import axios from "axios";
import * as cheerio from "cheerio";

const BATCH_EXECUTE_URL =
    "https://news.google.com/_/DotsSplashUi/data/batchexecute";

const BROWSER_HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
};

/**
 * Google News RSS 리다이렉트 URL → 원본 뉴스 URL 변환
 *
 * 흐름:
 * 1. Google News 리다이렉트 페이지 GET → HTML 수신
 * 2. `c-wiz[data-p]` 속성에서 요청 파라미터 추출
 * 3. `%.@.` → `["garturlreq",` 치환으로 JSON 파싱
 * 4. Google의 batchexecute API (`Fbv4je`)에 POST
 * 5. 응답에서 원본 기사 URL 추출
 *
 * @see https://stackoverflow.com/questions/79444019
 * @param googleRssUrl Google News RSS 피드에서 받은 리다이렉트 URL
 * @returns 원본 뉴스 기사 URL
 */
export async function resolveGoogleNewsUrl(
    googleRssUrl: string,
): Promise<string> {
    // 1단계: Google News 리다이렉트 페이지 HTML 가져오기
    const response = await axios.get(googleRssUrl);
    const $ = cheerio.load(response.data);

    // 2단계: c-wiz 컴포넌트의 data-p 속성에서 요청 데이터 추출
    const data = $("c-wiz[data-p]").attr("data-p");

    if (!data) {
        return googleRssUrl;
    }

    // 3단계: data-p 파싱 → batchexecute 요청 페이로드 생성
    // "%.@." 접두사를 JSON 배열 시작으로 치환
    const obj = JSON.parse(data.replace("%.@.", '["garturlreq",'));

    const payload = {
        "f.req": JSON.stringify([
            [
                [
                    "Fbv4je",
                    JSON.stringify([...obj.slice(0, -6), ...obj.slice(-2)]),
                    "null",
                    "generic",
                ],
            ],
        ]),
    };

    // 4단계: batchexecute API에 POST → 원본 URL 응답
    const postResponse = await axios.post(BATCH_EXECUTE_URL, payload, {
        headers: BROWSER_HEADERS,
    });

    // 5단계: 응답 파싱 → 원본 URL 추출
    // 응답 앞의 ")]}'\\n" 보안 접두사 제거 후 JSON 파싱
    const arrayString = JSON.parse(postResponse.data.replace(")]}'", ""))[0][2];
    const articleUrl = JSON.parse(arrayString)[1] as string;

    return articleUrl;
}
