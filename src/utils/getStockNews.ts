import {
    GoogleNewsClient,
    type GoogleNewsItem,
} from "../api/googleNews/index.js";
import { resolveGoogleNewsUrl } from "./resolveGoogleNewsUrl.js";

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

/** len 파라미터를 Google News when: 형식으로 변환 */
function convertLenToWhen(len: string): string {
    switch (len) {
        case "1d":
            return "1d";
        case "1w":
            return "7d";
        case "1m":
            return "30d";
        default:
            return "1d";
    }
}

// ── 중복 뉴스 제거 (bigram Dice coefficient) ──

/** 문자열에서 bigram 집합 생성 */
function getBigrams(str: string): Set<string> {
    const normalized = str.replace(/\s+/g, "").toLowerCase();
    const bigrams = new Set<string>();
    for (let i = 0; i < normalized.length - 1; i++) {
        bigrams.add(normalized.slice(i, i + 2));
    }
    return bigrams;
}

/** 두 문자열의 Dice coefficient 유사도 계산 (0~1) */
function diceCoefficient(a: string, b: string): number {
    const bigramsA = getBigrams(a);
    const bigramsB = getBigrams(b);

    if (bigramsA.size === 0 && bigramsB.size === 0) return 1;
    if (bigramsA.size === 0 || bigramsB.size === 0) return 0;

    let intersection = 0;
    for (const bigram of bigramsA) {
        if (bigramsB.has(bigram)) intersection++;
    }

    return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/** 제목 유사도 기반 중복 뉴스 제거 (≥ 0.6이면 중복) */
function removeDuplicateNews(items: NewsItem[]): NewsItem[] {
    const unique: NewsItem[] = [];

    for (const item of items) {
        const isDuplicate = unique.some(
            (existing) => diceCoefficient(existing.title, item.title) >= 0.6,
        );
        if (!isDuplicate) {
            unique.push(item);
        }
    }

    return unique;
}

/**
 * 종목의 최신 뉴스를 검색 (Google News RSS 활용)
 * @param newsClient Google News 클라이언트
 * @param stockCode 종목코드
 * @param stockName 종목명
 * @param len 기간 (1d, 1w, 1m)
 */
export async function getStockNews(
    newsClient: GoogleNewsClient,
    stockCode: string,
    stockName: string,
    len: string = "1d",
): Promise<StockNewsResult> {
    const when = convertLenToWhen(len);

    const items = await newsClient.search({
        query: `${stockName} 주식`,
        when,
    });

    // 리다이렉트 URL을 원본 URL로 병렬 변환
    const resolvedItems = await Promise.allSettled(
        items.map(async (item: GoogleNewsItem) => {
            const resolvedUrl = await resolveGoogleNewsUrl(item.url);
            return {
                title: item.title,
                url: resolvedUrl,
                date: item.pubDate,
                snippet: `${item.source} - ${item.title}`,
            } as NewsItem;
        }),
    );

    const news: NewsItem[] = resolvedItems
        .filter(
            (r): r is PromiseFulfilledResult<NewsItem> =>
                r.status === "fulfilled",
        )
        .map((r) => r.value);

    return {
        stockCode,
        stockName,
        news: removeDuplicateNews(news),
    };
}

// 테스트를 위해 내부 함수 export
export { diceCoefficient, removeDuplicateNews, getBigrams };
