import { useLayoutEffect, useMemo, useRef } from 'react'
import { DoubleSide, BufferGeometry, CatmullRomCurve3, Color, Float32BufferAttribute, Object3D, TubeGeometry, Vector3 } from 'three'
import type { InstancedMesh, Texture } from 'three'
import { randomSource } from './courtyardMaterials'

type Point = [number, number, number]
type Limb = { points: Point[]; radius: number; tip: number }
type Cluster = { at: Point; spread: Point; count: number }

const arbor: Limb[] = [
  { points: [[-.34, -.12, 0], [-.2, .46, .01], [-.32, 1.13, .04], [-.14, 1.69, .01], [.03, 2.27, -.14], [.17, 2.87, -.32]], radius: .23, tip: .062 },
  { points: [[-.32, .82, .02], [-.12, 1.35, .06], [.12, 1.82, .12], [.52, 2.14, .04], [.89, 2.46, -.11], [1.26, 2.8, -.22]], radius: .114, tip: .015 },
  { points: [[-.24, 1.44, -.01], [-.47, 1.88, -.14], [-.76, 2.25, -.25], [-1.12, 2.56, -.48]], radius: .109, tip: .019 },
  { points: [[.08, 2.32, -.22], [.45, 2.65, -.62], [.83, 2.9, -.81]], radius: .09, tip: .016 },
  { points: [[.26, 1.87, .08], [.56, 2.16, .06], [.79, 2.25, .36], [1.12, 2.49, .42]], radius: .051, tip: .009 },
  { points: [[-.77, 2.26, -.23], [-.55, 2.72, -.28], [-.36, 2.97, -.5]], radius: .048, tip: .01 },
  { points: [[.79, 2.41, -.11], [1.18, 2.54, -.35], [1.51, 2.59, -.7]], radius: .039, tip: .008 },
  { points: [[-.3, .11, 0], [-.56, .01, .2], [-.81, -.025, .31]], radius: .12, tip: .018 },
  { points: [[-.28, .1, .02], [.11, -.015, -.15], [.34, -.04, -.34]], radius: .1, tip: .014 },
]

const treeClusters: Cluster[] = [
  { at: [-.95, 2.65, -.45], spread: [.66, .34, .42], count: 165 },
  { at: [-.46, 2.82, -.4], spread: [.62, .34, .45], count: 165 },
  { at: [.11, 2.96, -.44], spread: [.64, .44, .53], count: 180 },
  { at: [.74, 2.91, -.64], spread: [.57, .38, .51], count: 175 },
  { at: [1.13, 2.64, -.38], spread: [.66, .3, .35], count: 200 },
  { at: [1.21, 2.48, .26], spread: [.56, .25, .47], count: 165 },
  { at: [.52, 2.37, .1], spread: [.44, .30, .39], count: 150 },
  { at: [-.48, 2.37, -.28], spread: [.54, .34, .36], count: 160 },
]

function taper({ points, radius, tip }: Limb) {
  const path = new CatmullRomCurve3(points.map((point) => new Vector3(...point)))
  const geometry = new TubeGeometry(path, 24, 1, 15, false)
  const position = geometry.getAttribute('position')
  const center = new Vector3()
  const edge = new Vector3()
  for (let row = 0; row <= 24; row++) {
    const t = row / 24
    path.getPointAt(t, center)
    for (let side = 0; side <= 15; side++) {
      const i = row * 16 + side
      const ridge = 1 + .13 * Math.sin(side * Math.PI * 2 / 5 + t * 9) +
        .055 * Math.sin(side * Math.PI * 2 / 15 + t * 31)
      const width = (tip + (radius - tip) * (1 - t) ** .78) * ridge
      edge.fromBufferAttribute(position, i).sub(center).multiplyScalar(width).add(center)
      position.setXYZ(i, edge.x, edge.y, edge.z)
    }
  }
  geometry.computeVertexNormals()
  return geometry
}

const greens = ['#505636', '#676744', '#78764e', '#556039', '#78815b', '#91936f', '#4a5337', '#a19967']

function makeLeaf() {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute([
    0, -.53, 0, -.12, -.20, -.018, -.145, .10, -.04, 0, .52, -.08,
    .145, .10, -.04, .12, -.20, -.018, 0, .04, .04,
  ], 3))
  geometry.setIndex([0, 6, 1, 1, 6, 2, 2, 6, 3, 0, 5, 6, 5, 4, 6, 4, 3, 6])
  geometry.computeVertexNormals()
  return geometry
}

export function Foliage({ clusters, dense, seed, shadow, small = false }: {
  clusters: Cluster[]; dense: boolean; seed: number; shadow: boolean; small?: boolean
}) {
  const mesh = useRef<InstancedMesh>(null)
  const geometry = useMemo(makeLeaf, [])
  const amount = (cluster: Cluster) => Math.floor(cluster.count * (dense ? 1 : .55))
  const count = clusters.reduce((sum, cluster) => sum + amount(cluster), 0)

  useLayoutEffect(() => {
    if (!mesh.current) return
    const leaves = mesh.current
    const random = randomSource(seed)
    const transform = new Object3D()
    const color = new Color()
    let i = 0
    for (const cluster of clusters) {
      for (let sample = 0; sample < amount(cluster); sample++) {
        const z = random() * 2 - 1
        const azimuth = random() * Math.PI * 2
        const depth = Math.cbrt(random())
        const radius = Math.sqrt(1 - z * z) * depth
        transform.position.set(
          cluster.at[0] + Math.cos(azimuth) * radius * cluster.spread[0],
          cluster.at[1] + Math.sin(azimuth) * radius * cluster.spread[1],
          cluster.at[2] + z * depth * cluster.spread[2],
        )
        const size = (small ? .075 : .103) + random() * .067
        transform.rotation.set(random() * 4, random() * 6.28, random() * 6.28)
        transform.scale.set(size * (1 + random() * .4), size, size)
        transform.updateMatrix()
        leaves.setMatrixAt(i, transform.matrix)
        leaves.setColorAt(i, color.set(greens[Math.floor(random() * greens.length)]))
        i++
      }
    }
    leaves.instanceMatrix.needsUpdate = true
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true
    leaves.computeBoundingSphere()
  // The density determines both the instance allocation and how many leaves to populate.
  }, [clusters, count, dense, seed, small])

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} castShadow={shadow}>
      <meshStandardMaterial side={DoubleSide} roughness={.78} />
    </instancedMesh>
  )
}

export function OliveTree({ bark, mobile }: { bark: Texture; mobile: boolean }) {
  const limbs = useMemo(() => arbor.map(taper), [])
  return (
    <group position={[-1.82, 0, -1.25]} rotation={[0, -.2, -.095]}>
      {limbs.map((geometry, i) => (
        <mesh key={i} geometry={geometry} castShadow={!mobile} receiveShadow>
          <meshStandardMaterial color={i < 4 ? '#5c4834' : '#63503a'} map={bark} bumpMap={bark} bumpScale={.037} roughness={.99} />
        </mesh>
      ))}
      <Foliage clusters={treeClusters} dense={!mobile} shadow={!mobile} seed={419} />
    </group>
  )
}
