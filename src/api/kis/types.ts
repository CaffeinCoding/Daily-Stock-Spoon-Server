// KIS API 공통 타입

/** KIS API 공통 요청 헤더 */
export interface KisRequestHeaders {
    "Content-Type": string;
    authorization: string;
    appkey: string;
    appsecret: string;
    tr_id: string;
}

/** 토큰 발급 요청 바디 */
export interface KisTokenRequest {
    grant_type: "client_credentials";
    appkey: string;
    appsecret: string;
}

/** 토큰 발급 응답 */
export interface KisTokenResponse {
    access_token: string;
    access_token_token_expired: string;
    token_type: string;
    expires_in: number;
}

/** 캐시된 토큰 정보 */
export interface CachedToken {
    accessToken: string;
    expiredAt: Date;
}

// ──────────────────────────────────────────
// 국내주식기간별시세 (inquire-daily-itemchartprice)
// ──────────────────────────────────────────

export interface KisDailyChartParams {
    /** 종목코드 (ex: 005930) */
    stockCode: string;
    /** 시작일 (YYYYMMDD) */
    startDate: string;
    /** 종료일 (YYYYMMDD) */
    endDate: string;
    /** 기간 구분 D:일, W:주, M:월, Y:년 */
    periodCode?: "D" | "W" | "M" | "Y";
}

/** KIS 일봉 응답 개별 항목 */
export interface KisDailyChartItem {
    stck_bsop_date: string; // 영업일자
    stck_oprc: string; // 시가
    stck_hgpr: string; // 고가
    stck_lwpr: string; // 저가
    stck_clpr: string; // 종가
    acml_vol: string; // 누적 거래량
    acml_tr_pbmn: string; // 누적 거래대금
    prdy_vrss: string; // 전일대비
    prdy_vrss_sign: string; // 전일대비부호
    prdy_ctrt: string; // 전일대비율
    mod_yn: string; // 분할/병합 여부
}

/** KIS 일봉 API 응답 */
export interface KisDailyChartResponse {
    rt_cd: string;
    msg_cd: string;
    msg1: string;
    output1: Record<string, string>;
    output2: KisDailyChartItem[];
}

// ──────────────────────────────────────────
// 주식당일분봉조회 (inquire-time-itemchartprice)
// ──────────────────────────────────────────

export interface KisTimeChartParams {
    /** 종목코드 */
    stockCode: string;
    /** 조회 시작 시간 (HHMMSS) */
    startTime?: string;
}

/** KIS 분봉 응답 개별 항목 */
export interface KisTimeChartItem {
    stck_bsop_date: string;
    stck_cntg_hour: string; // 체결 시간
    stck_oprc: string;
    stck_hgpr: string;
    stck_lwpr: string;
    stck_prpr: string; // 현재가
    cntg_vol: string; // 체결 거래량
    acml_vol: string;
}

/** KIS 분봉 API 응답 */
export interface KisTimeChartResponse {
    rt_cd: string;
    msg_cd: string;
    msg1: string;
    output1: Record<string, string>;
    output2: KisTimeChartItem[];
}

// ──────────────────────────────────────────
// 국내기관_외국인 매매종목가집계 (foreign-institution-total)
// ──────────────────────────────────────────

export interface KisForeignInstitutionParams {
    /** 구분: 0-외국인, 1-기관, 2-전체 */
    classCode?: "0" | "1" | "2";
    /** 순위 정렬: 0-순매수, 1-순매도 */
    rankSortCode?: "0" | "1";
}

/** KIS 외국인/기관 집계 응답 개별 항목 */
export interface KisForeignInstitutionItem {
    hts_kor_isnm: string; // 종목명
    mksc_shrn_iscd: string; // 단축 종목코드
    stck_prpr: string; // 현재가
    prdy_vrss: string; // 전일대비
    prdy_vrss_sign: string; // 전일대비부호
    prdy_ctrt: string; // 전일대비율
    ntby_qty: string; // 순매수 수량
    acml_vol: string; // 누적 거래량
    seln_cnqn_smtn: string; // 매도 체결 합계
    shnu_cnqn_smtn: string; // 매수 체결 합계
}

/** KIS 외국인/기관 집계 API 응답 */
export interface KisForeignInstitutionResponse {
    rt_cd: string;
    msg_cd: string;
    msg1: string;
    output: KisForeignInstitutionItem[];
}

// ──────────────────────────────────────────
// 종목별 투자자매매동향 (investor-trade-by-stock-daily)
// ──────────────────────────────────────────

export interface KisInvestorTradeParams {
    /** 종목코드 */
    stockCode: string;
}

/** KIS 투자자매매동향 응답 개별 항목 */
export interface KisInvestorTradeItem {
    stck_bsop_date: string; // 영업일자
    frgn_ntby_qty: string; // 외국인 순매수 수량
    orgn_ntby_qty: string; // 기관 순매수 수량
    prsn_ntby_qty: string; // 개인 순매수 수량
    stck_prpr: string; // 현재가(종가)
    prdy_vrss: string; // 전일대비
    prdy_vrss_sign: string; // 전일대비부호
}

/** KIS 투자자매매동향 API 응답 */
export interface KisInvestorTradeResponse {
    rt_cd: string;
    msg_cd: string;
    msg1: string;
    output: KisInvestorTradeItem[];
}
