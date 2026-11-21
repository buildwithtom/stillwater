import { BufferAttribute, BufferGeometry, MathUtils } from 'three'

const scale = 430
const originX = 785
const originY = 465
const imageWidth = 1536
const imageHeight = 1024

type Section = readonly [row: number, left: number, right: number]
export const hairline: readonly Section[] = [
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
const eyes = [{ x: 737, y: 418 }, { x: 842, y: 407 }] as const

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

  return -.055 + .258 * Math.pow(curvature, .86) +
    .046 * bump(x, y, 789, 455, 31, 65) +
    .077 * bump(x, y, 786, 484, 27, 19) +
    .025 * bump(x, y, 777, 542, 62, 47) -
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

export function portraitShell(head: boolean, front: boolean) {
  const sections = head ? hairline : shoulders
  return grid(head && front ? 98 : 42, head && front ? 112 : 52, (s, t) => {
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
  const shape = (s: number) => Math.sin(Math.PI * s) ** .75
  const rim = (s: number) => eye.y - 6.9 * shape(s) - 3.5 * (s - .5)
  const geometry = grid(22, 7, (s, t) => {
    const x = eye.x + (s - .5) * 47
    return {
      point: coords(x, rim(s), surface(x, rim(s), true) + .006),
      texel: uv(x, eye.y - 8.8 - (1 - t) * 9 - 3.5 * (s - .5)),
    }
  })
  const attribute = geometry.getAttribute('position')
  geometry.boundingSphere = null

  function close(amount: number) {
    for (let i = 0; i < attribute.count; i++) {
      const s = (i % 23) / 22
      const t = Math.floor(i / 23) / 7
      const x = eye.x + (s - .5) * 47
      const y = rim(s) + 15.5 * shape(s) * t * amount
      attribute.setXYZ(i, ...coords(x, y, surface(x, y, true) + .006))
    }
    attribute.needsUpdate = true
  }

  return { geometry, close }
}

const mouthX = 787
const mouthWidth = 78
const mouthLine = (s: number) => 525 + Math.sin(Math.PI * s) * 1.5 - (s - .5) * 3
const mouthContour = (s: number) => Math.sin(Math.PI * s) ** .85
const center = (s: number, wide: number, round: number) =>
  mouthX + ((s - .5) * mouthWidth) * (1 + .11 * wide - .22 * round)

export function mouthRig() {
  const columns = 32
  const rows = 7
  const makePart = (part: 'inside' | 'lip' | 'teeth') => grid(columns, rows, (s, t) => {
    const x = center(s, 0, 0)
    const y = mouthLine(s)
    return { point: coords(x, y, surface(x, y, true)), texel: uv(x, y + (part === 'lip' ? 3 + t * 8 : 0)) }
  })
  const inside = makePart('inside')
  const lip = makePart('lip')
  const teeth = makePart('teeth')

  function setPose(open: number, wide: number, round: number, press: number) {
    const length = Math.max(.6, open * (19 + round * 4) - press * 2)
    for (const [part, geometry] of [['inside', inside], ['lip', lip], ['teeth', teeth]] as const) {
      const attribute = geometry.getAttribute('position')
      for (let i = 0; i < attribute.count; i++) {
        const s = (i % (columns + 1)) / columns
        const t = Math.floor(i / (columns + 1)) / rows
        const x = center(s, wide, round)
        const opening = mouthContour(s) * length
        const top = mouthLine(s) - opening * .14
        const closing = mouthLine(s) + opening
        const y = part === 'inside' ? MathUtils.lerp(top, closing + 1.4, t)
          : part === 'lip' ? closing + (2 + t * 7) * mouthContour(s)
            : top + (1 + t * Math.min(4, length * .32)) * mouthContour(s)
        const depth = surface(x, y, true) + (part === 'inside' ? .008 : part === 'lip' ? .011 : .009)
        attribute.setXYZ(i, ...coords(x, y, depth))
      }
      attribute.needsUpdate = true
    }
  }

  return { inside, lip, teeth, setPose }
}

export function faceRig(geometry: BufferGeometry) {
  const position = geometry.getAttribute('position')
  const texels = geometry.getAttribute('uv')
  const bases = Array.from({ length: position.count }, (_, i) => {
    const u = texels.getX(i)
    const v = texels.getY(i)
    const x = u * imageWidth
    const y = (1 - v) * imageHeight
    const gaze = Math.max(...eyes.map((eye) => bump(x, y, eye.x, eye.y, 15, 7)))
    const bottom = MathUtils.smoothstep(y, 525, 540)
    const jaw = bottom * bump(x, y, 790, 551, 55, 38)
    return { i, u, v, gaze, jaw, y: position.getY(i) }
  })
  const gazeVertices = bases.filter(({ gaze }) => gaze > .018)
  const jawVertices = bases.filter(({ jaw }) => jaw > .015)

  return (eyeX: number, eyeY: number, open: number) => {
    for (const vertex of gazeVertices) {
      texels.setXY(vertex.i, vertex.u + eyeX * vertex.gaze / imageWidth, vertex.v + eyeY * vertex.gaze / imageHeight)
    }
    for (const vertex of jawVertices) {
      position.setY(vertex.i, vertex.y - (open * vertex.jaw * 13) / scale)
    }
    texels.needsUpdate = true
    position.needsUpdate = true
  }
}
