import { describe, it, expect, vi, beforeEach } from "vitest";

// ── mock 함수 선언 (vi.hoisted) ────────────

const {
    mockGetDailyChart,
    mockGetForeignInstitutionTotal,
    mockGetInvestorTradeDaily,
    mockNewsSearch,
    mockResolveUrl,
    mockExtract,
} = vi.hoisted(() => ({
    mockGetDailyChart: vi.fn(),
    mockGetForeignInstitutionTotal: vi.fn(),
    mockGetInvestorTradeDaily: vi.fn(),
    mockNewsSearch: vi.fn(),
    mockResolveUrl: vi.fn((url: string) => Promise.resolve(url)),
    mockExtract: vi.fn(),
}));

// KIS API 클라이언트 mock
vi.mock("../api/kis/index.js", () => ({
    KisApiClient: vi.fn().mockImplementation(() => ({
        getDailyChart: mockGetDailyChart,
        getForeignInstitutionTotal: mockGetForeignInstitutionTotal,
        getInvestorTradeDaily: mockGetInvestorTradeDaily,
    })),
}));

// Google News 클라이언트 mock
vi.mock("../api/googleNews/index.js", () => ({
    GoogleNewsClient: vi.fn().mockImplementation(() => ({
        search: mockNewsSearch,
    })),
}));

// resolveGoogleNewsUrl mock
vi.mock("./resolveGoogleNewsUrl.js", () => ({
    resolveGoogleNewsUrl: mockResolveUrl,
}));

// @extractus/article-extractor mock
vi.mock("@extractus/article-extractor", () => ({
    extract: mockExtract,
}));

import { KisApiClient } from "../api/kis/index.js";
import { GoogleNewsClient } from "../api/googleNews/index.js";
import { getStockChart } from "./getStockChart.js";
import { getForeignInstitutionTop10 } from "./getForeignInstitutionTop10.js";
import {
    getStockNews,
    diceCoefficient,
    removeDuplicateNews,
} from "./getStockNews.js";
import { getNewsFromUrl } from "./getNewsFromUrl.js";

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
        expect(result.chart[0].date).toBe("20240130");
        expect(result.chart[1].date).toBe("20240131");
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
    let newsClient: GoogleNewsClient;

    beforeEach(() => {
        vi.clearAllMocks();
        newsClient = new GoogleNewsClient();
    });

    it("뉴스 검색 결과를 반환해야 한다", async () => {
        mockNewsSearch.mockResolvedValueOnce([
            {
                title: "삼성전자 AI 투자",
                url: "https://example.com/1",
                pubDate: "2024-01-30",
                source: "매경",
            },
            {
                title: "반도체 동향",
                url: "https://example.com/2",
                pubDate: "2024-01-29",
                source: "한경",
            },
        ]);

        const result = await getStockNews(
            newsClient,
            "005930",
            "삼성전자",
            "1w",
        );

        expect(result.stockCode).toBe("005930");
        expect(result.stockName).toBe("삼성전자");
        expect(result.news).toHaveLength(2);
        expect(result.news[0].title).toBe("삼성전자 AI 투자");
        expect(result.news[0].date).toBe("2024-01-30");
    });

    it("중복 뉴스를 제거해야 한다", async () => {
        mockNewsSearch.mockResolvedValueOnce([
            {
                title: "삼성전자 AI 반도체 투자 확대 발표",
                url: "https://a.com/1",
                pubDate: "2024-01-30",
                source: "매경",
            },
            {
                title: "삼성전자 AI 반도체 투자 확대",
                url: "https://b.com/2",
                pubDate: "2024-01-30",
                source: "한경",
            },
            {
                title: "SK하이닉스 HBM 수출 호조",
                url: "https://c.com/3",
                pubDate: "2024-01-30",
                source: "조선",
            },
        ]);

        const result = await getStockNews(
            newsClient,
            "005930",
            "삼성전자",
            "1d",
        );

        // 유사도 >= 0.6인 두 번째 뉴스가 제거되어야 함
        expect(result.news).toHaveLength(2);
        expect(result.news[0].title).toBe("삼성전자 AI 반도체 투자 확대 발표");
        expect(result.news[1].title).toBe("SK하이닉스 HBM 수출 호조");
    });
});

describe("diceCoefficient", () => {
    it("동일한 문자열은 유사도 1이어야 한다", () => {
        expect(diceCoefficient("삼성전자", "삼성전자")).toBe(1);
    });

    it("완전히 다른 문자열은 유사도 0이어야 한다", () => {
        expect(diceCoefficient("abc", "xyz")).toBe(0);
    });

    it("유사한 제목은 높은 유사도를 가져야 한다", () => {
        const sim = diceCoefficient(
            "삼성전자 AI 반도체 투자 확대 발표",
            "삼성전자 AI 반도체 투자 확대",
        );
        expect(sim).toBeGreaterThanOrEqual(0.6);
    });

    it("다른 주제의 제목은 낮은 유사도를 가져야 한다", () => {
        const sim = diceCoefficient(
            "삼성전자 AI 투자",
            "SK하이닉스 HBM 수출 호조",
        );
        expect(sim).toBeLessThan(0.6);
    });
});

describe("getNewsFromUrl", () => {
    it("URL에서 뉴스 콘텐츠를 추출해야 한다", async () => {
        mockExtract.mockResolvedValueOnce({
            title: "테스트 뉴스 제목",
            content:
                "<p>이것은 테스트 뉴스의 본문입니다. 삼성전자가 AI 반도체 생산라인 투자를 확대한다고 밝혔다.</p>",
            published: "2024-01-30T09:00:00+09:00",
        });

        const result = await getNewsFromUrl("https://example.com/news/1");

        expect(result.url).toBe("https://example.com/news/1");
        expect(result.date).toBe("2024-01-30");
        expect(result.content).toContain("삼성전자");
        expect(result.content).not.toContain("<p>");
    });

    it("extract가 null을 반환하면 빈 결과를 반환해야 한다", async () => {
        mockExtract.mockResolvedValueOnce(null);

        const result = await getNewsFromUrl("https://example.com/invalid");

        expect(result.url).toBe("https://example.com/invalid");
        expect(result.title).toBe("");
        expect(result.content).toBe("");
    });
});
