import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChooseAdventure } from './ChooseAdventure'

describe('ChooseAdventure', () => {
  it('renders draft cards and calls onChoose', () => {
    const onChoose = vi.fn()
    render(
      <ChooseAdventure
        drafts={[
          { id: 'd1', title: '暑假冒险', status: 0 } as never,
          { id: 'd2', title: '阅读之旅', status: 0 } as never,
        ]}
        onChoose={onChoose}
      />,
    )
    expect(screen.getByText('暑假冒险')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('choose-adventure-d2'))
    expect(onChoose).toHaveBeenCalledWith('d2')
  })
})
