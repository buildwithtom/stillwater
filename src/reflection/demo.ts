import type { VerseId } from './scripture'
import narration from './narration.json'

export type Reflection = {
  kind: 'reflection' | 'unmatched' | 'safety'
  text: string
  verses: readonly VerseId[]
}

type Topic = {
  id: string
  label: string
  prompt: string
  match: readonly RegExp[]
  reply: string
  followUp: string
  verses: readonly VerseId[]
}

export const topics = [
  {
    id: 'loneliness',
    label: 'I feel alone',
    prompt: 'I feel lonely and wonder if my friends still care about me.',
    match: [/\b(lone(?:ly|liness)|isolat\w*|alone|friend\w*|forgotten|left out|no one cares|nobody (?:cares|loves|likes)|don't love me|abandon\w*)\b/],
    reply: narration.loneliness.reply,
    followUp: narration.loneliness.followUp,
    verses: ['brokenHeart', 'love'],
  },
  {
    id: 'anxiety',
    label: 'I’m worried about the future',
    prompt: 'I’m anxious and worried about the future.',
    match: [/\b(anxio\w*|anxiety|worr\w*|future|overwhelm\w*|uncertain\w*|scared|fear\w*|panic)\b/],
    reply: narration.anxiety.reply,
    followUp: narration.anxiety.followUp,
    verses: ['tomorrow'],
  },
  {
    id: 'forgiveness',
    label: 'I’m struggling to forgive',
    prompt: 'I’m struggling to forgive someone who hurt me.',
    match: [/\b(forgiv\w*|grudge\w*|resent\w*|betray\w*|hold a grudge|hurt me)\b/],
    reply: narration.forgiveness.reply,
    followUp: narration.forgiveness.followUp,
    verses: ['forgiving'],
  },
  {
    id: 'failure',
    label: 'I feel like I’ve failed',
    prompt: 'I feel like a failure.',
    match: [/\b(fail\w*|mistake\w*|disappoint\w*|not good enough|worthless|messed up|let (?:someone|them|everyone) down)\b/],
    reply: narration.failure.reply,
    followUp: narration.failure.followUp,
    verses: ['upheld'],
  },
  {
    id: 'gratitude',
    label: 'I want to practice gratitude',
    prompt: 'I want to pause and practice gratitude.',
    match: [/\b(gratitude|grateful|thank\w*|appreciat\w*|blessings?)\b/],
    reply: narration.gratitude.reply,
    followUp: narration.gratitude.followUp,
    verses: ['thanks'],
  },
] as const satisfies readonly Topic[]

export type TopicId = (typeof topics)[number]['id']

const dangerPatterns = [
  /\b(suicid\w*|self[ -]?harm\w*|overdos\w*)\b/,
  /\b(?:kill|hurt|cut|harm|hang) (?:myself|yourself|themselves|himself|herself)\b/,
  /\b(?:end|take) (?:my|his|her|their|your|my own) life\b/,
  /\b(?:want|wish|plan|going|ready|better off) (?:to |if i (?:was|were) )?(?:die|be dead|dead)\b/,
  /\b(?:don't|do not|no longer) want to (?:live|be alive|wake up|be here)\b/,
  /\b(?:can't|cannot) (?:go on|keep (?:myself |them )?safe)\b/,
  /\b(?:end it all|(?:jump|step) (?:off|in front of)|(?:going to|want to) (?:hurt|kill) someone|(?:i'm|i am) being (?:hit|followed)|someone is (?:trying to hurt|trying to kill) me)\b/,
  /\b(?:in (?:immediate )?danger|not safe(?: at home| right now)?|being (?:attacked|threatened)|threatened to kill|want to (?:kill|hurt) (?:someone|people)|took (?:too many|all the) pills)\b/,
]

const cue = /^(?:(?:yes|maybe|i think so|i don't know|i'm not sure|no|that helps|what (?:should|can) i do|what next|how do i start)[.!? ]*)$/

export function getReflection(input: string, previousTopic: TopicId | null) {
  const message = input.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim()

  if (dangerPatterns.some((pattern) => pattern.test(message))) {
    return {
      topic: null,
      reflection: {
        kind: 'safety',
        text: 'You deserve immediate help and someone who can be with you. If you or someone else may be in danger right now, call your local emergency services or go to the nearest emergency department. Tell a trusted person what’s happening and ask them to stay with you or help you make the call. If you can do so safely, move away from anything that could cause harm.',
        verses: [],
      } satisfies Reflection,
    }
  }

  const matched = topics.find((topic) => topic.match.some((pattern) => pattern.test(message)))
  const followUp = cue.test(message) ? topics.find(({ id }) => id === previousTopic) : undefined
  const selected = matched ?? followUp

  if (selected) {
    return {
      topic: selected.id,
      reflection: {
        kind: 'reflection',
        text: matched ? selected.reply : selected.followUp,
        verses: selected.verses,
      } satisfies Reflection,
    }
  }

  return {
    topic: null,
    reflection: {
      kind: 'unmatched',
      text: narration.unmatched.reply,
      verses: [],
    } satisfies Reflection,
  }
}
