import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, MathUtils } from 'three'
import type { AvatarPose } from './avatarMotion'

const scale = 430
const originX = 785
const originY = 465
const imageWidth = 1536
const imageHeight = 1024

type Section = readonly [row: number, left: number, right: number]
const hairline: readonly Section[] = [
  [226, 746, 816], [234, 712, 850], [248, 683, 875], [271, 653, 890],
  [298, 630, 925], [322, 620, 939], [349, 608, 956], [369, 599, 969],
  [397, 592, 964], [424, 586, 975], [451, 590, 973], [476, 595, 974],
  [504, 593, 965], [531, 597, 966], [562, 596, 973], [590, 603, 979],
  [613, 605, 965], [634, 623, 951], [647, 648, 928], [659, 671, 902],
]
const shoulders: readonly Section[] = [
  [555, 708, 894], [618, 702, 894], [633, 692, 920], [654, 644, 991],
  [674, 584, 1060], [695, 549, 1115], [720, 504, 1152], [755, 471, 1191],
  [807, 436, 1219], [873, 400, 1248], [941, 372, 1272], [1024, 335, 1296],
]

export const skullPivot = 1.58
const eyes = [
  { x: 737, y: 418, left: 708, right: 767, leftY: 425, rightY: 420, upper: 13, lower: 5.6 },
  { x: 842, y: 407, left: 812, right: 874, leftY: 414, rightY: 407, upper: 12, lower: 5.3 },
] as const

function coords(x: number, y: number, depth: number) {
  return [(x - originX) / scale, (originY - y) / scale, depth] as const
}

function uv(x: number, y: number) {
  return [x / imageWidth, 1 - y / imageHeight] as const
}

function range(sections: readonly Section[], y: number) {
  const next = sections.findIndex(([row]) => y < row)
  const i = next < 1 ? (y <= sections[0][0] ? 0 : sections.length - 2) : next - 1
  const [y0, left, right] = sections[i]
  const [y1, nextLeft, nextRight] = sections[i + 1]
  const t = MathUtils.clamp((y - y0) / (y1 - y0), 0, 1)
  return [MathUtils.lerp(left, nextLeft, t), MathUtils.lerp(right, nextRight, t)]
}

function bump(x: number, y: number, centerX: number, centerY: number, width: number, height: number) {
  return Math.exp(-(((x - centerX) / width) ** 2 + ((y - centerY) / height) ** 2))
}

function surface(x: number, y: number, head: boolean, front = true) {
  const [left, right] = range(head ? hairline : shoulders, y)
  const cross = MathUtils.clamp(2 * (x - left) / (right - left) - 1, -1, 1)
  const curvature = Math.sqrt(1 - cross ** 2)
  if (!front) return -.055 - (head ? .29 : .25) * curvature
  if (!head) return -.055 + (.165 + .083 * MathUtils.smoothstep(y, 620, 900)) * curvature

  return -.055 + .256 * Math.pow(curvature, .87) +
    .047 * bump(x, y, 790, 449, 29, 58) +
    .079 * bump(x, y, 787, 480, 22, 19) +
    .022 * bump(x, y, 767, 484, 12, 12) +
    .018 * bump(x, y, 806, 478, 12, 12) +
    .016 * bump(x, y, 798, 522, 44, 21) +
    .027 * bump(x, y, 794, 571, 53, 31) -
    .036 * bump(x, y, eyes[0].x, eyes[0].y, 32, 19) -
    .034 * bump(x, y, eyes[1].x, eyes[1].y, 31, 17) +
    .027 * bump(x, y, 710, 461, 45, 28) +
    .026 * bump(x, y, 864, 450, 45, 29)
}

function meshData(positions: number[], uvs: number[], indices: number[]) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function grid(columns: number, rows: number, sample: (s: number, t: number) => {
  point: readonly [number, number, number]; texel: readonly [number, number]
}, reverse = false) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const { point, texel } = sample(column / columns, row / rows)
      positions.push(...point)
      uvs.push(...texel)
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column
        const b = a + 1
        const c = a + columns + 1
        const d = c + 1
        indices.push(...(reverse ? [a, b, c, b, d, c] : [a, c, b, b, c, d]))
      }
    }
  }
  return meshData(positions, uvs, indices)
}

export function blendPortraitLighting(geometry: BufferGeometry, robe: boolean) {
  const texels = geometry.getAttribute('uv')
  const colors = new BufferAttribute(new Float32Array(texels.count * 3), 3)
  for (let i = 0; i < texels.count; i++) {
    const y = (1 - texels.getY(i)) * imageHeight
    // Both surfaces retain the same baked light where the neck and robe overlap.
    const diffuse = robe ? MathUtils.smoothstep(y, 668, 735) : 1 - MathUtils.smoothstep(y, 540, 570)
    colors.setXYZ(i, diffuse, diffuse, diffuse)
  }
  geometry.setAttribute('color', colors)
}

