export type ImageFormat = 'png' | 'jpeg' | 'webp'

/** 解码后的原始像素，与 jSquash 的 ImageData 结构一致。 */
export interface RawImage {
  data: Uint8Array | Uint8ClampedArray
  width: number
  height: number
}
