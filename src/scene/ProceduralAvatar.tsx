import { useTexture } from '@react-three/drei/core/Texture'
import { useEffect, useMemo, useRef } from 'react'
import { MeshStandardMaterial, SRGBColorSpace } from 'three'
import type { Group, Mesh } from 'three'
import { blendPortraitLighting, faceRig, eyeRig, portraitShell, skullPivot } from './portraitGeometry'
import { useAvatarMotion } from './avatarMotion'
import type { AvatarProps } from './avatarMotion'
import { portraitUrl } from './assets'

function makeRig() {
  const { top, bottom, interior } = faceRig()
  const hair = portraitShell(true, false)
  const robe = portraitShell(false, true)
  const back = portraitShell(false, false)
  const leftEye = eyeRig(0)
  const rightEye = eyeRig(1)
  for (const geometry of [top.geometry, bottom.geometry, leftEye.upper, leftEye.lower, rightEye.upper, rightEye.lower]) {
    blendPortraitLighting(geometry, false)
  }
  blendPortraitLighting(robe, true)

  const geometries = [
    top.geometry, bottom.geometry, interior.geometry, hair, robe, back,
    leftEye.upper, leftEye.lower, rightEye.upper, rightEye.lower,
  ]
  return { top, bottom, interior, hair, robe, back, leftEye, rightEye, geometries }
}

export function ProceduralAvatar(props: AvatarProps) {
  const texture = useTexture(portraitUrl)
  texture.colorSpace = SRGBColorSpace
  const rig = useMemo(makeRig, [])
  const body = useRef<Group>(null)
  const head = useRef<Group>(null)
  const blinkLeft = useRef<Group>(null)
  const blinkRight = useRef<Group>(null)
  const cavity = useRef<Mesh>(null)
  const portrait = useMemo(() => new MeshStandardMaterial({
    map: texture,
    color: '#54504b',
    emissiveMap: texture,
    emissive: '#faf8f3',
    emissiveIntensity: .91,
    roughness: .91,
    vertexColors: true,
    toneMapped: false,
  }), [texture])

  useEffect(() => () => portrait.dispose(), [portrait])
  useEffect(() => () => rig.geometries.forEach((geometry) => geometry.dispose()), [rig])

  useAvatarMotion(props, (pose) => {
    if (body.current) {
      body.current.position.y = skullPivot + pose.breath * .004
      body.current.scale.z = 1 + pose.breath * .012
    }
    if (head.current) head.current.rotation.set(pose.nod, pose.turn, pose.tilt)

    rig.top.move(pose)
    rig.bottom.move(pose)
    for (const [group, lid, weight] of [
      [blinkLeft, rig.leftEye, pose.blinkLeft], [blinkRight, rig.rightEye, pose.blinkRight],
    ] as const) {
      if (group.current) group.current.visible = weight > .015
      if (weight > .015) lid.close(weight)
    }
    const open = pose.open * (1 - pose.press * .88) > .022
    if (cavity.current) cavity.current.visible = open
    if (open) rig.interior.move(pose)
  })

  return (
    <group position-y={skullPivot} ref={body}>
      <mesh geometry={rig.robe} material={portrait} castShadow />
      <mesh geometry={rig.back} castShadow><meshStandardMaterial map={texture} color="#c4ad91" roughness={.96} /></mesh>
      <group ref={head}>
        {[rig.top.geometry, rig.bottom.geometry].map((geometry) => (
          <mesh key={geometry.id} geometry={geometry} material={portrait} castShadow />
        ))}
        <mesh geometry={rig.hair} castShadow><meshStandardMaterial map={texture} color="#776354" roughness={.97} /></mesh>
        {([[blinkLeft, rig.leftEye], [blinkRight, rig.rightEye]] as const).map(([ref, eye]) => (
          <group key={eye.upper.id} ref={ref} visible={false}>
            {[eye.upper, eye.lower].map((geometry) => (
              <mesh key={geometry.id} geometry={geometry} material={portrait} frustumCulled={false} />
            ))}
          </group>
        ))}
        <mesh ref={cavity} geometry={rig.interior.geometry} visible={false} frustumCulled={false}>
          <meshBasicMaterial vertexColors toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}
