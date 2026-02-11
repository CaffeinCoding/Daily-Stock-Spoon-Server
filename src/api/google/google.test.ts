import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleSearchClient } from "./index.js";
import axios from "axios";

vi.mock("axios", () => {
    const mockAxiosInstance = {
        get: vi.fn(),
    };
    return {
        default: {
            create: vi.fn(() => mockAxiosInstance),
        },
    };
});

const mockSearchResponse = {
    data: {
        items: [
            {
                title: "삼성전자, AI 반도체 투자 확대",
                link: "https://example.com/news/1",
                snippet: "삼성전자가 AI 반도체 생산라인 투자를 확대한다고...",
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
                title: "삼성전자 4분기 실적 발표",
                link: "https://example.com/news/2",
                snippet: "삼성전자가 2024년 4분기 실적을 발표했다...",
                pagemap: {
                    metatags: [
                        {
                            "article:published_time":
                                "2024-01-29T14:00:00+09:00",
                        },
                    ],
                },
            },
            {
                title: "반도체 업계 동향 분석",
                link: "https://example.com/news/3",
                snippet: "최근 반도체 업계의 주요 동향을 분석한다...",
            },
        ],
        searchInformation: {
            totalResults: "1500",
            searchTime: 0.35,
        },
    },
};

describe("GoogleSearchClient", () => {
    let client: GoogleSearchClient;
    let mockAxiosInstance: { get: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        vi.clearAllMocks();
        client = new GoogleSearchClient("test-api-key", "test-search-id");
        mockAxiosInstance = (axios.create as ReturnType<typeof vi.fn>).mock
            .results[0].value;
    });

    describe("search", () => {
        it("검색 결과를 반환해야 한다", async () => {
            mockAxiosInstance.get.mockResolvedValueOnce(mockSearchResponse);

            const result = await client.search({ query: "삼성전자 주식" });

            expect(result.items).toHaveLength(3);
            expect(result.items![0].title).toBe(
                "삼성전자, AI 반도체 투자 확대",
            );
            expect(result.searchInformation?.totalResults).toBe("1500");
        });

        it("올바른 파라미터로 API를 호출해야 한다", async () => {
            mockAxiosInstance.get.mockResolvedValueOnce(mockSearchResponse);

            await client.search({
                query: "삼성전자 뉴스",
                dateRestrict: "d7",
                num: 5,
            });

            expect(mockAxiosInstance.get).toHaveBeenCalledWith(
                "https://customsearch.googleapis.com/customsearch/v1",
                expect.objectContaining({
                    params: expect.objectContaining({
                        key: "test-api-key",
                        cx: "test-search-id",
                        q: "삼성전자 뉴스",
                        gl: "kr",
                        dateRestrict: "d7",
                        num: 5,
                    }),
                }),
            );
        });

        it("dateRestrict 없이 호출할 수 있어야 한다", async () => {
            mockAxiosInstance.get.mockResolvedValueOnce({
                data: { items: [] },
            });

            const result = await client.search({ query: "테스트" });

            expect(result.items).toHaveLength(0);
            const callParams = mockAxiosInstance.get.mock.calls[0][1].params;
            expect(callParams.dateRestrict).toBeUndefined();
        });
    });
});
