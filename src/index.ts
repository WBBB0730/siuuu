import { decode, encode, PRESETS } from './codecs'
import { t } from './i18n'

import type { ImageFormat, RawImage } from './types'

export type { ImageFormat, RawImage }
export { PRESETS }

export interface CompressOptions {
  /** 输出格式，默认与输入一致（第一版不做格式转换）。 */
  format?: ImageFormat
}

export interface CompressResult {
  data: Uint8Array
  format: ImageFormat
}

/** 通过魔数识别图片格式，无法识别时返回 undefined。 */
export function detectFormat(data: Uint8Array): ImageFormat | undefined {
  if (data.length >= 8
    && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return 'png'
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'jpeg'
  }
  if (data.length >= 12
    && data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46
    && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) {
    return 'webp'
  }
  return undefined
}

/** 压缩单张图片。 */
export async function compress(input: Uint8Array, options: CompressOptions = {}): Promise<CompressResult> {
  const inputFormat = detectFormat(input)
  if (!inputFormat) {
    throw new Error(t('unrecognizedFormat'))
  }
  const format = options.format ?? inputFormat
  const image: RawImage = await decode(input, inputFormat)
  const data = await encode(image, format)
  return { data, format }
}
