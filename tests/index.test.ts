import { describe, expect, it } from 'vitest'

import { compress, detectFormat } from '../src'
import { encode } from '../src/codecs'
import type { ImageFormat, RawImage } from '../src/types'

function gradient(width = 200, height = 200): RawImage {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      data[i] = x % 256
      data[i + 1] = y % 256
      data[i + 2] = (x + y) % 256
      data[i + 3] = 255
    }
  }
  return { data, width, height }
}

describe('detectFormat', () => {
  it('识别 PNG / JPEG / WebP 魔数', () => {
    expect(detectFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png')
    expect(detectFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg')
    expect(detectFormat(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('webp')
  })

  it('未知格式返回 undefined', () => {
    expect(detectFormat(new Uint8Array([1, 2, 3, 4]))).toBeUndefined()
  })
})

describe('compress', () => {
  const formats: ImageFormat[] = ['png', 'jpeg', 'webp']
  const raw = gradient()

  it.each(formats)('压缩 %s 后仍是有效的同格式图片', async (format) => {
    const source = await encode(raw, format)
    expect(detectFormat(source)).toBe(format)

    const result = await compress(source)
    expect(result.format).toBe(format)
    expect(result.data.length).toBeGreaterThan(0)
    expect(detectFormat(result.data)).toBe(format)
  })

  it('无法识别的格式抛错', async () => {
    await expect(compress(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow()
  })
})
