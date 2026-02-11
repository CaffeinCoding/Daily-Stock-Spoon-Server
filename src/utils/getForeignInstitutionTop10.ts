import { KisApiClient } from "../api/kis/index.js";
import type { KisForeignInstitutionItem } from "../api/kis/types.js";

/** 상위 종목 아이템 */
export interface TopStockItem {
    stockCode: string;
    stockName: string;
    volume: number;
}

/** getForeignInstitutionTop10 응답 */
export interface ForeignInstitutionTop10Result {
    buyTop: TopStockItem[];
    sellTop: TopStockItem[];
    date: string;
}

/** KIS 원시 데이터를 TopStockItem으로 변환 */
function mapToTopItem(item: KisForeignInstitutionItem): TopStockItem {
    return {
        stockCode: item.mksc_shrn_iscd,
        stockName: item.hts_kor_isnm,
        volume: Math.abs(parseInt(item.ntby_qty, 10)),
    };
}

/** 현재 장마감 여부 판단 (15:30 이후면 true) */
function isMarketClosed(): boolean {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return hours > 15 || (hours === 15 && minutes >= 30);
}

/**
 * 외국인/기관 순매수/순매도 상위 10개 종목을 조회
 * - 장마감 전: 국내기관_외국인 매매종목가집계만 활용
 * - 장마감 후: 추가로 종목별 투자자매매동향으로 보정
 */
export async function getForeignInstitutionTop10(
    kisClient: KisApiClient,
): Promise<ForeignInstitutionTop10Result> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    // 순매수 상위 (외국인)
    const buyResponse = await kisClient.getForeignInstitutionTotal({
        classCode: "0", // 외국인
        rankSortCode: "0", // 순매수
    });

    // 순매도 상위 (외국인)
    const sellResponse = await kisClient.getForeignInstitutionTotal({
        classCode: "0",
        rankSortCode: "1", // 순매도
    });

    let buyTop = (buyResponse.output || []).slice(0, 10).map(mapToTopItem);
    let sellTop = (sellResponse.output || []).slice(0, 10).map(mapToTopItem);

    // 장마감 후: 투자자매매동향으로 실제 매매량 보정
    if (isMarketClosed()) {
        buyTop = await enrichWithInvestorData(kisClient, buyTop);
        sellTop = await enrichWithInvestorData(kisClient, sellTop);
    }

    return {
        buyTop,
        sellTop,
        date: today,
    };
}

/** 종목별 투자자매매동향으로 실제 매매량 보정 */
async function enrichWithInvestorData(
    kisClient: KisApiClient,
    items: TopStockItem[],
): Promise<TopStockItem[]> {
    const enriched: TopStockItem[] = [];

    for (const item of items) {
        try {
            const tradeData = await kisClient.getInvestorTradeDaily({
                stockCode: item.stockCode,
            });

            if (tradeData.output && tradeData.output.length > 0) {
                const todayData = tradeData.output[0];
                const foreignVol = parseInt(todayData.frgn_ntby_qty, 10);
                enriched.push({
                    ...item,
                    volume: Math.abs(foreignVol),
                });
            } else {
                enriched.push(item);
            }
        } catch {
            // API 실패 시 원본 데이터 유지
            enriched.push(item);
        }
    }

    return enriched;
}
