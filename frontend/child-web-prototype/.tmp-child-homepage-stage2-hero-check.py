import asyncio
import json
import shutil
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

import websockets

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ROOT = Path(r"D:\WorkSpace\night-king\Homework")
PAGE = ROOT / "frontend" / "child-web-prototype" / "child-homepage.html"
URL = PAGE.resolve().as_uri()


class CDPClient:
    def __init__(self, websocket_url: str):
        self.websocket_url = websocket_url
        self.next_id = 0
        self.pending = {}
        self.events = asyncio.Queue()
        self.ws = None
        self.reader_task = None

    async def connect(self):
        self.ws = await websockets.connect(self.websocket_url, max_size=None)
        self.reader_task = asyncio.create_task(self._reader())

    async def close(self):
        if self.reader_task:
            self.reader_task.cancel()
            try:
                await self.reader_task
            except asyncio.CancelledError:
                pass
        if self.ws:
            await self.ws.close()

    async def _reader(self):
        async for raw in self.ws:
            data = json.loads(raw)
            if 'id' in data:
                future = self.pending.pop(data['id'], None)
                if future and not future.done():
                    future.set_result(data)
            else:
                await self.events.put(data)

    async def send(self, method: str, params: dict | None = None):
        self.next_id += 1
        msg_id = self.next_id
        future = asyncio.get_running_loop().create_future()
        self.pending[msg_id] = future
        await self.ws.send(json.dumps({
            'id': msg_id,
            'method': method,
            'params': params or {}
        }))
        response = await future
        if 'error' in response:
            raise RuntimeError(f"CDP {method} failed: {response['error']}")
        return response.get('result', {})

    async def wait_for(self, method: str, timeout: float = 10.0):
        end_time = time.time() + timeout
        while True:
            remaining = end_time - time.time()
            if remaining <= 0:
                raise TimeoutError(f"Timed out waiting for {method}")
            event = await asyncio.wait_for(self.events.get(), timeout=remaining)
            if event.get('method') == method:
                return event.get('params', {})


async def fetch_ws_url(port: int) -> str:
    deadline = time.time() + 10
    last_error = None
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list', timeout=1) as response:
                targets = json.load(response)
            page_targets = [item for item in targets if item.get('type') == 'page']
            if page_targets:
                return page_targets[0]['webSocketDebuggerUrl']
        except Exception as exc:  # noqa: BLE001
            last_error = exc
        await asyncio.sleep(0.2)
    raise RuntimeError(f'Could not fetch DevTools target: {last_error}')


async def evaluate(client: CDPClient, expression: str):
    result = await client.send('Runtime.evaluate', {
        'expression': expression,
        'returnByValue': True,
        'awaitPromise': True,
    })
    if 'exceptionDetails' in result:
        raise RuntimeError(result['exceptionDetails'])
    return result['result'].get('value')


async def main():
    if not Path(CHROME).exists():
        raise SystemExit(f'Chrome not found: {CHROME}')

    user_data_dir = Path(tempfile.mkdtemp(prefix='child-homepage-cdp-'))
    port = 9222
    cmd = [
        CHROME,
        f'--remote-debugging-port={port}',
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1600,1800',
        f'--user-data-dir={user_data_dir}',
        'about:blank',
    ]
    process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    client = None

    try:
        ws_url = await fetch_ws_url(port)
        client = CDPClient(ws_url)
        await client.connect()
        await client.send('Page.enable')
        await client.send('Runtime.enable')
        await client.send('Page.navigate', {'url': URL})
        await client.wait_for('Page.loadEventFired', timeout=15)
        await evaluate(client, 'new Promise(resolve => setTimeout(resolve, 1200))')

        diagnostics_expression = """
(() => {
  const form = dragonForms[2];
  const metrics = {
    neckRatio: form.neck.length / form.body.length,
    snoutRatio: form.snout.length / form.head.length,
    headAspect: form.head.length / form.head.height,
    tailRatio: form.tail.lengths.reduce((sum, value) => sum + value, 0) / form.body.length,
    rearLegRatio: form.legs.rear / form.body.height,
    bodyTilt: form.body.tilt,
    spineCount: form.spines.count,
    hornLength: form.horns ? form.horns.length : 0,
    wingSpanRatio: form.wings ? form.wings.span / form.body.length : 0,
    restYaw: dragonStage.restYaw
  };

  const thresholds = {
    neckRatio: 0.34,
    snoutRatio: 0.54,
    headAspect: 1.8,
    tailRatio: 1.08,
    rearLegRatio: 0.96,
    bodyTilt: 0.12,
    spineCount: 5,
    hornLength: 34,
    wingSpanRatio: 0.72,
    restYaw: -0.34
  };

  const checks = {
    neckRatio: metrics.neckRatio >= thresholds.neckRatio,
    snoutRatio: metrics.snoutRatio >= thresholds.snoutRatio,
    headAspect: metrics.headAspect >= thresholds.headAspect,
    tailRatio: metrics.tailRatio >= thresholds.tailRatio,
    rearLegRatio: metrics.rearLegRatio >= thresholds.rearLegRatio,
    bodyTilt: metrics.bodyTilt >= thresholds.bodyTilt,
    spineCount: metrics.spineCount >= thresholds.spineCount,
    hornLength: metrics.hornLength >= thresholds.hornLength,
    wingSpanRatio: metrics.wingSpanRatio >= thresholds.wingSpanRatio,
    restYaw: metrics.restYaw >= thresholds.restYaw
  };

  return {
    metrics,
    thresholds,
    checks,
    passed: Object.values(checks).every(Boolean)
  };
})()
"""
        diagnostics = await evaluate(client, diagnostics_expression)
        print(json.dumps(diagnostics, ensure_ascii=False, indent=2))

        raise SystemExit(0 if diagnostics['passed'] else 1)
    finally:
        if client:
            await client.close()
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        shutil.rmtree(user_data_dir, ignore_errors=True)


if __name__ == '__main__':
    asyncio.run(main())
