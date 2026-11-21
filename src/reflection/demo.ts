import type { VerseId } from './scripture'

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
    reply: 'It hurts to feel forgotten by people you care about. Psalm 34 describes God as near to people whose hearts are broken, and John 13 calls us to care for one another. You could start by telling one person you trust how things have felt lately. Friendship makes room for care in both directions. Who might be safe to reach out to today?',
    followUp: 'Reaching out can feel vulnerable when you’ve been disappointed. Try a simple invitation, such as asking someone to take a walk or share a meal. Even if it takes time to reconnect, your need for companionship deserves care. Is there someone who has listened kindly before?',
    verses: ['brokenHeart', 'love'],
  },
  {
    id: 'anxiety',
    label: 'I’m worried about the future',
    prompt: 'I’m anxious and worried about the future.',
    match: [/\b(anxio\w*|anxiety|worr\w*|future|overwhelm\w*|uncertain\w*|scared|fear\w*|panic)\b/],
    reply: 'Uncertainty can make tomorrow feel heavy before it has even arrived. In Matthew 6, Jesus teaches his listeners to attend to the troubles of the day in front of them. You might write down one thing you can act on today, then share the rest with someone you trust. What’s one manageable thing you can do before the day ends?',
    followUp: 'If the list still feels too big, make the next step smaller. A glass of water, a short walk, or a conversation can give you a place to start. What would make today feel a little more manageable?',
    verses: ['tomorrow'],
  },
  {
    id: 'forgiveness',
    label: 'I’m struggling to forgive',
    prompt: 'I’m struggling to forgive someone who hurt me.',
    match: [/\b(forgiv\w*|grudge\w*|resent\w*|betray\w*|hold a grudge|hurt me)\b/],
    reply: 'When someone hurts you, forgiveness can take time. Ephesians encourages tenderness and forgiveness in light of the grace we’ve received. You can take that seriously and still name what happened, protect your boundaries, and ask someone wise to walk with you. What would give you the space you need to begin?',
    followUp: 'A first step might be telling the truth about what happened to someone who can listen without rushing you. You can hope for healing and keep boundaries that protect you. Which boundary would help you feel steadier right now?',
    verses: ['forgiving'],
  },
  {
    id: 'failure',
    label: 'I feel like I’ve failed',
    prompt: 'I feel like a failure.',
    match: [/\b(fail\w*|mistake\w*|disappoint\w*|not good enough|worthless|messed up|let (?:someone|them|everyone) down)\b/],
    reply: 'A setback can make it hard to see anything else about yourself. Psalm 145 describes God as lifting up people who fall. Consider what you can learn, and whether there’s a repair you can make. Then give yourself room to begin again. What’s one thing you’d say to a friend in the same situation?',
    followUp: 'If you can name something to repair, choose a small action you can carry out. If it will take time, a trusted person can help you face it with honesty and patience. What feels possible today?',
    verses: ['upheld'],
  },
  {
    id: 'gratitude',
    label: 'I want to practice gratitude',
    prompt: 'I want to pause and practice gratitude.',
    match: [/\b(gratitude|grateful|thank\w*|appreciat\w*|blessings?)\b/],
    reply: 'It’s worth pausing to notice something good while it’s still fresh. First Thessalonians makes room for gratitude in every circumstance. You can notice a kindness even on a difficult day. Think of one particular person, moment, or ordinary comfort you’re grateful for. Would you like to take a moment to name it or thank the person involved?',
    followUp: 'Try writing a sentence about that particular moment, or telling the person what their kindness meant to you. Gratitude often feels more concrete when we name the detail we almost missed.',
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
      text: 'This local prototype has a small set of written reflections. You can choose a starting point below or try asking about loneliness, worry, forgiveness, feeling like a failure, or gratitude.',
      verses: [],
    } satisfies Reflection,
  }
}
