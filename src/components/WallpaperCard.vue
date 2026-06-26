<template>
  <article
    class="group relative mb-4 break-inside-avoid overflow-hidden rounded-xl bg-slate-900/60 ring-1 ring-white/5 transition hover:ring-brand-500/40"
  >
    <!-- 缩略图：使用 object-cover 让瀑布流高度由图片本身决定 -->
    <button
      type="button"
      class="block w-full text-left"
      @click="$emit('preview', record)"
    >
      <img
        :src="thumbUrl"
        :alt="record.title"
        loading="lazy"
        class="w-full h-auto block transition duration-500 group-hover:scale-[1.02]"
        @load="onLoad"
      />
    </button>

    <!-- 底部信息条 -->
    <div class="flex items-center justify-between gap-2 p-3">
      <div class="min-w-0 flex-1">
        <h3 class="truncate text-sm font-medium text-slate-100">
          {{ record.title || '未命名' }}
        </h3>
        <p class="mt-0.5 truncate text-xs text-slate-400">
          <span
            v-if="record.category"
            class="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300"
          >
            {{ record.category }}
          </span>
          <span class="ml-2 inline-flex items-center gap-1">
            <svg
              class="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
              />
            </svg>
            {{ formatCount(record.downloads) }}
          </span>
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-500 active:scale-95"
        :disabled="loading"
        @click.stop="onDownload"
      >
        <span v-if="loading">…</span>
        <span v-else>下载</span>
      </button>
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { downloadWallpaper, getImageUrl } from '@/api/wallpapers'

const props = defineProps({
  record: { type: Object, required: true },
})

defineEmits(['preview'])

const loading = ref(false)

// PocketBase file 字段：为了缩略图可以加上 ?thumb= 参数（PocketBase 内置图片处理）
const thumbUrl = computed(() => getImageUrl(props.record))

function formatCount(n) {
  n = Number(n) || 0
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

async function onDownload() {
  if (loading.value) return
  loading.value = true
  try {
    await downloadWallpaper(props.record)
  } finally {
    loading.value = false
  }
}

function onLoad() {
  // 留作占位：未来可接入 IntersectionObserver 统计曝光
}
</script>
