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

    def drain_events(self):
        collected = []
        while not self.events.empty():
            collected.append(self.events.get_nowait())
        return collected

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

    user_data_dir = Path(tempfile.mkdtemp(prefix='t3-load-check-'))
    port = 9223
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

    page_errors = []
    console_errors = []

    try:
        ws_url = await fetch_ws_url(port)
        client = CDPClient(ws_url)
        await client.connect()
        await client.send('Page.enable')
        await client.send('Runtime.enable')
        await client.send('Log.enable')
        await client.send('Page.navigate', {'url': URL})
        await client.wait_for('Page.loadEventFired', timeout=15)
        await evaluate(client, 'new Promise(resolve => setTimeout(resolve, 1500))')

        # Collect any uncaught exceptions / console errors that fired during load.
        for event in client.drain_events():
            method = event.get('method')
            params = event.get('params', {})
            if method == 'Runtime.exceptionThrown':
                details = params.get('exceptionDetails', {})
                text = details.get('exception', {}).get('description') or details.get('text')
                page_errors.append(text)
            elif method == 'Log.entryAdded':
                entry = params.get('entry', {})
                if entry.get('level') == 'error':
                    console_errors.append(entry.get('text'))

        checks = await evaluate(client, """
(() => ({
  hasPetStageMount: !!document.getElementById('petStageMount'),
  petStageMountClass: document.getElementById('petStageMount') ? document.getElementById('petStageMount').className : null,
  noCanvas: !document.getElementById('pet3dCanvas'),
  noElementSwitcher: !document.getElementById('elementSwitcher'),
  speechBubbleExists: !!document.getElementById('petSpeechBubble'),
  showSpeechBubbleDefined: typeof showSpeechBubble === 'function'
}))()
""")

        report = {
            'pageErrors': page_errors,
            'consoleErrors': console_errors,
            'checks': checks,
        }
        print(json.dumps(report, ensure_ascii=False, indent=2))

        ok = (
            not page_errors
            and not console_errors
            and checks['hasPetStageMount']
            and checks['noCanvas']
            and checks['noElementSwitcher']
            and checks['speechBubbleExists']
            and checks['showSpeechBubbleDefined']
        )
        if ok:
            print('PASS load-check: zero page errors, #petStageMount present')
        else:
            print('FAIL load-check')
        raise SystemExit(0 if ok else 1)
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
