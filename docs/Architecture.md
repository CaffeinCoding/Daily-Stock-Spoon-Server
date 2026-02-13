# Daily Stock Spoon - Architecture 문서

## 시스템 아키텍처

```
┌──────────────────────────────────────────────────────┐
│                    Hono Server                        │
│                   (src/index.ts)                      │
│                                                      │
│  POST /api/chart ──── getStockChart()                │
│  GET  /api/fitop ──── getForeignInstitutionTop10()   │
│  POST /api/news  ──── getStockNews()                 │
│  POST /api/news-from-url ── getNewsFromUrl()         │
└──────────────┬───────────────────┬───────────────────┘
               │                   │
        ┌──────┴──────┐     ┌──────┴──────┐
        │  utils/     │     │  utils/     │
        │ 비즈니스     │     │ 크롤링      │
        │ 로직 계층    │     │ 계층        │
        └──────┬──────┘     └──────┬──────┘
               │                   │
     ┌─────────┴─────────┐        │
     │                   │        │
┌────┴────┐     ┌────────┴──┐  ┌──┴──────────────────┐
│ KIS API │     │Google News│  │ article-extractor   │
│ Client  │     │RSS Client │  │ (@extractus)        │
│(api/kis)│     │(api/gNews)│  │                     │
└────┬────┘     └────┬──────┘  └─────────────────────┘
     │               │
     ▼               ▼
┌─────────┐   ┌──────────────────┐
│ KIS     │   │ Google News      │
│ OpenAPI │   │ RSS Feed         │
└─────────┘   └──────────────────┘
```

## 디렉토리 구조

```
daily-stock-spoon/
├── src/
│   ├── api/
│   │   ├── kis/
│   │   │   ├── index.ts         # KIS API 클라이언트 (토큰, 시세, 매매동향, 403 재시도)
│   │   │   ├── types.ts         # KIS 요청/응답 타입 정의 + KisApiError
│   │   │   └── kis.test.ts
│   │   ├── google/
│   │   │   ├── index.ts         # Google Custom Search 클라이언트 (레거시)
│   │   │   ├── types.ts         # Google 검색 타입 정의
│   │   │   └── google.test.ts
│   │   └── googleNews/
│   │       ├── index.ts         # Google News RSS 클라이언트 (cheerio 파싱)
│   │       └── googleNews.test.ts
│   ├── utils/
│   │   ├── getStockChart.ts     # 주식 차트 데이터 조회
│   │   ├── getForeignInstitutionTop10.ts  # 외국인/기관 TOP10
│   │   ├── getStockNews.ts      # 종목 뉴스 조회 + 중복 제거
│   │   ├── getNewsFromUrl.ts    # URL 뉴스 본문 추출 (@extractus/article-extractor)
│   │   ├── resolveGoogleNewsUrl.ts   # Google News 리다이렉트 URL → 원본 URL
│   │   ├── resolveGoogleNewsUrl.test.ts
│   │   └── utils.test.ts
│   ├── index.ts                 # Hono 서버 엔트리포인트
│   └── server.test.ts
├── docs/                        # 협업 문서
├── .env                         # 환경변수 (git 제외)
├── .env.example                 # 환경변수 템플릿
├── package.json
├── tsconfig.json
└── README.md
```

## 계층 구조

### 1. API 계층 (`src/api/`)

외부 API와의 통신을 담당. HTTP 요청/응답, 인증, 에러 핸들링을 캡슐화.

| 모듈             | 역할                             | 외부 API            |
| ---------------- | -------------------------------- | ------------------- |
| `api/kis`        | 한국투자증권 REST API 클라이언트 | KIS OpenAPI         |
| `api/google`     | Google Custom Search 클라이언트  | Google CSE (레거시) |
| `api/googleNews` | Google News RSS 피드 클라이언트  | Google News RSS     |

### 2. 유틸리티 계층 (`src/utils/`)

비즈니스 로직 담당. API 계층을 조합하여 서비스 요구사항 구현.

| 모듈                         | 의존 API / 라이브러리                                |
| ---------------------------- | ---------------------------------------------------- |
| `getStockChart`              | KIS (기간별시세)                                     |
| `getForeignInstitutionTop10` | KIS (외국인/기관 집계 + 투자자매매동향)              |
| `getStockNews`               | Google News RSS + `resolveGoogleNewsUrl` + 중복 제거 |
| `getNewsFromUrl`             | `@extractus/article-extractor`                       |
| `resolveGoogleNewsUrl`       | Google News batchexecute API (리다이렉트 URL 해결)   |

### 3. 서버 계층 (`src/index.ts`)

Hono 기반 HTTP 서버. 라우팅, 입력값 검증, 에러 핸들링.

## 데이터 흐름

### 차트 조회 (`POST /api/chart`)

```mermaid
sequenceDiagram
    Client->>Hono: POST /api/chart {stockCode, startDate, endDate}
    Hono->>getStockChart: 종목코드, 기간
    getStockChart->>KIS API: 토큰 발급 (캐시 확인)
    KIS API-->>getStockChart: access_token
    getStockChart->>KIS API: 기간별시세 조회
    KIS API-->>getStockChart: OHLCV raw data
    getStockChart-->>Hono: 정제된 차트 데이터
    Hono-->>Client: JSON Response
```

### 외국인/기관 TOP10 (`GET /api/fitop`)

```mermaid
sequenceDiagram
    Client->>Hono: GET /api/fitop
    Hono->>getForeignInstitutionTop10: 호출
    getForeignInstitutionTop10->>KIS API: 외국인/기관 매매종목가집계
    KIS API-->>getForeignInstitutionTop10: 상위 종목 리스트
    alt 장마감 후
        getForeignInstitutionTop10->>KIS API: 종목별 투자자매매동향 (종목별)
        KIS API-->>getForeignInstitutionTop10: 실제 매매량
    end
    getForeignInstitutionTop10-->>Hono: TOP10 데이터
    Hono-->>Client: JSON Response
```

### 종목 뉴스 조회 (`POST /api/news`)

```mermaid
sequenceDiagram
    Client->>Hono: POST /api/news {stockCode, stockName, len}
    Hono->>getStockNews: 종목코드, 종목명, 기간
    getStockNews->>GoogleNewsClient: RSS 피드 검색
    GoogleNewsClient-->>getStockNews: 뉴스 아이템 리스트 (리다이렉트 URL)
    getStockNews->>resolveGoogleNewsUrl: URL 변환 (batchexecute)
    resolveGoogleNewsUrl-->>getStockNews: 원본 뉴스 URL
    getStockNews->>getStockNews: 중복 제거 (Dice coefficient ≥ 0.6)
    getStockNews-->>Hono: 뉴스 데이터
    Hono-->>Client: JSON Response
```

## 기술 스택

| 분류        | 기술                         | 용도                              |
| ----------- | ---------------------------- | --------------------------------- |
| Runtime     | Node.js                      | 서버 실행 환경                    |
| Language    | TypeScript                   | 타입 안전성                       |
| Framework   | Hono                         | 경량 웹 프레임워크                |
| HTTP Client | axios                        | API 호출                          |
| 뉴스 검색   | Google News RSS + cheerio    | 뉴스 검색 및 RSS 파싱             |
| 뉴스 파싱   | @extractus/article-extractor | URL→기사 본문 추출                |
| URL 변환    | resolveGoogleNewsUrl         | Google News 리다이렉트 → 원본 URL |
| 환경변수    | dotenv                       | .env 파일 로드                    |
| 테스트      | vitest                       | 단위/통합 테스트                  |
