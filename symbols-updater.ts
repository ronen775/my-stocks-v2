// Runtime symbols updater: fetches public symbol directories once per day
// Falls back to the bundled list if network fails. Caches results in localStorage.

const NASDAQ_URL = 'https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt';
const OTHER_URL = 'https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt';
// Optional proxy endpoint to avoid CORS; if not provided, we will NOT fetch over network in the browser
const SYMBOLS_ENDPOINT: string | undefined = (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SYMBOLS_ENDPOINT : undefined);
const CACHE_KEY = 'symbols_cache_v1';
const CACHE_TS_KEY = 'symbols_cache_v1_ts';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Common FX pairs (Yahoo Finance format uses "=X")
const FX_PAIRS = [
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X', 'USDCAD=X', 'AUDUSD=X', 'NZDUSD=X',
  'USDILS=X', 'USDNOK=X', 'USDSEK=X', 'USDTRY=X', 'USDINR=X', 'USDCNY=X', 'USDHKD=X',
  'USDKRW=X', 'USDZAR=X', 'USDMXN=X', 'USDBRL=X', 'USDPLN=X', 'USDCLP=X'
];

// Popular crypto pairs (Yahoo Finance format)
const CRYPTO_PAIRS = [
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'DOGE-USD', 'ADA-USD',
  'AVAX-USD', 'DOT-USD', 'MATIC-USD', 'LTC-USD'
];

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

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

export async function fetchSymbolsFromPublicSources(): Promise<string[]> {
  // If a proxy endpoint is configured, fetch from it; otherwise avoid network calls (prevents CORS errors)
  if (SYMBOLS_ENDPOINT && typeof fetch !== 'undefined') {
    const res = await fetch(SYMBOLS_ENDPOINT, { redirect: 'follow' });
    if (!res.ok) throw new Error(`Failed to fetch ${SYMBOLS_ENDPOINT}: ${res.status}`);
    const list: string[] = await res.json();
    return Array.isArray(list) ? list : [];
  }
  // No proxy configured → do not fetch over network in client; rely on bundled list only
  return [];
}

export async function initSymbolsList(initialList: string[]): Promise<string[]> {
  try {
    const tsRaw = localStorage.getItem(CACHE_TS_KEY);
    const lastTs = tsRaw ? Number(tsRaw) : 0;
    const now = Date.now();
    // Use cached list if available
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cached: string[] = JSON.parse(cachedRaw);
      // Refresh in background if older than 24h
      if (!lastTs || now - lastTs > ONE_DAY_MS) {
        void refreshSymbolsInBackground();
      }
      return cached.length ? cached : initialList;
    }
    // No cache: kick off fetch in background only if proxy is configured; otherwise return initial
    if (SYMBOLS_ENDPOINT) {
      void refreshSymbolsInBackground();
    }
    return initialList;
  } catch {
    return initialList;
  }
}

async function refreshSymbolsInBackground() {
  try {
    // Skip if proxy not configured
    if (!SYMBOLS_ENDPOINT) return;
    const symbols = await fetchSymbolsFromPublicSources();
    localStorage.setItem(CACHE_KEY, JSON.stringify(symbols));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch {
    // ignore network errors
  }
}



