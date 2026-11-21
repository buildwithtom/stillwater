import { lazy, Suspense, useState } from 'react'
import type { RefObject } from 'react'
import { BookOpen, Pause, Play, RotateCcw, Square } from 'lucide-react'
import { captionGroups } from '../speech/timing'
import type { MouthFrame, SpeechPhase } from '../speech/useSpeech'
import type { SpokenWord } from '../speech/timing'
import type { AvatarState } from '../scene/useAvatarState'
import { SceneBoundary } from './SceneBoundary'
import { portraitUrl } from '../scene/assets'

const LiveScene = lazy(() => import('../scene/CourtyardScene'))

const labels: Record<AvatarState, string> = {
  idle: 'At rest',
  listening: 'Listening',
  thinking: 'Reflecting',
  speaking: 'Speaking',
}


type SceneStatus = 'loading' | 'ready' | 'unsupported' | 'error'

export function CourtyardStage({ state, reducedMotion, mouth, phase, words, index, notice, hasResponse, showVerse, replay, pause, stop, onVerse }: {
  state: AvatarState
  reducedMotion: boolean
  mouth: RefObject<MouthFrame>
  phase: SpeechPhase
  words: readonly SpokenWord[]
  index: number
  notice: string
  hasResponse: boolean
  showVerse: boolean
  replay: () => void
  pause: () => void
  stop: () => void
  onVerse: () => void
}) {
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>('loading')
  const groups = captionGroups(words)
  const caption = groups.find((group) => index >= group.start && index < group.start + group.words.length)
  const speaking = phase === 'speaking' || phase === 'paused'
  const active = phase !== 'idle'
  const captionVisible = active && caption

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
        <div className="stage-shade" aria-hidden="true" />
        <div className="stage-top">
          <div className="stage-status" aria-live="polite">
            <span className="state-dot" data-state={state} />
            {phase === 'paused' ? 'Voice paused' : labels[state]}
          </div>
          {sceneStatus !== 'ready' && (
            <span className="scene-mode">{sceneStatus === 'loading' ? 'Preparing 3D scene' : 'Still image · 3D unavailable'}</span>
          )}
        </div>
        <div className="stage-bottom">
          {captionVisible && (
            <p className="caption" key={caption.start} aria-hidden="true">
              {caption.words.slice(0, index - caption.start + 1).map((word) => <span key={word.at}>{word.text} </span>)}
            </p>
          )}
          <div className="stage-meta">
            <span className="stage-title"><span aria-hidden="true" />The Olive Courtyard</span>
            <span className="stage-context">Dramatized character</span>
          </div>
        </div>
      </div>
      {hasResponse ? (
        <div className="stage-toolbar">
          <span className="voice-caption">{notice || 'Simulated voice · on-device playback'}</span>
          <div className="playback" aria-label="Voice playback">
            <button type="button" className="icon-button" title="Replay response" aria-label="Replay response" onClick={replay}>
              <RotateCcw size={17} />
            </button>
            <button type="button" className="icon-button" title={phase === 'paused' ? 'Resume speech' : 'Pause speech'}
              aria-label={phase === 'paused' ? 'Resume speech' : 'Pause speech'} disabled={!speaking} onClick={pause}>
              {phase === 'paused' ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button type="button" className="icon-button" title="Stop playback" aria-label="Stop playback" disabled={!active} onClick={stop}>
              <Square size={14} />
            </button>
          </div>
        </div>
      ) : showVerse ? (
        <button className="stage-verse" type="button" onClick={onVerse}>
          <BookOpen size={17} strokeWidth={1.55} aria-hidden="true" />
          <span className="verse-excerpt">“Be still, and know that I am God.”</span>
          <span className="verse-ref">Psalm 46:10</span>
        </button>
      ) : null}
    </section>
  )
}
