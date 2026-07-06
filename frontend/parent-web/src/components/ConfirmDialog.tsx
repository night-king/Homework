/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type ConfirmFn = (title: string, message: string) => Promise<boolean>

const ConfirmContext = React.createContext<ConfirmFn | null>(null)

interface ConfirmState {
  open: boolean
  title: string
  message: string
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState>({ open: false, title: '', message: '' })
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null)

  const confirm = React.useCallback<ConfirmFn>((title, message) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setState({ open: true, title, message })
    })
  }, [])

  const settle = React.useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, open: false }))
    resolverRef.current?.(value)
    resolverRef.current = null
  }, [])

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) settle(false)
    },
    [settle],
  )

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={state.open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{state.title}</DialogTitle>
            {state.message && <DialogDescription>{state.message}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => settle(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => settle(true)}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within a <ConfirmProvider>')
  }
  return ctx
}
