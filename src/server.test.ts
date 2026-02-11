import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

// ── vi.hoisted로 mock 함수 선언 ────────────

const {
    mockGetDailyChart,
    mockGetForeignInstitutionTotal,
    mockGetInvestorTradeDaily,
    mockSearch,
} = vi.hoisted(() => ({
    mockGetDailyChart: vi.fn(),
    mockGetForeignInstitutionTotal: vi.fn(),
    mockGetInvestorTradeDaily: vi.fn(),
    mockSearch: vi.fn(),
}));

// ── 모든 외부 의존성 mock ─────────────────

vi.mock("./api/kis/index.js", () => ({
    KisApiClient: vi.fn().mockImplementation(() => ({
        getDailyChart: mockGetDailyChart,
        getAccessToken: vi.fn().mockResolvedValue("mock-token"),
        getForeignInstitutionTotal: mockGetForeignInstitutionTotal,
        getInvestorTradeDaily: mockGetInvestorTradeDaily,
    })),
}));

vi.mock("./api/google/index.js", () => ({
    GoogleSearchClient: vi.fn().mockImplementation(() => ({
        search: mockSearch,
    })),
}));

vi.mock("axios", () => ({
    default: {
        get: vi.fn(),
        create: vi.fn(() => ({ get: vi.fn(), post: vi.fn() })),
    },
}));

vi.mock("dotenv", () => ({
    default: { config: vi.fn() },
}));

vi.mock("@hono/node-server", () => ({
    serve: vi.fn(),
}));

import { app } from "./index.js";

// ── 테스트 ─────────────────────────────

describe("API Server Routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("POST /api/chart", () => {
        it("차트 데이터를 반환해야 한다", async () => {
            mockGetDailyChart.mockResolvedValueOnce({
                rt_cd: "0",
                output2: [
                    {
                        stck_bsop_date: "20240131",
                        stck_oprc: "74000",
                        stck_hgpr: "74500",
                        stck_lwpr: "73500",
                        stck_clpr: "74200",
                        acml_vol: "12345678",
                    },
                ],
            });

            const res = await app.request("/api/chart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stockCode: "005930",
                    startDate: "20240101",
                    endDate: "20240131",
                }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.stockCode).toBe("005930");
            expect(data.chart).toHaveLength(1);
            expect(data.chart[0].close).toBe(74200);
        });

        it("필수 파라미터 누락 시 400을 반환해야 한다", async () => {
            const res = await app.request("/api/chart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
        });
    });

    describe("GET /api/fitop", () => {
        it("외국인/기관 상위 종목을 반환해야 한다", async () => {
            mockGetForeignInstitutionTotal.mockResolvedValueOnce({
                rt_cd: "0",
                output: [
                    {
                        hts_kor_isnm: "삼성전자",
                        mksc_shrn_iscd: "005930",
                        ntby_qty: "500000",
                    },
                ],
            });
            mockGetForeignInstitutionTotal.mockResolvedValueOnce({
                rt_cd: "0",
                output: [
                    {
                        hts_kor_isnm: "SK하이닉스",
                        mksc_shrn_iscd: "000660",
                        ntby_qty: "-300000",
                    },
                ],
            });

            const res = await app.request("/api/fitop");

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.buyTop).toHaveLength(1);
            expect(data.sellTop).toHaveLength(1);
            expect(data.date).toBeDefined();
        });
    });

    describe("POST /api/news", () => {
        it("종목 뉴스를 반환해야 한다", async () => {
            mockSearch.mockResolvedValueOnce({
                items: [
                    {
                        title: "삼성전자 뉴스",
                        link: "https://example.com/1",
                        snippet: "삼성전자...",
                    },
                ],
            });

            const res = await app.request("/api/news", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stockCode: "005930",
                    stockName: "삼성전자",
                    len: "1w",
                }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.news).toHaveLength(1);
            expect(data.stockCode).toBe("005930");
        });

        it("stockCode 누락 시 400을 반환해야 한다", async () => {
            const res = await app.request("/api/news", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
        });
    });

    describe("POST /api/news-from-url", () => {
        it("URL에서 뉴스를 크롤링해야 한다", async () => {
            const mockHtml = `
        <html>
          <head>
            <meta property="article:published_time" content="2024-01-30T09:00:00+09:00">
            <title>테스트 뉴스</title>
          </head>
          <body>
            <article>
              <h1>테스트 뉴스</h1>
              <p>테스트 뉴스 본문입니다. 매우 중요한 경제 뉴스로 삼성전자 관련 내용을 담고 있습니다.</p>
            </article>
          </body>
        </html>
      `;

            (axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: mockHtml,
            });

            const res = await app.request("/api/news-from-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: "https://example.com/news/1" }),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.url).toBe("https://example.com/news/1");
            expect(data.date).toBe("2024-01-30");
        });

        it("url 누락 시 400을 반환해야 한다", async () => {
            const res = await app.request("/api/news-from-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
        });
    });
});
