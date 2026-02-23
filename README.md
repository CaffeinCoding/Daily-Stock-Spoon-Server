# Daily Stock Spoon Utils

Daily Stock Spoon 서비스에서 사용하기 위한 유틸리티 서버

## Environment

- PORT (기본 3000)
- KIS_APPKEY
- KIS_APPSECRET

## Features

- getStockChart: 주식 종목의 차트 데이터를 return
    - input: 종목 코드
    - --startDate: 차트 시작일
    - --endDate: 차트 종료일 (default 당일)
    - output: 주식 종목의 차트 데이터 (json object)
    - api
        - kis [국내주식기간별시세(일/주/월/년)](https://apiportal.koreainvestment.com/apiservice-apiservice?/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice) 활용
        - kis [주식당일분봉조회](https://apiportal.koreainvestment.com/apiservice-apiservice?/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice) 활용
- getForeignInstitutionTop10: 외국인/기 상위 10개 종목의 데이터를 return
    - input: 없음
    - output: 외국인/기관 상위 10개 종목의 데이터 (json object)
    - api
        - kis [국내기관\_외국인 매매종목가집계](https://apiportal.koreainvestment.com/apiservice-apiservice?/uapi/domestic-stock/v1/quotations/foreign-institution-total)
        - kis [종목별 투자자매매동향(일별)](https://apiportal.koreainvestment.com/apiservice-apiservice?/uapi/domestic-stock/v1/quotations/investor-trade-by-stock-daily)
    - logic
        - 장마감 전
            - 국내기관 외국인 매매종목가집계만 활용하여 순매수 상위 종목 10개와 각 종목별 순매수량을 수집
            - 국내기관 외국인 매매종목가집계만 활용하여 순매도 상위 종목 10개와 각 종목별 순매도량을 수집
        - 장마감 후
            - 국내기관 외국인 매매종목가집계로 순매수 상위 종목 10개와 순매도 상위 종목 10개를 수집
            - 수집한 종목들과 종목별 투자자매매동향을 활용해 당일 실제 종목별 순매수량과 순매도량을 수집.
            - 수집한 자료들을 정리하여 return
- getStockNews: 주식 종목의 최신 뉴스 데이터를 return
    - input: 종목 코드
    - --len: 뉴스 기간 (당일 기준, 1d, 1w, 1m)
    - output: 주식 종목의 최신 뉴스 데이터 (json object)
    - api
        - Google News RSS 피드 (cheerio로 파싱)
    - logic
        - len 파라미터(1d, 1w, 1m)를 기반으로 날짜(day)별로 구간을 나누어 Google News RSS 피드를 통해 뉴스 검색
        - resolveGoogleNewsUrl로 Google News 리다이렉트 URL을 원본 URL로 변환
        - 각 일자별로 최대 50개의 뉴스를 확인 후 bigram Dice coefficient 기반 중복 뉴스 제거 (유사도 ≥ 0.6)
        - 일별로 중복이 제거된 기사 중 최대 5개의 뉴스를 선별하여 전체 목록 반환
- getNewsFromUrl: url을 이용해 뉴스 데이터를 크롤링 및 해당 데이터를 return
    - input: url
    - output: 뉴스 데이터 (json object)
    - 기술: `@extractus/article-extractor`

## Tech Stack

- nodejs
- typescript
- Hono + @hono/zod-openapi + @hono/swagger-ui
- axios
- cheerio
- @extractus/article-extractor
- zod
- dotenv
- vitest
- Docker

### API

- KIS(한국투자증권) api
- Google News RSS

## Directory Structure

```
.
├── src
│   ├── api
│   │   ├── kis
│   │   │   ├── index.ts          # KIS API 클라이언트 (토큰 자동 발급/재시도)
│   │   │   ├── types.ts          # KIS 타입 정의 (KisApiError 포함)
│   │   │   └── kis.test.ts
│   │   ├── google
│   │   │   ├── index.ts          # Google Custom Search 클라이언트 (레거시)
│   │   │   ├── types.ts          # Google 타입 정의
│   │   │   └── google.test.ts
│   │   └── googleNews
│   │       ├── index.ts          # Google News RSS 클라이언트
│   │       └── googleNews.test.ts
│   ├── utils
│   │   ├── getStockChart.ts
│   │   ├── getForeignInstitutionTop10.ts
│   │   ├── getStockNews.ts       # 뉴스 조회 + 중복 제거
│   │   ├── getNewsFromUrl.ts     # URL 뉴스 본문 추출
│   │   ├── resolveGoogleNewsUrl.ts   # Google News 리다이렉트 URL 해결
│   │   ├── resolveGoogleNewsUrl.test.ts
│   │   └── utils.test.ts
│   ├── index.ts                  # Hono + OpenAPI + Swagger UI 서버
│   └── server.test.ts
├── docs
│   ├── Product.md
│   ├── Architecture.md
│   ├── HowToUse.md
│   ├── google-custom-search.md
│   ├── dev/                      # 개발 이슈/계획 문서
│   └── kis/                      # KIS API 문서 4개
├── Dockerfile                    # Multi-stage 프로덕션 빌드
├── docker-compose.yml            # Docker Compose 설정
├── .dockerignore
├── .env
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── tsconfig.json
```

## Path

```json
- /api/chart
    - POST
    - body:
    {
        stockCode: string,
        startDate: string,
        endDate: string
    }
    - response:
        {
            stockCode: string,
            chart:
            [
                {
                    date: string,
                    open: number,
                    high: number,
                    low: number,
                    close: number,
                    volume: number
                }
            ],
            startDate: string,
            endDate: string
        }
- /api/fitop
    - GET
    - response:
        {
            buyTop:
            [
                {
                    stockCode: string,
                    stockName: string,
                    volume: number
                }
            ],
            sellTop:
            [
                {
                    stockCode: string,
                    stockName: string,
                    volume: number
                }
            ],
            date: string
        }
- /api/news
    - POST
    - body: { stockCode: string, len: string}
    - response:
        {
            stockCode: string,
            stockName: string,
            news:
            [
                {
                    title: string,
                    url: string,
                    date: string,
                    snippet: string
                }
            ]
        }
- /api/news-from-url
    - POST
    - body: { url: string}
    - response:
        {
            title: string,
            url: string,
            date: string,
            content: string
        }
```

## 사용방법

👉 **[HowToUse.md](./docs/HowToUse.md)** — 설치, 환경변수 설정, API 사용법 (curl 예시 포함)

### Docker로 실행

```bash
# .env 파일 설정 후 실행
docker compose up -d

# 커스텀 포트로 실행
PORT=8080 docker compose up -d
```

### Swagger UI

서버 실행 후 브라우저에서 API를 인터랙티브하게 테스트할 수 있습니다.

- **Swagger UI**: `http://localhost:3000/swagger`
- **OpenAPI JSON**: `http://localhost:3000/doc`

### 문서

- [Product.md](./docs/Product.md) — 제품 요구사항
- [Architecture.md](./docs/Architecture.md) — 시스템 아키텍처
- [Google Custom Search API](./docs/google-custom-search.md) — (레거시, 현재 Google News RSS 사용)
- KIS API 문서 — `docs/kis/`

## 참고사항

- kis(한국투자증권) api를 사용하기 위해서는 접근토근을 발급받아서 이용해야된다.
    - [발급링크](https://apiportal.koreainvestment.com/apiservice-apiservice?/oauth2/tokenP)
    - [발급폐기](https://apiportal.koreainvestment.com/apiservice-apiservice?/oauth2/revokeP)
    - 유효기간: 24시간
    - 갱신주기: 6시간
    - 403 에러 시 자동 토큰 재발급 및 1회 재시도
- 모든 주가는 수정주가가 반영된 상태