export function portraitShell(head: boolean, front: boolean) {
  const sections = head ? hairline : shoulders
  return grid(52, 58, (s, t) => {
    const y = MathUtils.lerp(sections[0][0], sections[sections.length - 1][0], t)
    const [left, right] = range(sections, y)
    const shoulderEdge = head ? 0 : 2.6 * Math.sin(y * .081)
    const x = MathUtils.lerp(left + shoulderEdge, right - shoulderEdge, s)
    return {
      point: coords(x, y, surface(x, y, head, front)),
      texel: front ? uv(x, y) : head ? uv(622 + 38 * s, 406 + 182 * t) : uv(514 + 78 * s, 802 + 170 * t),
    }
  }, !front)
}


export function eyeRig(index: 0 | 1) {
  const eye = eyes[index]
  const outline = (s: number) => {
    const height = Math.sin(Math.PI * s) ** .85
    const baseline = MathUtils.lerp(eye.leftY, eye.rightY, s)
    return {
      x: MathUtils.lerp(eye.left, eye.right, s),
      top: baseline - eye.upper * height,
      bottom: baseline + eye.lower * height,
      height,
    }
  }
  const columns = 25
  const rows = 5
  const makeLid = (upper: boolean) => grid(columns, rows, (s, t) => {
    const { x, top, bottom, height } = outline(s)
    const edge = upper ? top : bottom
    const sampleY = upper ? top - (7.5 * (1 - t) + .4) * height : bottom + (3.5 * t + .2) * height
    return { point: coords(x, edge, surface(x, edge, true)), texel: uv(x, sampleY) }
  })
  const upper = makeLid(true)
  const lower = makeLid(false)

  function close(amount: number) {
    for (const geometry of [upper, lower]) {
      const attribute = geometry.getAttribute('position')
      for (let i = 0; i < attribute.count; i++) {
        const s = (i % (columns + 1)) / columns
        const t = Math.floor(i / (columns + 1)) / rows
        const { x, top, bottom, height } = outline(s)
        const meet = MathUtils.lerp(top, bottom, .83)
        const y = geometry === upper
          ? MathUtils.lerp(top, meet, amount * t)
          : MathUtils.lerp(bottom, meet, amount * (1 - t))
        attribute.setXYZ(i, ...coords(x, y, surface(x, y, true) + .0045 + height * .0015 * amount))
      }
      attribute.needsUpdate = true
      geometry.computeVertexNormals()
    }
  }

  return { upper, lower, close }
}

const mouthLeft = 753
const mouthRight = 845
const mouthCenter = (mouthLeft + mouthRight) / 2
const lipLevel = 526
const lipLine: readonly (readonly [x: number, y: number])[] = [
  [730, lipLevel], [mouthLeft, 528.7], [766, 529], [781, 526.8], [795, 526.4],
  [810, 524.3], [827, 522.4], [mouthRight, 518.6], [870, lipLevel],
]

function lipY(x: number) {
  for (let i = 1; i < lipLine.length; i++) {
    const [end, y] = lipLine[i]
    const [start, previousY] = lipLine[i - 1]
    if (x >= start && x <= end) return MathUtils.lerp(previousY, y, (x - start) / (end - start))
  }
  return lipLevel
}

function mouthEnvelope(x: number) {
  const distance = MathUtils.clamp((x - mouthLeft) / (mouthRight - mouthLeft), 0, 1)
  return Math.sin(distance * Math.PI) ** 1.14
}

type MouthPose = Pick<AvatarPose, 'open' | 'wide' | 'round' | 'press'>

function lipWeights(x: number, y: number, lower: boolean) {
  const distance = y - lipY(x)
  const lip = mouthEnvelope(x)
  const jaw = MathUtils.lerp(lip, .68 * bump(x, y, 796, 558, 72, 42), MathUtils.smoothstep(distance, 0, 24))
  return {
    lift: lower ? -14.8 * jaw : 4.2 * lip * Math.exp(-((distance / 16) ** 2)),
    width: (x - mouthCenter) * bump(x, y, mouthCenter, lipLevel, 65, 33),
    forward: bump(x, y, mouthCenter, lipLevel, 49, 20),
  }
}

function poseVertex(
  attribute: ReturnType<BufferGeometry['getAttribute']>, index: number,
  x: number, y: number, z: number, weights: ReturnType<typeof lipWeights>, pose: MouthPose,
  lift = weights.lift,
) {
  const width = pose.wide * .10 - pose.round * .21
  const opening = pose.open * (1 - pose.press * .88)
  attribute.setXYZ(index,
    (x - originX + width * weights.width) / scale,
    (originY - y + opening * lift) / scale,
    z + weights.forward * (pose.round * .018 + pose.press * .003 - opening * .004),
  )
}

