/** Google Custom Search 요청 파라미터 */
export interface GoogleSearchParams {
    /** 검색 쿼리 */
    query: string;
    /** 기간 필터 (d[N], w[N], m[N]) */
    dateRestrict?: string;
    /** 결과 수 (1~10) */
    num?: number;
    /** 시작 인덱스 */
    start?: number;
}

/** Google Custom Search 개별 결과 */
export interface GoogleSearchItem {
    /** 결과 제목 */
    title: string;
    /** 결과 URL */
    link: string;
    /** 텍스트 스니펫 */
    snippet: string;
    /** 페이지 메타 정보 */
    pagemap?: {
        metatags?: Array<Record<string, string>>;
    };
}

/** Google Custom Search API 응답 */
export interface GoogleSearchResponse {
    items?: GoogleSearchItem[];
    searchInformation?: {
        totalResults: string;
        searchTime: number;
    };
}
