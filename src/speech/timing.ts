export type Viseme = 'closed' | 'open' | 'wide' | 'round' | 'press'

export type SpokenWord = {
  text: string
  at: number
  endsAt: number
  duration: number
}

export function tokenize(text: string): SpokenWord[] {
  return Array.from(text.matchAll(/\S+/g), (match) => ({
    text: match[0],
    at: match.index,
    endsAt: match.index + match[0].length,
    duration: 225 + Math.min(match[0].length, 14) * 28 + (/[.!?]$/.test(match[0]) ? 240 : /[,;:]$/.test(match[0]) ? 125 : 0),
  }))
}

export function estimateViseme(word: string, progress: number): Viseme {
  const letters = word.toLowerCase().replace(/[^a-z]/g, '')
  if (progress > 0.82 || !letters.length) return 'closed'
  const letter = letters[Math.min(letters.length - 1, Math.floor((progress / 0.82) * letters.length))]
  if ('mbpfv'.includes(letter)) return 'press'
  if ('ouqw'.includes(letter)) return 'round'
  if ('eiy'.includes(letter)) return 'wide'
  return 'open'
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
