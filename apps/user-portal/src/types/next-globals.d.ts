// next-env.d.ts 由 next dev/build 生成且随 distDir 抖动，已不入库；
// 这里固定引入 Next 全局类型，保证 fresh clone 直接 tsc 可通过。
/// <reference types="next" />
/// <reference types="next/image-types/global" />
