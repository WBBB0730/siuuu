// imagequant 的 wasm-bindgen glue（imagequant_bg.js，bundler 目标）未自带类型声明，
// 这里复用主入口的类型，并补充内部的 __wbg_set_wasm。
declare module 'imagequant/imagequant_bg.js' {
  export { Imagequant, ImagequantImage } from 'imagequant/imagequant.js'
  export function __wbg_set_wasm(wasm: unknown): void
}
