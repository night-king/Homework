import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FileUploadField } from './FileUploadField'

describe('FileUploadField', () => {
  it('calls onUpload with the chosen file', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined)
    render(<FileUploadField testId="cover" label="封面" accept="image/*" kind="image" onUpload={onUpload} />)
    const input = screen.getByTestId('cover-input') as HTMLInputElement
    const file = new File(['x'], 'c.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file))
  })
  it('shows current image preview when currentUrl set (image kind)', () => {
    render(<FileUploadField testId="cover" label="封面" accept="image/*" kind="image" currentUrl="http://x/c.png" onUpload={vi.fn()} />)
    expect(screen.getByTestId('cover-preview')).toHaveAttribute('src', 'http://x/c.png')
  })
})
