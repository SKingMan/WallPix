// PocketBase 客户端单例
// 文档: https://github.com/pocketbase/js-sdk
import PocketBase from 'pocketbase'

// 从 Vite 环境变量读取后端地址；未配置时回落到本地
const URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090'

// 全局只创建一个实例，便于 authStore 在 HMR 持久化
export const pb = new PocketBase(URL)

// 暴露 base URL，方便需要直接走 fetch 调 admin auth 的场景
export function getPocketbaseUrl() {
  return URL
}

// 关闭自动取消：每个请求独立，不被前一个未完成的请求 abort
pb.autoCancellation(false)

// 开发环境下输出 SDK 调试日志
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log('[pocketbase] connected to', URL)
}

export default pb
