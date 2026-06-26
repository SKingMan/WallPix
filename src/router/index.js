// 路由：/ 公开站点，/admin/login 登录页，/admin 后台（需鉴权）
import { createRouter, createWebHistory } from 'vue-router'
import { pb } from '@/lib/pocketbase'

// 懒加载
const HomeView = () => import('@/views/HomeView.vue')
const AdminLoginView = () => import('@/views/AdminLoginView.vue')
const AdminView = () => import('@/views/AdminView.vue')

const routes = [
  { path: '/', name: 'home', component: HomeView },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: AdminLoginView,
    meta: { title: '管理员登录' },
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminView,
    meta: { requiresAdmin: true, title: '后台管理' },
  },
  // 兜底：未匹配路由回首页
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// 鉴权守卫：判断"是否有有效 token"
// 注意：服务端 v0.22+ 改名为 _superusers，SDK 0.21.5 的 pb.authStore.isAdmin
// 会因为 collectionName 不匹配而永远是 false。这里改用 isValid（仅看 token 有效性）。
router.beforeEach((to) => {
  const isAuthed = pb.authStore.isValid
  if (to.meta.requiresAdmin && !isAuthed) {
    // 未登录 → 跳登录页，带 redirect 参数
    return { path: '/admin/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/admin/login' && isAuthed) {
    // 已登录 → 直接进后台
    return { path: '/admin' }
  }
})

router.afterEach((to) => {
  if (to.meta?.title) document.title = `${to.meta.title} · WallPix`
  else document.title = 'WallPix · 高清壁纸'
})

export default router
