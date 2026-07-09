
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
            except Exception:
                pass
        if self.ws:
            try:
                await self.ws.close()
            except Exception:
                pass

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
        await self.ws.send(json.dumps({'id': msg_id, 'method': method, 'params': params or {}}))
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
        except Exception as exc:
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
    user_data_dir = Path(tempfile.mkdtemp(prefix='child-homepage-rotation-'))
    port = 9333
    process = subprocess.Popen([
        CHROME,
        f'--remote-debugging-port={port}',
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1600,1800',
        f'--user-data-dir={user_data_dir}',
        'about:blank',
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
        result = await evaluate(client, """
(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const stage = document.getElementById('pet3dStage');
  const pointerId = 21;
  const beforeYaw = dragonStage.targetYaw;
  const beforePitch = dragonStage.targetPitch;

  stage.dispatchEvent(new PointerEvent('pointerdown', {
    pointerId,
    clientX: 120,
    clientY: 140,
    bubbles: true
  }));
  stage.dispatchEvent(new PointerEvent('pointermove', {
    pointerId,
    clientX: 560,
    clientY: 70,
    bubbles: true
  }));

  const yawAfterDrag = dragonStage.targetYaw;
  const pitchAfterDrag = dragonStage.targetPitch;

  stage.dispatchEvent(new PointerEvent('pointerup', {
    pointerId,
    clientX: 560,
    clientY: 70,
    bubbles: true
  }));

  await wait(800);

  const yawAfterRelease = dragonStage.targetYaw;
  const pitchAfterRelease = dragonStage.targetPitch;

  const checks = {
    yawCanGoPastOldClamp: Math.abs(yawAfterDrag) > 1.2,
    yawPersistsAfterRelease: Math.abs(yawAfterRelease - yawAfterDrag) < 0.15,
    pitchRecenters: Math.abs(pitchAfterRelease - dragonStage.restPitch) < Math.abs(pitchAfterDrag - dragonStage.restPitch)
  };

  return {
    beforeYaw,
    beforePitch,
    yawAfterDrag,
    pitchAfterDrag,
    yawAfterRelease,
    pitchAfterRelease,
    restYaw: dragonStage.restYaw,
    restPitch: dragonStage.restPitch,
    checks,
    passed: Object.values(checks).every(Boolean)
  };
})()
""")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        raise SystemExit(0 if result['passed'] else 1)
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
