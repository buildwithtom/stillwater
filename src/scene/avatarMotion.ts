import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import { useRef } from 'react'
import type { RefObject } from 'react'
import { restingMouth } from '../speech/articulation'
import type { MouthFrame } from '../speech/timing'
import type { AvatarState } from './useAvatarState'

export type AvatarProps = {
  state: AvatarState
  mouth: RefObject<MouthFrame>
  reducedMotion: boolean
}

export type AvatarPose = {
  breath: number
  nod: number
  turn: number
  tilt: number
  eyeX: number
  eyeY: number
  brow: number
  blinkLeft: number
  blinkRight: number
  open: number
  wide: number
  round: number
  press: number
}

const still: AvatarPose = {
  breath: 0, nod: 0, turn: 0, tilt: 0, eyeX: 0, eyeY: 0, brow: 0,
  blinkLeft: 0, blinkRight: 0, open: 0, wide: 0, round: 0, press: 0,
}

function blink(seconds: number) {
  if (seconds <= 0 || seconds >= .185) return 0
  return seconds < .068
    ? MathUtils.smoothstep(seconds, 0, .068)
    : 1 - MathUtils.smoothstep(seconds, .08, .185)
}

export function useAvatarMotion({ state, mouth, reducedMotion }: AvatarProps, apply: (pose: AvatarPose, delta: number) => void) {
  const clock = useRef({
    elapsed: 0, stateAge: 0, nextBlink: 2.7, blinkAt: -1,
    glanceAt: 2.1, glanceUntil: 0, glanceX: 0, glanceY: 0,
    gestureAt: -10, state, pose: { ...still },
  })

  useFrame((_, frameDelta) => {
    const delta = Math.min(frameDelta, .05)
    const motion = clock.current
    const { pose } = motion
    motion.elapsed += delta
    motion.stateAge += delta
    if (motion.state !== state) {
      motion.state = state
      motion.stateAge = 0
    }
    const { elapsed: t, stateAge: age } = motion
    const speaking = state === 'speaking'
    const target = speaking ? mouth.current : restingMouth

    if (t >= motion.nextBlink) {
      motion.blinkAt = t
      motion.nextBlink = t + 2.6 + Math.random() * 3.8
    }

    if (t >= motion.glanceAt) {
      motion.glanceAt = t + 2.3 + Math.random() * 2.8
      motion.glanceUntil = t + .35 + Math.random() * .49
      motion.glanceX = (Math.random() - .5) * 3
      motion.glanceY = (Math.random() - .5) * 1.2
    }

    if (speaking && target.emphasis > .83 && t - motion.gestureAt > 2.5) motion.gestureAt = t
    const gesture = speaking ? Math.exp(-(((t - motion.gestureAt - .18) / .25) ** 2)) : 0
    const thinking = state === 'thinking' ? Math.exp(-(((age - .40) / .38) ** 2)) : 0
    const listening = state === 'listening' ? Math.exp(-(((age - .86) / .38) ** 2)) : 0
    const glance = t < motion.glanceUntil ? 1 : 0
    const motionAmount = reducedMotion ? 0 : 1
    const speechAmount = reducedMotion ? .5 : 1
    const damp = (current: number, next: number, speed = 5) => MathUtils.damp(current, next, speed, delta)

    pose.breath = Math.sin(t * 1.18) * motionAmount
    pose.nod = damp(pose.nod, (.004 * pose.breath + listening * .031 + thinking * .017 + gesture * .020) * motionAmount)
    pose.turn = damp(pose.turn, (-.016 * thinking + .004 * motion.glanceX * glance) * motionAmount)
    pose.tilt = damp(pose.tilt, (listening * .014 - thinking * .019) * motionAmount)
    pose.eyeX = damp(pose.eyeX, (motion.glanceX * glance + 1.3 * thinking) * motionAmount, 19)
    pose.eyeY = damp(pose.eyeY, (motion.glanceY * glance - 1.6 * thinking) * motionAmount, 19)
    pose.brow = damp(pose.brow, (listening * .6 + gesture * .32) * motionAmount, 7)
    pose.blinkLeft = blink(t - motion.blinkAt) * motionAmount
    pose.blinkRight = blink(t - motion.blinkAt - .009) * motionAmount
    pose.open = damp(pose.open, target.open * speechAmount, 29)
    pose.round = damp(pose.round, target.round * speechAmount, 24)
    pose.wide = damp(pose.wide, target.wide * speechAmount, 24)
    pose.press = damp(pose.press, target.press * speechAmount, 34)
    apply(pose, delta)
  })
}
