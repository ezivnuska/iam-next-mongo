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

export function isSafeExternalUrl(url: string): boolean {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return false; }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const host = parsed.hostname.toLowerCase();

  if (host === 'localhost' || host === '0.0.0.0') return false;
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) return false;
  if (host === '[::1]' || host === '::1') return false;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b, c, d] = ipv4.slice(1).map(Number);
    if (a === 127) return false;                          // loopback
    if (a === 10) return false;                           // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return false;   // 172.16.0.0/12
    if (a === 192 && b === 168) return false;             // 192.168.0.0/16
    if (a === 169 && b === 254) return false;             // link-local
    if (a === 0 || a === 255) return false;               // unspecified/broadcast
    if (a >= 224) return false;                           // multicast
  }

  return true;
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  if (!isSafeExternalUrl(url)) return null;

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
    const rawImage = extractOgMeta(html, 'og:image');
    const image = rawImage && isSafeExternalUrl(rawImage) ? rawImage : undefined;
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
