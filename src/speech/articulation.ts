import data from './pronunciations.json'

export type MouthFrame = {
  open: number
  wide: number
  round: number
  press: number
  emphasis: number
}

type Articulation = { at: number; pose: MouthFrame }
type Shape = readonly [open: number, wide: number, round: number, press: number]

export const restingMouth: MouthFrame = { open: 0, wide: 0, round: 0, press: 0, emphasis: 0 }

const shapes: Record<string, Shape> = {
  AA: [.95, .04, .02, 0], AE: [.85, .37, 0, 0], AH: [.53, .04, 0, 0], AO: [.67, 0, .64, 0],
  AW: [.78, 0, .46, 0], AY: [.74, .31, 0, 0], EH: [.58, .41, 0, 0], ER: [.32, 0, .20, 0],
  EY: [.47, .52, 0, 0], IH: [.28, .47, 0, 0], IY: [.23, .60, 0, 0], OW: [.47, 0, .83, 0],
  OY: [.49, .08, .59, 0], UH: [.33, 0, .48, 0], UW: [.25, 0, .87, 0],
  B: [0, 0, 0, 1], M: [0, 0, 0, 1], P: [0, 0, 0, 1],
  F: [.14, .10, 0, .42], V: [.14, .10, 0, .42],
  W: [.20, 0, .70, 0], Y: [.20, .49, 0, 0], R: [.26, 0, .29, 0],
  CH: [.26, 0, .38, 0], JH: [.26, 0, .33, 0], SH: [.26, 0, .37, 0], ZH: [.26, 0, .35, 0],
  S: [.17, .27, 0, 0], Z: [.17, .27, 0, 0], TH: [.22, .12, 0, 0], DH: [.20, .12, 0, 0],
}
const lightConsonant: Shape = [.24, .06, 0, 0]
const guessedVowels: Record<string, string> = { a: 'AE0', e: 'EH0', i: 'IH0', o: 'OW0', u: 'UH0' }
const guessedConsonants: Record<string, string> = { c: 'K', j: 'JH', q: 'K', x: 'K' }
const lexicon: Record<string, string> = data

function phonemesFor(word: string) {
  const clean = word.toLowerCase().replace(/[’‘]/g, "'").replace(/^'|'$|[^a-z0-9']/g, '')
  if (Object.hasOwn(lexicon, clean)) return lexicon[clean].split(' ')

  const unaccented = clean.replace(/'|\d/g, '').replace(/([a-z])\1+/g, '$1')
  return (unaccented.match(/ch|sh|th|[a-z]/g) ?? []).map((sound) =>
    guessedVowels[sound] ?? guessedConsonants[sound] ?? sound.toUpperCase())
}

export function buildArticulation(word: string) {
  const phonemes = phonemesFor(word)
  const frames: Articulation[] = []
  let time = 0

  for (const phoneme of phonemes) {
    const stress = phoneme.match(/\d$/)?.[0]
    const [open, wide, round, press] = shapes[phoneme.replace(/\d$/, '')] ?? lightConsonant
    const weight = stress === '1' ? 2 : stress === '2' ? 1.65 : stress ? 1.35 : press === 1 ? .85 : 1
    frames.push({
      at: time + weight * .5,
      pose: { open: open * (stress === '0' ? .77 : 1), wide, round, press, emphasis: stress === '1' ? 1 : 0 },
    })
    time += weight
  }

  for (const frame of frames) frame.at /= time
  return { frames, duration: Math.max(92, 46 + time * 60) }
}

function mix(from: MouthFrame, to: MouthFrame, weight: number): MouthFrame {
  return {
    open: from.open + (to.open - from.open) * weight,
    wide: from.wide + (to.wide - from.wide) * weight,
    round: from.round + (to.round - from.round) * weight,
    press: from.press + (to.press - from.press) * weight,
    emphasis: from.emphasis + (to.emphasis - from.emphasis) * weight,
  }
}

export function sampleMouth(
  frames: readonly Articulation[],
  progress: number,
  before: MouthFrame = restingMouth,
  after: MouthFrame = restingMouth,
): MouthFrame {
  if (!frames.length || progress > 1.18) return restingMouth
  const next = frames.findIndex((frame) => frame.at >= progress)
  const left = next === 0 ? { at: 0, pose: before } : frames[next < 0 ? frames.length - 1 : next - 1]
  const right = next < 0 ? { at: 1, pose: after } : frames[next]
  const t = Math.min(1, Math.max(0, (progress - left.at) / (right.at - left.at)))
  return mix(left.pose, right.pose, t * t * (3 - 2 * t))
}
