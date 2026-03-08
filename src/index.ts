import { serve } from "@hono/node-server";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import dotenv from "dotenv";

import { KisApiClient } from "./api/kis/index.js";
import { GoogleNewsClient } from "./api/googleNews/index.js";
import { getStockChart } from "./utils/getStockChart.js";
import { getForeignInstitutionTop10 } from "./utils/getForeignInstitutionTop10.js";
import { getStockNews } from "./utils/getStockNews.js";
import { getNewsFromUrl } from "./utils/getNewsFromUrl.js";
import { dbInstance } from "./db/sqlite.js";

dotenv.config();

// ── 클라이언트 초기화 ───────────────────────

const kisClient = new KisApiClient(
    process.env.KIS_APPKEY || "",
    process.env.KIS_APPSECRET || "",
);

const newsClient = new GoogleNewsClient();

// ── Zod 스키마 정의 ─────────────────────────

// Chart
const ChartRequestSchema = z
    .object({
        stockCode: z
            .string()
            .openapi({ example: "005930", description: "종목코드" }),
        startDate: z
            .string()
            .openapi({ example: "20240101", description: "시작일 (YYYYMMDD)" }),
        endDate: z.string().optional().openapi({
            example: "20240131",
            description: "종료일 (YYYYMMDD, 기본: 당일)",
        }),
    })
    .openapi("ChartRequest");

const ChartItemSchema = z
    .object({
        date: z.string().openapi({ example: "20240131" }),
        open: z.number().openapi({ example: 74000 }),
        high: z.number().openapi({ example: 74500 }),
        low: z.number().openapi({ example: 73500 }),
        close: z.number().openapi({ example: 74200 }),
        volume: z.number().openapi({ example: 12345678 }),
    })
    .openapi("ChartItem");

const ChartResponseSchema = z
    .object({
        stockCode: z.string().openapi({ example: "005930" }),
        chart: z.array(ChartItemSchema),
        startDate: z.string().openapi({ example: "20240101" }),
        endDate: z.string().openapi({ example: "20240131" }),
    })
    .openapi("ChartResponse");

// FiTop
const TopStockItemSchema = z
    .object({
        stockCode: z.string().openapi({ example: "005930" }),
        stockName: z.string().openapi({ example: "삼성전자" }),
        volume: z.number().openapi({ example: 500000 }),
    })
    .openapi("TopStockItem");

const FiTopResponseSchema = z
    .object({
        buyTop: z.array(TopStockItemSchema),
        sellTop: z.array(TopStockItemSchema),
        date: z.string().openapi({ example: "20240131" }),
    })
    .openapi("FiTopResponse");

// News
const NewsRequestSchema = z
    .object({
        stockCode: z
            .string()
            .openapi({ example: "005930", description: "종목코드" }),
        stockName: z.string().optional().openapi({
            example: "삼성전자",
            description: "종목명 (검색 키워드)",
        }),
        len: z
            .string()
            .optional()
            .openapi({ example: "1w", description: "기간 (1d, 1w, 1m)" }),
    })
    .openapi("NewsRequest");

const NewsItemSchema = z
    .object({
        title: z.string().openapi({ example: "삼성전자, AI 반도체 투자 확대" }),
        url: z.string().openapi({ example: "https://example.com/news/1" }),
        date: z.string().openapi({ example: "2024-01-30" }),
        snippet: z
            .string()
            .openapi({ example: "삼성전자가 AI 반도체 생산라인..." }),
    })
    .openapi("NewsItem");

const NewsResponseSchema = z
    .object({
        stockCode: z.string().openapi({ example: "005930" }),
        stockName: z.string().openapi({ example: "삼성전자" }),
        news: z.array(NewsItemSchema),
    })
    .openapi("NewsResponse");

// News from URL
const NewsFromUrlRequestSchema = z
    .object({
        url: z.string().url().openapi({
            example: "https://example.com/news/article/123",
            description: "뉴스 URL",
        }),
    })
    .openapi("NewsFromUrlRequest");

