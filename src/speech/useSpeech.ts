import { useCallback, useEffect, useRef, useState } from 'react'
import { restingMouth } from './articulation'
import { mouthAt, tokenize } from './timing'
import type { MouthFrame, SpokenWord } from './timing'

export type SpeechPhase = 'idle' | 'queued' | 'reading' | 'speaking' | 'paused'
type SpeechView = { phase: SpeechPhase; words: readonly SpokenWord[]; index: number }
type Session = {
  words: SpokenWord[]
  phase: Exclude<SpeechPhase, 'idle'>
  index: number
  wordAt: number
  startedAt: number
  lastBoundary: number
  boundaryIndex: number
  tempo: number
  pausedAt: number
  frame: number
  utterance?: SpeechSynthesisUtterance
}

const discoveryWindow = 2200
const empty: SpeechView = { phase: 'idle', words: [], index: -1 }

function chooseVoice(voices: readonly SpeechSynthesisVoice[]) {
  const score = (voice: SpeechSynthesisVoice) =>
    (/natural|enhanced|premium/i.test(voice.name) ? 9 : 0) +
    (/daniel|guy|alex|aaron|oliver|david|arthur/i.test(voice.name) ? 5 : 0) +
    (voice.default ? 2 : 0) + (voice.lang === 'en-US' || voice.lang === 'en-GB' ? 1 : 0)

  return voices.filter((voice) => voice.localService && /^en(?:[-_]|$)/i.test(voice.lang))
    .sort((a, b) => score(b) - score(a))[0]
}

function detach(utterance?: SpeechSynthesisUtterance) {
  if (utterance) {
    utterance.onstart = null
    utterance.onend = null
    utterance.onerror = null
    utterance.onboundary = null
  }
}

