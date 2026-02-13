import axios, { type AxiosInstance, type AxiosError } from "axios";
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
import { KisApiError } from "./types.js";

const KIS_BASE_URL = "https://openapi.koreainvestment.com:9443";
const TOKEN_REFRESH_HOURS = 6;
const MAX_RETRY = 1; // 403 발생 시 최대 1회 재시도

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

        try {
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
        } catch (err) {
            const axiosErr = err as AxiosError;
            const status = axiosErr.response?.status || 500;
            throw new KisApiError(status, "토큰 발급 실패", "/oauth2/tokenP");
        }
    }

    /** 캐시된 토큰 무효화 */
    invalidateToken(): void {
        this.cachedToken = null;
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

    /**
     * 403 재시도 로직이 포함된 GET 요청
     * - 403 발생 시 토큰 무효화 → 재발급 → 1회 재시도
     * - 그 외 에러는 KisApiError로 래핑
     */
    private async requestWithRetry<T>(
        endpoint: string,
        trId: string,
        params: Record<string, string>,
        retryCount = 0,
    ): Promise<T> {
        try {
            const headers = await this.buildHeaders(trId);
            const { data } = await this.client.get<T>(endpoint, {
                headers,
                params,
            });
            return data;
        } catch (err) {
            const axiosErr = err as AxiosError;
            const status = axiosErr.response?.status || 500;

            // 403: 토큰 만료 → 재발급 후 재시도 (1회)
            if (status === 403 && retryCount < MAX_RETRY) {
                this.invalidateToken();
                return this.requestWithRetry<T>(
                    endpoint,
                    trId,
                    params,
                    retryCount + 1,
                );
            }

            // 그 외 에러 → KisApiError로 래핑
            const message =
                status === 403
                    ? "토큰 발급 실패 또는 유효기간 만료"
                    : status === 404
                      ? "요청한 API 경로를 찾을 수 없습니다"
                      : status === 500
                        ? "KIS 서버 내부 오류가 발생했습니다"
                        : `API 요청 실패 (${axiosErr.message})`;

            throw new KisApiError(status, message, endpoint);
        }
    }

    // ── 국내주식기간별시세 ────────────────────

    /** 국내주식기간별시세(일/주/월/년) 조회 */
    async getDailyChart(
        params: KisDailyChartParams,
    ): Promise<KisDailyChartResponse> {
        return this.requestWithRetry<KisDailyChartResponse>(
            "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
            "FHKST03010100",
            {
                FID_COND_MRKT_DIV_CODE: "J",
                FID_INPUT_ISCD: params.stockCode,
                FID_INPUT_DATE_1: params.startDate,
                FID_INPUT_DATE_2: params.endDate,
                FID_PERIOD_DIV_CODE: params.periodCode || "D",
                FID_ORG_ADJ_PRC: "1",
            },
        );
    }

    // ── 주식당일분봉조회 ─────────────────────

    /** 주식당일분봉조회 */
    async getTimeChart(
        params: KisTimeChartParams,
    ): Promise<KisTimeChartResponse> {
        return this.requestWithRetry<KisTimeChartResponse>(
            "/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice",
            "FHKST03010200",
            {
                FID_COND_MRKT_DIV_CODE: "J",
                FID_INPUT_ISCD: params.stockCode,
                FID_INPUT_HOUR_1: params.startTime || "",
                FID_ETC_CLS_CODE: "",
            },
        );
    }

    // ── 국내기관_외국인 매매종목가집계 ──────────

    /** 국내기관_외국인 매매종목가집계 조회 */
    async getForeignInstitutionTotal(
        params?: KisForeignInstitutionParams,
    ): Promise<KisForeignInstitutionResponse> {
        return this.requestWithRetry<KisForeignInstitutionResponse>(
            "/uapi/domestic-stock/v1/quotations/foreign-institution-total",
            "FHPTJ04400000",
            {
                FID_COND_MRKT_DIV_CODE: "V",
                FID_COND_SCR_DIV_CODE: "16449",
                FID_INPUT_ISCD: "0000",
                FID_DIV_CLS_CODE: "0",
                FID_RANK_SORT_CLS_CODE: params?.rankSortCode || "0",
                FID_ETC_CLS_CODE: params?.classCode || "0",
            },
        );
    }

    // ── 종목별 투자자매매동향(일별) ────────────

    /** 종목별 투자자매매동향(일별) 조회 */
    async getInvestorTradeDaily(
        params: KisInvestorTradeParams,
    ): Promise<KisInvestorTradeResponse> {
        return this.requestWithRetry<KisInvestorTradeResponse>(
            "/uapi/domestic-stock/v1/quotations/investor-trade-by-stock-daily",
            "FHKST01010900",
            {
                FID_COND_MRKT_DIV_CODE: "J",
                FID_INPUT_ISCD: params.stockCode,
            },
        );
    }
}
