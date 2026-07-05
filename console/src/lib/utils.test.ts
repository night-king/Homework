import { describe, it, expect } from 'vitest'
import { cn } from './utils'
describe('cn', () => {
  it('merges + dedupes tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-ink', false && 'hidden', 'font-bold')).toBe('text-ink font-bold')
  })
})
