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

/** len 파라미터를 기반으로 검색할 날짜(오늘 포함) 범위 배열 반환 */
function getDateRangesForLen(len: string): { after: string; before: string }[] {
    const ranges: { after: string; before: string }[] = [];
    let days = 1;
    if (len === "1d") days = 1;
    else if (len === "1w") days = 7;
    else if (len === "1m") days = 30;
    else days = 1;

    // 한국 시간(KST) 대략적 기준.
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    const kst = new Date(utc + 9 * 60 * 60 * 1000);

    for (let i = 0; i < days; i++) {
        const afterDate = new Date(kst);
        afterDate.setDate(afterDate.getDate() - i);

        const beforeDate = new Date(kst);
        beforeDate.setDate(beforeDate.getDate() - i + 1);

        const formatYMD = (d: Date) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        };

        ranges.push({
            after: formatYMD(afterDate),
            before: formatYMD(beforeDate),
        });
    }

    return ranges;
}

/** 일정 밀리초 대기 */
const delay = (ms: number) => {
    if (process.env.NODE_ENV === "test") return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
};

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
    const dateRanges = getDateRangesForLen(len);
    const allNews: NewsItem[] = [];

    for (const range of dateRanges) {
        const items = await newsClient.search({
            query: `${stockName} 주식`,
            after: range.after,
            before: range.before,
        });

        // 1일 최대 50개 제한
        const dailyItems = items.slice(0, 50);

        // 리다이렉트 URL을 원본 URL로 병렬 변환
        const resolvedItems = await Promise.allSettled(
            dailyItems.map(async (item: GoogleNewsItem) => {
                const resolvedUrl = await resolveGoogleNewsUrl(item.url);
                return {
                    title: item.title,
                    url: resolvedUrl,
                    date: item.pubDate,
                    snippet: `${item.source} - ${item.title}`,
                } as NewsItem;
            }),
        );

        const validNews: NewsItem[] = resolvedItems
            .filter(
                (r): r is PromiseFulfilledResult<NewsItem> =>
                    r.status === "fulfilled",
            )
            .map((r) => r.value);

        // 일별 중복 제거 처리 및 앞부분에서 5개 추출
        const uniqueDailyNews = removeDuplicateNews(validNews).slice(0, 5);
        allNews.push(...uniqueDailyNews);

        // 구글 뉴스 API Rate Limit 방지를 위해 순차 처리 시 약간의 딜레이
        if (range !== dateRanges[dateRanges.length - 1]) {
            await delay(1000);
        }
    }

    return {
        stockCode,
        stockName,
        news: allNews,
    };
}

// 테스트를 위해 내부 함수 export
export { diceCoefficient, removeDuplicateNews, getBigrams };
