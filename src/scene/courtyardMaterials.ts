import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

export function randomSource(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function textureNoise(random: () => number, cells: number) {
  const values = Array.from({ length: cells * cells }, random)
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const at = (x: number, y: number) => values[(y % cells) * cells + x % cells]
  return (x: number, y: number) => {
    const u = x * cells / 256
    const v = y * cells / 256
    const left = Math.floor(u)
    const top = Math.floor(v)
    const fx = smooth(u - left)
    const fy = smooth(v - top)
    const upper = at(left, top) * (1 - fx) + at(left + 1, top) * fx
    const lower = at(left, top + 1) * (1 - fx) + at(left + 1, top + 1) * fx
    return upper * (1 - fy) + lower * fy - .5
  }
}

export function mortarTexture(kind: 'stone' | 'bark' | 'clay') {
  const random = randomSource({ stone: 75, bark: 21, clay: 41 }[kind])
  const image = document.createElement('canvas')
  image.width = image.height = 256
  const context = image.getContext('2d')
  if (!context) throw new Error('Canvas texture creation failed')
  const data = context.createImageData(256, 256)
  const patches = textureNoise(random, 7)
  const speckles = textureNoise(random, 29)
  const pores = textureNoise(random, 67)
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const index = (y * 256 + x) * 4
      const grain = random() * 17
      const surface = patches(x, y) * 35 + speckles(x, y) * 29 + pores(x, y) * 21
      const striation = kind === 'bark' ? 22 * Math.sin(x * .83 + y * .14 + patches(x, y) * 4) :
        kind === 'clay' ? 4 * Math.sin(y * .76) : 0
      const shade = (kind === 'bark' ? 142 : 200) + grain + surface + striation
      data.data.set([shade, shade - 5, shade - 12, 255], index)
    }
  }
  context.putImageData(data, 0, 0)
  for (let i = 0; i < 3100; i++) {
    const x = random() * 256
    const y = random() * 256
    context.fillStyle = i % 3 ? 'rgba(65, 51, 37, .11)' : 'rgba(255, 244, 227, .23)'
    context.fillRect(x, y, random() * 2.2 + .4, random() * 1.3 + .4)
  }
  const texture = new CanvasTexture(image)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.anisotropy = 4
  return texture
}
