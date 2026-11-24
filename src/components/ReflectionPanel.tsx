import type { FormEvent, KeyboardEvent } from 'react'
import { topics } from '../reflection/demo'
import type { Reflection } from '../reflection/demo'
import { scripture } from '../reflection/scripture'
import type { VerseId } from '../reflection/scripture'

export function ReflectionPanel({ draft, setDraft, setComposing, submit, exchange, onVerse }: {
  draft: string
  setDraft: (draft: string) => void
  setComposing: (composing: boolean) => void
  submit: (text: string) => void
  exchange: { id: number; prompt: string; response: Reflection } | null
  onVerse: (id: VerseId) => void
}) {
  function onSubmit(event: FormEvent) {
    event.preventDefault()
    submit(draft)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit(draft)
    }
  }

  return (
    <section className="reflection-panel" aria-labelledby="main-heading">
      <div className="reflection-intro">
        <h1 id="main-heading">What’s on your <span>heart today?</span></h1>
        {exchange === null && <p className="intro-copy">A quiet place for questions and biblical reflection.</p>}
      </div>
      <p className="sr-only" role="status">{exchange?.response.kind !== 'safety' ? exchange?.response.text : ''}</p>
      {exchange && (
        <article className={'answer answer--' + exchange.response.kind} key={exchange.id} aria-label="Latest reflection">
          {exchange.response.kind !== 'safety' && <p className="user-prompt"><span>You</span>{exchange.prompt}</p>}
          <p className="eyebrow">{exchange.response.kind === 'safety' ? 'Immediate support' : 'Stillwater reflection'}</p>
          <p className="answer-text" role={exchange.response.kind === 'safety' ? 'alert' : undefined}>{exchange.response.text}</p>
          {exchange.response.verses.length > 0 && (
            <div className="references" aria-label="Scripture references">
              {exchange.response.verses.map((id) => (
                <button key={id} className="reference" type="button" onClick={() => onVerse(id)}>
                  {scripture[id].reference}
                </button>
              ))}
            </div>
          )}
        </article>
      )}
      <form className="composer" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="reflection-input">Share what’s on your heart</label>
        <textarea id="reflection-input" name="reflection" rows={2} maxLength={1000} autoComplete="off" value={draft}
          placeholder={exchange ? 'Continue the reflection…' : 'Share what’s on your mind…'}
          onFocus={() => setComposing(true)} onBlur={() => setComposing(false)}
          onChange={(event) => {
            setDraft(event.target.value)
            setComposing(true)
          }} onKeyDown={onKeyDown} />
        <button type="submit" className="send-button" aria-label="Send reflection" disabled={!draft.trim()}>
          Send
        </button>
      </form>
      {exchange?.response.kind !== 'safety' && (
        <div className="suggestions">
          <p className="eyebrow" id="suggestion-heading">{exchange ? 'Another topic' : 'Try a prompt'}</p>
          <ul aria-labelledby="suggestion-heading">
            {topics.map((topic) => (
              <li key={topic.id}>
                <button className="topic" type="button" onClick={() => submit(topic.prompt)}>
                  {topic.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
