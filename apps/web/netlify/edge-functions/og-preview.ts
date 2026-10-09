const BOT_USER_AGENTS: string[] = [
  "telegrambot",
  "whatsapp",
  "twitterbot",
  "facebookexternalhit",
  "facebot",
  "discordbot",
  "slackbot",
  "skypeuripreview",
  "linkedinbot",
  "vkshare",
  "redditbot",
  "applebot",
];

export default async function handler(request: Request, context: any) {
  const url = new URL(request.url);
  const userAgent = (request.headers.get("user-agent") || "").toLowerCase();

  // Match /d/:code
  const match = url.pathname.match(/^\/d\/([^/]+)/);
  if (match) {
    const isBot = BOT_USER_AGENTS.some((bot: string) => userAgent.includes(bot));
    if (isBot) {
      const code = match[1];
      const backendUrl = `https://rdkwebsite-production.up.railway.app/api/v1/shares/preview/${code}`;
      try {
        const resp = await fetch(backendUrl, {
          headers: {
            "Accept": "text/html",
            "User-Agent": request.headers.get("user-agent") || "NetlifyEdgeBot",
          },
        });
        if (resp.ok) {
          const html = await resp.text();
          return new Response(html, {
            status: 200,
            headers: {
              "content-type": "text/html; charset=utf-8",
              "cache-control": "public, max-age=3600",
            },
          });
        }
      } catch (err) {
        // Fall back to SPA if fetch fails
      }
    }
  }

  return context.next();
}
