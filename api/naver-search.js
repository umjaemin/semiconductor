// Vercel Serverless Function
// 네이버 뉴스 검색 API 프록시 (Client ID/Secret은 서버 환경변수에만 저장되어 브라우저에 노출되지 않음)

export default async function handler(req, res) {
  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: "검색어가 없습니다." });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "서버에 네이버 API 키가 설정되지 않았습니다." });
  }

  try {
    const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(q)}&display=8&sort=date`;
    const response = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 403) {
        return res.status(429).json({ error: "오늘의 무료 검색 한도(25,000건)를 다 썼습니다. 자정 이후 다시 이용 가능합니다." });
      }
      return res.status(response.status).json({ error: "네이버 API 요청이 실패했습니다." });
    }

    const data = await response.json();

    // 필요한 필드만 정리해서 프론트엔드로 전달
    const items = (data.items || []).map((item) => ({
      title: item.title.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
      description: item.description.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
      link: item.originallink || item.link,
      pubDate: item.pubDate,
    }));

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: "검색 중 오류가 발생했습니다." });
  }
}
