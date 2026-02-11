# KIS API - 국내주식기간별시세 (일/주/월/년)

## 기본 정보

| 항목            | 값                                                                |
| --------------- | ----------------------------------------------------------------- |
| API명           | 국내주식기간별시세(일/주/월/년)                                   |
| TR ID           | `FHKST03010100`                                                   |
| Method          | `GET`                                                             |
| URL             | `/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice` |
| 실전 도메인     | `https://openapi.koreainvestment.com:9443`                        |
| 모의투자 도메인 | `https://openapivts.koreainvestment.com:29443`                    |

## 요청 헤더

| 헤더            | 타입   | 필수 | 설명                              |
| --------------- | ------ | ---- | --------------------------------- |
| `Content-Type`  | string | Y    | `application/json; charset=utf-8` |
| `authorization` | string | Y    | `Bearer {access_token}`           |
| `appkey`        | string | Y    | 앱 키                             |
| `appsecret`     | string | Y    | 앱 시크릿                         |
| `tr_id`         | string | Y    | `FHKST03010100`                   |

## 쿼리 파라미터

| 파라미터                 | 타입   | 필수 | 설명                                           |
| ------------------------ | ------ | ---- | ---------------------------------------------- |
| `FID_COND_MRKT_DIV_CODE` | string | Y    | 시장 구분 (`J`: KRX)                           |
| `FID_INPUT_ISCD`         | string | Y    | 종목코드 (예: `005930`)                        |
| `FID_INPUT_DATE_1`       | string | Y    | 시작일 (`YYYYMMDD`)                            |
| `FID_INPUT_DATE_2`       | string | Y    | 종료일 (`YYYYMMDD`)                            |
| `FID_PERIOD_DIV_CODE`    | string | Y    | 기간 구분 (`D`: 일, `W`: 주, `M`: 월, `Y`: 년) |
| `FID_ORG_ADJ_PRC`        | string | Y    | 수정주가 (`0`: 미반영, `1`: 반영)              |

## 응답 (output2 배열)

| 필드             | 설명                      |
| ---------------- | ------------------------- |
| `stck_bsop_date` | 주식 영업 일자 (YYYYMMDD) |
| `stck_oprc`      | 시가                      |
| `stck_hgpr`      | 고가                      |
| `stck_lwpr`      | 저가                      |
| `stck_clpr`      | 종가                      |
| `acml_vol`       | 누적 거래량               |
| `acml_tr_pbmn`   | 누적 거래 대금            |
| `prdy_vrss`      | 전일 대비                 |
| `prdy_vrss_sign` | 전일 대비 부호            |
| `prdy_ctrt`      | 전일 대비율               |
| `flng_cls_code`  | 락 구분 코드              |
| `mod_yn`         | 분할/병합 여부            |

## 사용 예시

```bash
curl -X GET "https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=005930&FID_INPUT_DATE_1=20240101&FID_INPUT_DATE_2=20240131&FID_PERIOD_DIV_CODE=D&FID_ORG_ADJ_PRC=1" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "authorization: Bearer {token}" \
  -H "appkey: {appkey}" \
  -H "appsecret: {appsecret}" \
  -H "tr_id: FHKST03010100"
```

## 참고

- API 포탈: [링크](https://apiportal.koreainvestment.com/apiservice-apiservice?/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice)
