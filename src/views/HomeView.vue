<template>
  <div class="min-h-full bg-slate-950 text-slate-100">
    <!-- 顶部导航 -->
    <header
      class="sticky top-0 z-30 border-b border-white/5 bg-slate-950/85 backdrop-blur"
    >
      <div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div class="flex items-center gap-2">
          <span class="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 4h16v16H4z M9 9l3 4 2-2 4 5H6z" />
            </svg>
          </span>
          <h1 class="text-lg font-semibold tracking-tight">WallPix</h1>
          <span class="ml-2 hidden text-xs text-slate-500 sm:inline">
            {{ totalItems }} 张壁纸
          </span>
        </div>
        <SearchBar v-model="keyword" />
      </div>

      <!-- 分类筛选 -->
      <div class="mx-auto max-w-7xl px-4 pb-3 sm:px-6">
        <CategoryFilter v-model="selectedCategory" :categories="categories" />
      </div>
    </header>

    <!-- 主体内容 -->
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <!-- 加载 / 错误 / 空 -->
      <div
        v-if="loading"
        class="py-20 text-center text-sm text-slate-400"
      >
        加载中…
      </div>
      <div
        v-else-if="error"
        class="py-20 text-center text-sm text-rose-400"
      >
        {{ error }}
        <button
          class="ml-3 rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
          @click="refresh"
        >
          重试
        </button>
      </div>
      <div
        v-else-if="!items.length"
        class="py-20 text-center text-sm text-slate-400"
      >
        没有找到符合条件的壁纸
      </div>

      <!-- 瀑布流：使用 CSS columns 实现，按断点变化列数 -->
      <div
        v-show="!loading && !error && items.length"
        class="columns-1 gap-4 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-4"
      >
        <WallpaperCard
          v-for="it in items"
          :key="it.id"
          :record="it"
          @preview="preview = $event"
        />
      </div>

      <!-- 分页 -->
      <nav
        v-if="!loading && totalPages > 1"
        class="mt-8 flex items-center justify-center gap-2"
      >
        <button
          class="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-40"
          :disabled="page <= 1"
          @click="prevPage"
        >
          上一页
        </button>
        <span class="text-sm text-slate-400">
          {{ page }} / {{ totalPages }}
        </span>
        <button
          class="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-40"
          :disabled="page >= totalPages"
          @click="nextPage"
        >
          下一页
        </button>
      </nav>
    </main>

    <!-- 预览弹窗 -->
    <WallpaperPreview
      :record="preview"
      @close="preview = null"
      @downloaded="onDownloaded"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import WallpaperCard from '@/components/WallpaperCard.vue'
import WallpaperPreview from '@/components/WallpaperPreview.vue'
import CategoryFilter from '@/components/CategoryFilter.vue'
import SearchBar from '@/components/SearchBar.vue'
import { useWallpapers } from '@/composables/useWallpapers'

const {
  items,
  categories,
  keyword,
  selectedCategory,
  page,
  totalPages,
  totalItems,
  loading,
  error,
  nextPage,
  prevPage,
  refresh,
  bumpDownload,
} = useWallpapers()

// 当前预览的 record；null 表示关闭
const preview = ref(null)

function onDownloaded({ id, downloads }) {
  bumpDownload(id, downloads)
}
</script>
