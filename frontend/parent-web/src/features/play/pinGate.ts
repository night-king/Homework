import { create } from 'zustand'

// 内存态，故意不落 sessionStorage：刷新即清空 → 重新验证。
// 「交还家长」时也会 reset()，回来重进要再验一次。按 childId 记，切孩子各验各的。
interface PinGateState {
  verified: Record<string, true>
  markVerified: (childId: string) => void
  reset: () => void
}

export const usePinGate = create<PinGateState>((set) => ({
  verified: {},
  markVerified: (childId) => set((s) => ({ verified: { ...s.verified, [childId]: true } })),
  reset: () => set({ verified: {} }),
}))
