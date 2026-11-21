import { useTexture } from '@react-three/drei/core/Texture'
import { useEffect, useMemo, useRef } from 'react'
import { SRGBColorSpace } from 'three'
import type { Group, Mesh } from 'three'
import { faceRig, eyeRig, mouthRig, portraitShell, skullPivot } from './portraitGeometry'
import { useAvatarMotion } from './avatarMotion'
import type { AvatarProps } from './avatarMotion'
import { portraitUrl } from './assets'

function makeRig() {
  const face = portraitShell(true, true)
  const hair = portraitShell(true, false)
  const robe = portraitShell(false, true)
  const back = portraitShell(false, false)
  const leftEye = eyeRig(0)
  const rightEye = eyeRig(1)
  const lips = mouthRig()
  return {
    face, hair, robe, back, leftEye, rightEye, lips,
    adjustFace: faceRig(face),
    geometries: [face, hair, robe, back, leftEye.geometry, rightEye.geometry, lips.inside, lips.lip, lips.teeth],
  }
}

export function ProceduralAvatar(props: AvatarProps) {
  const texture = useTexture(portraitUrl)
  texture.colorSpace = SRGBColorSpace
  const rig = useMemo(makeRig, [])
  const body = useRef<Group>(null)
  const head = useRef<Group>(null)
  const blinkLeft = useRef<Mesh>(null)
  const blinkRight = useRef<Mesh>(null)
  const cavity = useRef<Mesh>(null)
  const lowerLip = useRef<Mesh>(null)
  const teeth = useRef<Mesh>(null)

  useEffect(() => () => rig.geometries.forEach((geometry) => geometry.dispose()), [rig])

  useAvatarMotion(props, (pose) => {
    if (body.current) {
      body.current.position.y = skullPivot + pose.breath * .006
      body.current.scale.z = 1 + pose.breath * .015
    }
    if (head.current) {
      head.current.rotation.set(pose.nod, pose.turn, pose.tilt)
      head.current.position.y = pose.breath * .005
    }
    rig.adjustFace(pose.eyeX, pose.eyeY, pose.open)
    for (const [mesh, lid, weight] of [
      [blinkLeft, rig.leftEye, pose.blinkLeft], [blinkRight, rig.rightEye, pose.blinkRight],
    ] as const) {
      if (mesh.current) mesh.current.visible = weight > .04
      if (weight > .04) lid.close(weight)
    }
    if (cavity.current) cavity.current.visible = pose.open > .13
    if (lowerLip.current) lowerLip.current.visible = pose.open > .23
    if (teeth.current) teeth.current.visible = pose.open > .48
    if (pose.open > .13) rig.lips.setPose(pose.open, pose.wide, pose.round, pose.press)
  })

  return (
    <group position-y={skullPivot} ref={body}>
      <mesh geometry={rig.robe} castShadow>
        <meshBasicMaterial map={texture} color="#e9d9c8" toneMapped={false} />
      </mesh>
      <mesh geometry={rig.back} castShadow><meshStandardMaterial map={texture} color="#c4ad91" roughness={.96} /></mesh>
      <group ref={head}>
        <mesh geometry={rig.face} castShadow>
          <meshBasicMaterial map={texture} color="#f1e4d9" toneMapped={false} />
        </mesh>
        <mesh geometry={rig.hair} castShadow><meshStandardMaterial map={texture} color="#776354" roughness={.97} /></mesh>
        <mesh ref={blinkLeft} geometry={rig.leftEye.geometry} visible={false} frustumCulled={false}>
          <meshBasicMaterial map={texture} color="#f1e4d9" toneMapped={false} />
        </mesh>
        <mesh ref={blinkRight} geometry={rig.rightEye.geometry} visible={false} frustumCulled={false}>
          <meshBasicMaterial map={texture} color="#f1e4d9" toneMapped={false} />
        </mesh>
        <mesh ref={cavity} geometry={rig.lips.inside} visible={false} frustumCulled={false}>
          <meshBasicMaterial color="#321b18" toneMapped={false} />
        </mesh>
        <mesh ref={teeth} geometry={rig.lips.teeth} visible={false} frustumCulled={false}>
          <meshBasicMaterial color="#bb9b79" toneMapped={false} />
        </mesh>
        <mesh ref={lowerLip} geometry={rig.lips.lip} visible={false} frustumCulled={false}>
          <meshBasicMaterial map={texture} color="#f1e4d9" toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}
