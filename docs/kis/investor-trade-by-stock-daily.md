# KIS API - 종목별 투자자매매동향 (일별)

## 기본 정보

| 항목        | 값                                                                 |
| ----------- | ------------------------------------------------------------------ |
| API명       | 종목별 투자자매매동향(일별)                                        |
| Method      | `GET`                                                              |
| URL         | `/uapi/domestic-stock/v1/quotations/investor-trade-by-stock-daily` |
| 실전 도메인 | `https://openapi.koreainvestment.com:9443`                         |
| HTS 화면    | 종목별 매매동향 [6421]                                             |

## 요청 헤더

| 헤더            | 타입   | 필수 | 설명                              |
| --------------- | ------ | ---- | --------------------------------- |
| `Content-Type`  | string | Y    | `application/json; charset=utf-8` |
| `authorization` | string | Y    | `Bearer {access_token}`           |
| `appkey`        | string | Y    | 앱 키                             |
| `appsecret`     | string | Y    | 앱 시크릿                         |
| `tr_id`         | string | Y    | 거래 ID                           |

## 쿼리 파라미터

| 파라미터                 | 타입   | 필수 | 설명                    |
| ------------------------ | ------ | ---- | ----------------------- |
| `FID_COND_MRKT_DIV_CODE` | string | Y    | 시장 구분 (`J`: KRX)    |
| `FID_INPUT_ISCD`         | string | Y    | 종목코드 (예: `005930`) |

## 응답 (output 배열)

| 필드             | 설명               |
| ---------------- | ------------------ |
| `stck_bsop_date` | 영업 일자          |
| `frgn_ntby_qty`  | 외국인 순매수 수량 |
| `orgn_ntby_qty`  | 기관 순매수 수량   |
| `prsn_ntby_qty`  | 개인 순매수 수량   |
| `stck_prpr`      | 현재가(종가)       |
| `prdy_vrss`      | 전일 대비          |
| `prdy_vrss_sign` | 전일 대비 부호     |

## 참고

- 코스피/코스닥 종목에 대한 투자 주체별 순매수/누적 순매수 데이터 제공
- 실시간 데이터는 장 종료 후 오후 8시경 조회 가능
- API 포탈: [링크](https://apiportal.koreainvestment.com/apiservice-apiservice?/uapi/domestic-stock/v1/quotations/investor-trade-by-stock-daily)