function halfFace(lower: boolean) {
  const geometry = grid(136, lower ? 56 : 111, (s, t) => {
    const row = lower ? MathUtils.lerp(lipLevel, 659, t) : MathUtils.lerp(226, lipLevel, t)
    const [left, right] = range(hairline, row)
    const x = MathUtils.lerp(left, right, s)
    const y = row + (lipY(x) - lipLevel) * Math.exp(-(((row - lipLevel) / 31) ** 2))
    return { point: coords(x, y, surface(x, y, true)), texel: uv(x, y) }
  })
  const position = geometry.getAttribute('position') as BufferAttribute
  const texels = geometry.getAttribute('uv') as BufferAttribute

  position.setUsage(DynamicDrawUsage)
  if (!lower) texels.setUsage(DynamicDrawUsage)
  const mouth: { i: number; x: number; y: number; z: number; weights: ReturnType<typeof lipWeights> }[] = []
  const expression: { i: number; u: number; v: number; gaze: number; brow: number }[] = []
  for (let i = 0; i < position.count; i++) {
    const u = texels.getX(i)
    const v = texels.getY(i)
    const x = u * imageWidth
    const y = (1 - v) * imageHeight
    if (x > 688 && x < 910 && y > 482 && y < 638) {
      mouth.push({ i, x, y, z: position.getZ(i), weights: lipWeights(x, y, lower) })
    }

    if (!lower && y > 358 && y < 438 && x > 685 && x < 899) {
      const gaze = Math.max(...eyes.map((eye) => bump(x, y, eye.x, eye.y, 15, 7)))
      const brow = Math.max(...eyes.map((eye) => bump(x, y, eye.x + 1, eye.y - 29, 24, 9)))
      if (gaze > .014 || brow > .014) expression.push({ i, u, v, gaze, brow })
    }
  }

  const applied = { open: 0, wide: 0, round: 0, press: 0, eyeX: 0, eyeY: 0, brow: 0 }
  const mouthChannels = ['open', 'wide', 'round', 'press'] as const
  const eyeChannels = ['eyeX', 'eyeY', 'brow'] as const

  return {
    geometry,
    move(pose: AvatarPose) {
      if (mouthChannels.some((channel) => Math.abs(pose[channel] - applied[channel]) > .001)) {
        for (const vertex of mouth) {
          poseVertex(position, vertex.i, vertex.x, vertex.y, vertex.z, vertex.weights, pose)
        }
        for (const channel of mouthChannels) applied[channel] = pose[channel]
        position.needsUpdate = true
      }
      if (expression.length && eyeChannels.some((channel) => Math.abs(pose[channel] - applied[channel]) > .005)) {
        for (const vertex of expression) {
          // The iris offset is confined to each pupil and the brow shift fades into the surrounding skin.
          texels.setXY(vertex.i, vertex.u - pose.eyeX * vertex.gaze / imageWidth,
            vertex.v - (pose.eyeY * vertex.gaze + 1.9 * pose.brow * vertex.brow) / imageHeight)
        }
        for (const channel of eyeChannels) applied[channel] = pose[channel]
        texels.needsUpdate = true
      }
    },
  }
}

function mouthInterior() {
  const columns = 49
  const rows = 15
  const geometry = grid(columns, rows, (s) => {
    const x = MathUtils.lerp(mouthLeft, mouthRight, s)
    const y = lipY(x)
    return { point: coords(x, y, surface(x, y, true)), texel: uv(x, y) }
  })
  const position = geometry.getAttribute('position') as BufferAttribute
  position.setUsage(DynamicDrawUsage)
  const colors = new BufferAttribute(new Float32Array(position.count * 3), 3).setUsage(DynamicDrawUsage)
  const shadow = new Color('#20100e')
  const palate = new Color('#5f302b')
  const enamel = new Color('#b89575')
  const shade = new Color()
  const samples = Array.from({ length: position.count }, (_, i) => {
    const s = (i % (columns + 1)) / columns
    const t = Math.floor(i / (columns + 1)) / rows
    const x = MathUtils.lerp(mouthLeft, mouthRight, s)
    const y = lipY(x)
    return {
      t, x, y, z: surface(x, y, true) - .007 - .012 * Math.sin(Math.PI * t),
      lower: lipWeights(x, y, true), upper: lipWeights(x, y, false),
      inner: mouthEnvelope(x),
    }
  })
  geometry.setAttribute('color', colors)

  return {
    geometry,
    move(pose: MouthPose) {
      for (let i = 0; i < samples.length; i++) {
        const { t, x, y, z, lower, upper, inner } = samples[i]
        const lift = MathUtils.lerp(upper.lift + .35, lower.lift - .55, t)
        poseVertex(position, i, x, y, z, lower, pose, lift)
        const toothLight = MathUtils.smoothstep(pose.open, .29, .59) * (1 - pose.press) * inner ** 2 *
          Math.exp(-(((t - .21) / .10) ** 2)) * .77
        shade.copy(shadow).lerp(palate, .54 * inner * t ** 3).lerp(enamel, toothLight)
        colors.setXYZ(i, shade.r, shade.g, shade.b)
      }
      position.needsUpdate = true
      colors.needsUpdate = true
    },
  }
}

export function faceRig() {
  const top = halfFace(false)
  const bottom = halfFace(true)
  const interior = mouthInterior()
  return { top, bottom, interior }
}
