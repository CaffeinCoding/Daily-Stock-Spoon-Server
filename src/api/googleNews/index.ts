import axios from "axios";
import * as cheerio from "cheerio";

/** Google News RSS 검색 파라미터 */
export interface GoogleNewsParams {
    /** 검색어 */
    query: string;
    /** 기간 (1d, 7d, 30d 등 Google News when: 형식) */
    when?: string;
}

/** Google News RSS 결과 아이템 */
export interface GoogleNewsItem {
    title: string;
    url: string;
    pubDate: string;
    source: string;
}

const GOOGLE_NEWS_RSS_BASE = "https://news.google.com/rss/search";

/** Anti-Bot 회피용 브라우저 헤더 */
const BROWSER_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Referer: "https://www.google.com/",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
};

const REQUEST_TIMEOUT = 5000;

export class GoogleNewsClient {
    /**
     * Google News RSS 피드를 검색하여 뉴스 목록을 반환
     * @param params 검색 파라미터
     * @returns 뉴스 아이템 배열
     */
    async search(params: GoogleNewsParams): Promise<GoogleNewsItem[]> {
        const queryParts = [params.query];
        if (params.when) {
            queryParts.push(`when:${params.when}`);
        }

        const url = `${GOOGLE_NEWS_RSS_BASE}?q=${encodeURIComponent(queryParts.join(" "))}&hl=ko&gl=KR&ceid=KR:ko`;

        try {
            const { data } = await axios.get<string>(url, {
                headers: BROWSER_HEADERS,
                timeout: REQUEST_TIMEOUT,
                responseType: "text",
            });

            return this.parseRss(data);
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 429 || status === 403) {
                console.warn(
                    `Google News RSS 요청 차단됨 (${status}). 빈 결과를 반환합니다.`,
                );
                return [];
            }
            if (err?.code === "ECONNABORTED") {
                console.warn(
                    "Google News RSS 요청 타임아웃. 빈 결과를 반환합니다.",
                );
                return [];
            }
            throw err;
        }
    }

    /** RSS XML을 파싱하여 GoogleNewsItem 배열로 변환 */
    private parseRss(xml: string): GoogleNewsItem[] {
        const $ = cheerio.load(xml, { xml: true });
        const items: GoogleNewsItem[] = [];

        $("item").each((_i, el) => {
            const title = $(el).find("title").text().trim();
            const link = $(el).find("link").text().trim();
            const pubDate = $(el).find("pubDate").text().trim();
            const source = $(el).find("source").text().trim();

            if (title && link) {
                items.push({
                    title,
                    url: link,
                    pubDate: this.formatDate(pubDate),
                    source,
                });
            }
        });

        return items;
    }

    /** RSS pubDate를 YYYY-MM-DD 형식으로 변환 */
    private formatDate(pubDate: string): string {
        if (!pubDate) return "";
        try {
            const d = new Date(pubDate);
            return d.toISOString().slice(0, 10);
        } catch {
            return pubDate.slice(0, 10);
        }
    }
}
