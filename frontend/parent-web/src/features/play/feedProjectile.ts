// 喂养投掷:道具从补给台源卡飞向宠物落点。真几何——取两个 rect,克隆 .kid-flying-drop 挂 body
// (position:fixed,视口坐标),两帧后加 is-flying 触发 CSS transition,~780ms 清理。
// 移植自原型 launchFeedProjectile(child-homepage.html:4225-4249)。
export function launchFeedProjectile(
  source: HTMLElement,
  target: HTMLElement | null,
  visual: { iconUrl?: string | null; glyph?: string | null },
): void {
  if (!target) return // 落点未挂载则不飞(容错,不影响喂养请求)
  const s = source.getBoundingClientRect()
  const t = target.getBoundingClientRect()

  const fly = document.createElement('div')
  fly.className = 'kid-flying-drop'
  if (visual.iconUrl) {
    const img = document.createElement('img')
    img.src = visual.iconUrl
    img.alt = ''
    fly.appendChild(img)
  } else {
    fly.textContent = visual.glyph ?? '🎁'
  }

  const sx = s.left + s.width / 2
  const sy = s.top + s.height / 2
  // 瞄准落点内 56%/34% 的点(略偏右上,贴近宠物"嘴")——与原型一致(child-homepage.html:4236-4237)
  const dx = t.left + t.width * 0.56 - sx
  const dy = t.top + t.height * 0.34 - sy
  fly.style.left = `${sx}px`
  fly.style.top = `${sy}px`
  fly.style.setProperty('--fly-x', `${dx}px`)
  fly.style.setProperty('--fly-y', `${dy}px`)

  document.body.appendChild(fly)
  // 两帧:先让浏览器应用 base 态,再加 is-flying 让 transition 真正跑
  requestAnimationFrame(() => {
    requestAnimationFrame(() => fly.classList.add('is-flying'))
  })
  window.setTimeout(() => fly.remove(), 780)
}
