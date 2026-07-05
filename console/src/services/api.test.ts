import { describe, it, expect } from 'vitest'
import { getErrorMessage } from './api'

describe('getErrorMessage', () => {
  it('reads ABP error envelope message', () => {
    const err = { response: { data: { error: { message: '名称已存在' } } } }
    expect(getErrorMessage(err)).toBe('名称已存在')
  })
  it('joins validation errors', () => {
    const err = { response: { data: { error: { message: 'x', validationErrors: [{ message: 'A' }, { message: 'B' }] } } } }
    expect(getErrorMessage(err)).toBe('A；B')
  })
  it('falls back when no envelope', () => {
    expect(getErrorMessage({}, 'FB')).toBe('FB')
  })
})
