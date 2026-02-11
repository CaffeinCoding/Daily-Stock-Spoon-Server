# Daily Stock Spoon Utils

Daily Stock Spoon 서비스에서 사용하기 위한 유틸리티 서버

## Enviroment

- KIS_APPKEY
- KIS_APPSECRET
- GOOGLE_SEARCH_ID
- GOOGLE_SEARCH_API_KEY

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
        - google custom search api query parameter [링크](https://developers.google.com/custom-search/v1/reference/rest/v1/cse/list)
    - logic
        - getForeignInstitutionTop10 api를 활용해 기관과 외국인 순매수 상위 종목 10개와 순매도 상위 종목 10개를 수집
        - google custom search api와 getNewsFromUrl api를 활용해 각 종목의 최신 뉴스 데이터를 수집
        - 수집한 뉴스 데이터를 정리하여 return
- getNewsFromUrl: url을 이용해 뉴스 데이터를 크롤링 및 해당 데이터를 return
    - input: url
    - output: 뉴스 데이터 (json object)

## Tech Stack

- nodejs
- typescript
- Hono + @hono/zod-openapi + @hono/swagger-ui
- axios
- zod
- @mozilla/readability
- jsdom
- dotenv
- vitest

### API

- KIS(한국투자증권) api
- Google Custom Search api

## Directory Structure

```
.
├── src
│   ├── api
│   │   ├── kis
│   │   │   ├── index.ts          # KIS API 클라이언트
│   │   │   ├── types.ts          # KIS 타입 정의
│   │   │   └── kis.test.ts
│   │   └── google
│   │       ├── index.ts          # Google Search 클라이언트
│   │       ├── types.ts          # Google 타입 정의
│   │       └── google.test.ts
│   ├── utils
│   │   ├── getStockChart.ts
│   │   ├── getForeignInstitutionTop10.ts
│   │   ├── getStockNews.ts
│   │   ├── getNewsFromUrl.ts
│   │   └── utils.test.ts
│   ├── index.ts                  # Hono + OpenAPI + Swagger UI 서버
│   └── server.test.ts
├── docs
│   ├── Product.md
│   ├── Architecture.md
│   ├── HowToUse.md
│   ├── google-custom-search.md
│   └── kis/                      # KIS API 문서 4개
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

### Swagger UI

서버 실행 후 브라우저에서 API를 인터랙티브하게 테스트할 수 있습니다.

- **Swagger UI**: `http://localhost:3000/swagger`
- **OpenAPI JSON**: `http://localhost:3000/doc`

### 문서

- [Product.md](./docs/Product.md) — 제품 요구사항
- [Architecture.md](./docs/Architecture.md) — 시스템 아키텍처
- [Google Custom Search API](./docs/google-custom-search.md)
- KIS API 문서 — `docs/kis/`

## 참고사항

- kis(한국투자증권) api를 사용하기 위해서는 접근토근을 발급받아서 이용해야된다.
    - [발급링크](https://apiportal.koreainvestment.com/apiservice-apiservice?/oauth2/tokenP)
    - [발급폐기](https://apiportal.koreainvestment.com/apiservice-apiservice?/oauth2/revokeP)
    - 유효기간: 24시간
    - 갱신주기: 6시간
- 모든 주가는 수정주가가 반영된 상태
