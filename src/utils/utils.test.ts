import { describe, it, expect, vi, beforeEach } from "vitest";

// ── getStockChart 테스트 ──────────────────

// KIS API 클라이언트 mock
const mockGetDailyChart = vi.fn();
const mockGetForeignInstitutionTotal = vi.fn();
const mockGetInvestorTradeDaily = vi.fn();

vi.mock("../api/kis/index.js", () => ({
    KisApiClient: vi.fn().mockImplementation(() => ({
        getDailyChart: mockGetDailyChart,
        getForeignInstitutionTotal: mockGetForeignInstitutionTotal,
        getInvestorTradeDaily: mockGetInvestorTradeDaily,
    })),
}));

// Google Search 클라이언트 mock
const mockSearch = vi.fn();
vi.mock("../api/google/index.js", () => ({
    GoogleSearchClient: vi.fn().mockImplementation(() => ({
        search: mockSearch,
    })),
}));

// axios mock (for getNewsFromUrl)
vi.mock("axios", () => ({
    default: {
        get: vi.fn(),
        create: vi.fn(() => ({ get: vi.fn(), post: vi.fn() })),
    },
}));

import { KisApiClient } from "../api/kis/index.js";
import { GoogleSearchClient } from "../api/google/index.js";
import { getStockChart } from "./getStockChart.js";
import { getForeignInstitutionTop10 } from "./getForeignInstitutionTop10.js";
import { getStockNews } from "./getStockNews.js";
import { getNewsFromUrl } from "./getNewsFromUrl.js";
import axios from "axios";

describe("getStockChart", () => {
    let kisClient: KisApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        kisClient = new KisApiClient("key", "secret");
    });

    it("차트 데이터를 정제하여 반환해야 한다", async () => {
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
                {
                    stck_bsop_date: "20240130",
                    stck_oprc: "73800",
                    stck_hgpr: "74200",
                    stck_lwpr: "73600",
                    stck_clpr: "74000",
                    acml_vol: "10987654",
                },
            ],
        });

        const result = await getStockChart(
            kisClient,
            "005930",
            "20240130",
            "20240131",
        );

        expect(result.stockCode).toBe("005930");
        expect(result.chart).toHaveLength(2);
        // 날짜순 정렬 확인
        expect(result.chart[0].date).toBe("20240130");
        expect(result.chart[1].date).toBe("20240131");
        // 숫자 변환 확인
        expect(result.chart[1].open).toBe(74000);
        expect(result.chart[1].close).toBe(74200);
        expect(result.chart[1].volume).toBe(12345678);
    });

    it("빈 응답을 처리해야 한다", async () => {
        mockGetDailyChart.mockResolvedValueOnce({
            rt_cd: "0",
            output2: [],
        });

        const result = await getStockChart(
            kisClient,
            "999999",
            "20240101",
            "20240131",
        );
        expect(result.chart).toHaveLength(0);
    });
});

describe("getForeignInstitutionTop10", () => {
    let kisClient: KisApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        kisClient = new KisApiClient("key", "secret");
    });

    it("순매수/순매도 상위 종목을 반환해야 한다", async () => {
        // 순매수 상위
        mockGetForeignInstitutionTotal.mockResolvedValueOnce({
            rt_cd: "0",
            output: [
                {
                    hts_kor_isnm: "삼성전자",
                    mksc_shrn_iscd: "005930",
                    ntby_qty: "500000",
                },
                {
                    hts_kor_isnm: "SK하이닉스",
                    mksc_shrn_iscd: "000660",
                    ntby_qty: "300000",
                },
            ],
        });

        // 순매도 상위
        mockGetForeignInstitutionTotal.mockResolvedValueOnce({
            rt_cd: "0",
            output: [
                {
                    hts_kor_isnm: "LG에너지솔루션",
                    mksc_shrn_iscd: "373220",
                    ntby_qty: "-200000",
                },
            ],
        });

        const result = await getForeignInstitutionTop10(kisClient);

        expect(result.buyTop).toHaveLength(2);
        expect(result.buyTop[0].stockName).toBe("삼성전자");
        expect(result.buyTop[0].volume).toBe(500000);
        expect(result.sellTop).toHaveLength(1);
        expect(result.sellTop[0].stockName).toBe("LG에너지솔루션");
    });
});

describe("getStockNews", () => {
    let googleClient: GoogleSearchClient;

    beforeEach(() => {
        vi.clearAllMocks();
        googleClient = new GoogleSearchClient("key", "id");
    });

    it("뉴스 검색 결과를 반환해야 한다", async () => {
        mockSearch.mockResolvedValueOnce({
            items: [
                {
                    title: "삼성전자 AI 투자",
                    link: "https://example.com/1",
                    snippet: "삼성전자가...",
                    pagemap: {
                        metatags: [
                            {
                                "article:published_time":
                                    "2024-01-30T09:00:00+09:00",
                            },
                        ],
                    },
                },
                {
                    title: "반도체 동향",
                    link: "https://example.com/2",
                    snippet: "반도체 업계...",
                },
            ],
        });

        const result = await getStockNews(
            googleClient,
            "005930",
            "삼성전자",
            "1w",
        );

        expect(result.stockCode).toBe("005930");
        expect(result.stockName).toBe("삼성전자");
        expect(result.news).toHaveLength(2);
        expect(result.news[0].title).toBe("삼성전자 AI 투자");
        expect(result.news[0].date).toBe("2024-01-30");
        expect(result.news[1].date).toBe(""); // 메타태그 없는 경우
    });
});

describe("getNewsFromUrl", () => {
    it("URL에서 뉴스 콘텐츠를 추출해야 한다", async () => {
        const mockHtml = `
      <html>
        <head>
          <meta property="article:published_time" content="2024-01-30T09:00:00+09:00">
          <title>테스트 뉴스 제목</title>
        </head>
        <body>
          <article>
            <h1>테스트 뉴스 제목</h1>
            <p>이것은 테스트 뉴스의 본문입니다. 삼성전자가 AI 반도체 생산라인 투자를 확대한다고 밝혔다. 이에 따라 주가가 상승세를 보이고 있다.</p>
          </article>
        </body>
      </html>
    `;

        (axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: mockHtml,
        });

        const result = await getNewsFromUrl("https://example.com/news/1");

        expect(result.url).toBe("https://example.com/news/1");
        expect(result.date).toBe("2024-01-30");
        expect(result.content).toContain("삼성전자");
    });
});
