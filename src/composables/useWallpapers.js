// 壁纸列表的响应式状态：搜索/分类/分页
import { ref, watch, onMounted } from 'vue'
import { listWallpapers, listCategories } from '@/api/wallpapers'

export function useWallpapers() {
  const items = ref([])
  const categories = ref([])
  const keyword = ref('')
  const selectedCategory = ref('all')
  const page = ref(1)
  const totalPages = ref(1)
  const totalItems = ref(0)
  const loading = ref(false)
  const error = ref('')

  // 防止多个请求并发导致旧数据覆盖新数据
  let token = 0

  async function fetchPage(resetPage = false) {
    if (resetPage) page.value = 1
    const myToken = ++token
    loading.value = true
    error.value = ''
    try {
      const res = await listWallpapers({
        category: selectedCategory.value,
        keyword: keyword.value,
        page: page.value,
      })
      // 只接受最新一次请求的结果
      if (myToken !== token) return
      items.value = res.items
      totalPages.value = res.totalPages
      totalItems.value = res.totalItems
    } catch (err) {
      if (myToken !== token) return
      // eslint-disable-next-line no-console
      console.error('[useWallpapers] list failed:', err)
      error.value = err?.message || '加载失败'
    } finally {
      if (myToken === token) loading.value = false
    }
  }

  async function fetchCategories() {
    try {
      const list = await listCategories()
      categories.value = list
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[useWallpapers] categories failed:', err)
      categories.value = []
    }
  }

  // 切换分类或关键字 → 重置到第一页
  watch([selectedCategory, keyword], () => fetchPage(true))
  // 翻页
  watch(page, () => fetchPage(false))

  onMounted(() => {
    fetchCategories()
    fetchPage(true)
  })

  // 预览弹窗中下载成功后，把对应卡片的 downloads 同步到列表里
  function bumpDownload(id, downloads) {
    const target = items.value.find((it) => it.id === id)
    if (target) target.downloads = downloads
  }

  return {
    // state
    items,
    categories,
    keyword,
    selectedCategory,
    page,
    totalPages,
    totalItems,
    loading,
    error,
    // actions
    setCategory: (v) => (selectedCategory.value = v),
    setKeyword: (v) => (keyword.value = v),
    nextPage: () => {
      if (page.value < totalPages.value) page.value++
    },
    prevPage: () => {
      if (page.value > 1) page.value--
    },
    refresh: () => fetchPage(false),
    bumpDownload,
  }
}
