import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

// axios mock
vi.mock("axios", () => ({
    default: {
        get: vi.fn(),
        create: vi.fn(() => ({ get: vi.fn(), post: vi.fn() })),
    },
}));

import { GoogleNewsClient } from "./index.js";

// 테스트용 RSS XML
const mockRssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>삼성전자 주식 - Google 뉴스</title>
    <item>
      <title>삼성전자, AI 반도체 투자 확대</title>
      <link>https://example.com/news/1</link>
      <pubDate>Thu, 30 Jan 2024 09:00:00 GMT</pubDate>
      <source url="https://example.com">매경</source>
    </item>
    <item>
      <title>삼성전자 4분기 실적 발표</title>
      <link>https://example.com/news/2</link>
      <pubDate>Wed, 29 Jan 2024 14:30:00 GMT</pubDate>
      <source url="https://example.com">한경</source>
    </item>
  </channel>
</rss>`;

describe("GoogleNewsClient", () => {
    let client: GoogleNewsClient;

    beforeEach(() => {
        vi.clearAllMocks();
        client = new GoogleNewsClient();
    });

    it("RSS 피드를 파싱하여 뉴스 목록을 반환해야 한다", async () => {
        (axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: mockRssXml,
        });

        const items = await client.search({
            query: "삼성전자 주식",
            when: "1d",
        });

        expect(items).toHaveLength(2);
        expect(items[0].title).toBe("삼성전자, AI 반도체 투자 확대");
        expect(items[0].url).toBe("https://example.com/news/1");
        expect(items[0].pubDate).toBe("2024-01-30");
        expect(items[0].source).toBe("매경");
        expect(items[1].title).toBe("삼성전자 4분기 실적 발표");
    });

    it("Anti-Bot 헤더가 포함되어야 한다", async () => {
        (axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: mockRssXml,
        });

        await client.search({ query: "삼성전자" });

        expect(axios.get).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: expect.objectContaining({
                    "User-Agent": expect.stringContaining("Mozilla"),
                    Referer: "https://www.google.com/",
                    "Accept-Language": expect.stringContaining("ko-KR"),
                }),
                timeout: 5000,
            }),
        );
    });

    it("429 에러 시 빈 배열을 반환해야 한다", async () => {
        (axios.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
            response: { status: 429 },
        });

        const items = await client.search({ query: "삼성전자" });
        expect(items).toEqual([]);
    });

    it("403 에러 시 빈 배열을 반환해야 한다", async () => {
        (axios.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
            response: { status: 403 },
        });

        const items = await client.search({ query: "삼성전자" });
        expect(items).toEqual([]);
    });

    it("타임아웃 시 빈 배열을 반환해야 한다", async () => {
        (axios.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
            code: "ECONNABORTED",
        });

        const items = await client.search({ query: "삼성전자" });
        expect(items).toEqual([]);
    });
});
