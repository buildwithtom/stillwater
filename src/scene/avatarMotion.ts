import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import { useRef } from 'react'
import type { RefObject } from 'react'
import type { MouthFrame } from '../speech/useSpeech'
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
  blinkLeft: number
  blinkRight: number
  open: number
  wide: number
  round: number
  press: number
}

const still: AvatarPose = {
  breath: 0, nod: 0, turn: 0, tilt: 0, eyeX: 0, eyeY: 0,
  blinkLeft: 0, blinkRight: 0, open: 0, wide: 0, round: 0, press: 0,
}

const blink = (seconds: number) => seconds < 0 || seconds >= .21 ? 0 :
  Math.sin(Math.PI * (seconds / .21) ** .73) ** 1.65

export function useAvatarMotion({ state, mouth, reducedMotion }: AvatarProps, apply: (pose: AvatarPose, delta: number) => void) {
  const clock = useRef({ elapsed: 0, stateAge: 0, nextBlink: 2.7, blinkAt: -1, state, pose: { ...still } })

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
    if (t >= motion.nextBlink) {
      motion.blinkAt = t
      motion.nextBlink = t + 3.1 + Math.random() * 4.3
    }
    const thinking = state === 'thinking' ? Math.exp(-age * .15) : 0
    const listening = state === 'listening' ? Math.exp(-((age % 8 - 1.35) ** 2) * 8) : 0
    const speaking = state === 'speaking' ? 1 : 0
    const amount = reducedMotion ? 0 : 1
    const damp = (current: number, target: number, speed = 4) => MathUtils.damp(current, target, speed, delta)

    pose.breath = Math.sin(t * 1.36) * amount
    pose.nod = damp(pose.nod, (.014 * Math.sin(t * .82) + listening * .055 - thinking * .035 + speaking * .017 * Math.sin(t * 2.4)) * amount)
    pose.turn = damp(pose.turn, (.028 * Math.sin(t * .36) + thinking * -.07 + speaking * .019 * Math.sin(t * 1.55)) * amount)
    pose.tilt = damp(pose.tilt, (.012 * Math.sin(t * .53) + listening * .032 + thinking * .025) * amount)
    pose.eyeX = damp(pose.eyeX, (.7 * Math.sin(t * .61) + 2.1 * thinking) * amount, 6)
    pose.eyeY = damp(pose.eyeY, (.55 * Math.sin(t * .49) + 1.2 * thinking) * amount, 6)
    pose.blinkLeft = blink(t - motion.blinkAt) * amount
    pose.blinkRight = blink(t - motion.blinkAt - .017) * amount

    const target = speaking ? mouth.current.amount * (reducedMotion ? .48 : 1) : 0
    const shape = mouth.current.shape
    pose.open = damp(pose.open, target * (shape === 'open' ? 1 : shape === 'round' ? .72 : shape === 'wide' ? .51 : .08), 19)
    pose.round = damp(pose.round, shape === 'round' ? target : 0, 16)
    pose.wide = damp(pose.wide, shape === 'wide' ? target : 0, 16)
    pose.press = damp(pose.press, shape === 'press' ? target : 0, 19)
    apply(pose, delta)
  })
}
