<template>
  <div class="grid min-h-screen place-items-center bg-slate-950 px-4">
    <form
      class="w-full max-w-sm rounded-2xl bg-slate-900 p-8 shadow-2xl ring-1 ring-white/5"
      @submit.prevent="onSubmit"
    >
      <div class="mb-6 flex items-center justify-center gap-2">
        <span
          class="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h16v16H4z M9 9l3 4 2-2 4 5H6z" />
          </svg>
        </span>
        <h1 class="text-xl font-semibold text-slate-100">WallPix · 后台</h1>
      </div>

      <h2 class="mb-4 text-center text-sm text-slate-400">管理员登录</h2>

      <label class="mb-3 block">
        <span class="mb-1 block text-xs text-slate-400">邮箱</span>
        <input
          v-model="email"
          type="email"
          autocomplete="username"
          required
          class="w-full rounded-lg bg-slate-800 px-3 py-2.5 text-sm text-slate-100 ring-1 ring-white/5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="admin@example.com"
        />
      </label>

      <label class="mb-5 block">
        <span class="mb-1 block text-xs text-slate-400">密码</span>
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          class="w-full rounded-lg bg-slate-800 px-3 py-2.5 text-sm text-slate-100 ring-1 ring-white/5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="••••••••"
        />
      </label>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 active:scale-95 disabled:opacity-60"
      >
        {{ loading ? '登录中…' : '登录' }}
      </button>

      <p
        v-if="error"
        class="mt-3 rounded bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-400"
      >
        {{ error }}
      </p>

      <p class="mt-6 text-center text-xs text-slate-500">
        <router-link to="/" class="hover:text-slate-300">← 返回壁纸站</router-link>
      </p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminAuth } from '@/composables/useAdminAuth'

const route = useRoute()
const router = useRouter()
const { login } = useAdminAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value.trim(), password.value)
    // 登录成功 → 跳 redirect 指定的页面或后台首页
    const redirect = (route.query.redirect && String(route.query.redirect)) || '/admin'
    router.replace(redirect)
  } catch (e) {
    error.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>
