<template>
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="record"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-8"
        @click.self="$emit('close')"
        @keydown.esc="$emit('close')"
        tabindex="0"
        ref="overlay"
      >
        <!-- 关闭按钮 -->
        <button
          type="button"
          class="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/20"
          @click="$emit('close')"
          aria-label="关闭"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- 大图容器：移动端上下排，桌面端左右排 -->
        <div
          class="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl md:flex-row"
        >
          <!-- 图片 -->
          <div class="flex flex-1 items-center justify-center bg-black p-2 sm:p-4">
            <img
              :src="imageUrl"
              :alt="record.title"
              class="max-h-[80vh] w-auto max-w-full object-contain"
            />
          </div>

          <!-- 侧栏信息 -->
          <aside class="flex w-full flex-col gap-4 p-5 md:w-80">
            <div>
              <h2 class="line-clamp-1 text-lg font-semibold text-slate-100">
                {{ record.title || '未命名' }}
              </h2>
              <p
                v-if="record.category"
                class="mt-1 inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
              >
                {{ record.category }}
              </p>
            </div>

            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-lg bg-slate-800/60 p-3">
                <dt class="text-xs text-slate-400">下载量</dt>
                <dd class="mt-1 text-base font-semibold text-slate-100">
                  {{ record.downloads ?? 0 }}
                </dd>
              </div>
              <div class="rounded-lg bg-slate-800/60 p-3">
                <dt class="text-xs text-slate-400">ID</dt>
                <dd class="mt-1 truncate text-xs text-slate-300">
                  {{ record.id }}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              class="mt-auto flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-500 active:scale-95 disabled:opacity-60"
              :disabled="downloading"
              @click="onDownload"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              {{ downloading ? '处理中…' : '下载原图' }}
            </button>

            <p class="text-center text-[11px] text-slate-500">
              按 ESC 或点击空白处关闭
            </p>
          </aside>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { downloadWallpaper, getImageUrl } from '@/api/wallpapers'

const props = defineProps({
  record: { type: Object, default: null },
})

const emit = defineEmits(['close', 'downloaded'])

const overlay = ref(null)
const downloading = ref(false)

// 打开时自动聚焦到遮罩层以响应 ESC
watch(
  () => props.record,
  async (val) => {
    if (val) {
      await nextTick()
      overlay.value?.focus()
    }
  },
)

const imageUrl = computed(() => (props.record ? getImageUrl(props.record) : ''))

async function onDownload() {
  if (!props.record || downloading.value) return
  downloading.value = true
  try {
    const next = await downloadWallpaper(props.record)
    // 把新的下载数抛给父组件，用于同步列表里那张卡片的计数
    emit('downloaded', { id: props.record.id, downloads: next })
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
