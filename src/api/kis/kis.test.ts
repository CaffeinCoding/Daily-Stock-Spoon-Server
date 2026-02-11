import { describe, it, expect, vi, beforeEach } from "vitest";
import { KisApiClient } from "./index.js";
import axios from "axios";

// axios mock
vi.mock("axios", () => {
    const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(),
    };
    return {
        default: {
            create: vi.fn(() => mockAxiosInstance),
        },
    };
});

// Mock 데이터
const mockTokenResponse = {
    data: {
        access_token: "test-access-token-12345",
        access_token_token_expired: "2024-12-31 23:59:59",
        token_type: "Bearer",
        expires_in: 86400,
    },
};

const mockDailyChartResponse = {
    data: {
        rt_cd: "0",
        msg_cd: "MCA00000",
        msg1: "정상처리",
        output1: {
            hts_kor_isnm: "삼성전자",
            stck_shrn_iscd: "005930",
        },
        output2: [
            {
                stck_bsop_date: "20240131",
                stck_oprc: "74000",
                stck_hgpr: "74500",
                stck_lwpr: "73500",
                stck_clpr: "74200",
                acml_vol: "12345678",
                acml_tr_pbmn: "915000000000",
                prdy_vrss: "200",
                prdy_vrss_sign: "2",
                prdy_ctrt: "0.27",
                mod_yn: "N",
            },
            {
                stck_bsop_date: "20240130",
                stck_oprc: "73800",
                stck_hgpr: "74200",
                stck_lwpr: "73600",
                stck_clpr: "74000",
                acml_vol: "10987654",
                acml_tr_pbmn: "812000000000",
                prdy_vrss: "-100",
                prdy_vrss_sign: "5",
                prdy_ctrt: "-0.14",
                mod_yn: "N",
            },
        ],
    },
};

const mockTimeChartResponse = {
    data: {
        rt_cd: "0",
        msg_cd: "MCA00000",
        msg1: "정상처리",
        output1: {},
        output2: [
            {
                stck_bsop_date: "20240131",
                stck_cntg_hour: "153000",
                stck_oprc: "74100",
                stck_hgpr: "74200",
                stck_lwpr: "74000",
                stck_prpr: "74200",
                cntg_vol: "5000",
                acml_vol: "12345678",
            },
        ],
    },
};

const mockForeignInstitutionResponse = {
    data: {
        rt_cd: "0",
        msg_cd: "MCA00000",
        msg1: "정상처리",
        output: [
            {
                hts_kor_isnm: "삼성전자",
                mksc_shrn_iscd: "005930",
                stck_prpr: "74200",
                prdy_vrss: "200",
                prdy_vrss_sign: "2",
                prdy_ctrt: "0.27",
                ntby_qty: "500000",
                acml_vol: "12345678",
                seln_cnqn_smtn: "3000000",
                shnu_cnqn_smtn: "3500000",
            },
            {
                hts_kor_isnm: "SK하이닉스",
                mksc_shrn_iscd: "000660",
                stck_prpr: "155000",
                prdy_vrss: "1000",
                prdy_vrss_sign: "2",
                prdy_ctrt: "0.65",
                ntby_qty: "300000",
                acml_vol: "5678901",
                seln_cnqn_smtn: "2000000",
                shnu_cnqn_smtn: "2300000",
            },
        ],
    },
};

const mockInvestorTradeResponse = {
    data: {
        rt_cd: "0",
        msg_cd: "MCA00000",
        msg1: "정상처리",
        output: [
            {
                stck_bsop_date: "20240131",
                frgn_ntby_qty: "450000",
                orgn_ntby_qty: "50000",
                prsn_ntby_qty: "-500000",
                stck_prpr: "74200",
                prdy_vrss: "200",
                prdy_vrss_sign: "2",
            },
        ],
    },
};

