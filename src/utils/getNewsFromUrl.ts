import { extract } from "@extractus/article-extractor";

/** getNewsFromUrl 응답 */
export interface NewsFromUrlResult {
    title: string;
    url: string;
    date: string;
    content: string;
}

/**
 * URL에서 뉴스 콘텐츠를 크롤링
 * @extractus/article-extractor 활용
 * @param url 뉴스 URL
 */
export async function getNewsFromUrl(url: string): Promise<NewsFromUrlResult> {
    const article = await extract(
        url,
        {},
        {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(10000),
        },
    );

    if (!article) {
        return { title: "", url, date: "", content: "" };
    }

    // content는 HTML 문자열 → 태그 제거하여 plaintext 변환
    const plainContent = stripHtml(article.content || "");

    return {
        title: article.title || "",
        url,
        date: article.published ? article.published.slice(0, 10) : "",
        content: plainContent,
    };
}

/** HTML 태그를 제거하여 plaintext로 변환 */
function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}
