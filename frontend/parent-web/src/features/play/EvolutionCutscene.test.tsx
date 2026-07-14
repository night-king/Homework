import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EvolutionCutscene } from './EvolutionCutscene'
import type { FeedResultDto } from '@/types/homework'

const base: FeedResultDto = { evolved: false, newLevel: 2, completed: false, currentLevel: 2, growthPoints: 0, revealText: '裂壳光爆', evolveVideoUrl: null }

describe('EvolutionCutscene', () => {
  it('evolved with video → renders video + reveal', () => {
    render(<EvolutionCutscene result={{ ...base, evolved: true, evolveVideoUrl: 'http://x/e.mp4' }} onClose={vi.fn()} />)
    expect(screen.getByTestId('evo-video')).toBeInTheDocument()
    expect(screen.getByText('裂壳光爆')).toBeInTheDocument()
  })
  it('evolved without video → CSS fallback', () => {
    render(<EvolutionCutscene result={{ ...base, evolved: true, evolveVideoUrl: null }} onClose={vi.fn()} />)
    expect(screen.getByTestId('evo-css')).toBeInTheDocument()
  })
  it('completed → celebration + close', () => {
    const onClose = vi.fn()
    render(<EvolutionCutscene result={{ ...base, evolved: true, completed: true, newLevel: 5 }} onClose={onClose} />)
    expect(screen.getByTestId('evo-completed')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('evo-close'))
    expect(onClose).toHaveBeenCalled()
  })
})
