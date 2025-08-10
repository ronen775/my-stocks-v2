// Cloudflare Worker: Free quote proxy with 30s cache
// Deploy: wrangler publish (Cloudflare account required)
// Request: GET /?symbols=MSFT,AAPL,BTC-USD,USDILS=X

const TTL = 30; // seconds

function isCrypto(symbol) {
  return /^(BTC|ETH|SOL|BNB|XRP|DOGE|ADA|AVAX|DOT|MATIC|LTC)-USD$/.test(symbol);
}
function isFx(symbol) {
  return /^[A-Z]{6}=X$/.test(symbol);
}

async function fetchYahoo(symbols) {
  if (!symbols.length) return {};
  const url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + encodeURIComponent(symbols.join(','));
  const res = await fetch(url);
  if (!res.ok) return {};
  const json = await res.json();
  const out = {};
  const list = json?.quoteResponse?.result || [];
  for (const r of list) {
    const sym = r?.symbol;
    const price = r?.regularMarketPrice ?? r?.postMarketPrice ?? r?.bid ?? r?.ask ?? r?.previousClose;
    if (sym && typeof price === 'number' && price > 0) out[sym] = price;
  }
  return out;
}

async function fetchCrypto(symbol) {
  const base = symbol.split('-')[0];
  const map = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple', DOGE: 'dogecoin',
    ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot', MATIC: 'polygon', LTC: 'litecoin'
  };
  const id = map[base];
  if (!id) return null;
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
  if (!res.ok) return null;
  const json = await res.json();
  const val = json?.[id]?.usd;
  return (typeof val === 'number' && val > 0) ? val : null;
}

async function fetchFx(symbol) {
  const base = symbol.slice(0, 3);
  const quote = symbol.slice(3, 6);
  const res = await fetch(`https://api.exchangerate.host/latest?base=${base}&symbols=${quote}`);
  if (!res.ok) return null;
  const json = await res.json();
  const val = json?.rates?.[quote];
  return (typeof val === 'number' && val > 0) ? val : null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const symbolsParam = url.searchParams.get('symbols') || '';
    const symbols = Array.from(new Set(symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)));
    if (!symbols.length) return new Response('{}', { headers: { 'Content-Type': 'application/json' } });

    // Cache key
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    // Partition
    const yahooSyms = symbols.filter(s => !isCrypto(s) && !isFx(s));
    const cryptos = symbols.filter(isCrypto);
    const fxs = symbols.filter(isFx);

    const out = {};
    try {
      const y = await fetchYahoo(yahooSyms);
      Object.assign(out, y);
    } catch {}

    await Promise.all(cryptos.map(async s => {
      try {
        const p = await fetchCrypto(s);
        if (p && p > 0) out[s] = p;
      } catch {}
    }));

    await Promise.all(fxs.map(async s => {
      try {
        const p = await fetchFx(s);
        if (p && p > 0) out[s] = p;
      } catch {}
    }));

    const resp = new Response(JSON.stringify(out), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${TTL}`
      }
    });
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  }
};


