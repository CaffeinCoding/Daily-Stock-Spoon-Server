import { KisApiClient } from "../api/kis/index.js";
import type { KisDailyChartItem } from "../api/kis/types.js";

/** 정제된 차트 데이터 아이템 */
export interface ChartItem {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

/** getStockChart 응답 */
export interface StockChartResult {
    stockCode: string;
    chart: ChartItem[];
    startDate: string;
    endDate: string;
}

/** KIS 원시 데이터를 정제된 ChartItem으로 변환 */
function mapChartItem(item: KisDailyChartItem): ChartItem {
    return {
        date: item.stck_bsop_date,
        open: parseInt(item.stck_oprc, 10),
        high: parseInt(item.stck_hgpr, 10),
        low: parseInt(item.stck_lwpr, 10),
        close: parseInt(item.stck_clpr, 10),
        volume: parseInt(item.acml_vol, 10),
    };
}

/**
 * 주식 종목의 차트 데이터를 조회
 * @param kisClient KIS API 클라이언트
 * @param stockCode 종목코드 (ex: 005930)
 * @param startDate 시작일 (YYYYMMDD)
 * @param endDate 종료일 (YYYYMMDD, default 당일)
 */
export async function getStockChart(
    kisClient: KisApiClient,
    stockCode: string,
    startDate: string,
    endDate?: string,
): Promise<StockChartResult> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const end = endDate || today;

    const response = await kisClient.getDailyChart({
        stockCode,
        startDate,
        endDate: end,
        periodCode: "D",
    });

    const chart = (response.output2 || [])
        .map(mapChartItem)
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
        stockCode,
        chart,
        startDate,
        endDate: end,
    };
}
