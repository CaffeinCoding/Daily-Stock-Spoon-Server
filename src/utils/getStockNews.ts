import { GoogleSearchClient } from "../api/google/index.js";

/** 뉴스 아이템 */
export interface NewsItem {
    title: string;
    url: string;
    date: string;
    snippet: string;
}

/** getStockNews 응답 */
export interface StockNewsResult {
    stockCode: string;
    stockName: string;
    news: NewsItem[];
}

/** len 파라미터를 dateRestrict 형식으로 변환 */
function convertLenToDateRestrict(len: string): string {
    switch (len) {
        case "1d":
            return "d1";
        case "1w":
            return "w1";
        case "1m":
            return "m1";
        default:
            return "d1";
    }
}

/** 메타태그에서 날짜 추출 */
function extractDateFromMeta(pagemap?: {
    metatags?: Array<Record<string, string>>;
}): string {
    if (!pagemap?.metatags?.[0]) return "";

    const meta = pagemap.metatags[0];
    const dateKey = Object.keys(meta).find(
        (k) =>
            k.includes("published") || k.includes("date") || k.includes("time"),
    );

    if (dateKey && meta[dateKey]) {
        // ISO 날짜 형식에서 날짜 부분만 추출
        const dateStr = meta[dateKey];
        const match = dateStr.match(/\d{4}-\d{2}-\d{2}/);
        return match ? match[0] : dateStr.slice(0, 10);
    }

    return "";
}

/**
 * 종목의 최신 뉴스를 검색
 * @param googleClient Google Search 클라이언트
 * @param stockCode 종목코드
 * @param stockName 종목명
 * @param len 기간 (1d, 1w, 1m)
 */
export async function getStockNews(
    googleClient: GoogleSearchClient,
    stockCode: string,
    stockName: string,
    len: string = "1d",
): Promise<StockNewsResult> {
    const dateRestrict = convertLenToDateRestrict(len);

    const response = await googleClient.search({
        query: `${stockName} 주식 뉴스`,
        dateRestrict,
        num: 10,
    });

    const news: NewsItem[] = (response.items || []).map((item) => ({
        title: item.title,
        url: item.link,
        date: extractDateFromMeta(item.pagemap),
        snippet: item.snippet,
    }));

    return {
        stockCode,
        stockName,
        news,
    };
}
