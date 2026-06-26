<template>
  <section class="rounded-2xl bg-slate-900 p-5 ring-1 ring-white/5">
    <header class="mb-4 flex flex-wrap items-center gap-3">
      <h2 class="flex items-center gap-2 text-base font-semibold text-slate-100">
        <svg class="h-4 w-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        壁纸列表
        <span class="ml-1 text-xs font-normal text-slate-500">
          共 {{ totalItems }} 条 · 第 {{ page }} / {{ totalPages }} 页
        </span>
      </h2>

      <div class="ml-auto flex flex-wrap items-center gap-2">
        <input
          v-model="keyword"
          type="search"
          placeholder="按标题搜索…"
          class="w-48 rounded-lg bg-slate-800 px-3 py-1.5 text-sm ring-1 ring-white/5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          @keyup.enter="reload()"
        />
        <button
          class="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
          @click="reload()"
        >刷新</button>
        <button
          class="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          :disabled="!items.length"
          @click="toggleAll"
        >
          {{ allSelected ? '全不选' : '全选当前页' }}
        </button>
        <button
          class="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500 active:scale-95 disabled:opacity-50"
          :disabled="!selectedIds.size || deleting"
          @click="onBulkDelete"
        >
          {{ deleting ? '删除中…' : `下架选中 (${selectedIds.size})` }}
        </button>
      </div>
    </header>

    <!-- 加载 / 错误 -->
    <div v-if="loading" class="py-16 text-center text-sm text-slate-400">加载中…</div>
    <div v-else-if="error" class="py-16 text-center text-sm text-rose-400">
      {{ error }}
      <button class="ml-2 rounded bg-slate-800 px-2 py-1 text-xs" @click="reload()">重试</button>
    </div>
    <div v-else-if="!items.length" class="py-16 text-center text-sm text-slate-400">空</div>

    <!-- 表格 -->
    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[640px] text-sm">
        <thead class="border-b border-white/5 text-xs uppercase text-slate-500">
          <tr>
            <th class="w-8 py-2"></th>
            <th class="w-14 py-2 text-left">缩略</th>
            <th class="py-2 text-left">标题</th>
            <th class="w-24 py-2 text-left">分类</th>
            <th class="w-20 py-2 text-right">下载</th>
            <th class="w-20 py-2 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="it in items"
            :key="it.id"
            class="border-b border-white/5 hover:bg-slate-800/30"
          >
            <td class="py-2">
              <input
                type="checkbox"
                :checked="selectedIds.has(it.id)"
                class="h-4 w-4 cursor-pointer accent-brand-500"
                @change="toggleOne(it.id)"
              />
            </td>
            <td class="py-2">
              <img
                :src="getImageUrl(it)"
                :alt="it.title"
                class="h-12 w-12 rounded object-cover ring-1 ring-white/5"
                loading="lazy"
              />
            </td>
            <td class="max-w-xs truncate py-2 text-slate-200" :title="it.title">
              {{ it.title }}
            </td>
            <td class="py-2 text-slate-400">{{ it.category }}</td>
            <td class="py-2 text-right tabular-nums text-slate-300">
              {{ it.downloads || 0 }}
            </td>
            <td class="py-2 text-right">
              <button
                class="text-xs text-rose-400 hover:underline"
                @click="onSingleDelete(it)"
              >下架</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <nav v-if="totalPages > 1" class="mt-4 flex items-center justify-center gap-2 text-sm">
      <button
        class="rounded-lg bg-slate-800 px-3 py-1 text-slate-200 disabled:opacity-40"
        :disabled="page <= 1"
        @click="page--; reload()"
      >上一页</button>
      <span class="text-slate-400">{{ page }} / {{ totalPages }}</span>
      <button
        class="rounded-lg bg-slate-800 px-3 py-1 text-slate-200 disabled:opacity-40"
        :disabled="page >= totalPages"
        @click="page++; reload()"
      >下一页</button>
    </nav>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { pb } from '@/lib/pocketbase'

const PAGE_SIZE = 50

const items = ref([])
const totalItems = ref(0)
const totalPages = ref(1)
const page = ref(1)
const keyword = ref('')
const loading = ref(false)
const error = ref('')
const selectedIds = ref(new Set())
const deleting = ref(false)

const allSelected = computed(() => {
  if (!items.value.length) return false
  return items.value.every((it) => selectedIds.value.has(it.id))
})

function escapeFilter(v = '') {
  return String(v).replace(/"/g, '\\"')
}

function getImageUrl(record) {
  if (!record || !record.image) return ''
  const fn = pb.files.getUrl || pb.files.getURL
  return fn.call(pb.files, record, record.image)
}

async function reload() {
  loading.value = true
  error.value = ''
  // 切页/搜索时清掉跨页选择
  selectedIds.value = new Set()
  try {
    const params = {
      sort: '-created',
    }
    const q = keyword.value.trim()
    if (q) params.filter = `(title ~ "${escapeFilter(q)}" || category ~ "${escapeFilter(q)}")`
    const res = await pb.collection('wallpapers').getList(page.value, PAGE_SIZE, params)
    items.value = res.items
    totalItems.value = res.totalItems
    totalPages.value = res.totalPages
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function toggleOne(id) {
  const set = new Set(selectedIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  selectedIds.value = set
}

function toggleAll() {
  const set = new Set(selectedIds.value)
  if (allSelected.value) {
    items.value.forEach((it) => set.delete(it.id))
  } else {
    items.value.forEach((it) => set.add(it.id))
  }
  selectedIds.value = set
}

async function deleteOne(id) {
  await pb.collection('wallpapers').delete(id)
}

async function onSingleDelete(it) {
  if (!confirm(`确认下架「${it.title}」？此操作会删除 PB 上的记录和文件。`)) return
  deleting.value = true
  try {
    await deleteOne(it.id)
    await reload()
  } catch (e) {
    alert('删除失败：' + (e?.message || e))
  } finally {
    deleting.value = false
  }
}

async function onBulkDelete() {
  const ids = Array.from(selectedIds.value)
  if (!ids.length) return
  if (!confirm(`确认批量下架 ${ids.length} 条？此操作不可撤销。`)) return
  deleting.value = true
  let ok = 0, fail = 0
  for (const id of ids) {
    try {
      await deleteOne(id)
      ok++
    } catch (e) {
      fail++
    }
  }
  deleting.value = false
  alert(`完成：成功 ${ok}，失败 ${fail}`)
  await reload()
}

onMounted(() => {
  reload()
})

// 监听 page 变化（防止 reload 多次触发）
watch(page, () => reload())

// 暴露 reload 方法，让父组件在上传完成后调用
defineExpose({ reload })
</script>
