import { describe, it, expect } from 'vitest'
import zh from '../../public/locales/zh-CN/translation.json'
import en from '../../public/locales/en/translation.json'

function keys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`])
}

describe('locales', () => {
  it('both locales define the new journeys/wizard namespaces', () => {
    for (const loc of [zh, en] as Array<Record<string, unknown>>) {
      const flat = keys(loc)
      expect(flat).toContain('nav.journeys')
      expect(flat).toContain('journeys.title')
      expect(flat).toContain('journeys.create')
      expect(flat).toContain('wizard.stepBasics')
      expect(flat).toContain('wizard.publish')
      expect(flat).toContain('wizard.days.0')
      expect(flat).toContain('wizard.days.6')
      expect(flat).toContain('nav.play')
      expect(flat).toContain('play.pickChildTitle')
    }
  })
  it('zh and en have identical key sets', () => {
    expect(keys(zh as Record<string, unknown>).sort()).toEqual(keys(en as Record<string, unknown>).sort())
  })
})
