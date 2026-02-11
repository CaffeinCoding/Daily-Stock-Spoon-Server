import axios from "axios";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

/** getNewsFromUrl 응답 */
export interface NewsFromUrlResult {
    title: string;
    url: string;
    date: string;
    content: string;
}

/**
 * URL에서 뉴스 콘텐츠를 크롤링
 * @mozilla/readability + jsdom 활용
 * @param url 뉴스 URL
 */
export async function getNewsFromUrl(url: string): Promise<NewsFromUrlResult> {
    // HTML 가져오기
    const { data: html } = await axios.get<string>(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 10000,
    });

    // JSDOM + Readability로 파싱
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    // 날짜 추출 (meta 태그에서)
    const date = extractDateFromHtml(dom);

    return {
        title: article?.title || "",
        url,
        date,
        content: article?.textContent?.trim() || "",
    };
}

/** HTML에서 날짜 메타태그 추출 */
function extractDateFromHtml(dom: JSDOM): string {
    const doc = dom.window.document;
    const dateSelectors = [
        'meta[property="article:published_time"]',
        'meta[name="article:published_time"]',
        'meta[property="og:article:published_time"]',
        'meta[name="date"]',
        'meta[name="pubdate"]',
        "time[datetime]",
    ];

    for (const selector of dateSelectors) {
        const el = doc.querySelector(selector);
        if (el) {
            const value =
                el.getAttribute("content") || el.getAttribute("datetime") || "";
            const match = value.match(/\d{4}-\d{2}-\d{2}/);
            if (match) return match[0];
        }
    }

    return "";
}
