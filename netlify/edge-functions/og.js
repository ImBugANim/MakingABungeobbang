// 링크 미리보기(카톡·인스타 등)용: ?g=... 링크로 들어오면 <head>에 OG 태그를 넣어줘요.
// Netlify 환경변수 SUPABASE_URL (예: https://abcd.supabase.co) 이 필요해요.
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function nameOf(h) {
  try {
    const b = h.match(/../g).map(x => parseInt(x, 16));
    if (b.length < 3 || b[0] > 100 || (b[1] & 127) > 2 || b[2] > 40) return '';
    const nw = b[1] > 127;
    let i = 3;
    for (let k = 0; k < b[2]; k++) i += nw && b[i] > 127 ? 2 + b[i + 1] * 2 : 3;
    return new TextDecoder().decode(new Uint8Array(b.slice(i))).slice(0, 8);
  } catch { return ''; }
}

async function oid(h) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(h));
  return [...new Uint8Array(b)].slice(0, 10).map(x => x.toString(16).padStart(2, '0')).join('');
}

export default async (req, context) => {
  const res = await context.next();
  const g = new URL(req.url).searchParams.get('g');
  if (!g || !/^[0-9a-f]{6,2000}$/.test(g)) return res;
  if (!(res.headers.get('content-type') || '').includes('text/html')) return res;
  const name = nameOf(g);
  if (!name) return res;

  const sb = (Netlify.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
  const url = new URL(req.url);
  const title = `${esc(name)}님이 붕어빵을 선물했어요! 🐟`;
  const desc = '따끈한 붕어빵이 도착했어요. 눌러서 확인해 보세요!';
  let tags = `<meta property="og:type" content="website"><meta property="og:title" content="${title}">` +
    `<meta property="og:description" content="${desc}"><meta property="og:url" content="${esc(url.href)}">` +
    `<meta name="twitter:card" content="summary_large_image">`;
  if (sb) {
    const img = `${sb}/storage/v1/object/public/og/${await oid(g)}.jpg`;
    tags += `<meta property="og:image" content="${img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`;
  }
  let html = (await res.text())
    .replace(/<meta property="og:[^>]*>/g, '')
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace('</head>', tags + '</head>');
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  return new Response(html, { status: res.status, headers });
};

export const config = { path: '/' };
