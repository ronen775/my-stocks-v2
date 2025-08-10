import fetch from 'node-fetch';
import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

// Optional: if you plan to use paid APIs, define secrets here later
// const FMP_KEY = defineSecret('FMP_API_KEY');

// Free sources fallback: Yahoo (no key, via direct), CoinGecko, ExchangeRate Host

function isCrypto(symbol: string) {
  return /^(BTC|ETH|SOL|BNB|XRP|DOGE|ADA|AVAX|DOT|MATIC|LTC)-USD$/.test(symbol);
}
function isFx(symbol: string) {
  return /^[A-Z]{6}=X$/.test(symbol);
}

async function fetchYahoo(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  const url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + encodeURIComponent(symbols.join(','));
  const res = await fetch(url);
  if (!res.ok) return {};
  const json = await res.json() as any;
  const out: Record<string, number> = {};
  const list = json?.quoteResponse?.result || [];
  for (const r of list) {
    const sym = r?.symbol;
    const price = r?.regularMarketPrice ?? r?.postMarketPrice ?? r?.bid ?? r?.ask ?? r?.previousClose;
    if (sym && typeof price === 'number' && price > 0) out[sym] = price;
  }
  return out;
}

async function fetchCrypto(symbol: string): Promise<number | null> {
  const base = symbol.split('-')[0];
  const map: Record<string, string> = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple', DOGE: 'dogecoin',
    ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot', MATIC: 'polygon', LTC: 'litecoin'
  };
  const id = map[base];
  if (!id) return null;
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
  if (!res.ok) return null;
  const json = await res.json() as any;
  const val = json?.[id]?.usd;
  return (typeof val === 'number' && val > 0) ? val : null;
}

async function fetchFx(symbol: string): Promise<number | null> {
  const base = symbol.slice(0, 3);
  const quote = symbol.slice(3, 6);
  const res = await fetch(`https://api.exchangerate.host/latest?base=${base}&symbols=${quote}`);
  if (!res.ok) return null;
  const json = await res.json() as any;
  const val = json?.rates?.[quote];
  return (typeof val === 'number' && val > 0) ? val : null;
}

// Simple in-memory cache (per instance) ~30s
const cache: Map<string, { price: number, ts: number }> = new Map();
const TTL_MS = 30_000;

export const getQuote = onCall({ cors: true, region: 'us-central1' }, async (req) => {
  const body = (req.data || {}) as { symbols?: string[] };
  const symbols = Array.isArray(body.symbols) ? body.symbols : [];
  const unique = Array.from(new Set(symbols.map(s => String(s).toUpperCase().trim())));
  if (unique.length === 0) return {};

  // Partition
  const stocksOrYahoo = unique.filter(s => !isCrypto(s) && !isFx(s));
  const cryptos = unique.filter(isCrypto);
  const fxs = unique.filter(isFx);

  const out: Record<string, number> = {};
  const now = Date.now();
  const pendingYahoo: string[] = [];
  // Serve from cache where possible
  for (const s of stocksOrYahoo) {
    const c = cache.get(s);
    if (c && now - c.ts < TTL_MS) {
      out[s] = c.price;
    } else {
      pendingYahoo.push(s);
    }
  }
  // Yahoo batch
  try {
    if (pendingYahoo.length) {
      const y = await fetchYahoo(pendingYahoo);
      for (const [k, v] of Object.entries(y)) {
        out[k] = v;
        cache.set(k, { price: v, ts: now });
      }
    }
  } catch {}
  // Crypto
  await Promise.all(cryptos.map(async s => {
    try {
      const cached = cache.get(s);
      if (cached && now - cached.ts < TTL_MS) { out[s] = cached.price; return; }
      const p = await fetchCrypto(s);
      if (p && p > 0) out[s] = p;
      if (p && p > 0) cache.set(s, { price: p, ts: now });
    } catch {}
  }));
  // FX
  await Promise.all(fxs.map(async s => {
    try {
      const cached = cache.get(s);
      if (cached && now - cached.ts < TTL_MS) { out[s] = cached.price; return; }
      const p = await fetchFx(s);
      if (p && p > 0) out[s] = p;
      if (p && p > 0) cache.set(s, { price: p, ts: now });
    } catch {}
  }));

  return out;
});


