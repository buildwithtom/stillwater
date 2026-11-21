import { useRef, useState } from 'react'
import { getReflection } from './demo'
import type { Reflection, TopicId } from './demo'

type Exchange = { id: number; prompt: string; response: Reflection }

export function useReflection() {
  const previousTopic = useRef<TopicId | null>(null)
  const nextId = useRef(0)
  const [exchange, setExchange] = useState<Exchange | null>(null)

  function send(message: string) {
    const prompt = message.trim()
    if (!prompt) return null

    const { topic, reflection } = getReflection(prompt, previousTopic.current)
    previousTopic.current = topic
    const entry = { id: ++nextId.current, prompt, response: reflection }
    setExchange(entry)
    return entry
  }

  return { exchange, send }
}
