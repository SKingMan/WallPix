##############################################################
# WallPix Dockerfile — 单容器：Node HTTP 服务 + 反代内网 PB
#
# 架构：
#   浏览器 → :18082 (主机公网) → 容器内 :80 (Node server.js)
#                                  ├─ /api/*  → 反代 host.docker.internal:8090 (内网 PB)
#                                  ├─ /_/*    → 反代 host.docker.internal:8090
#                                  └─ 其他    → dist/ 静态文件（SPA fallback）
#
# 关键：
#   - 浏览器只接触 :18082（容器），零 CORS
#   - 容器内走内网 host.docker.internal:8090 访问 PB
#   - PB 不暴露公网 8090，更安全
##############################################################

# ============================================================
# Stage 1: 构建前端
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
        npm ci --no-audit --no-fund; \
    else \
        npm install --no-audit --no-fund; \
    fi

COPY . .

# 前端用相对路径（/api/* 同源），VITE_POCKETBASE_URL=/ 由 docker-compose 注入
ARG VITE_POCKETBASE_URL=/
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL

RUN npm run build

# ============================================================
# Stage 2: 运行时（仅 node:20-alpine）
# ============================================================
FROM node:20-alpine

WORKDIR /app

# 前端构建产物
COPY --from=builder /app/dist ./dist

# Node HTTP 服务（静态 + 反代 PB）
COPY server.js ./

# 容器内服务端口（主机端口由 docker-compose 映射）
ENV PORT=80

# 反代目标：宿主机 PB（容器内走内网）
ENV POCKETBASE_HOST=host.docker.internal
ENV POCKETBASE_PORT=8090

ENV TZ=Asia/Shanghai

EXPOSE 80

# 健康检查：检测首页 + 反代 PB
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
