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
RUN mkdir -p /app/db && chown -R appuser:appgroup /app/db

# 프로덕션 의존성만 설치
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# 빌드 결과물 복사
COPY --from=build /app/dist ./dist

# 포트 설정
ENV PORT=3000
EXPOSE ${PORT}

# 로컬 볼륨 마운트 권한 충돌을 피하기 위해 root 권한으로 실행되도록 주석 처리
# USER appuser

# 헬스체크
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/doc || exit 1

CMD ["node", "dist/index.js"]
