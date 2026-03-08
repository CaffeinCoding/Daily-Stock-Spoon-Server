# 외국인/기관 매매 상위 종목 기능 관련

## 문제상황

- 외국인/기관 매매 상위 종목을 조회시 api의 response가 empty array 일 경우를 고려하지 않음
    - api의 response가 empty array 일 경우, 데이터가 있다고 판단하여 empty array를 return하는 문제 발생

## 해결방안

- api의 response가 empty array 일 경우, 데이터가 없다고 판단하여 DB 데이터를 확인하는 과정으로 넘어가도록 수정
