import { describe, it, expect } from 'vitest'
import { decodeUser, isTokenExpired } from './authService'
describe('decodeUser / isTokenExpired', () => {
  it('extracts id/userName/email from JWT payload', () => {
    const payload = { sub: 'abc', unique_name: 'demo', email: 'demo@homework.today' }
    const jwt = `x.${btoa(JSON.stringify(payload))}.y`
    expect(decodeUser(jwt)).toEqual({ id: 'abc', userName: 'demo', email: 'demo@homework.today' })
  })
  it('isTokenExpired: true when exp in past, false when future', () => {
    const now = Math.floor(Date.now() / 1000)
    const mk = (exp: number) => `x.${btoa(JSON.stringify({ sub: 'a', exp }))}.y`
    expect(isTokenExpired(mk(now - 60))).toBe(true)
    expect(isTokenExpired(mk(now + 3600))).toBe(false)
  })
})
