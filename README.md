# WallPix · 壁纸网站

一个简洁好看的在线壁纸浏览网站，支持分类、搜索、预览、下载。

---

## ✨ 功能

### 🌐 壁纸站（前台）

- 🖼️ 浏览高清壁纸（瀑布流布局）
- 🏷️ 分类筛选（自然/城市/动漫/星空等）
- 🔍 关键词搜索
- 👁️ 大图预览
- ⬇️ 一键下载原图

### 🔧 管理后台

打开 `/admin` 进入：

- 🔐 管理员登录
- ⬆️ 上传新壁纸（支持 jpg/png/webp）
- 🏷️ 设置分类标签
- 📊 查看下载次数
- ✏️ 编辑/删除已上传的壁纸

---

## 🏗️ 架构

```
浏览器 → 服务器 :18082 (公网)
            ↓ 容器内 Node 服务
            ├─ /api/*  → 反代 → 宿主机 PB :8090 (内网)
            ├─ /_/*    → 反代 → 宿主机 PB :8090 (内网)
            └─ 其他    → dist/ 静态文件
```

- 浏览器只接触 18082，**同源零 CORS**
- 容器内走内网 `host.docker.internal:8090` 访问 PB
- PB 8090 端口**不对外开放**，更安全

---

## 🚀 部署

### 前提

- 服务器已装 Docker
- PocketBase 已在宿主机部署，监听 `0.0.0.0:8090`
- 云安全组开放 18082

### 步骤

```bash
# 1. 上传项目
scp -r /path/to/WallPix root@你的IP:/opt/

# 2. 启动
ssh root@你的IP
cd /opt/WallPix
cp .env.example .env
docker compose build --no-cache
docker compose up -d
```

### 访问

- 🖼️ **壁纸站**：`http://你的IP:18082/`
- 🔧 **管理后台**：`http://你的IP:18082/_/`

---

## 🛠️ 本地开发

```bash
npm install
npm run dev
# 打开 http://localhost:5173
# Vite 自动代理 /api/* → .env.local 里的服务器 PB
```

---

## 💾 数据备份

```bash
tar czf wallpix-backup-$(date +%Y%m%d).tar.gz /path/to/pb_data
```

---

## 🆘 遇到问题？

**18082 访问不到？**
- 云安全组是否开放 18082
- 容器是否启动：`docker compose ps`

**容器跑起来了但 /api/* 502？**
- 宿主机 PB 是否监听 0.0.0.0：`ss -tlnp | grep 8090`
- 看容器日志：`docker compose logs -f`
