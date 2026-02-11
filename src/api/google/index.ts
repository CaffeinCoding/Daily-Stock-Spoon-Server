import axios, { type AxiosInstance } from "axios";
import type { GoogleSearchParams, GoogleSearchResponse } from "./types.js";

const GOOGLE_CSE_BASE_URL =
    "https://customsearch.googleapis.com/customsearch/v1";

export class GoogleSearchClient {
    private apiKey: string;
    private searchEngineId: string;
    private client: AxiosInstance;

    constructor(apiKey: string, searchEngineId: string) {
        this.apiKey = apiKey;
        this.searchEngineId = searchEngineId;
        this.client = axios.create();
    }

    /**
     * Google Custom Search 실행
     * @param params 검색 파라미터
     * @returns 검색 결과
     */
    async search(params: GoogleSearchParams): Promise<GoogleSearchResponse> {
        const { data } = await this.client.get<GoogleSearchResponse>(
            GOOGLE_CSE_BASE_URL,
            {
                params: {
                    key: this.apiKey,
                    cx: this.searchEngineId,
                    q: params.query,
                    gl: "kr",
                    ...(params.dateRestrict && {
                        dateRestrict: params.dateRestrict,
                    }),
                    ...(params.num && { num: params.num }),
                    ...(params.start && { start: params.start }),
                },
            },
        );

        return data;
    }
}
