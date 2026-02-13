# ── Stage 1: 의존성 설치 ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: TypeScript 빌드 ──
FROM deps AS build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Stage 3: 프로덕션 실행 ──
FROM node:22-alpine AS production
WORKDIR /app

# 보안: non-root 사용자
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 프로덕션 의존성만 설치
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# 빌드 결과물 복사
COPY --from=build /app/dist ./dist

# 포트 설정
ENV PORT=3000
EXPOSE ${PORT}

# non-root 사용자로 전환
USER appuser

# 헬스체크
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/doc || exit 1

CMD ["node", "dist/index.js"]
