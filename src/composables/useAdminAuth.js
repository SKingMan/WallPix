// 管理员鉴权状态
//
// 背景：服务端是 PocketBase v0.22+，admin 集合改名为 _superusers。
// SDK v0.21.5 的 pb.admins.authWithPassword() 在 v0.22 服务端上返回 404，
// 而 pb.collection('_superusers').authWithPassword() 虽然能拿到 token，
// 但 SDK 0.21.5 不认识响应格式，authStore.record 拿到的是空对象。
//
// 解法：直接用 fetch 打 /api/collections/_superusers/auth-with-password，
// 拿到 {token, record} 后手动调 pb.authStore.save(token, record)。
import { computed } from 'vue'
import { pb } from '@/lib/pocketbase'
import { getPocketbaseUrl } from '@/lib/pocketbase'

export function useAdminAuth() {
  // 是否已登录：authStore 里有有效 token 即视为已登录
  // 注意：v0.22+ 的 _superusers record 在 SDK 0.21.5 里不会让 isAdmin=true，
  // 所以用 isValid（仅看 token）来判断
  const isLoggedIn = computed(() => !!pb.authStore.isValid)
  // SDK 0.21.5 把 record 存在 model 字段（不是 record）
  const admin = computed(() => pb.authStore.model || pb.authStore.record)

  /**
   * 用超级管理员账号登录
   * @returns {Promise<{email: string}>} 登录成功返回基本信息
   * @throws {Error} 登录失败抛出
   */
  async function login(email, password) {
    const baseUrl = getPocketbaseUrl()
    // 关键修复 1：相对路径转绝对路径，避免 fetch 协议相对 URL（net::ERR_NAME_NOT_RESOLVED）
    // 关键修复 2：baseUrl='/' 时不要拼出末尾的 /，否则
    //   'http://host' + '/' + '/api/...'  =  'http://host//api/...'
    //   这个 URL 到 server.js 时 req.url 是 '//api/...'，不以 '/api/' 开头，
    //   会走 SPA fallback 返回 index.html，导致前端的 res.json() 失败
    const fullBase = baseUrl === '/'
      ? window.location.origin
      : baseUrl.startsWith('/')
      ? window.location.origin + baseUrl
      : baseUrl

    // 走服务端实际支持的端点
    const endpoints = [
      '/api/collections/_superusers/auth-with-password', // v0.22+
      '/api/admins/auth-with-password',                  // v0.20/0.21
    ]
    let lastErr
    for (const path of endpoints) {
      try {
        const res = await fetch(fullBase + path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: email, password }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.token) {
          // 手动写入 SDK 的 authStore（兼容所有版本）
          pb.authStore.save(data.token, data.record || null)
          return { email: data.record?.email || email }
        }
        // 凭据错误：直接抛 400，不再试下一个端点
        if (res.status === 400) {
          throw new Error('邮箱或密码错误')
        }
        // 404：端点不存在，试下一个
        if (res.status === 404) {
          lastErr = new Error(`404 ${path}`)
          continue
        }
        throw new Error(data.message || `登录失败 (HTTP ${res.status})`)
      } catch (e) {
        // 网络错误 / 解析错误：直接抛
        if (e.message === '邮箱或密码错误') throw e
        lastErr = e
      }
    }
    throw lastErr || new Error('登录失败：所有端点都不可用')
  }

  function logout() {
    pb.authStore.clear()
  }

  return { isLoggedIn, admin, login, logout }
}
