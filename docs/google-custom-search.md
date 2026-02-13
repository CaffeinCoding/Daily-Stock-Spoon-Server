# Google Custom Search API - cse.list (레거시)

> **⚠️ 참고**: 현재 뉴스 검색은 Google News RSS 피드(`api/googleNews`)를 사용합니다. 이 문서는 참고용으로 유지됩니다.

## 기본 정보

| 항목   | 값                                                    |
| ------ | ----------------------------------------------------- |
| API명  | Custom Search JSON API                                |
| Method | `GET`                                                 |
| URL    | `https://customsearch.googleapis.com/customsearch/v1` |
| 인증   | API Key (쿼리 파라미터)                               |

## 쿼리 파라미터

### 필수 파라미터

| 파라미터 | 타입   | 설명                          |
| -------- | ------ | ----------------------------- |
| `key`    | string | Google API 키                 |
| `cx`     | string | Programmable Search Engine ID |
| `q`      | string | 검색 쿼리                     |

### 주요 선택 파라미터

| 파라미터       | 타입    | 설명                                              |
| -------------- | ------- | ------------------------------------------------- |
| `dateRestrict` | string  | 기간 필터 (`d[N]`: N일, `w[N]`: N주, `m[N]`: N월) |
| `num`          | integer | 결과 수 (1~10, 기본 10)                           |
| `start`        | integer | 시작 인덱스 (기본 1, 최대 100)                    |
| `gl`           | string  | 지역 코드 (예: `kr`)                              |
| `sort`         | string  | 정렬 (예: `date`)                                 |

## 응답

### Search 객체

```json
{
    "items": [
        {
            "title": "뉴스 제목",
            "link": "https://example.com/article",
            "snippet": "뉴스 요약...",
            "pagemap": {
                "metatags": [
                    {
                        "article:published_time": "2024-01-30T09:00:00+09:00"
                    }
                ]
            }
        }
    ],
    "searchInformation": {
        "totalResults": "100"
    }
}
```

### 주요 응답 필드 (items[])

| 필드               | 설명                       |
| ------------------ | -------------------------- |
| `title`            | 검색 결과 제목             |
| `link`             | URL                        |
| `snippet`          | 텍스트 스니펫              |
| `pagemap.metatags` | 페이지 메타 정보 (날짜 등) |

## 사용 예시

```bash
curl "https://customsearch.googleapis.com/customsearch/v1?key={API_KEY}&cx={SEARCH_ID}&q=삼성전자+주식&dateRestrict=d7&num=10&gl=kr"
```

## 제한사항

- 무료: 일 100회 쿼리
- 결과 최대 100개 (start + num ≤ 100)
- num 최대 10

## 참고

- 공식 문서: [cse.list](https://developers.google.com/custom-search/v1/reference/rest/v1/cse/list)
