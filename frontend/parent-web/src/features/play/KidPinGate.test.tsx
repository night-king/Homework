import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KidPinGate } from './KidPinGate'
import { usePinGate } from './pinGate'

vi.mock('@/services/homeworkService', () => ({ verifyChildPin: vi.fn() }))
import { verifyChildPin } from '@/services/homeworkService'
const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>

const type = (digits: string) => {
  for (const d of digits) fireEvent.click(screen.getByTestId(`pin-key-${d}`))
}

beforeEach(() => {
  vi.clearAllMocks()
  usePinGate.getState().reset()
})

describe('KidPinGate', () => {
  it('输满 4 位即校验；正确则标记已验证', async () => {
    mock(verifyChildPin).mockResolvedValue(true)
    render(<KidPinGate childId="c1" childName="哥哥" avatar="🐯" />)
    type('1234')
    await waitFor(() => expect(verifyChildPin).toHaveBeenCalledWith('c1', { pin: '1234' }))
    await waitFor(() => expect(usePinGate.getState().verified.c1).toBe(true))
  })

  it('PIN 错误显示提示且不标记验证，输入清空重来', async () => {
    mock(verifyChildPin).mockResolvedValue(false)
    render(<KidPinGate childId="c1" childName="哥哥" />)
    type('0000')
    await waitFor(() => expect(screen.getByTestId('kid-pin-error')).toBeInTheDocument())
    expect(usePinGate.getState().verified.c1).toBeUndefined()
  })
})
