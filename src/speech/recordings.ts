import tracks from './recordings.json'

export type VoiceRecording = {
  clip: string
  text: string
  words: readonly (readonly [startMs: number, endMs: number])[]
}

const recordings = new Map<string, VoiceRecording>(
  tracks.map((track) => [track.text, {
    clip: track.clip,
    text: track.text,
    words: track.words.map(([start, end]) => [start, end] as const),
  }]),
)

export const recordingFor = (text: string, words: number) => {
  const track = recordings.get(text)
  return track?.words.length === words ? track : undefined
}

export function recordingWordAt(track: VoiceRecording, timeMs: number) {
  let left = 0
  let right = track.words.length
  while (left < right) {
    const middle = (left + right) >>> 1
    if (track.words[middle][0] <= timeMs) left = middle + 1
    else right = middle
  }
  return left - 1
}
