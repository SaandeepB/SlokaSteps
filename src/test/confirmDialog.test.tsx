import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ConfirmDialog } from '../components/common/ConfirmDialog'

function DialogHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <ConfirmDialog
        open={open}
        title="Leave lesson?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      >
        <p>Your progress remains available.</p>
      </ConfirmDialog>
    </>
  )
}

describe('ConfirmDialog', () => {
  it('contains focus, closes with Escape, and restores the trigger', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)

    const trigger = screen.getByRole('button', { name: 'Open dialog' })
    await user.click(trigger)

    const cancel = screen.getByRole('button', { name: 'Stay' })
    const confirm = screen.getByRole('button', { name: 'Leave' })
    expect(cancel).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')

    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()
    await user.tab()
    expect(cancel).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(document.body.style.overflow).toBe('')
  })
})
