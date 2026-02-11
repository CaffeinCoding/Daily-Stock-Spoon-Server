# KIS API - 국내기관\_외국인 매매종목가집계

## 기본 정보

| 항목        | 값                                                             |
| ----------- | -------------------------------------------------------------- |
| API명       | 국내기관\_외국인 매매종목가집계                                |
| TR ID       | `FHPTJ04400000`                                                |
| Method      | `GET`                                                          |
| URL         | `/uapi/domestic-stock/v1/quotations/foreign-institution-total` |
| 실전 도메인 | `https://openapi.koreainvestment.com:9443`                     |

## 요청 헤더

| 헤더            | 타입   | 필수 | 설명                              |
| --------------- | ------ | ---- | --------------------------------- |
| `Content-Type`  | string | Y    | `application/json; charset=utf-8` |
| `authorization` | string | Y    | `Bearer {access_token}`           |
| `appkey`        | string | Y    | 앱 키                             |
| `appsecret`     | string | Y    | 앱 시크릿                         |
| `tr_id`         | string | Y    | `FHPTJ04400000`                   |

## 쿼리 파라미터

| 파라미터                 | 타입   | 필수 | 설명                                     |
| ------------------------ | ------ | ---- | ---------------------------------------- |
| `FID_COND_MRKT_DIV_CODE` | string | Y    | 시장 구분 (`V`: 전체, `J`: KRX)          |
| `FID_COND_SCR_DIV_CODE`  | string | Y    | 화면 구분 (`16449`)                      |
| `FID_INPUT_ISCD`         | string | Y    | 종목코드 (`0000`: 전체)                  |
| `FID_DIV_CLS_CODE`       | string | Y    | 구분 (`0`: 수량, `1`: 금액)              |
| `FID_RANK_SORT_CLS_CODE` | string | Y    | 순위 정렬 (`0`: 순매수, `1`: 순매도)     |
| `FID_ETC_CLS_CODE`       | string | Y    | 구분 (`0`: 외국인, `1`: 기관, `2`: 전체) |

## 응답 (output 배열)

| 필드              | 설명           |
| ----------------- | -------------- |
| `hts_kor_isnm`    | 종목명         |
| `mksc_shrn_iscd`  | 단축 종목코드  |
| `stck_prpr`       | 현재가         |
| `prdy_vrss`       | 전일 대비      |
| `prdy_vrss_sign`  | 전일 대비 부호 |
| `prdy_ctrt`       | 전일 대비율    |
| `ntby_qty`        | 순매수 수량    |
| `acml_vol`        | 누적 거래량    |
| `total_askp_rsqn` | 총 매도 잔량   |
| `total_bidp_rsqn` | 총 매수 잔량   |
| `seln_cnqn_smtn`  | 매도 체결 합계 |
| `shnu_cnqn_smtn`  | 매수 체결 합계 |

## 데이터 업데이트 시점

| 주체   | 업데이트 시간              |
| ------ | -------------------------- |
| 외국인 | 09:30, 11:20, 13:20, 14:30 |
| 기관   | 10:00, 11:20, 13:20, 14:30 |

> 실제 입력 시간은 ±10분 차이 발생. 시장 상황에 따라 변동 가능.

## 참고

- API 포탈: [링크](https://apiportal.koreainvestment.com/apiservice-apiservice?/uapi/domestic-stock/v1/quotations/foreign-institution-total)
