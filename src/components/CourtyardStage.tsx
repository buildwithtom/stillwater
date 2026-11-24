import { lazy, Suspense, useState } from 'react'
import type { RefObject } from 'react'
import { Pause, Play, RotateCcw, Square, Volume2, VolumeX } from 'lucide-react'
import { captionGroups } from '../speech/timing'
import type { MouthFrame, SpokenWord } from '../speech/timing'
import type { SpeechPhase } from '../speech/useSpeech'
import type { AvatarState } from '../scene/useAvatarState'
import { SceneBoundary } from './SceneBoundary'
import { portraitUrl } from '../scene/assets'

const LiveScene = lazy(() => import('../scene/CourtyardScene'))

const labels: Record<AvatarState, string> = {
  idle: '',
  listening: 'Listening',
  thinking: 'Reflecting',
  speaking: 'Speaking',
}

type SceneStatus = 'loading' | 'ready' | 'unsupported' | 'error'

type CourtyardProps = {
  state: AvatarState
  reducedMotion: boolean
  mouth: RefObject<MouthFrame>
  phase: SpeechPhase
  words: readonly SpokenWord[]
  index: number
  notice: string
  hasResponse: boolean
  voiceLabel: string
  voiceAvailable: boolean
  voiceOn: boolean
  onVoice: () => void
  replay: () => void
  pause: () => void
  stop: () => void
}

export function CourtyardStage({
  state, reducedMotion, mouth, phase, words, index, notice, hasResponse,
  voiceLabel, voiceAvailable, voiceOn, onVoice, replay, pause, stop,
}: CourtyardProps) {
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>('loading')
  const caption = captionGroups(words).find((group) => index >= group.start && index < group.start + group.words.length)
  const speaking = phase === 'speaking' || phase === 'paused'
  const active = phase !== 'idle'
  const status = phase === 'paused' ? 'Voice paused' : labels[state]

  return (
    <section className="courtyard" aria-label="The Olive Courtyard">
      <div className="stage">
        <img className="stage-still" src={portraitUrl} alt="" fetchPriority="high" width={1440} height={960} />
        {sceneStatus !== 'error' && sceneStatus !== 'unsupported' && (
          <div className={'stage-canvas' + (sceneStatus === 'ready' ? ' stage-canvas--ready' : '')} aria-hidden="true">
            <SceneBoundary fallback={null} onError={() => setSceneStatus('error')}>
              <Suspense fallback={null}>
                <LiveScene state={state} mouth={mouth} reducedMotion={reducedMotion} onStatus={setSceneStatus} />
              </Suspense>
            </SceneBoundary>
          </div>
        )}
        <div className="stage-top">
          <div className="stage-status" aria-live="polite">{status}</div>
          {sceneStatus !== 'ready' && (
            <span className="scene-mode">{sceneStatus === 'loading' ? 'Preparing 3D scene' : 'Still image · 3D unavailable'}</span>
          )}
        </div>
        {active && caption && (
          <div className="stage-bottom">
            <p className="caption" key={caption.start} aria-hidden="true">
              {caption.words.slice(0, index - caption.start + 1).map((word) => <span key={word.at}>{word.text} </span>)}
            </p>
          </div>
        )}
      </div>
      <div className="stage-toolbar">
        <p className="stage-disclosure">Simulated biblical reflection</p>
        <div className="stage-controls">
          {hasResponse && (
            <div className="playback" aria-label="Voice playback">
              <button type="button" className="icon-button" title="Replay response" aria-label="Replay response" onClick={replay}>
                <RotateCcw size={16} />
              </button>
              <button type="button" className="icon-button" title={phase === 'paused' ? 'Resume speech' : 'Pause speech'}
                aria-label={phase === 'paused' ? 'Resume speech' : 'Pause speech'} disabled={!speaking} onClick={pause}>
                {phase === 'paused' ? <Play size={15} /> : <Pause size={15} />}
              </button>
              <button type="button" className="icon-button" title="Stop playback" aria-label="Stop playback" disabled={!active} onClick={stop}>
                <Square size={13} />
              </button>
            </div>
          )}
          <button type="button" className="voice-button" aria-pressed={voiceAvailable && voiceOn}
            disabled={!voiceAvailable} onClick={onVoice}>
            {voiceAvailable && voiceOn ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
            {voiceLabel}
          </button>
        </div>
        {notice && <p className="voice-notice" role="status">{notice}</p>}
      </div>
    </section>
  )
}
