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
  const sample = () => {
    const ctx = pet3dCanvas.getContext('2d');
    const stepX = Math.max(1, Math.floor(pet3dCanvas.width / 24));
    const stepY = Math.max(1, Math.floor(pet3dCanvas.height / 24));
    let nonZero = 0;
    let total = 0;
    for (let y = 0; y < pet3dCanvas.height; y += stepY) {
      for (let x = 0; x < pet3dCanvas.width; x += stepX) {
        total += 1;
        if (ctx.getImageData(x, y, 1, 1).data[3] > 0) {
          nonZero += 1;
        }
      }
    }
    return { nonZero, total };
  };

  const form = dragonForms[dragonStage.level] ?? dragonForms[1];
  const palette = createDragonPalette(dragonStage.element);
  const pose = dragonStage.getPose(performance.now(), form);
  const scene = { faces: [], effects: [] };
  dragonStage.buildDragon(scene, form, pose, palette);
  dragonStage.drawScene(scene, pose);
  const projected = scene.faces.flatMap((face) => face.points.map((point) => dragonStage.project(point)));
  const bounds = projected.reduce((acc, point) => ({
    minX: Math.min(acc.minX, point.x),
    maxX: Math.max(acc.maxX, point.x),
    minY: Math.min(acc.minY, point.y),
    maxY: Math.max(acc.maxY, point.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const visibleFace = scene.faces.find((face) => {
    const edgeA = sub3(face.points[1], face.points[0]);
    const edgeB = sub3(face.points[face.points.length - 1], face.points[0]);
    const normal = normalize(cross(edgeA, edgeB));
    const center = averagePoints(face.points);
    const view = normalize({ x: -center.x, y: -center.y, z: dragonStage.cameraDistance - center.z });
    return face.doubleSided || dot(normal, view) > 0;
  });
  const visibleFaceProjected = visibleFace ? visibleFace.points.map((point) => dragonStage.project(point)).reduce((memo, point, index, list) => ({ x: memo.x + point.x / list.length, y: memo.y + point.y / list.length }), { x: 0, y: 0 }) : null;
  const facePixel = visibleFaceProjected
    ? Array.from(pet3dCanvas.getContext('2d').getImageData(Math.round(visibleFaceProjected.x), Math.round(visibleFaceProjected.y), 1, 1).data)
    : null;
  const centerPixel = Array.from(pet3dCanvas.getContext('2d').getImageData(Math.floor(pet3dCanvas.width / 2), Math.floor(pet3dCanvas.height / 2), 1, 1).data);
  return {
    canvasWidth: pet3dCanvas.width,
    canvasHeight: pet3dCanvas.height,
    sample: sample(),
    centerPixel,
    visibleFacePixel: facePixel,
    visibleFaceProjected,
    dragonLevel: dragonStage.level,
    dragonElement: dragonStage.element,
    sceneFaces: scene.faces.length,
    sceneEffects: scene.effects.length,
    visibleFaces: scene.faces.filter((face) => {
      const edgeA = sub3(face.points[1], face.points[0]);
      const edgeB = sub3(face.points[face.points.length - 1], face.points[0]);
      const normal = normalize(cross(edgeA, edgeB));
      const center = averagePoints(face.points);
      const view = normalize({ x: -center.x, y: -center.y, z: dragonStage.cameraDistance - center.z });
      return face.doubleSided || dot(normal, view) > 0;
    }).length,
    projectedBounds: bounds,
    centerX: dragonStage.centerX,
    centerY: dragonStage.centerY,
    focalLength: dragonStage.focalLength,
    currentYaw: dragonStage.currentYaw,
    currentPitch: dragonStage.currentPitch,
    subtitle: profileSubtitle.textContent,
    heroName: petHeroStageName.textContent
  };
})()
"""
        diagnostics = await evaluate(client, diagnostics_expression)
        print(json.dumps(diagnostics, ensure_ascii=False, indent=2))

        painted = diagnostics['sample']['nonZero'] > max(10, diagnostics['sample']['total'] * 0.05)
        raise SystemExit(0 if painted else 1)
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
