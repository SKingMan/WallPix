// 壁纸相关 API 封装
// 集合: wallpapers
// 字段: title(text) image(file) category(text) downloads(number, default 0)
import { pb } from '@/lib/pocketbase'

const COLLECTION = 'wallpapers'
const PAGE_SIZE = Number(import.meta.env.VITE_PAGE_SIZE) || 30

// 构造 PocketBase filter 字符串时的转义，避免引号注入
export function escapeFilter(value = '') {
  return String(value).replace(/"/g, '\\"')
}

// 把列表请求参数组合成 PocketBase 接受的 filter / sort
function buildListParams({ category, keyword, page, sort = '-created' } = {}) {
  const filters = []
  if (category && category !== 'all') {
    filters.push(`category = "${escapeFilter(category)}"`)
  }
  if (keyword && keyword.trim()) {
    const q = escapeFilter(keyword.trim())
    // 标题包含关键字 或 分类匹配
    filters.push(`(title ~ "${q}" || category ~ "${q}")`)
  }
  return {
    page: page || 1,
    perPage: PAGE_SIZE,
    sort,
    filter: filters.join(' && ') || undefined,
  }
}

/**
 * 拉取壁纸列表（分页）
 * @param {Object} options
 * @param {string} [options.category] 分类筛选，传 'all' 或空代表全部
 * @param {string} [options.keyword] 搜索关键字（匹配 title / category）
 * @param {number} [options.page=1]
 * @returns {Promise<{items: any[], totalItems: number, totalPages: number, page: number}>}
 */
export async function listWallpapers({ category, keyword, page = 1 } = {}) {
  const params = buildListParams({ category, keyword, page })
  // 注意：PB SDK v0.21+ 会把 filter: undefined 序列化成字符串 "undefined" 发送，
  // 触发 PB 400。这里用条件展开，避免传 undefined。
  const result = await pb.collection(COLLECTION).getList(params.page, params.perPage, {
    sort: params.sort,
    ...(params.filter ? { filter: params.filter } : {}),
  })
  return {
    items: result.items,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
    page: result.page,
  }
}

/**
 * 拉取所有分类（去重）
 * PocketBase 没有 distinct 接口，这里分页拉完所有数据后去重
 * 适用于分类量较小的场景；若分类很多，建议在后端加一个 categories 集合
 */
export async function listCategories() {
  const PAGE = 200
  let page = 1
  const set = new Set()
  // 防御性循环：最多拉 20 页 4000 条
  for (let i = 0; i < 20; i++) {
    const res = await pb.collection(COLLECTION).getList(page, PAGE, {
      fields: 'category',
      sort: 'category',
    })
    res.items.forEach((it) => {
      if (it.category) set.add(it.category)
    })
    if (page >= res.totalPages) break
    page++
  }
  return Array.from(set)
}

/**
 * 根据 record 拿到图片的完整可访问 URL
 * PocketBase 文件字段存的是文件名，要拼成 URL
 * 注意：v0.21+ 用 getUrl（小写 l），旧版本是 getURL
 */
export function getImageUrl(record) {
  if (!record || !record.image) return ''
  // 同时兼容新老版本
  const fn = pb.files.getUrl || pb.files.getURL
  return fn.call(pb.files, record, record.image)
}

/**
 * 下载壁纸：
 *   1) 触发浏览器下载（a[download]）
 *   2) downloads +1
 * 失败不影响下载本身
 */
export async function downloadWallpaper(record) {
  const url = getImageUrl(record)
  if (!url) throw new Error('壁纸文件不存在')

  // 触发下载：同源可直接 download；跨域时浏览器会改为预览打开，
  // 此时改为在新窗口打开流式下载
  const a = document.createElement('a')
  a.href = url
  a.download = record.image
  a.rel = 'noopener'
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  // 计数 +1（PocketBase update 接口）
  try {
    const next = (record.downloads || 0) + 1
    await pb.collection(COLLECTION).update(record.id, { downloads: next })
    return next
  } catch (err) {
    // 计数失败不阻塞用户使用
    // eslint-disable-next-line no-console
    console.warn('[wallpapers] download count update failed:', err)
    return record.downloads || 0
  }
}
