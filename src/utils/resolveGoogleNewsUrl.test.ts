import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

// axios mock
vi.mock("axios", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        create: vi.fn(() => ({ get: vi.fn(), post: vi.fn() })),
    },
}));

import { resolveGoogleNewsUrl } from "./resolveGoogleNewsUrl.js";

// ── 테스트 헬퍼 ─────────────────────────

/** c-wiz[data-p] 속성을 포함한 mock HTML 생성 */
function buildMockHtml(dataP: string): string {
    return `<html><body><c-wiz data-p='${dataP}'></c-wiz></body></html>`;
}

/** batchexecute 응답 형식 mock 생성 */
function buildBatchResponse(articleUrl: string): string {
    return `)]}'\n${JSON.stringify([
        [null, null, JSON.stringify([null, articleUrl])],
    ])}`;
}

/** 유효한 data-p mock (10개 요소 = slice(-6) + slice(-2) 연산 가능) */
const MOCK_DATA_P =
    '%.@."encoded_id","timestamp","a","b","c","d","e","f","x","y"]';

describe("resolveGoogleNewsUrl", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("batchexecute를 통해 원본 URL을 추출해야 한다", async () => {
        const googleUrl =
            "https://news.google.com/rss/articles/CBMiSOME_ENCODED?oc=5";
        const originalUrl = "https://apnews.com/article/some-article";

        // GET → HTML
        (axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: buildMockHtml(MOCK_DATA_P),
        });

        // POST → batchexecute 응답
        (axios.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: buildBatchResponse(originalUrl),
        });

        const result = await resolveGoogleNewsUrl(googleUrl);

        expect(result).toBe(originalUrl);
        expect(axios.get).toHaveBeenCalledWith(googleUrl);
        expect(axios.post).toHaveBeenCalledWith(
            "https://news.google.com/_/DotsSplashUi/data/batchexecute",
            expect.objectContaining({ "f.req": expect.any(String) }),
            expect.objectContaining({
                headers: expect.objectContaining({
                    "Content-Type":
                        "application/x-www-form-urlencoded;charset=UTF-8",
                }),
            }),
        );
    });

    it("c-wiz[data-p] 속성이 없으면 원본 URL을 반환해야 한다", async () => {
        const googleUrl =
            "https://news.google.com/rss/articles/CBMiSOME_ENCODED";

        (axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: "<html><body><div>No c-wiz</div></body></html>",
        });

        const result = await resolveGoogleNewsUrl(googleUrl);
        expect(result).toBe(googleUrl);
        expect(axios.post).not.toHaveBeenCalled();
    });

    it("GET 요청 실패 시 에러가 전파되어야 한다", async () => {
        const googleUrl =
            "https://news.google.com/rss/articles/CBMiSOME_ENCODED";

        (axios.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
            new Error("Network error"),
        );

        await expect(resolveGoogleNewsUrl(googleUrl)).rejects.toThrow(
            "Network error",
        );
    });

    it("batchexecute POST 실패 시 에러가 전파되어야 한다", async () => {
        const googleUrl =
            "https://news.google.com/rss/articles/CBMiSOME_ENCODED";

        (axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: buildMockHtml(MOCK_DATA_P),
        });

        (axios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
            new Error("Post error"),
        );

        await expect(resolveGoogleNewsUrl(googleUrl)).rejects.toThrow(
            "Post error",
        );
    });
});
