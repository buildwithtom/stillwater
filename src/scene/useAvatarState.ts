import { useEffect, useState } from 'react'
import type { SpeechPhase } from '../speech/useSpeech'

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking'

export function useAvatarState(phase: SpeechPhase, reflectionId: number, composing: boolean, reducedMotion: boolean) {
  const [settledReflection, setSettledReflection] = useState(0)

  useEffect(() => {
    if (!reflectionId) return
    const timer = window.setTimeout(() => setSettledReflection(reflectionId), reducedMotion ? 0 : 560)
    return () => window.clearTimeout(timer)
  }, [reflectionId, reducedMotion])

  if (phase === 'speaking') return 'speaking'
  if (phase === 'queued' || phase === 'reading' || reflectionId !== settledReflection) return 'thinking'
  if (composing) return 'listening'
  return 'idle'
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(query.matches)
    query.addEventListener('change', sync)
    sync()
    return () => query.removeEventListener('change', sync)
  }, [])
  return reduced
}
