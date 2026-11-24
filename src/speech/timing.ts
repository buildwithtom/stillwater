import { buildArticulation, restingMouth, sampleMouth } from './articulation'
export type { MouthFrame } from './articulation'

export type SpokenWord = {
  text: string
  at: number
  endsAt: number
  startTime: number
  duration: number
  articulation: ReturnType<typeof buildArticulation>
  pause: number
}

export function tokenize(text: string): SpokenWord[] {
  let startTime = 0
  return Array.from(text.matchAll(/\S+/g), (match) => {
    const articulation = buildArticulation(match[0])
    const pause = /[.!?]$/.test(match[0]) ? 240 : /[,;:]$/.test(match[0]) ? 125 : 0
    const duration = articulation.duration + pause
    const word = {
      text: match[0],
      at: match.index,
      endsAt: match.index + match[0].length,
      startTime,
      duration,
      articulation,
      pause,
    }
    startTime += duration
    return word
  })
}

export function mouthAt(words: readonly SpokenWord[], index: number, elapsed: number, tempo: number) {
  const word = words[index]
  const progress = elapsed / (word.articulation.duration * tempo)
  const previous = words[index - 1]
  const next = words[index + 1]
  const before = previous && !previous.pause ? previous.articulation.frames.at(-1)?.pose : undefined
  const after = next && !word.pause ? next.articulation.frames[0]?.pose : undefined

  // Carry part of the adjacent shape across a word boundary. Punctuation closes the lips.
  const lean = (pose = restingMouth) => ({
    open: pose.open * .45, wide: pose.wide * .45, round: pose.round * .45,
    press: pose.press, emphasis: 0,
  })
  return sampleMouth(word.articulation.frames, progress, lean(before), lean(after))
}

export function captionGroups(words: readonly SpokenWord[]) {
  const groups: { start: number; words: SpokenWord[] }[] = []
  let group: SpokenWord[] = []
  words.forEach((word, index) => {
    group.push(word)
    if (group.length >= 10 || (group.length >= 5 && /[.!?,;:]$/.test(word.text)) || index === words.length - 1) {
      groups.push({ start: index - group.length + 1, words: group })
      group = []
    }
  })
  return groups
}
