import axios, { type AxiosInstance } from "axios";
import type {
    CachedToken,
    KisTokenRequest,
    KisTokenResponse,
    KisDailyChartParams,
    KisDailyChartResponse,
    KisTimeChartParams,
    KisTimeChartResponse,
    KisForeignInstitutionParams,
    KisForeignInstitutionResponse,
    KisInvestorTradeParams,
    KisInvestorTradeResponse,
} from "./types.js";

const KIS_BASE_URL = "https://openapi.koreainvestment.com:9443";
const TOKEN_REFRESH_HOURS = 6;

export class KisApiClient {
    private appKey: string;
    private appSecret: string;
    private client: AxiosInstance;
    private cachedToken: CachedToken | null = null;

    constructor(appKey: string, appSecret: string) {
        this.appKey = appKey;
        this.appSecret = appSecret;
        this.client = axios.create({
            baseURL: KIS_BASE_URL,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
        });
    }

    // ── 토큰 관리 ────────────────────────────

    /** 접근토큰 발급 (캐시 활용) */
    async getAccessToken(): Promise<string> {
        // 캐시된 토큰이 유효하면 재사용
        if (this.cachedToken && this.cachedToken.expiredAt > new Date()) {
            return this.cachedToken.accessToken;
        }

        const body: KisTokenRequest = {
            grant_type: "client_credentials",
            appkey: this.appKey,
            appsecret: this.appSecret,
        };

        const { data } = await this.client.post<KisTokenResponse>(
            "/oauth2/tokenP",
            body,
        );

        // 갱신주기 6시간으로 캐시
        const expiredAt = new Date();
        expiredAt.setHours(expiredAt.getHours() + TOKEN_REFRESH_HOURS);

        this.cachedToken = {
            accessToken: data.access_token,
            expiredAt,
        };

        return data.access_token;
    }

    /** 공통 헤더 생성 */
    private async buildHeaders(trId: string) {
        const token = await this.getAccessToken();
        return {
            authorization: `Bearer ${token}`,
            appkey: this.appKey,
            appsecret: this.appSecret,
            tr_id: trId,
        };
    }

    // ── 국내주식기간별시세 ────────────────────

    /** 국내주식기간별시세(일/주/월/년) 조회 */
    async getDailyChart(
        params: KisDailyChartParams,
    ): Promise<KisDailyChartResponse> {
        const headers = await this.buildHeaders("FHKST03010100");

        const { data } = await this.client.get<KisDailyChartResponse>(
            "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
            {
                headers,
                params: {
                    FID_COND_MRKT_DIV_CODE: "J",
                    FID_INPUT_ISCD: params.stockCode,
                    FID_INPUT_DATE_1: params.startDate,
                    FID_INPUT_DATE_2: params.endDate,
                    FID_PERIOD_DIV_CODE: params.periodCode || "D",
                    FID_ORG_ADJ_PRC: "1", // 수정주가 반영
                },
            },
        );

        return data;
    }

    // ── 주식당일분봉조회 ─────────────────────

    /** 주식당일분봉조회 */
    async getTimeChart(
        params: KisTimeChartParams,
    ): Promise<KisTimeChartResponse> {
        const headers = await this.buildHeaders("FHKST03010200");

        const { data } = await this.client.get<KisTimeChartResponse>(
            "/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice",
            {
                headers,
                params: {
                    FID_COND_MRKT_DIV_CODE: "J",
                    FID_INPUT_ISCD: params.stockCode,
                    FID_INPUT_HOUR_1: params.startTime || "",
                    FID_ETC_CLS_CODE: "",
                },
            },
        );

        return data;
    }

    // ── 국내기관_외국인 매매종목가집계 ──────────

    /** 국내기관_외국인 매매종목가집계 조회 */
    async getForeignInstitutionTotal(
        params?: KisForeignInstitutionParams,
    ): Promise<KisForeignInstitutionResponse> {
        const headers = await this.buildHeaders("FHPTJ04400000");

        const { data } = await this.client.get<KisForeignInstitutionResponse>(
            "/uapi/domestic-stock/v1/quotations/foreign-institution-total",
            {
                headers,
                params: {
                    FID_COND_MRKT_DIV_CODE: "V",
                    FID_COND_SCR_DIV_CODE: "16449",
                    FID_INPUT_ISCD: "0000",
                    FID_DIV_CLS_CODE: "0", // 수량 기준
                    FID_RANK_SORT_CLS_CODE: params?.rankSortCode || "0",
                    FID_ETC_CLS_CODE: params?.classCode || "0",
                },
            },
        );

        return data;
    }

    // ── 종목별 투자자매매동향(일별) ────────────

    /** 종목별 투자자매매동향(일별) 조회 */
    async getInvestorTradeDaily(
        params: KisInvestorTradeParams,
    ): Promise<KisInvestorTradeResponse> {
        const headers = await this.buildHeaders("FHKST01010900");

        const { data } = await this.client.get<KisInvestorTradeResponse>(
            "/uapi/domestic-stock/v1/quotations/investor-trade-by-stock-daily",
            {
                headers,
                params: {
                    FID_COND_MRKT_DIV_CODE: "J",
                    FID_INPUT_ISCD: params.stockCode,
                },
            },
        );

        return data;
    }
}
