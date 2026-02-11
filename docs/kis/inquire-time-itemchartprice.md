# KIS API - 주식당일분봉조회

## 기본 정보

| 항목        | 값                                                               |
| ----------- | ---------------------------------------------------------------- |
| API명       | 주식당일분봉조회                                                 |
| TR ID       | `FHKST03010200`                                                  |
| Method      | `GET`                                                            |
| URL         | `/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice` |
| 실전 도메인 | `https://openapi.koreainvestment.com:9443`                       |
| 최대 조회   | 1회 30건                                                         |

## 요청 헤더

| 헤더            | 타입   | 필수 | 설명                              |
| --------------- | ------ | ---- | --------------------------------- |
| `Content-Type`  | string | Y    | `application/json; charset=utf-8` |
| `authorization` | string | Y    | `Bearer {access_token}`           |
| `appkey`        | string | Y    | 앱 키                             |
| `appsecret`     | string | Y    | 앱 시크릿                         |
| `tr_id`         | string | Y    | `FHKST03010200`                   |

## 쿼리 파라미터

| 파라미터                 | 타입   | 필수 | 설명                      |
| ------------------------ | ------ | ---- | ------------------------- |
| `FID_COND_MRKT_DIV_CODE` | string | Y    | 시장 구분 (`J`: KRX)      |
| `FID_INPUT_ISCD`         | string | Y    | 종목코드                  |
| `FID_INPUT_HOUR_1`       | string | Y    | 조회 시작 시간 (`HHMMSS`) |
| `FID_ETC_CLS_CODE`       | string | Y    | 기타 구분 (빈값)          |

## 응답 (output2 배열)

| 필드             | 설명               |
| ---------------- | ------------------ |
| `stck_bsop_date` | 영업 일자          |
| `stck_cntg_hour` | 체결 시간 (HHMMSS) |
| `stck_oprc`      | 시가               |
| `stck_hgpr`      | 고가               |
| `stck_lwpr`      | 저가               |
| `stck_prpr`      | 현재가             |
| `cntg_vol`       | 체결 거래량        |
| `acml_vol`       | 누적 거래량        |

## 참고

- 당일 데이터만 조회 가능
- 1회 최대 30건까지 조회 가능
- API 포탈: [링크](https://apiportal.koreainvestment.com/apiservice-apiservice?/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice)
