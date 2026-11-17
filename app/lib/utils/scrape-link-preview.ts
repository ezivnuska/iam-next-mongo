// app/lib/utils/scrape-link-preview.ts

if (typeof window !== 'undefined') {
  throw new Error('Server-only module');
}

export interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

function extractOgMeta(html: string, property: string): string | undefined {
  const re1 = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i');
  return (html.match(re1) || html.match(re2))?.[1];
}

function extractNameMeta(html: string, name: string): string | undefined {
  const re1 = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i');
  return (html.match(re1) || html.match(re2))?.[1];
}

function extractTitle(html: string): string | undefined {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    if (!(response.headers.get('content-type') || '').includes('text/html')) return null;

    const reader = response.body?.getReader();
    if (!reader) return null;

    let html = '';
    let bytesRead = 0;
    const decoder = new TextDecoder();

    while (bytesRead < 50_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytesRead += value.length;
      if (html.includes('</head>')) break;
    }
    reader.cancel().catch(() => {});

    const title = extractOgMeta(html, 'og:title') || extractTitle(html);
    const description = extractOgMeta(html, 'og:description') || extractNameMeta(html, 'description');
    const image = extractOgMeta(html, 'og:image');
    const siteName = extractOgMeta(html, 'og:site_name');

    if (!title && !description && !image) return null;

    return {
      ...(title && { title }),
      ...(description && { description }),
      ...(image && { image }),
      ...(siteName && { siteName }),
    };
  } catch {
    return null;
  }
}
