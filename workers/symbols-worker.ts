// Cloudflare Worker to serve updated symbols list with CORS and daily caching
// Deploy with Wrangler (free plan). Returns JSON array of symbols at /symbols

const NASDAQ_URL = 'https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt';
const OTHER_URL = 'https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt';

const FX_PAIRS = [
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X', 'USDCAD=X', 'AUDUSD=X', 'NZDUSD=X',
  'USDILS=X', 'USDNOK=X', 'USDSEK=X', 'USDTRY=X', 'USDINR=X', 'USDCNY=X', 'USDHKD=X',
  'USDKRW=X', 'USDZAR=X', 'USDMXN=X', 'USDBRL=X', 'USDPLN=X', 'USDCLP=X'
];

const CRYPTO_PAIRS = [
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'DOGE-USD', 'ADA-USD',
  'AVAX-USD', 'DOT-USD', 'MATIC-USD', 'LTC-USD'
];

function parseNasdaq(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith('Symbol|') || line.startsWith('File Creation Time')) continue;
    const cols = line.split('|');
    if (cols.length < 7) continue;
    const symbol = cols[0]?.trim().toUpperCase();
    const testIssue = cols[3]?.trim();
    const etf = cols[6]?.trim();
    if (!symbol) continue;
    if (testIssue === 'Y') continue;
    if (etf === 'Y') continue;
    if (!/^[A-Z0-9.\-]+$/.test(symbol)) continue;
    out.push(symbol);
  }
  return out;
}

function parseOther(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith('ACT Symbol|') || line.startsWith('File Creation Time')) continue;
    const cols = line.split('|');
    if (cols.length < 7) continue;
    const actSymbol = cols[0]?.trim().toUpperCase();
    const cqsSymbol = cols[3]?.trim().toUpperCase();
    const etf = cols[4]?.trim();
    const testIssue = cols[6]?.trim();
    const symbol = (cqsSymbol || actSymbol);
    if (!symbol) continue;
    if (testIssue === 'Y') continue;
    if (etf === 'Y') continue;
    if (!/^[A-Z0-9.\-]+$/.test(symbol)) continue;
    out.push(symbol);
  }
  return out;
}

async function fetchAllSymbols(): Promise<string[]> {
  const [nasdaqRes, otherRes] = await Promise.all([
    fetch(NASDAQ_URL, { redirect: 'follow' }),
    fetch(OTHER_URL, { redirect: 'follow' }),
  ]);
  if (!nasdaqRes.ok || !otherRes.ok) {
    throw new Error(`Upstream failed: ${nasdaqRes.status}/${otherRes.status}`);
  }
  const nasdaqText = await nasdaqRes.text();
  const otherText = await otherRes.text();
  const symbols = [...parseNasdaq(nasdaqText), ...parseOther(otherText), ...FX_PAIRS, ...CRYPTO_PAIRS];
  const uniq = Array.from(new Set(symbols));
  uniq.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return uniq;
}

function cors(headers: HeadersInit = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=3600', // 1h at edge; see CF cache below
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  } as HeadersInit;
}

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors() });
    if (url.pathname !== '/' && url.pathname !== '/symbols') {
      return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: cors() });
    }

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    const cached = await cache.match(cacheKey);
    if (cached) return new Response(cached.body, cached);

    try {
      const list = await fetchAllSymbols();
      const res = new Response(JSON.stringify(list), { status: 200, headers: cors() });
      // Cache at edge for 24h
      ctx.waitUntil(cache.put(cacheKey, new Response(res.clone().body, res)));
      return res;
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e?.message || 'fetch failed' }), { status: 502, headers: cors() });
    }
  }
} satisfies ExportedHandler;


