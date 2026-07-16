import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { launchFeedProjectile } from './feedProjectile'

function el(): HTMLElement {
  const e = document.createElement('div')
  document.body.appendChild(e)
  return e
}

describe('launchFeedProjectile', () => {
  beforeEach(() => { vi.useFakeTimers(); document.body.innerHTML = '' })
  afterEach(() => { vi.useRealTimers() })

  it('挂一个 .kid-flying-drop 到 body,带 glyph,~780ms 后清理', () => {
    const src = el(); const tgt = el()
    launchFeedProjectile(src, tgt, { glyph: '🍙' })
    const fly = document.querySelector('.kid-flying-drop')
    expect(fly).not.toBeNull()
    expect(fly!.textContent).toBe('🍙')
    vi.advanceTimersByTime(800)
    expect(document.querySelector('.kid-flying-drop')).toBeNull()
  })

  it('有 iconUrl 时飞行体是 img', () => {
    const src = el(); const tgt = el()
    launchFeedProjectile(src, tgt, { iconUrl: 'http://x/i.png', glyph: '🍙' })
    const img = document.querySelector('.kid-flying-drop img') as HTMLImageElement | null
    expect(img).not.toBeNull()
    expect(img!.src).toContain('http://x/i.png')
  })

  it('target 为 null → 不飞、不挂元素(容错)', () => {
    const src = el()
    launchFeedProjectile(src, null, { glyph: '🍙' })
    expect(document.querySelector('.kid-flying-drop')).toBeNull()
  })

  it('把源与落点的位移写进 --fly-x/--fly-y', () => {
    const src = el(); const tgt = el()
    // jsdom 的 getBoundingClientRect 恒为 0,这里只验属性被设置(不验具体像素)
    launchFeedProjectile(src, tgt, { glyph: '🍙' })
    const fly = document.querySelector('.kid-flying-drop') as HTMLElement
    expect(fly.style.getPropertyValue('--fly-x')).not.toBe('')
    expect(fly.style.getPropertyValue('--fly-y')).not.toBe('')
  })
})
