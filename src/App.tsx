import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { CourtyardStage } from './components/CourtyardStage'
import { Modal } from './components/Modal'
import { ReflectionPanel } from './components/ReflectionPanel'
import { scripture, translation } from './reflection/scripture'
import type { VerseId } from './reflection/scripture'
import { useReflection } from './reflection/useReflection'
import { useAvatarState, useReducedMotion } from './scene/useAvatarState'
import { useSpeech } from './speech/useSpeech'

export function App() {
  const [draft, setDraft] = useState('')
  const [composing, setComposing] = useState(false)
  const [modal, setModal] = useState<VerseId | 'about' | null>(null)
  const reducedMotion = useReducedMotion()
  const { exchange, send } = useReflection()
  const speech = useSpeech(reducedMotion)
  const voiceAvailable = speech.canPlayRecordings || Boolean(speech.voice)
  const voiceLabel = voiceAvailable ? (speech.enabled ? 'Voice on' : 'Voice off')
    : speech.discovering ? 'Checking voice…' : 'Voice unavailable'
  const response = exchange?.response
  const canReplay = Boolean(response && response.kind !== 'safety')
  const state = useAvatarState(speech.phase, response?.kind === 'safety' ? 0 : exchange?.id ?? 0, composing, reducedMotion)

  function submit(text: string) {
    const entry = send(text)
    if (!entry) return
    setDraft('')
    setComposing(false)
    if (entry.response.kind === 'safety') speech.reset()
    else speech.play(entry.response.text)
  }

  return (
    <div className="site">
      <a className="skip-link" href="#reflection-input">Skip to reflection</a>
      <header className="site-header">
        <span className="brand">Stillwater</span>
        <button type="button" className="about-button" onClick={() => setModal('about')}>About</button>
      </header>

      <main className="experience">
        <CourtyardStage state={state} reducedMotion={reducedMotion} mouth={speech.mouth} phase={speech.phase}
          words={speech.words} index={speech.index} notice={speech.notice} hasResponse={canReplay}
          voiceLabel={voiceLabel} voiceAvailable={voiceAvailable} voiceOn={speech.enabled} onVoice={speech.toggleVoice}
          replay={() => { if (response && canReplay) speech.play(response.text) }}
          pause={speech.togglePause} stop={speech.stop} />
        <ReflectionPanel draft={draft} setDraft={setDraft} setComposing={setComposing} submit={submit}
          exchange={exchange} onVerse={setModal} />
      </main>

      {modal === 'about' && (
        <Modal title="About Stillwater" eyebrow="Local prototype" dismiss={() => setModal(null)}>
          <p>Stillwater offers written reflections based on biblical teachings. Its Jesus-inspired character and voice are a dramatized simulation. The guidance comes from the app’s local demo scripts.</p>
          <p>Stillwater is intended for personal reflection. For pastoral care, practical support, or professional advice, reach out to someone you trust.</p>
          <p>Messages stay in this tab for the session. Narration plays from audio bundled with the app, with an on-device browser voice as a backup.</p>
        </Modal>
      )}
      {modal && modal !== 'about' && (
        <Modal title={scripture[modal].reference} eyebrow="Scripture" dismiss={() => setModal(null)}>
          <blockquote>“{scripture[modal].text}”</blockquote>
          <a className="source-link" href={scripture[modal].source} target="_blank" rel="noreferrer">
            <BookOpen size={16} aria-hidden="true" />{translation} · Read in context<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Modal>
      )}
    </div>
  )
}