const NewsFromUrlResponseSchema = z
    .object({
        title: z.string().openapi({ example: "삼성전자, AI 반도체 투자 확대" }),
        url: z
            .string()
            .openapi({ example: "https://example.com/news/article/123" }),
        date: z.string().openapi({ example: "2024-01-30" }),
        content: z.string().openapi({
            example: "삼성전자가 AI 반도체 생산라인 투자를 확대한다고...",
        }),
    })
    .openapi("NewsFromUrlResponse");

// Error
const ErrorSchema = z
    .object({
        error: z
            .string()
            .openapi({ example: "stockCode와 startDate는 필수입니다" }),
    })
    .openapi("Error");

// ── 라우트 정의 ─────────────────────────────

const chartRoute = createRoute({
    method: "post",
    path: "/api/chart",
    tags: ["Chart"],
    summary: "주식 차트 데이터 조회",
    description:
        "종목코드와 기간으로 일봉 차트 데이터(OHLCV)를 조회합니다. 수정주가가 반영됩니다.",
    request: {
        body: {
            content: { "application/json": { schema: ChartRequestSchema } },
            required: true,
        },
    },
    responses: {
        200: {
            content: { "application/json": { schema: ChartResponseSchema } },
            description: "차트 데이터 조회 성공",
        },
        400: {
            content: { "application/json": { schema: ErrorSchema } },
            description: "필수 파라미터 누락",
        },
    },
});

const fiTopRoute = createRoute({
    method: "get",
    path: "/api/fitop",
    tags: ["Foreign/Institution"],
    summary: "외국인/기관 매매 상위 10 종목",
    description:
        "외국인 순매수/순매도 상위 10개 종목을 조회합니다. 장마감 전에는 가집계, 이후에는 실제 매매량 보정 데이터를 반환합니다. KIS API 호출 실패 시 DB의 최신 데이터가 반환됩니다.",
    responses: {
        200: {
            content: { "application/json": { schema: FiTopResponseSchema } },
            description: "상위 종목 조회 성공 (DB Fallback 포함)",
        },
        500: {
            content: { "application/json": { schema: ErrorSchema } },
            description: "API 및 DB 모두 조회 실패",
        },
    },
});

const fiTopDbRoute = createRoute({
    method: "get",
    path: "/api/fitop-db",
    tags: ["Foreign/Institution"],
    summary: "DB에 외국인/기관 매매 상위 10 종목 강제 적재",
    description:
        "KIS API에서 최신 데이터를 가져와 강제로 DB에 적재한 후 반환합니다.",
    responses: {
        200: {
            content: { "application/json": { schema: FiTopResponseSchema } },
            description: "저장 및 조회 성공",
        },
        500: {
            content: { "application/json": { schema: ErrorSchema } },
            description: "API 에러",
        },
    },
});

const newsRoute = createRoute({
    method: "post",
    path: "/api/news",
    tags: ["News"],
    summary: "종목 뉴스 조회",
    description:
        "Google News RSS 피드를 활용해 종목 관련 최신 뉴스를 검색합니다. 중복 뉴스는 제목 유사도 기반으로 자동 제거됩니다.",
    request: {
        body: {
            content: { "application/json": { schema: NewsRequestSchema } },
            required: true,
        },
    },
    responses: {
        200: {
            content: { "application/json": { schema: NewsResponseSchema } },
            description: "뉴스 검색 성공",
        },
        400: {
            content: { "application/json": { schema: ErrorSchema } },
            description: "필수 파라미터 누락",
        },
    },
});

const newsFromUrlRoute = createRoute({
    method: "post",
    path: "/api/news-from-url",
    tags: ["News"],
    summary: "URL 뉴스 크롤링",
    description:
        "URL에서 뉴스 본문을 추출합니다. @mozilla/readability + jsdom을 활용합니다.",
    request: {
        body: {
            content: {
                "application/json": { schema: NewsFromUrlRequestSchema },
            },
            required: true,
        },
    },
    responses: {
        200: {
            content: {
                "application/json": { schema: NewsFromUrlResponseSchema },
            },
            description: "뉴스 크롤링 성공",
        },
        400: {
            content: { "application/json": { schema: ErrorSchema } },
            description: "필수 파라미터 누락",
        },
    },
});

