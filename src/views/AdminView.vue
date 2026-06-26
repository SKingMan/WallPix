<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <!-- 顶部 -->
    <header
      class="sticky top-0 z-20 border-b border-white/5 bg-slate-950/85 backdrop-blur"
    >
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div class="flex items-center gap-2">
          <span
            class="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-white"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 4h16v16H4z M9 9l3 4 2-2 4 5H6z" />
            </svg>
          </span>
          <h1 class="text-base font-semibold">WallPix 后台</h1>
          <span class="ml-2 hidden text-xs text-slate-500 sm:inline">
            {{ admin?.email }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <router-link
            to="/"
            class="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
          >查看站点</router-link>
          <button
            class="rounded-lg bg-rose-600/20 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-600/30"
            @click="onLogout"
          >退出登录</button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <AdminUploader @uploaded="onUploaded" />
      <AdminWallpaperList ref="listRef" />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminUploader from '@/components/admin/AdminUploader.vue'
import AdminWallpaperList from '@/components/admin/AdminWallpaperList.vue'
import { useAdminAuth } from '@/composables/useAdminAuth'

const router = useRouter()
const { admin, logout } = useAdminAuth()

// 引用子组件，用于上传后触发刷新
const listRef = ref(null)

function onLogout() {
  logout()
  router.replace('/admin/login')
}

// 上传完成 → 调用子组件的 reload()
function onUploaded() {
  listRef.value?.reload?.()
}
</script>
