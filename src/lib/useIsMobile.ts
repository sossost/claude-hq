'use client'

import { useSyncExternalStore } from 'react'

const MOBILE_BREAKPOINT = '(max-width: 767px)'

const mql = typeof window !== 'undefined'
  ? window.matchMedia(MOBILE_BREAKPOINT)
  : null

function subscribe(callback: () => void): () => void {
  mql?.addEventListener('change', callback)
  return () => mql?.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  return mql?.matches ?? false
}

function getServerSnapshot(): boolean {
  return false
}

/** Non-hook helper for useState initializers */
export function getIsMobile(): boolean {
  return mql?.matches ?? false
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