// ── Hono 앱 생성 ─────────────────────────

export const app = new OpenAPIHono();

app.use("*", cors());

// ── 에러 핸들러 ──────────────────────────

app.onError((err, c) => {
    console.error("Server Error:", err);
    return c.json({ error: err.message || "Internal Server Error" }, 500);
});

// ── 라우트 핸들러 ────────────────────────

app.openapi(chartRoute, async (c) => {
    const body = c.req.valid("json");

    if (!body.stockCode || !body.startDate) {
        return c.json({ error: "stockCode와 startDate는 필수입니다" }, 400);
    }

    const result = await getStockChart(
        kisClient,
        body.stockCode,
        body.startDate,
        body.endDate,
    );

    return c.json(result, 200);
});

app.openapi(fiTopRoute, async (c) => {
    try {
        const result = await getForeignInstitutionTop10(kisClient);

        // 데이터가 유효한 경우 안전하게 DB 저장
        if (result && result.date) {
            dbInstance.saveFiTop(result.date, result.buyTop, result.sellTop);
        }

        return c.json(result, 200);
    } catch (e) {
        console.error("Failed to fetch FiTop from KIS. Fallbacking to DB:", e);
        const latestInfo = dbInstance.getLatestFiTop();
        if (latestInfo) {
            return c.json(latestInfo, 200);
        }
        return c.json(
            { error: "Failed to fetch from API and no cache available" },
            500,
        );
    }
});

app.openapi(fiTopDbRoute, async (c) => {
    try {
        const result = await getForeignInstitutionTop10(kisClient);

        if (result && result.date) {
            dbInstance.saveFiTop(result.date, result.buyTop, result.sellTop);
        }

        const latestInfo = dbInstance.getFiTop(result.date) || result;
        return c.json(latestInfo, 200);
    } catch (e) {
        console.error("Failed to update FiTop DB:", e);
        return c.json(
            { error: "Failed to update internal DB from KIS API" },
            500,
        );
    }
});

app.openapi(newsRoute, async (c) => {
    const body = c.req.valid("json");

    if (!body.stockCode) {
        return c.json({ error: "stockCode는 필수입니다" }, 400);
    }

    const result = await getStockNews(
        newsClient,
        body.stockCode,
        body.stockName || body.stockCode,
        body.len || "1d",
    );

    return c.json(result, 200);
});

app.openapi(newsFromUrlRoute, async (c) => {
    const body = c.req.valid("json");

    if (!body.url) {
        return c.json({ error: "url은 필수입니다" }, 400);
    }

    const result = await getNewsFromUrl(body.url);
    return c.json(result as any, 200);
});

// ── OpenAPI 문서 & Swagger UI ────────────

app.doc("/doc", {
    openapi: "3.0.0",
    info: {
        title: "Daily Stock Spoon API",
        version: "1.0.0",
        description:
            "Daily Stock Spoon 유틸리티 서버 API. 주식 차트, 외국인/기관 매매 동향, 종목 뉴스 조회 기능을 제공합니다.",
    },
    servers: [{ url: "/", description: "Current server" }],
});

app.get("/swagger", swaggerUI({ url: "/doc" }));

// ── 서버 시작 ─────────────────────────────

const port = parseInt(process.env.PORT || "3000", 10);

serve(
    {
        fetch: app.fetch,
        port,
    },
    (info) => {
        console.log(
            `🚀 Daily Stock Spoon server running on http://localhost:${info.port}`,
        );
        console.log(`📖 Swagger UI: http://localhost:${info.port}/swagger`);
        console.log(`📄 OpenAPI JSON: http://localhost:${info.port}/doc`);
    },
);
