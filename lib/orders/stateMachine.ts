import type { OrderStatus } from '@/types/database'

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['placed'],
  placed: ['in_kitchen'],
  in_kitchen: ['ready'],
  ready: ['served'],
  served: ['billed'],
  billed: ['paid'],
  paid: ['closed'],
  closed: [],
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function nextStatus(current: OrderStatus): OrderStatus | null {
  const nexts = VALID_TRANSITIONS[current]
  return nexts.length > 0 ? nexts[0] : null
}

export { VALID_TRANSITIONS }
