import 'server-only';
import { env } from '@/lib/env';

/**
 * Người dùng có thể paste 1 trong 3 thứ:
 *   1. Place ID thô (vd "ChIJN1t_tDeuEmsRUsoyG83frY4")
 *   2. Link share dạng ngắn (maps.app.goo.gl / goo.gl/maps)  → cần follow redirect
 *   3. URL Google Maps dài đầy đủ                              → regex hoặc searchText
 *
 * Hàm này quy về Place ID chuẩn của Google. Throw nếu không resolve được.
 */
export async function resolvePlaceId(rawInput: string): Promise<string> {
  const input = rawInput.trim();
  if (!input) throw new Error('Input rỗng');

  // 1) Place ID thô — không chứa "://" và là chuỗi base64url-style.
  if (!input.includes('://') && /^[A-Za-z0-9_-]{20,}$/.test(input)) {
    return input;
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Không phải Place ID hợp lệ hoặc URL Google Maps');
  }

  // 2) Short URL → resolve về URL thật bằng cách follow redirect.
  // Chỉ cho phép host whitelist để tránh SSRF qua URL người dùng paste.
  const finalUrl = isGoogleShortLink(url.hostname)
    ? await followRedirect(input)
    : input;

  // 3) Regex các pattern hay gặp trên URL Google Maps đầy đủ.
  // 3a) ?q=place_id:ChIJ...  hoặc  ?placeid=ChIJ...
  const queryMatch = finalUrl.match(/[?&!]place[_]?id[=:]([A-Za-z0-9_-]{20,})/i);
  if (queryMatch) return queryMatch[1];

  // 3b) Bất kỳ chuỗi ChIJ... xuất hiện trong URL.
  const chijMatch = finalUrl.match(/(ChIJ[A-Za-z0-9_-]{20,})/);
  if (chijMatch) return chijMatch[1];

  // 4) URL share thông thường có dạng /maps/place/<Tên>/@lat,lng,zoom/data=...
  // Không chứa Place ID dưới dạng ChIJ. Dùng searchText với tên + location bias.
  const placeName = extractPlaceName(finalUrl);
  const coords = extractCoords(finalUrl);
  if (placeName) {
    return await searchTextForPlaceId(placeName, coords);
  }

  throw new Error(
    'Không trích được Place ID từ URL. Hãy paste Place ID trực tiếp (vd: ChIJ...).',
  );
}

function isGoogleShortLink(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'goo.gl' || h === 'maps.app.goo.gl' || h === 'g.page';
}

async function followRedirect(shortUrl: string): Promise<string> {
  const res = await fetch(shortUrl, {
    method: 'GET',
    redirect: 'follow',
    cache: 'no-store',
    headers: {
      // 1 số short link trả HTML khác nhau theo UA — dùng UA browser phổ thông.
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok && res.status !== 0) {
    throw new Error(`Không follow được short link (HTTP ${res.status})`);
  }
  return res.url;
}

function extractPlaceName(url: string): string | null {
  const m = url.match(/\/maps\/place\/([^/@?]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

function extractCoords(url: string): { lat: number; lng: number } | null {
  const m = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  return { lat: Number(m[1]), lng: Number(m[2]) };
}

async function searchTextForPlaceId(
  query: string,
  bias: { lat: number; lng: number } | null,
): Promise<string> {
  const body: Record<string, unknown> = { textQuery: query, pageSize: 1 };
  if (bias) {
    body.locationBias = {
      circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: 500 },
    };
  }
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.googlePlacesApiKey(),
      'X-Goog-FieldMask': 'places.id',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places searchText ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { places?: { id: string }[] };
  const id = data.places?.[0]?.id;
  if (!id) throw new Error('Không tìm thấy địa điểm khớp với "' + query + '"');
  return id;
}
