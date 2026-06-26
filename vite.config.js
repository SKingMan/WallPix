import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vite 配置：开发端口 5173，启用 @ 别名指向 src
export default defineConfig(({ mode }) => {
  // 加载 .env / .env.local，把所有 VITE_* 变量挂到 process.env
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      port: 5173,
      host: true,
      // 开发态代理：把 /api/* /_/* 转到 VITE_DEV_PB_TARGET（默认本地）
      // 浏览器看到的是同源（localhost:5173），零 CORS 问题
      proxy: {
        '/api': {
          target: env.VITE_DEV_PB_TARGET || 'http://localhost:8090',
          changeOrigin: true,
        },
        '/_': {
          target: env.VITE_DEV_PB_TARGET || 'http://localhost:8090',
          changeOrigin: true,
          ws: true,  // PB admin UI 用 WebSocket
        },
      },
    },
  }
})