export function useSpeech(reducedMotion: boolean) {
  const synthesis = typeof window !== 'undefined' && 'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window ? window.speechSynthesis : null
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [discovering, setDiscovering] = useState(Boolean(synthesis))
  const stillDiscovering = useRef(Boolean(synthesis))
  const [enabled, setEnabled] = useState(true)
  const [notice, setNotice] = useState('')
  const [view, setView] = useState<SpeechView>(empty)
  const enabledRef = useRef(true)
  const session = useRef<Session | null>(null)
  const mouth = useRef<MouthFrame>(restingMouth)

  const cancel = useCallback((reveal: boolean, updateView = true) => {
    const active = session.current
    session.current = null
    if (active) {
      cancelAnimationFrame(active.frame)
      detach(active.utterance)
      if (active.utterance && synthesis) {
        synthesis.cancel()
        if (synthesis.paused) synthesis.resume()
      }
    }
    mouth.current = restingMouth
    if (updateView) {
      setView((previous) => reveal ? { ...previous, phase: 'idle', index: previous.words.length - 1 } : empty)
    }
  }, [synthesis])

  useEffect(() => {
    if (!synthesis) return
    const refresh = (expired = false) => {
      const available = synthesis.getVoices()
      setVoices(available)
      if (available.length || expired) {
        stillDiscovering.current = false
        setDiscovering(false)
      }
    }
    const voicesChanged = () => refresh()
    refresh()
    const deadline = window.setTimeout(() => refresh(true), discoveryWindow)
    synthesis.addEventListener('voiceschanged', voicesChanged)
    return () => {
      window.clearTimeout(deadline)
      synthesis.removeEventListener('voiceschanged', voicesChanged)
      cancel(false, false)
    }
  }, [synthesis, cancel])

  function play(text: string) {
    cancel(false)
    setNotice('')
    const words = tokenize(text)
    if (!words.length) return
    const voice = synthesis ? chooseVoice(synthesis.getVoices()) : undefined
    const waitingForVoice = enabledRef.current && Boolean(synthesis) && !voice && stillDiscovering.current
    const willSpeak = enabledRef.current && Boolean(voice || waitingForVoice)
    const unavailable = synthesis ? 'No on-device English voice is available.' : 'Speech is unavailable in this browser.'

    if (!willSpeak) {
      if (enabledRef.current) setNotice(unavailable)
      if (reducedMotion) {
        setView({ phase: 'idle', words, index: words.length - 1 })
        return
      }
    }

    const now = performance.now()
    const active: Session = {
      words,
      phase: willSpeak ? 'queued' : 'reading',
      index: 0,
      wordAt: now,
      startedAt: now,
      lastBoundary: -Infinity,
      boundaryIndex: -1,
      tempo: 1,
      pausedAt: 0,
      frame: 0,
    }
    const maxDuration = words.reduce((sum, word) => sum + word.duration, 0) * 2 + 10_000
    session.current = active
    setView({ phase: active.phase, words, index: active.phase === 'queued' ? -1 : 0 })

    const publish = () => setView({ phase: active.phase, words, index: active.index })
    const useSilentTiming = (message: string) => {
      if (session.current !== active) return
      setNotice(message)
      detach(active.utterance)
      synthesis?.cancel()
      active.utterance = undefined
      if (reducedMotion) {
        cancel(true)
        return
      }
      active.phase = 'reading'
      active.wordAt = performance.now()
      publish()
    }
    const voiceFailure = 'The browser couldn’t start its voice. You can read the reflection below.'
    let nextVoiceCheck = now
    const tick = (time: number) => {
      if (session.current !== active) return
      if (active.phase === 'queued') {
        if (active.utterance && time - active.startedAt > 3000) {
          useSilentTiming(voiceFailure)
        } else if (!active.utterance && synthesis && time >= nextVoiceCheck) {
          nextVoiceCheck = time + 140
          const readyVoice = chooseVoice(synthesis.getVoices())
          if (readyVoice) startSpeech(readyVoice)
          else if (!stillDiscovering.current || time - now > discoveryWindow) useSilentTiming(unavailable)
        }
      }
      if (session.current !== active) return
      if (active.phase === 'speaking' || active.phase === 'reading') {
        const audible = active.phase === 'speaking'
        const tempo = audible ? active.tempo : .88
        const word = words[active.index]
        const elapsed = Math.max(0, time - active.wordAt)
        const duration = word.duration * tempo
        const boundaryGrace = active.boundaryIndex === active.index ? Math.min(90, duration * .22) : 0
        if (elapsed >= duration + boundaryGrace && active.index < words.length - 1) {
          active.index += 1
          active.wordAt = time
          publish()
        } else if (
          (!audible && active.index === words.length - 1 && elapsed > duration + 500) ||
          (audible && time - active.startedAt > maxDuration)
        ) {
          cancel(true)
          return
        }
        if (audible) {
          mouth.current = mouthAt(words, active.index, Math.max(0, time - active.wordAt), tempo)
        }
      }
      if (session.current === active) active.frame = requestAnimationFrame(tick)
    }

    function startSpeech(selectedVoice: SpeechSynthesisVoice) {
      if (!synthesis) return
      const utterance = new SpeechSynthesisUtterance(text)
      active.startedAt = performance.now()
      utterance.voice = selectedVoice
      utterance.lang = selectedVoice.lang
      utterance.rate = 0.91
      utterance.pitch = 0.96
      active.utterance = utterance
      utterance.onstart = () => {
        if (session.current !== active) return
        active.phase = 'speaking'
        active.startedAt = active.wordAt = performance.now()
        publish()
      }
      utterance.onboundary = (event) => {
        if (session.current !== active || active.phase !== 'speaking' || (event.name && event.name !== 'word')) return
        const index = words.findIndex((word) => word.endsAt > event.charIndex)
        if (index <= active.boundaryIndex) return
        const time = performance.now()
        if (active.boundaryIndex >= 0) {
          const nominal = words[index].startTime - words[active.boundaryIndex].startTime
          const observed = Math.min(1.6, Math.max(.58, (time - active.lastBoundary) / nominal))
          active.tempo += (observed - active.tempo) * .36
        }
        active.boundaryIndex = index
        active.lastBoundary = time
        if (index < active.index) return
        active.wordAt = time
        if (index > active.index) {
          active.index = index
          publish()
        }
      }
      utterance.onend = () => {
        if (session.current === active) cancel(true)
      }
      utterance.onerror = () => useSilentTiming(voiceFailure)
      try {
        synthesis.cancel()
        synthesis.speak(utterance)
      } catch {
        useSilentTiming(voiceFailure)
      }
    }
    if (willSpeak && voice) startSpeech(voice)
    if (session.current === active) active.frame = requestAnimationFrame(tick)
  }

  function toggleVoice() {
    enabledRef.current = !enabledRef.current
    setEnabled(enabledRef.current)
    setNotice('')
    if (!enabledRef.current) cancel(true)
  }

  function togglePause() {
    const active = session.current
    if (!active?.utterance || !synthesis) return
    const now = performance.now()
    if (active.phase === 'speaking') {
      active.pausedAt = now
      active.phase = 'paused'
      mouth.current = restingMouth
      synthesis.pause()
    } else if (active.phase === 'paused') {
      const delay = now - active.pausedAt
      active.wordAt += delay
      active.startedAt += delay
      active.lastBoundary += delay
      active.phase = 'speaking'
      synthesis.resume()
    }
    setView((previous) => ({ ...previous, phase: active.phase }))
  }

  return {
    ...view,
    mouth,
    enabled,
    notice,
    voice: chooseVoice(voices),
    discovering,
    play,
    stop: () => cancel(true),
    reset: () => { cancel(false); setNotice('') },
    toggleVoice,
    togglePause,
  }
}
