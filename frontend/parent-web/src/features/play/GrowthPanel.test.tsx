import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GrowthPanel } from './GrowthPanel'
import type { PetFormDto } from '@/types/homework'

const form: PetFormDto = { level: 2, name: '幼龙', growthToNext: 100 }
const next: PetFormDto = { level: 3, name: '成龙', growthToNext: 200 }

describe('GrowthPanel', () => {
  it('成长条按比例填充,显示百分比与成长值', () => {
    render(<GrowthPanel growthPoints={58} form={form} nextForm={next} />)
    const bar = screen.getByTestId('growth-bar')
    expect(bar).toHaveStyle({ width: '58%' })
    expect(screen.getByText('58%')).toBeInTheDocument()
    expect(screen.getByText(/58 \/ 100/)).toBeInTheDocument()
  })

  it('渲染伙伴图鉴入口', () => {
    render(<GrowthPanel growthPoints={0} form={form} nextForm={next} />)
    expect(screen.getByTestId('open-codex')).toBeInTheDocument()
  })

  it('点伙伴图鉴入口触发 onOpenCodex', () => {
    const onOpen = vi.fn()
    render(<GrowthPanel growthPoints={0} form={form} nextForm={next} onOpenCodex={onOpen} />)
    fireEvent.click(screen.getByTestId('open-codex'))
    expect(onOpen).toHaveBeenCalled()
  })
})
