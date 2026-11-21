import { useAnimations } from '@react-three/drei/core/useAnimations'
import { useGLTF } from '@react-three/drei/core/Gltf'
import { useEffect, useMemo } from 'react'
import { Bone, LoopRepeat, MathUtils, Mesh, Quaternion, Euler, SkinnedMesh } from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { useAvatarMotion } from './avatarMotion'
import type { AvatarPose, AvatarProps } from './avatarMotion'

const aliases = {
  open: ['visemeaa', 'aa', 'jawopen', 'mouthopen'],
  wide: ['visemeee', 'visemeih', 'ee', 'mouthstretch'],
  round: ['visemeou', 'visemeoh', 'ou', 'mouthfunnel', 'mouthpucker'],
  press: ['visemepp', 'pp', 'mouthclose'],
  blinkLeft: ['eyeblinkleft', 'blinkleft', 'blinkl'],
  blinkRight: ['eyeblinkright', 'blinkright', 'blinkr'],
} satisfies Partial<Record<keyof AvatarPose, string[]>>

type DrivenShape = keyof typeof aliases
const drivenShapes = Object.keys(aliases) as DrivenShape[]
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
const motionRotation = new Euler()
const motionQuaternion = new Quaternion()

export default function ModelAvatar({ url, scale, offsetY, ...props }: AvatarProps & { url: string; scale: number; offsetY: number }) {
  // Assets are local and uncompressed to avoid decoder requests to third-party CDNs.
  const { scene, animations } = useGLTF(url, false, false)
  const rig = useMemo(() => {
    const model = clone(scene)
    let head: Bone | undefined
    let jaw: Bone | undefined
    const morphs: { weights: number[]; index: number; shape: DrivenShape; rest: number }[] = []
    model.traverse((object) => {
      const name = normalize(object.name)
      if (object instanceof Bone && /^(?:mixamorig)?head(?:bone)?$/.test(name)) head = object
      if (object instanceof Bone && /^(?:mixamorig)?jaw(?:bone)?$/.test(name)) jaw = object
      if (!(object instanceof Mesh)) return
      object.castShadow = true
      const { morphTargetDictionary: dictionary, morphTargetInfluences: weights } = object
      if (!dictionary || !weights) return
      const keys = Object.keys(dictionary)
      for (const shape of drivenShapes) {
        const key = aliases[shape].map((alias) => keys.find((candidate) => normalize(candidate.replace(/.*[.:]/, '')) === alias)).find(Boolean)
        if (key === undefined) continue
        const index = dictionary[key]
        morphs.push({ weights, index, shape, rest: weights[index] })
      }
    })
    const headBone = head as Bone | undefined
    const jawBone = jaw as Bone | undefined
    return {
      model, head: headBone, jaw: jawBone, morphs,
      headRest: headBone?.quaternion.clone(), jawRest: jawBone?.quaternion.clone(),
      hasMouth: morphs.some(({ shape }) => shape === 'open'),
    }
  }, [scene])

  const { actions, mixer } = useAnimations(animations, rig.model)
  const clip = (name: string) => animations.find((animation) => animation.name.toLowerCase() === name)?.name
  const desired = !props.reducedMotion ? clip(props.state) ?? clip('idle') : undefined

  useEffect(() => {
    if (!desired) {
      mixer.stopAllAction()
      rig.model.traverse((object) => { if (object instanceof SkinnedMesh) object.skeleton.pose() })
      if (rig.head && rig.headRest) rig.head.quaternion.copy(rig.headRest)
      if (rig.jaw && rig.jawRest) rig.jaw.quaternion.copy(rig.jawRest)
      return
    }
    const action = actions[desired]
    action?.reset().setEffectiveWeight(1).setLoop(LoopRepeat, Infinity).fadeIn(.32).play()
    return () => { action?.fadeOut(.32) }
  }, [actions, desired, mixer, rig])

  const activeTracks = animations.find((animation) => animation.name === desired)?.tracks ?? []
  const rotates = (bone?: Bone) => bone && activeTracks.some((track) => track.name.includes(bone.name + '.quaternion'))
  const animatedHead = rotates(rig.head)
  const animatedJaw = rotates(rig.jaw)

  useAvatarMotion(props, (pose, delta) => {
    for (const { weights, index, shape, rest } of rig.morphs) {
      const weight = shape === 'open' && (pose.round > .1 || pose.wide > .1) ? pose.open * .64 : pose[shape]
      weights[index] = MathUtils.damp(weights[index], Math.max(rest, weight), 20, delta)
    }
    if (rig.head && rig.headRest && (!desired || !animatedHead)) {
      motionRotation.set(pose.nod, pose.turn, pose.tilt)
      rig.head.quaternion.copy(rig.headRest).multiply(motionQuaternion.setFromEuler(motionRotation))
    }
    if (rig.jaw && rig.jawRest && !rig.hasMouth && (!desired || !animatedJaw)) {
      motionRotation.set(pose.open * .22, 0, 0)
      rig.jaw.quaternion.copy(rig.jawRest).multiply(motionQuaternion.setFromEuler(motionRotation))
    }
  })

  return <primitive object={rig.model} scale={scale} position-y={offsetY} />
}
