# 외국인/기관 매매 상위 종목 기능 개선 및 DB 추가

## 개선 방안

- 장마감 이후 외국인/기관 매매 상위 종목들을 DB에 저장하는 기능 추가
    - singleton 패턴 적용
    - Method: GET
    - Endpoint: /api/fitop-db
        - Endpoint 호출 시 DB에 데이터를 저장하는 function을 호출
    - Output:
        ```json
        {
            "buyTop": [
                {
                    "stockCode": "005930",
                    "stockName": "삼성전자",
                    "volume": 500000
                }
            ],
            "sellTop": [
                {
                    "stockCode": "000660",
                    "stockName": "SK하이닉스",
                    "volume": 300000
                }
            ],
            "date": "20240131"
        }
        ```
    - DB: nodejs sqlite
    - DB Table:

        ```sql
        CREATE TABLE fitop (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            buyTop TEXT NOT NULL,
            sellTop TEXT NOT NULL
        );
        ```

        - buyTop, sellTop은 json.stringify()를 사용하여 string 형태로 DB에 저장
        - buyTop, sellTop은 json.parse()를 사용하여 json 형태로 데이터 활용

    - DB 저장 위치: './db/fitop.db'

- '/api/fitop' 호출 시 api 호출하여 응답 데이터가 있을 경우 DB에 저장 후 return. 없을 경우 DB 데이터 확인 후 return
    - logic
        - 사용자가 '/api/fitop' 호출
        - api를 호출
            - 데이터가 있을 경우 DB에 저장(insert/update) 및 return
            - 데이터가 없을 경우
                - DB 데이터 확인 (날짜 기준)
                    - 있으면 DB 데이터 return
                    - 없으면 error return

## Docker 변경 사항

- docker-compose.yml에 DB 저장 위치를 volume으로 추가
    - volume 이름: 'fitop-db'
    - volume 경로: './db/fitop.db'