describe("KisApiClient", () => {
    let client: KisApiClient;
    let mockAxiosInstance: {
        get: ReturnType<typeof vi.fn>;
        post: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        client = new KisApiClient("test-appkey", "test-appsecret");
        // axios.create가 반환한 인스턴스 가져오기
        mockAxiosInstance = (axios.create as ReturnType<typeof vi.fn>).mock
            .results[0].value;
    });

    describe("getAccessToken", () => {
        it("토큰을 발급받아야 한다", async () => {
            mockAxiosInstance.post.mockResolvedValueOnce(mockTokenResponse);

            const token = await client.getAccessToken();

            expect(token).toBe("test-access-token-12345");
            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                "/oauth2/tokenP",
                {
                    grant_type: "client_credentials",
                    appkey: "test-appkey",
                    appsecret: "test-appsecret",
                },
            );
        });

        it("캐시된 토큰을 재사용해야 한다", async () => {
            mockAxiosInstance.post.mockResolvedValueOnce(mockTokenResponse);

            const token1 = await client.getAccessToken();
            const token2 = await client.getAccessToken();

            expect(token1).toBe(token2);
            expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
        });
    });

    describe("getDailyChart", () => {
        it("기간별시세 데이터를 조회해야 한다", async () => {
            mockAxiosInstance.post.mockResolvedValueOnce(mockTokenResponse);
            mockAxiosInstance.get.mockResolvedValueOnce(mockDailyChartResponse);

            const result = await client.getDailyChart({
                stockCode: "005930",
                startDate: "20240101",
                endDate: "20240131",
            });

            expect(result.rt_cd).toBe("0");
            expect(result.output2).toHaveLength(2);
            expect(result.output2[0].stck_clpr).toBe("74200");
            expect(result.output2[0].stck_bsop_date).toBe("20240131");

            expect(mockAxiosInstance.get).toHaveBeenCalledWith(
                "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
                expect.objectContaining({
                    params: expect.objectContaining({
                        FID_INPUT_ISCD: "005930",
                        FID_ORG_ADJ_PRC: "1",
                    }),
                }),
            );
        });
    });

    describe("getTimeChart", () => {
        it("당일분봉 데이터를 조회해야 한다", async () => {
            mockAxiosInstance.post.mockResolvedValueOnce(mockTokenResponse);
            mockAxiosInstance.get.mockResolvedValueOnce(mockTimeChartResponse);

            const result = await client.getTimeChart({ stockCode: "005930" });

            expect(result.rt_cd).toBe("0");
            expect(result.output2).toHaveLength(1);
            expect(result.output2[0].stck_prpr).toBe("74200");
        });
    });

    describe("getForeignInstitutionTotal", () => {
        it("외국인/기관 매매 집계 데이터를 조회해야 한다", async () => {
            mockAxiosInstance.post.mockResolvedValueOnce(mockTokenResponse);
            mockAxiosInstance.get.mockResolvedValueOnce(
                mockForeignInstitutionResponse,
            );

            const result = await client.getForeignInstitutionTotal({
                classCode: "0",
                rankSortCode: "0",
            });

            expect(result.rt_cd).toBe("0");
            expect(result.output).toHaveLength(2);
            expect(result.output[0].hts_kor_isnm).toBe("삼성전자");
            expect(result.output[0].ntby_qty).toBe("500000");
        });
    });

    describe("getInvestorTradeDaily", () => {
        it("투자자매매동향 데이터를 조회해야 한다", async () => {
            mockAxiosInstance.post.mockResolvedValueOnce(mockTokenResponse);
            mockAxiosInstance.get.mockResolvedValueOnce(
                mockInvestorTradeResponse,
            );

            const result = await client.getInvestorTradeDaily({
                stockCode: "005930",
            });

            expect(result.rt_cd).toBe("0");
            expect(result.output).toHaveLength(1);
            expect(result.output[0].frgn_ntby_qty).toBe("450000");
            expect(result.output[0].orgn_ntby_qty).toBe("50000");
        });
    });
});
