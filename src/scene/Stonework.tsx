import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, ExtrudeGeometry, Object3D, Shape } from 'three'
import type { InstancedMesh, Texture } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { randomSource } from './courtyardMaterials'

type Block = { x: number; y: number; z: number; w: number; h: number; d: number; shade: number; roll?: number }
const stoneColors = ['#b39a79', '#b49b77', '#bc9f7c', '#bba181', '#b39c7b', '#aa9073', '#c1a786']
const arch = { x: .35, spring: 1.55, radius: 1.19, rim: 1.49, z: -2.72 }

function makeWall() {
  const blocks: Block[] = []
  const random = randomSource(302)
  const span = (left: number, right: number, y: number, height: number) => {
    for (let x = left; x < right - .012;) {
      const width = Math.min(right - x, .45 + random() * .71)
      blocks.push({
        x: x + width / 2, y: y + height / 2, z: -2.87 + random() * .035,
        w: width - .009, h: height - .012, d: .27 + random() * .03,
        shade: Math.floor(random() * stoneColors.length), roll: (random() - .5) * .007,
      })
      x += width
    }
  }
  for (let row = 0; row < 15; row++) {
    const h = .27 + random() * .055
    const y = row * .3
    const tolerance = arch.radius + .13
    const delta = Math.max(0, y - arch.spring)
    const cutout = Math.sqrt(Math.max(0, tolerance ** 2 - delta ** 2))
    if (cutout > 0) {
      span(-6.7, arch.x - cutout, y, h)
      span(arch.x + cutout, 6.8, y, h)
    } else {
      span(-6.7, 6.8, y, h)
    }
  }
  return blocks
}

function makePavers() {
  const pavers: Block[] = []
  const random = randomSource(81)
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 11; col++) {
      pavers.push({
        x: (col - 5) * .83 + (row % 2 ? .37 : 0), y: -.045 + random() * .018, z: 2.1 - row * .66,
        w: .82, h: .10, d: .647, shade: Math.floor(random() * stoneColors.length), roll: 0,
      })
    }
  }
  return pavers
}

function Blocks({ blocks, texture, floor = false }: { blocks: Block[]; texture: Texture; floor?: boolean }) {
  const instances = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 2, floor ? .035 : .045), [floor])
  useLayoutEffect(() => {
    const mesh = instances.current
    if (!mesh) return
    const transform = new Object3D()
    const color = new Color()
    blocks.forEach((block, i) => {
      transform.position.set(block.x, block.y, block.z)
      transform.rotation.z = block.roll ?? 0
      transform.scale.set(block.w, block.h, block.d)
      transform.updateMatrix()
      mesh.setMatrixAt(i, transform.matrix)
      mesh.setColorAt(i, color.set(stoneColors[block.shade]))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [blocks])

  return (
    <instancedMesh ref={instances} args={[geometry, undefined, blocks.length]} receiveShadow>
      <meshStandardMaterial map={texture} bumpMap={texture} bumpScale={floor ? .008 : .012} roughness={.98} />
    </instancedMesh>
  )
}

function archStone(inner: number, outer: number, start: number, end: number) {
  const outline = new Shape()
  outline.moveTo(inner * Math.cos(start), inner * Math.sin(start))
  outline.absarc(0, 0, inner, start, end, false)
  outline.lineTo(outer * Math.cos(end), outer * Math.sin(end))
  outline.absarc(0, 0, outer, end, start, true)
  outline.closePath()
  return new ExtrudeGeometry(outline, {
    depth: .33, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 2, steps: 1, curveSegments: 6,
  })
}

function masonryBacking() {
  const boundary = new Shape()
  const radius = arch.radius + .035
  boundary.moveTo(-6.8, -.08)
  boundary.lineTo(arch.x - radius, -.08)
  boundary.lineTo(arch.x - radius, arch.spring)
  boundary.absarc(arch.x, arch.spring, radius, Math.PI, 0, true)
  boundary.lineTo(arch.x + radius, -.08)
  boundary.lineTo(6.8, -.08)
  boundary.lineTo(6.8, 4.8)
  boundary.lineTo(-6.8, 4.8)
  boundary.closePath()
  return new ExtrudeGeometry(boundary, { depth: .085, bevelEnabled: false, curveSegments: 24 })
}

function Arch({ texture }: { texture: Texture }) {
  const pieces = useMemo(() => Array.from({ length: 15 }, (_, index) => {
    const start = Math.PI * index / 15 + .013
    const end = Math.PI * (index + 1) / 15 - .013
    return archStone(arch.radius - (index === 7 ? .035 : 0), arch.rim + (index === 7 ? .065 : 0), start, end)
  }), [])

  return (
    <>
      <group position={[arch.x, arch.spring, arch.z - .15]}>
        {pieces.map((geometry, i) => (
          <mesh key={i} geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial color={stoneColors[(i + 3) % stoneColors.length]} map={texture} bumpMap={texture} bumpScale={.009} roughness={.92} />
          </mesh>
        ))}
      </group>
      {[arch.x - 1.34, arch.x + 1.34].map((x) => (
        <group key={x} position={[x, 0, arch.z]}>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position-y={.13 + i * .256} castShadow receiveShadow>
              <boxGeometry args={[i === 5 ? .39 : .3, .244, i === 5 ? .51 : .41]} />
              <meshStandardMaterial color={stoneColors[(i + 1) % stoneColors.length]} map={texture} bumpMap={texture} bumpScale={.011} roughness={.95} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

export function Stonework({ texture }: { texture: Texture }) {
  const wall = useMemo(makeWall, [])
  const pavers = useMemo(makePavers, [])
  const backing = useMemo(masonryBacking, [])
  return (
    <>
      <mesh geometry={backing} position-z={-3.06} receiveShadow>
        <meshStandardMaterial color="#8e7960" map={texture} roughness={1} />
      </mesh>
      <Blocks blocks={wall} texture={texture} />
      <Blocks blocks={pavers} texture={texture} floor />
      <Arch texture={texture} />
      <mesh position={[0, -.14, -2.3]} receiveShadow>
        <boxGeometry args={[14, .19, 12]} />
        <meshStandardMaterial color="#776047" map={texture} roughness={1} />
      </mesh>
      <mesh position={[arch.x, 1.9, -5.45]} receiveShadow>
        <boxGeometry args={[5, 4.1, .4]} />
        <meshStandardMaterial color="#4c3b29" map={texture} roughness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[arch.x + side * 1.43, 1.55, -4.2]} receiveShadow>
          <boxGeometry args={[.48, 3.9, 2.56]} />
          <meshStandardMaterial color="#66503a" map={texture} roughness={1} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[arch.x, .013 + i * .105, -3.05 - i * .42]} receiveShadow>
          <boxGeometry args={[2.4, .18, .48]} />
          <meshStandardMaterial color={stoneColors[3]} map={texture} roughness={.95} />
        </mesh>
      ))}
      <group position={[-1.23, .15, -2.45]}>
        {[-.49, .49].map((x) => (
          <mesh key={x} position={[x, .14, 0]} receiveShadow>
            <boxGeometry args={[.24, .42, .42]} />
            <meshStandardMaterial color="#9d805c" map={texture} roughness={.95} />
          </mesh>
        ))}
        <mesh position-y={.36} castShadow receiveShadow>
          <boxGeometry args={[1.32, .128, .53]} />
          <meshStandardMaterial color="#bf9b71" map={texture} roughness={.92} />
        </mesh>
      </group>
    </>
  )
}
