<template>
  <section class="rounded-2xl bg-slate-900 p-5 ring-1 ring-white/5">
    <h2 class="mb-4 flex items-center gap-2 text-base font-semibold text-slate-100">
      <svg class="h-4 w-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M7 16a4 4 0 01-.88-7.9 5 5 0 019.95-1.3A4.5 4.5 0 0118 16H7zm5-7v6m0 0l-2-2m2 2l2-2" />
      </svg>
      批量上传
    </h2>

    <!-- 拖拽 / 选择文件 -->
    <div
      class="rounded-xl border-2 border-dashed border-white/10 px-4 py-8 text-center transition"
      :class="dragging ? 'border-brand-500 bg-brand-500/5' : 'hover:border-white/20'"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        class="hidden"
        @change="onPick"
      />
      <button
        type="button"
        class="text-sm text-brand-400 hover:underline"
        @click="fileInput?.click()"
      >
        点击选择文件
      </button>
      <span class="text-sm text-slate-400">或拖拽图片到这里（支持多选）</span>
    </div>

    <!-- 分类 + 操作 -->
    <div class="mt-4 flex flex-wrap items-center gap-3">
      <label class="flex items-center gap-2 text-sm text-slate-300">
        分类
        <input
          v-model="category"
          type="text"
          class="w-32 rounded-lg bg-slate-800 px-3 py-1.5 text-sm ring-1 ring-white/5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="2K"
        />
      </label>
      <span class="text-xs text-slate-500">
        文件名形如 <code>壁纸_60_360x540_描述.jpg</code> → 自动解析为标题 <code>壁纸 #60 - 描述</code>
      </span>
      <div class="ml-auto flex gap-2">
        <button
          v-if="files.length"
          type="button"
          class="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
          @click="clearAll"
        >
          清空 ({{ files.length }})
        </button>
        <button
          type="button"
          class="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-500 active:scale-95 disabled:opacity-60"
          :disabled="!files.length || uploading"
          @click="startUpload"
        >
          {{ uploading ? `上传中 ${doneCount + failCount}/${files.length}…` : `开始上传 (${files.length})` }}
        </button>
      </div>
    </div>

    <!-- 文件列表 + 状态 -->
    <ul
      v-if="files.length"
      class="mt-4 max-h-80 space-y-1.5 overflow-y-auto rounded-lg bg-slate-950/40 p-2 text-sm"
    >
      <li
        v-for="(f, i) in files"
        :key="i"
        class="flex items-center gap-3 rounded px-2 py-1.5"
        :class="statusClass(f.status)"
      >
        <span class="w-5 shrink-0 text-center">
          <span v-if="f.status === 'pending'">·</span>
          <span v-else-if="f.status === 'uploading'">↻</span>
          <span v-else-if="f.status === 'done'">✓</span>
          <span v-else-if="f.status === 'fail'">✗</span>
        </span>
        <span class="flex-1 truncate text-slate-200">{{ f.title }}</span>
        <span class="w-16 text-right text-xs text-slate-500">{{ f.size }}</span>
        <span class="w-16 text-right text-xs">{{ statusText(f.status) }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { pb } from '@/lib/pocketbase'
import { escapeFilter } from '@/api/wallpapers'

const emit = defineEmits(['uploaded'])

const fileInput = ref(null)
const dragging = ref(false)
const category = ref(localStorage.getItem('wallpix_category') || '2K')
const files = ref([]) // [{ name, size, blob, title, status, err }]
const uploading = ref(false)

const doneCount = computed(() => files.value.filter((f) => f.status === 'done').length)
const failCount = computed(() => files.value.filter((f) => f.status === 'fail').length)

// 文件名: 壁纸_<num>_<w>x<h>_<desc>.jpg → "壁纸 #<num> - <desc>"
function titleFromName(name) {
  const base = name.replace(/\.[^.]+$/, '')
  const m = base.match(/^壁纸_(\d+)_(\d+)x(\d+)_(.+)$/)
  if (!m) return base
  return `壁纸 #${m[1]} - ${m[4]}`
}

function humanSize(n) {
  if (n < 1024) return n + 'B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + 'KB'
  return (n / 1024 / 1024).toFixed(2) + 'MB'
}

function addFiles(list) {
  for (const f of list) {
    if (!f.type.startsWith('image/')) continue
    files.value.push({
      name: f.name,
      size: humanSize(f.size),
      blob: f,
      title: titleFromName(f.name),
      status: 'pending',
      err: '',
    })
  }
}

function onPick(e) {
  addFiles(Array.from(e.target.files || []))
  e.target.value = ''
}

function onDrop(e) {
  dragging.value = false
  addFiles(Array.from(e.dataTransfer?.files || []))
}

function clearAll() {
  files.value = []
}

function statusClass(s) {
  if (s === 'done') return 'text-emerald-300'
  if (s === 'fail') return 'text-rose-300'
  if (s === 'uploading') return 'text-brand-300'
  return 'text-slate-400'
}
function statusText(s) {
  if (s === 'done') return '完成'
  if (s === 'fail') return '失败'
  if (s === 'uploading') return '上传中'
  return '待上传'
}

async function startUpload() {
  if (uploading.value || !files.value.length) return
  uploading.value = true
  localStorage.setItem('wallpix_category', category.value)

  for (const f of files.value) {
    if (f.status === 'done') continue
    f.status = 'uploading'
    f.err = ''
    try {
      const form = new FormData()
      form.append('title', f.title)
      form.append('category', escapeFilter(category.value.trim() || '未分类'))
      form.append('downloads', '0')
      form.append('image', f.blob, f.name)
      await pb.collection('wallpapers').create(form)
      f.status = 'done'
    } catch (e) {
      f.status = 'fail'
      f.err = e?.message || '未知错误'
    }
  }

  uploading.value = false
  emit('uploaded')
}
</script>
