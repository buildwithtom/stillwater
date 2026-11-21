import { Canvas, useThree } from '@react-three/fiber'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ACESFilmicToneMapping, PCFShadowMap, Vector2 } from 'three'
import type { Texture } from 'three'
import { SceneBoundary } from '../components/SceneBoundary'
import { Stonework } from './Stonework'
import { Foliage, OliveTree } from './OliveTree'
import { mortarTexture } from './courtyardMaterials'
import { ProceduralAvatar } from './ProceduralAvatar'
import type { AvatarProps } from './avatarMotion'

const CustomAvatar = lazy(() => import('./ModelAvatar'))
const avatarPath = (import.meta.env.VITE_AVATAR_URL as string | undefined)?.trim()
const localAvatar = avatarPath && /^\/?(?:[\w.-]+\/)*[\w.-]+\.(?:glb|gltf)$/i.test(avatarPath)
  ? import.meta.env.BASE_URL + avatarPath.replace(/^\//, '')
  : undefined
const scale = Number(import.meta.env.VITE_AVATAR_SCALE) || 1
const offsetY = Number(import.meta.env.VITE_AVATAR_OFFSET_Y) || 0

const planterClusters: Parameters<typeof Foliage>[0]['clusters'] = [
  { at: [-2.11, .53, -2.09], spread: [.26, .31, .24], count: 115 },
  { at: [-2.27, .64, -2.18], spread: [.27, .29, .27], count: 112 },
  { at: [1.84, .3, -2.75], spread: [.33, .29, .23], count: 135 },
  { at: [2.28, .22, -1.78], spread: [.27, .21, .24], count: 95 },
]

function Pitcher({ clay, at, size, handled = false }: {
  clay: Texture; at: [number, number, number]; size: number; handled?: boolean
}) {
  const contour = useMemo(() => [
    [.01, 0], [.12, 0], [.157, .032], [.208, .12], [.257, .29], [.257, .43],
    [.224, .54], [.168, .62], [.104, .679], [.084, .73], [.09, .8], [.113, .817],
    [.115, .843], [.081, .856], [.065, .822], [.064, .763], [.071, .69], [.089, .65],
  ].map(([x, y]) => new Vector2(x, y)), [])
  return (
    <group position={at} scale={size}>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[contour, 30]} />
        <meshStandardMaterial color="#ac704d" map={clay} bumpMap={clay} bumpScale={.026} roughness={.9} />
      </mesh>
      {handled && (
        <mesh position={[.111, .636, 0]} scale={[.83, 1.36, .83]} rotation-z={-.27} castShadow>
          <torusGeometry args={[.109, .033, 9, 24]} />
          <meshStandardMaterial color="#a16c49" map={clay} roughness={.94} />
        </mesh>
      )}
      <mesh position-y={.047} rotation-x={Math.PI / 2}>
        <torusGeometry args={[.18, .009, 6, 28]} />
        <meshStandardMaterial color="#704b33" roughness={.94} />
      </mesh>
    </group>
  )
}

function Viewpoint() {
  const { camera, size } = useThree()
  useEffect(() => {
    const narrow = size.width / size.height < 1.04
    camera.position.set(.0, 1.66, narrow ? 3.62 : 3.33)
    camera.lookAt(0, 1.36, 0)
    camera.updateMatrixWorld()
  }, [camera, size])
  return null
}

type StatusHandler = (status: 'ready' | 'unsupported' | 'error') => void

function Ready({ onStatus }: { onStatus: StatusHandler }) {
  const gl = useThree((root) => root.gl)
  useEffect(() => {
    const handle = requestAnimationFrame(() => onStatus('ready'))
    const lost = (event: Event) => {
      event.preventDefault()
      onStatus('error')
    }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => {
      cancelAnimationFrame(handle)
      gl.domElement.removeEventListener('webglcontextlost', lost)
    }
  }, [gl, onStatus])
  return null
}

function World({ mobile, onStatus, ...avatar }: AvatarProps & { mobile: boolean; onStatus: StatusHandler }) {
  const { stone, bark, clay } = useMemo(() => ({
    stone: mortarTexture('stone'),
    bark: mortarTexture('bark'),
    clay: mortarTexture('clay'),
  }), [])
  useEffect(() => () => { stone.dispose(); bark.dispose(); clay.dispose() }, [stone, bark, clay])
  const standIn = <ProceduralAvatar {...avatar} />

  return (
    <>
      <color attach="background" args={['#564432']} />
      <fog attach="fog" args={['#7e654b', 6.4, 15]} />
      <hemisphereLight args={['#f7e8d3', '#776348', 1.38]} />
      <directionalLight color="#ffead0" intensity={2.68} position={[-3.8, 5.05, 2.6]} castShadow={!mobile}
        shadow-camera-left={-4.8} shadow-camera-right={4.8} shadow-camera-top={4.3} shadow-camera-bottom={-3.6}
        shadow-camera-near={.35} shadow-camera-far={17} shadow-mapSize={[1024, 1024]} shadow-bias={-.00035}
        shadow-normalBias={.024} />
      <directionalLight color="#e5c7a0" intensity={.26} position={[4, 3, -1]} />
      <Viewpoint />
      <Stonework texture={stone} />
      <OliveTree bark={bark} mobile={mobile} />
      <Foliage clusters={planterClusters} dense={!mobile} small seed={145} shadow={false} />
      <Pitcher clay={clay} at={[1.69, .11, -2.02]} size={1.08} handled />
      <Pitcher clay={clay} at={[2.15, .012, -1.97]} size={.62} />
      <Pitcher clay={clay} at={[-2.27, .005, -2.17]} size={.47} />
      {localAvatar ? (
        <SceneBoundary fallback={standIn}>
          <Suspense fallback={standIn}>
            <CustomAvatar url={localAvatar} scale={scale} offsetY={offsetY} {...avatar} />
          </Suspense>
        </SceneBoundary>
      ) : standIn}
      <Ready onStatus={onStatus} />
    </>
  )
}

function webGLAvailable() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false })
    context?.getExtension('WEBGL_lose_context')?.loseContext()
    return context !== null
  } catch {
    return false
  }
}

export default function CourtyardScene({ onStatus, ...avatar }: AvatarProps & { onStatus: StatusHandler }) {
  const [supportsWebGL] = useState(webGLAvailable)
  const [mobile] = useState(() => window.matchMedia('(max-width: 700px), (pointer: coarse)').matches)
  useEffect(() => {
    if (!supportsWebGL) onStatus('unsupported')
  }, [onStatus, supportsWebGL])
  if (!supportsWebGL) return null

  return (
    <Canvas dpr={[1, mobile ? 1.25 : 1.55]} shadows={mobile ? false : { type: PCFShadowMap, enabled: true }}
      camera={{ fov: 33, near: .1, far: 28, position: [0, 1.66, 3.33] }}
      gl={{ alpha: false, antialias: !mobile, powerPreference: 'low-power', toneMapping: ACESFilmicToneMapping }}>
      <Suspense fallback={null}>
        <World onStatus={onStatus} mobile={mobile} {...avatar} />
      </Suspense>
    </Canvas>
  )
}
