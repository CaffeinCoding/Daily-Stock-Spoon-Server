# Daily Stock Spoon - 사용 방법

## 사전 준비

### 1. Node.js 설치

- [Node.js](https://nodejs.org/) v18 이상 필요

### 2. API 키 발급

#### KIS(한국투자증권)

1. [한국투자증권 개발자센터](https://apiportal.koreainvestment.com/) 회원가입
2. API 서비스 신청 → **앱 키(APPKEY)**, **앱 시크릿(APPSECRET)** 발급
3. 접근토큰은 서버가 자동으로 발급/캐싱 처리 (유효기간 24시간, 갱신 6시간)

#### Google Custom Search

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. **Custom Search API** 활성화 → **API 키** 발급
3. [Programmable Search Engine](https://programmablesearchengine.google.com/) 생성 → **검색 엔진 ID** 확인

### 3. 환경변수 설정

`.env.example`을 `.env`로 복사 후 값 입력:

```bash
cp .env.example .env
```

```env
KIS_APPKEY=발급받은_앱키
KIS_APPSECRET=발급받은_앱시크릿
GOOGLE_SEARCH_ID=검색엔진_ID
GOOGLE_SEARCH_API_KEY=구글_API_키
```

---

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (hot reload)
npm run dev

# 프로덕션 빌드
npm run build
npm start

# 테스트 실행
npm test
```

서버 실행 후:

- **API 서버**: `http://localhost:3000`
- **Swagger UI**: `http://localhost:3000/swagger` — 브라우저에서 API를 인터랙티브하게 테스트
- **OpenAPI JSON**: `http://localhost:3000/doc` — OpenAPI 3.0 스펙 문서

---

## API 사용법

### 1. 주식 차트 조회 — `POST /api/chart`

종목의 일봉 차트 데이터를 조회합니다. (수정주가 반영)

```bash
curl -X POST http://localhost:3000/api/chart \
  -H "Content-Type: application/json" \
  -d '{
    "stockCode": "005930",
    "startDate": "20240101",
    "endDate": "20240131"
  }'
```

| 파라미터    | 타입   | 필수 | 설명                    |
| ----------- | ------ | ---- | ----------------------- |
| `stockCode` | string | ✅   | 종목코드 (ex: `005930`) |
| `startDate` | string | ✅   | 시작일 (`YYYYMMDD`)     |
| `endDate`   | string |      | 종료일 (기본: 당일)     |

**응답 예시:**

```json
{
    "stockCode": "005930",
    "chart": [
        {
            "date": "20240130",
            "open": 73800,
            "high": 74200,
            "low": 73600,
            "close": 74000,
            "volume": 10987654
        },
        {
            "date": "20240131",
            "open": 74000,
            "high": 74500,
            "low": 73500,
            "close": 74200,
            "volume": 12345678
        }
    ],
    "startDate": "20240101",
    "endDate": "20240131"
}
```

---

### 2. 외국인/기관 매매 TOP10 — `GET /api/fitop`

외국인 순매수/순매도 상위 10개 종목을 조회합니다.

```bash
curl http://localhost:3000/api/fitop
```

> 장마감 전(15:30 이전)에는 가집계 데이터, 이후에는 실제 매매량 보정 데이터를 반환합니다.

**응답 예시:**

```json
{
    "buyTop": [
        { "stockCode": "005930", "stockName": "삼성전자", "volume": 500000 }
    ],
    "sellTop": [
        { "stockCode": "000660", "stockName": "SK하이닉스", "volume": 300000 }
    ],
    "date": "20240131"
}
```

---

### 3. 종목 뉴스 조회 — `POST /api/news`

종목 관련 최신 뉴스를 검색합니다.

```bash
curl -X POST http://localhost:3000/api/news \
  -H "Content-Type: application/json" \
  -d '{
    "stockCode": "005930",
    "stockName": "삼성전자",
    "len": "1w"
  }'
```

| 파라미터    | 타입   | 필수 | 설명                                    |
| ----------- | ------ | ---- | --------------------------------------- |
| `stockCode` | string | ✅   | 종목코드                                |
| `stockName` | string |      | 종목명 (검색 키워드로 사용)             |
| `len`       | string |      | 기간: `1d`(1일), `1w`(1주), `1m`(1개월) |

---

### 4. URL 뉴스 크롤링 — `POST /api/news-from-url`

URL에서 뉴스 본문을 추출합니다.

```bash
curl -X POST http://localhost:3000/api/news-from-url \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://example.com/news/article/123" }'
```

**응답 예시:**

```json
{
    "title": "기사 제목",
    "url": "https://example.com/news/article/123",
    "date": "2024-01-30",
    "content": "기사 본문 텍스트..."
}
```

---

## 프로젝트 구조

자세한 아키텍처 및 API 문서는 `docs/` 디렉토리를 참고하세요:

- [Product.md](./docs/Product.md) — 제품 요구사항
- [Architecture.md](./docs/Architecture.md) — 시스템 아키텍처
- KIS API 문서 — `docs/kis/`
- [Google Custom Search API](./docs/google-custom-search.md)
