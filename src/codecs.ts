import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

import jpegDecode, { init as initJpegDecode } from '@jsquash/jpeg/decode.js'
import jpegEncode, { init as initJpegEncode } from '@jsquash/jpeg/encode.js'
import pngDecode, { init as initPngDecode } from '@jsquash/png/decode.js'
import webpDecode, { init as initWebpDecode } from '@jsquash/webp/decode.js'
import webpEncode, { init as initWebpEncode } from '@jsquash/webp/encode.js'
import oxipngOptimise, { init as initOxipng } from '@jsquash/oxipng/optimise.js'
import * as imagequant from 'imagequant/imagequant_bg.js'

import type { ImageFormat, RawImage } from './types'

// 默认画质 0–100，仅在调用方未显式传 quality 时按格式回退（即未传 -q 时的取值）。
// PNG 的 85 经实测标定，使 set_quality(0, 85) 的输出体积最接近旧版 imagequant(maxColors=200)。
export const DEFAULT_QUALITY: Record<ImageFormat, number> = { png: 85, jpeg: 75, webp: 90 }

// 固定的编码 / 努力度参数，与画质无关，暂不通过 CLI 暴露。
const ENCODE = {
  png: { oxipngLevel: 2 },
  webp: { method: 6, lossless: 0 },
} as const

const require = createRequire(import.meta.url)

// 这些 wasm 包以浏览器/Worker 为主，Node 下需手动读取并喂给各自的 init。
async function wasmBytes(spec: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(require.resolve(spec)))
}

async function wasmModule(spec: string): Promise<WebAssembly.Module> {
  return WebAssembly.compile(await wasmBytes(spec) as BufferSource)
}

// 每个 codec 只初始化一次。
let jpegDecodeReady: Promise<unknown> | undefined
let jpegEncodeReady: Promise<unknown> | undefined
let pngDecodeReady: Promise<unknown> | undefined
let webpDecodeReady: Promise<unknown> | undefined
let webpEncodeReady: Promise<unknown> | undefined
let oxipngReady: Promise<unknown> | undefined

// imagequant 自带的入口用 `import * from "*.wasm"`，在 tsx 等工具下无法解析，
// 故直接读取并实例化其 wasm（glue 仅需 __wbindgen_* 两个导入），各运行环境表现一致。
let imagequantReady: Promise<void> | undefined
async function ensureImagequant(): Promise<void> {
  imagequantReady ??= (async () => {
    const { instance } = await WebAssembly.instantiate(
      await wasmBytes('imagequant/imagequant_bg.wasm') as BufferSource,
      { './imagequant_bg.js': imagequant as unknown as WebAssembly.ModuleImports },
    )
    imagequant.__wbg_set_wasm(instance.exports)
  })()
  return imagequantReady
}

// jSquash 的类型签名面向浏览器（ArrayBuffer / ImageData），但运行时同样接受
// Uint8Array 与普通像素对象，这里仅做类型转换。
function asBuffer(data: Uint8Array): ArrayBuffer {
  return data as unknown as ArrayBuffer
}

function asImageData(image: RawImage): ImageData {
  return image as unknown as ImageData
}

function toUint8(data: Uint8Array | Uint8ClampedArray): Uint8Array {
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
}

async function decode(data: Uint8Array, format: ImageFormat): Promise<RawImage> {
  switch (format) {
    case 'png':
      pngDecodeReady ??= initPngDecode(await wasmBytes('@jsquash/png/codec/pkg/squoosh_png_bg.wasm'))
      await pngDecodeReady
      return pngDecode(asBuffer(data))
    case 'jpeg':
      jpegDecodeReady ??= initJpegDecode(await wasmModule('@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm'))
      await jpegDecodeReady
      return jpegDecode(asBuffer(data))
    case 'webp':
      webpDecodeReady ??= initWebpDecode(await wasmModule('@jsquash/webp/codec/dec/webp_dec.wasm'))
      await webpDecodeReady
      return webpDecode(asBuffer(data))
  }
}

async function encodePng(image: RawImage, quality: number): Promise<Uint8Array> {
  // imagequant 量化（set_quality 0–100，roughly like JPEG，自带抖动）后得到 PNG，再交给 oxipng 做无损优化。
  await ensureImagequant()
  const source = imagequant.Imagequant.new_image(toUint8(image.data), image.width, image.height, 0)
  const quantizer = new imagequant.Imagequant()
  quantizer.set_quality(0, quality) // minimum=0：永不因达不到目标画质而中止
  const quantized = quantizer.process(source)

  oxipngReady ??= initOxipng(await wasmBytes('@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm'))
  await oxipngReady
  const optimised = await oxipngOptimise(asBuffer(quantized), { level: ENCODE.png.oxipngLevel, interlace: false })
  return new Uint8Array(optimised)
}

async function encodeJpeg(image: RawImage, quality: number): Promise<Uint8Array> {
  jpegEncodeReady ??= initJpegEncode(await wasmModule('@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm'))
  await jpegEncodeReady
  return new Uint8Array(await jpegEncode(asImageData(image), { quality }))
}

async function encodeWebp(image: RawImage, quality: number): Promise<Uint8Array> {
  webpEncodeReady ??= initWebpEncode(await wasmModule('@jsquash/webp/codec/enc/webp_enc_simd.wasm'))
  await webpEncodeReady
  return new Uint8Array(await webpEncode(asImageData(image), { quality, ...ENCODE.webp }))
}

export async function encode(image: RawImage, format: ImageFormat, quality?: number): Promise<Uint8Array> {
  const q = quality ?? DEFAULT_QUALITY[format]
  switch (format) {
    case 'png':
      return encodePng(image, q)
    case 'jpeg':
      return encodeJpeg(image, q)
    case 'webp':
      return encodeWebp(image, q)
  }
}

export { decode }
