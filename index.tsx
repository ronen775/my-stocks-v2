import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import * as XLSX from 'xlsx';
import { signInWithGoogle, signOutUser, getCurrentUser, saveUserData, getUserData, onAuthStateChange, fetchQuotesViaFunction, connectGoogleSheets } from './firebase-config';
import { Modal } from './components/Modal';
import { listenTransactions, upsertTransaction, deleteTransaction, hasAnyTransactions } from './data/transactions';
// Sharing features removed for now
import { listenPortfolios, createPortfolio, renamePortfolio, deletePortfolio } from './data/portfolios';
import { stockList as STOCK_LIST_BUNDLED } from './stockList';
import { initSymbolsList } from './symbols-updater';

// Removed FMP API usage on client to avoid exposing secrets

// --- Icon Components ---
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
    </svg>
);
const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-3.5 1a.5.5 0 0 1-.65-.65l1-3.5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V12h2.293L12.793 5.5z"/>
    </svg>
);
const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
       <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V7a.5.5 0 0 0-1 0v5z"/>
       <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
    </svg>
);
const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
    </svg>
);

const FillAllIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M.5 2A.5.5 0 0 1 1 1.5h14a.5.5 0 0 1 0 1H1A.5.5 0 0 1 .5 2zM14.5 14a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1 0-1h13a.5.5 0 0 1 .5.5zM8 6a.5.5 0 0 1 .5.5v4.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L7.5 11.293V6.5A.5.5 0 0 1 8 6z"/>
    </svg>
);

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
    </svg>
);

// --- Brand Logo ---
const AppLogo = () => (
  <svg className="app-logo" viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--primary-color)" />
        <stop offset="100%" stopColor="#0ea5e9" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="28" height="28" rx="6" fill="url(#lg)" opacity="0.12" />
    <path d="M6 20l5-6 4 3 6-8 5 9" fill="none" stroke="var(--primary-color)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="26" cy="20" r="2" fill="var(--primary-color)" />
  </svg>
);

// --- US Indices Widget (TradingView) side-by-side: chart left, list right ---
const IndicesWidget: React.FC<{ dark: boolean }> = ({ dark }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<{ s: string; d: string; alt?: string }>(
    { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' }
  );

  const symbols: Array<{ s: string; d: string; alt?: string }> = [
    { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' },
    { s: 'NASDAQ:NDX', d: 'Nasdaq 100' },
    { s: 'AMEX:IWM', d: 'Russell 2000' },
    { s: 'COINBASE:BTCUSD', alt: 'BINANCE:BTCUSDT', d: 'Bitcoin' },
    { s: 'COINBASE:ETHUSD', alt: 'BINANCE:ETHUSDT', d: 'Ethereum' }
  ];

  useEffect(() => {
    if (!chartRef.current) return;

    const renderWidget = (symbol: string) => {
      if (!chartRef.current) return;
      chartRef.current.innerHTML = '';
      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container__widget';
      chartRef.current.appendChild(widgetDiv);

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        symbols: [[`${symbol}|1D`]],
        chartOnly: false,
        width: '100%',
        height: '320',
        locale: 'en',
        colorTheme: dark ? 'dark' : 'light',
        isTransparent: false,
        showVolume: false,
        lineWidth: 2
      });
      chartRef.current.appendChild(script);
    };

    // Try primary symbol first
    renderWidget(selected.s);

    // If nothing rendered in a short time, try the fallback (for Dow Jones)
    const timeoutId = window.setTimeout(() => {
      if (!chartRef.current) return;
      const hasContent = chartRef.current.querySelector('iframe, table, div > div');
      if (!hasContent && selected.alt) {
        renderWidget(selected.alt);
      }
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
      if (chartRef.current) chartRef.current.innerHTML = '';
    };
  }, [selected, dark]);

  return (
    <div className="card indices-card">
      <div className="indices-grid">
        <div className="indices-chart tradingview-widget-container" ref={chartRef} />
        <div className="indices-list">
          <div className="indices-title">מדדי ארה"ב</div>
          {symbols
            .filter(sym => sym.d === 'S&P 500' || sym.d === 'Nasdaq 100' || sym.d === 'Russell 2000')
            .map(sym => (
              <button
                key={sym.s}
                className={'indices-item' + (selected.s === sym.s ? ' active' : '')}
                onClick={() => setSelected(sym)}
                type="button"
              >
                {sym.d}
              </button>
            ))}
          <div className="indices-row">
            {symbols
              .filter(sym => sym.d === 'Bitcoin' || sym.d === 'Ethereum')
              .map(sym => (
                <button
                  key={sym.s}
                  className={'indices-item' + (selected.s === sym.s ? ' active' : '')}
                  onClick={() => setSelected(sym)}
                  type="button"
                >
                  {sym.d}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Tabs Navigation ---
type MainView = 'dashboard' | 'performance' | 'analytics' | 'settings';

interface TabNavProps {
  currentView: MainView;
  onChange: (view: MainView) => void;
}

const TabNav: React.FC<TabNavProps> = ({ currentView, onChange }) => {
  const tabs: Array<{ key: MainView; label: string; icon: React.ReactNode }> = [
    { key: 'dashboard', label: 'דשבורד', icon: <svg className="tab-icon" viewBox="0 0 24 24"><path d="M3 3h7v9H3zM14 3h7v5h-7zM14 11h7v10h-7zM3 14h7v7H3z" fill="currentColor"/></svg> },
    { key: 'performance', label: 'ביצועים', icon: <svg className="tab-icon" viewBox="0 0 24 24"><path d="M3 17h4l3-8 4 6 3-4 4 6H3z" fill="currentColor"/></svg> },
    { key: 'analytics', label: 'אנליטיקה', icon: <svg className="tab-icon" viewBox="0 0 24 24"><path d="M5 9h3v12H5zM10.5 3h3v18h-3zM16 12h3v9h-3z" fill="currentColor"/></svg> },
    { key: 'settings', label: 'הגדרות', icon: <svg className="tab-icon" viewBox="0 0 24 24"><path d="M19.14 12.94a7.07 7.07 0 000-1.88l2.03-1.58a.5.5 0 00.12-.66l-1.92-3.32a.5.5 0 00-.61-.22l-2.39.96a7.1 7.1 0 00-1.63-.95l-.36-2.54a.5.5 0 00-.5-.43h-3.84a.5.5 0 00-.5.43l-.36 2.54a7.1 7.1 0 00-1.63.95l-2.39-.96a.5.5 0 00-.61.22L2.71 8.82a.5.5 0 00.12.66l2.03 1.58a7.07 7.07 0 000 1.88l-2.03 1.58a.5.5 0 00-.12.66l1.92 3.32c.13.22.39.31.61.22l2.39-.96c.51.38 1.06.7 1.63.95l.36 2.54a.5.5 0 00.5.43h3.84a.5.5 0 00.5-.43l.36-2.54c.57-.25 1.12-.57 1.63-.95l2.39.96c.22.09.48 0 .61-.22l1.92-3.32a.5.5 0 00-.12-.66l-2.03-1.58zM12 15.5A3.5 3.5 0 1115.5 12 3.5 3.5 0 0112 15.5z" fill="currentColor"/></svg> },
  ];

  return (
    <nav className="tab-nav" aria-label="Primary">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={
            'tab-item' + (currentView === tab.key ? ' active' : '')
          }
          aria-current={currentView === tab.key ? 'page' : undefined}
          onClick={() => onChange(tab.key)}
        >
          {tab.icon}
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

const SaveIcon = ({ color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={color} viewBox="0 0 16 16">
    <path d="M7 1a2 2 0 0 0-2 2v1H2.5A1.5 1.5 0 0 0 1 5.5v8A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 13.5 1H13V2a2 2 0 0 1-2 2H7V1zm1 2V2h4v1a1 1 0 0 1-1 1H8zm-5 2h10a.5.5 0 0 1 .5.5V13a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 2 13V5.5A.5.5 0 0 1 2.5 5z"/>
    </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707z"/>
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.459c-.084 1.602.415 3.26 1.38 4.5C7.5 9.5 8.5 10 9.5 10c.828 0 1.5-.672 1.5-1.5 0-.464-.158-.928-.53-1.291a.768.768 0 0 1-.53-1.291.768.768 0 0 1 .53-1.291A1.5 1.5 0 0 0 11 4.5c0-.828-.672-1.5-1.5-1.5-.5 0-.924.158-1.291.53A.768.768 0 0 1 7.5 2.5a.768.768 0 0 1-.53-1.291A.768.768 0 0 1 6 .278zM4.5 12.5a.5.5 0 0 1-.5-.5 7.208 7.208 0 0 1 .878-3.459c.084-1.602-.415-3.26-1.38-4.5C2.5 6.5 1.5 6 .5 6c-.828 0-1.5.672-1.5 1.5 0 .464.158.928.53 1.291a.768.768 0 0 1-.53 1.291.768.768 0 0 1 .53 1.291A1.5 1.5 0 0 0 4.5 12.5c.828 0 1.5-.672 1.5-1.5 0-.464-.158-.928-.53-1.291a.768.768 0 0 1-.53-1.291A.768.768 0 0 1 4.5 12.5z"/>
  </svg>
);

// --- Type Definitions ---
interface Transaction {
    id: number;
    stockName: string;
    price: number;
    quantity: number;
    total: number;
    commission: number;
    date: string;
}

interface Settings {
    minCommission: number;
    commissionRate: number;
    additionalFee: number;
    taxRate: number;
    minYear?: number;
    maxYear?: number;
    sheetsSpreadsheetId?: string;
    polygonApiKey?: string;
}

interface StockSummary {
    totalBuyQuantity: number;
    totalSellQuantity: number;
    remainingQuantity: number;
    weightedAvgBuyPrice: number; // Pure price average
    weightedAvgCostBasis: number; // Price + commission average
    totalBuyCost: number;
    totalBuyValue: number; // Total buy value without commissions
    totalSellValue: number; // Total value of sales
    totalCommissions: number;
    realizedGrossPnl: number;
    realizedNetPnl: number;
    roi: number;
}

interface Dividend {
    date: string;
    exDate: string;
    amount: number;
    type: 'regular' | 'special' | 'liquidating';
    frequency?: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
}

interface TooltipState {
    visible: boolean;
    x: number;
    y: number;
    content: string;
}


// --- Helper Functions ---
const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(value));
    return value < 0 ? `-${formatted}` : formatted;
};

// Date helpers and safe formatting
const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

const parseLooseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    const s = String(dateString).trim();
    let date: Date | null = null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        date = new Date(`${s}T00:00:00Z`);
    } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        date = new Date(Date.UTC(y, m - 1, d));
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [d, m, y] = s.split('/').map(Number);
        date = new Date(Date.UTC(y, m - 1, d));
    } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
        const [d, m, y] = s.split('.').map(Number);
        date = new Date(Date.UTC(y, m - 1, d));
    } else if (/^\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2}$/.test(s)) {
        // Two-digit year, assume 00-69 -> 2000-2069, 70-99 -> 1970-1999
        const parts = s.split(/[\.\/-]/).map(Number);
        const d = parts[0];
        const m = parts[1];
        const yy = parts[2];
        const y = yy < 70 ? 2000 + yy : 1900 + yy;
        date = new Date(Date.UTC(y, m - 1, d));
    } else if (/^\d{1,2}[-\s][A-Za-z]{3,9}[-\s]\d{2,4}$/.test(s)) {
        // Formats like 12-Aug-2024 or 12 Aug 24
        const months: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
        const [dd, mon, yy] = s.replace(/\s+/g,' ').split(/[\s-]/);
        const dnum = Number(dd);
        const mnum = months[mon.slice(0,3).toLowerCase()];
        let ynum = Number(yy);
        if (ynum < 100) ynum = ynum < 70 ? 2000 + ynum : 1900 + ynum;
        if (!isNaN(dnum) && mnum >= 0 && !isNaN(ynum)) {
            date = new Date(Date.UTC(ynum, mnum, dnum));
        }
    } else {
        const tmp = new Date(s);
        date = isNaN(tmp.getTime()) ? null : tmp;
    }
    if (!date || isNaN(date.getTime())) return null;
    const year = date.getUTCFullYear();
    if (year < MIN_YEAR || year > MAX_YEAR) return null;
    return date;
};

const normalizeIsoDateString = (dateString: string): string | null => {
    const date = parseLooseDate(dateString);
    if (!date) return null;
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatDate = (dateString: string) => {
    const date = parseLooseDate(dateString);
    if (!date) return '—';
    return new Intl.DateTimeFormat('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};

const safeDateMs = (dateString: string): number => {
    const d = parseLooseDate(dateString);
    return d ? d.getTime() : 0;
};

// --- Google API helper ---
async function googleApiRequest<T = any>(url: string, options: { method?: string; body?: any; token: string }): Promise<{ ok: boolean; data: T | null; errorText?: string }>{
    try {
        const resp = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${options.token}`,
                'Content-Type': 'application/json'
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        const text = await resp.text();
        let json: any = null;
        try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
        if (!resp.ok) {
            const msg = json?.error?.message || json?.message || text || `HTTP ${resp.status}`;
            return { ok: false, data: null, errorText: msg };
        }
        return { ok: true, data: json as T };
    } catch (e: any) {
        return { ok: false, data: null, errorText: e?.message || 'Network error' };
    }
}

// Excel helpers
const excelSerialToIsoDate = (serial: number): string | null => {
    if (typeof serial !== 'number' || !isFinite(serial)) return null;
    // Excel's epoch (1900 system) starting at 1899-12-30 to account for the 1900 leap-year bug
    const excelEpochMs = Date.UTC(1899, 11, 30);
    const ms = excelEpochMs + Math.round(serial) * 24 * 60 * 60 * 1000;
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    if (y < MIN_YEAR || y > MAX_YEAR) return null;
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const normalizeExcelDateValue = (value: any): string | null => {
    if (value == null || value === '') return null;
    if (value instanceof Date) return normalizeIsoDateString(value.toISOString().slice(0,10));
    if (typeof value === 'number') return excelSerialToIsoDate(value);
    const text = String(value).trim();
    // Numeric string that looks like a serial
    if (/^\d{3,6}$/.test(text)) {
        const n = Number(text);
        const iso = excelSerialToIsoDate(n);
        if (iso) return iso;
    }
    return normalizeIsoDateString(text);
};

const pnlClass = (pnl: number) => pnl >= 0 ? 'profit' : 'loss';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0', '#546E7A', '#26a69a', '#D10CE8'];


// --- Chart Components ---
const LineChart: React.FC<{ data: Array<{ x: number; y: number }>; width?: number; height?: number; stroke?: string }>
  = ({ data, width = 600, height = 220, stroke = 'var(--primary-color)' }) => {
    if (!data || data.length === 0) {
      return <div className="chart-placeholder">אין נתונים להצגה</div>;
    }
    const minX = Math.min(...data.map(d => d.x));
    const maxX = Math.max(...data.map(d => d.x));
    const minY = Math.min(...data.map(d => d.y));
    const maxY = Math.max(...data.map(d => d.y));
    const pad = 8;
    const mapX = (x: number) => pad + ((x - minX) / Math.max(1, (maxX - minX))) * (width - pad * 2);
    const mapY = (y: number) => height - pad - ((y - minY) / Math.max(1, (maxY - minY))) * (height - pad * 2);
    const path = data
      .sort((a, b) => a.x - b.x)
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${mapX(d.x)} ${mapY(d.y)}`)
      .join(' ');
    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        <path d={path} fill="none" stroke={stroke} strokeWidth="2" />
      </svg>
    );
};

// --- External Quotes Endpoint (Cloudflare Worker) helper ---
const QUOTES_ENDPOINT: string | undefined = (import.meta as any).env?.VITE_QUOTES_ENDPOINT;

const fetchFromQuotesEndpoint = async (symbols: string[]): Promise<Record<string, number>> => {
    try {
        if (!QUOTES_ENDPOINT || !symbols?.length) return {};
        const url = `${QUOTES_ENDPOINT}?symbols=${encodeURIComponent(symbols.join(','))}`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return {};
        const data = await res.json();
        return (data && typeof data === 'object') ? data : {};
    } catch {
        return {};
    }
};
const PieChart = ({ data, onHover, onLeave }) => {
    if (!data || data.length === 0) {
        return <div className="chart-placeholder">אין נתונים להצגה</div>;
    }
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    let startAngle = -90;

    const getArcPath = (cx, cy, radius, startAngle, endAngle) => {
        const start = polarToCartesian(cx, cy, radius, endAngle);
        const end = polarToCartesian(cx, cy, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} L ${cx} ${cy} Z`;
    };

    const polarToCartesian = (cx, cy, radius, angleInDegrees) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: cx + (radius * Math.cos(angleInRadians)),
            y: cy + (radius * Math.sin(angleInRadians))
        };
    };

    return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
            {data.map((item, index) => {
                const percentage = (item.value / totalValue) * 360;
                const endAngle = startAngle + percentage;
                const pathData = getArcPath(100, 100, 100, startAngle, endAngle);
                startAngle = endAngle;
                return (
                    <path
                        key={item.name}
                        d={pathData}
                        fill={item.color}
                        onMouseMove={(e) => onHover(e, item)}
                        onMouseOut={onLeave}
                        className="pie-slice"
                    />
                );
            })}
        </svg>
    );
};

const App: React.FC = () => {
    // --- State Management ---
    const [view, setView] = useState<'dashboard' | 'stockDetail' | 'performance' | 'analytics' | 'settings'>('dashboard');
    const [dashboardFilter, setDashboardFilter] = useState<'open' | 'closed'>('open');
    const [buyHistoryFilter, setBuyHistoryFilter] = useState<'all' | 'unsold' | 'sold'>('unsold');
    const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('all');
    const [customStart, setCustomStart] = useState<string>('');
    const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'stock', direction: 'asc' });
    const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [settings, setSettings] = useState<Settings>({
        minCommission: 7,
        commissionRate: 0.0008,
        additionalFee: 2.5,
        taxRate: 0.25,
        minYear: MIN_YEAR,
        maxYear: MAX_YEAR,
        sheetsSpreadsheetId: '',
        polygonApiKey: '8pT3Kh9Npf_8Q5gn6dI2fN6p_8YuWQSH'
    });
    const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, content: '' });
    const [activePortfolioId, setActivePortfolioId] = useState<string>('default');
    const [portfolios, setPortfolios] = useState<Array<{ id: string; name: string }>>([{ id: 'default', name: 'ברירת מחדל' }]);

    const [buyTransactions, setBuyTransactions] = useState<Transaction[]>([]);
    const [sellTransactions, setSellTransactions] = useState<Transaction[]>([]);
    const [isUpdatingStocks, setIsUpdatingStocks] = useState<boolean>(false);
    const [symbolList, setSymbolList] = useState<string[]>(STOCK_LIST_BUNDLED);
    const [showMigration, setShowMigration] = useState<boolean>(false);
    const [currentStockPrices, setCurrentStockPrices] = useState<Record<string, number>>({});
    const [isFetchingCurrentPrices, setIsFetchingCurrentPrices] = useState<boolean>(false);
    
    // Dividend data
    const [stockDividends, setStockDividends] = useState<Record<string, Dividend[]>>({});
    const [isLoadingDividends, setIsLoadingDividends] = useState<Record<string, boolean>>({});
    const [lastDividendUpdate, setLastDividendUpdate] = useState<Record<string, number>>({});
    
    // Collapsible tables in stock detail view
    const [showBuyTable, setShowBuyTable] = useState<boolean>(true);
    const [showSellTable, setShowSellTable] = useState<boolean>(true);
    const [showDividendsTable, setShowDividendsTable] = useState<boolean>(false);
    const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
    const [modal, setModal] = useState<
      | null
      | {
          title?: string;
          message: any;
          actions: Array<{
            label: string;
            value: string;
            variant?: 'primary' | 'danger' | 'default';
          }>;
          onClose?: (v: string | null, payload?: any) => any;
          withInput?: boolean;
          inputLabel?: string;
          inputPlaceholder?: string;
          inputDefaultValue?: string;
          selectOptions?: Array<{ value: string; label: string }>;
          multiSelect?: boolean;
        }
    >(null);
    
    // Simple cache for stock prices (5 minutes)
    const priceCache = useRef<Record<string, { price: number; timestamp: number }>>({});
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    // Dividend cache (24 hours)
    const DIVIDEND_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    const importInputRef = useRef<HTMLInputElement | null>(null);
  // Sheets: simple helpers
  const createSheetsTemplate = useCallback(async (token: string): Promise<string | null> => {
    const create = await googleApiRequest<any>('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      token,
      body: {
        properties: { title: 'Stock Calculator - Template' },
        sheets: [
          { properties: { title: 'קניות' } },
          { properties: { title: 'מכירות' } },
          { properties: { title: 'הגדרות' } },
        ],
      },
    });
    if (!create.ok || !create.data?.spreadsheetId) return null;
    const sid = create.data.spreadsheetId as string;
    const values = {
      valueInputOption: 'RAW',
      data: [
        { range: 'קניות!A1:G1', values: [['id','stockName','price','quantity','total','commission','date']] },
        { range: 'מכירות!A1:G1', values: [['id','stockName','price','quantity','total','commission','date']] },
        { range: 'הגדרות!A1:D1', values: [['minCommission','commissionRate','additionalFee','taxRate']] },
      ],
    } as any;
    const write = await googleApiRequest<any>(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values:batchUpdate`, { method: 'POST', token, body: values });
    if (!write.ok) return null;
    return sid;
  }, []);

  const exportToSheets = useCallback(async (token: string, spreadsheetId: string) => {
    // build rows
    const buyRows = buyTransactions.map(t => [t.id, t.stockName, t.price, t.quantity, t.total, t.commission, t.date]);
    const sellRows = sellTransactions.map(t => [t.id, t.stockName, t.price, t.quantity, t.total, t.commission, t.date]);
    const settRow = [settings.minCommission, settings.commissionRate, settings.additionalFee, settings.taxRate];
    const payload = {
      valueInputOption: 'RAW',
      data: [
        { range: 'קניות!A1', values: [['id','stockName','price','quantity','total','commission','date'], ...buyRows] },
        { range: 'מכירות!A1', values: [['id','stockName','price','quantity','total','commission','date'], ...sellRows] },
        { range: 'הגדרות!A1', values: [['minCommission','commissionRate','additionalFee','taxRate'], settRow] },
      ],
    } as any;
    const res = await googleApiRequest<any>(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, { method: 'POST', token, body: payload });
    return res.ok;
  }, [buyTransactions, sellTransactions, settings]);

  const importFromSheets = useCallback(async (token: string, spreadsheetId: string) => {
    const ranges = ['קניות!A2:G100000', 'מכירות!A2:G100000', 'הגדרות!A2:D2'];
    const res = await googleApiRequest<any>(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${encodeURIComponent(ranges[0])}&ranges=${encodeURIComponent(ranges[1])}&ranges=${encodeURIComponent(ranges[2])}`, { method: 'GET', token });
    if (!res.ok) throw new Error(res.errorText || 'read failed');
    const valueRanges: Array<{ range: string; values: any[][] }> = res.data?.valueRanges || [];
    const get = (title: string) => valueRanges.find(v => v.range?.includes(title))?.values || [];
    const buys = get('קניות').filter(r => r.length >= 7).map(r => ({ id: Number(r[0]), stockName: String(r[1]||''), price: Number(r[2]||0), quantity: Number(r[3]||0), total: Number(r[4]||0), commission: Number(r[5]||0), date: String(r[6]||'') })) as Transaction[];
    const sells = get('מכירות').filter(r => r.length >= 7).map(r => ({ id: Number(r[0]), stockName: String(r[1]||''), price: Number(r[2]||0), quantity: Number(r[3]||0), total: Number(r[4]||0), commission: Number(r[5]||0), date: String(r[6]||'') })) as Transaction[];
    const sett = get('הגדרות')[0];
    if (buys.length) setBuyTransactions(buys);
    if (sells.length) setSellTransactions(sells);
    if (sett && sett.length >= 4) setSettings(prev => ({ ...prev, minCommission: Number(sett[0]||0), commissionRate: Number(sett[1]||0), additionalFee: Number(sett[2]||0), taxRate: Number(sett[3]||0) }));
  }, []);

  // Fetch dividends from Polygon.io API
  const fetchStockDividends = useCallback(async (stockSymbol: string) => {
    if (!settings.polygonApiKey) {
      console.warn('No Polygon API key configured');
      return;
    }

    // Check if we need to update (24 hour cache)
    const now = Date.now();
    const lastUpdate = lastDividendUpdate[stockSymbol] || 0;
    if (now - lastUpdate < DIVIDEND_CACHE_DURATION) {
      console.log(`Dividends for ${stockSymbol} are still fresh, skipping update`);
      return;
    }

    setIsLoadingDividends(prev => ({ ...prev, [stockSymbol]: true }));
    
    try {
      // Get current year and previous year for comprehensive data
      const currentYear = new Date().getFullYear();
      const fromDate = `${currentYear - 2}-01-01`;
      const toDate = `${currentYear + 1}-12-31`;
      
      const response = await fetch(
        `https://api.polygon.io/v3/reference/dividends?ticker=${stockSymbol}&ex_dividend_date.gte=${fromDate}&ex_dividend_date.lte=${toDate}&apiKey=${settings.polygonApiKey}`
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API key לא תקין - אנא בדוק את המפתח שלך');
        } else if (response.status === 429) {
          throw new Error('חרגת ממגבלת הבקשות - נסה שוב מאוחר יותר');
        } else if (response.status === 500) {
          throw new Error('שגיאת שרת - נסה שוב מאוחר יותר');
        } else {
          throw new Error(`שגיאת HTTP: ${response.status}`);
        }
      }
      
      const data = await response.json();
      
      if (data.results) {
        const dividends: Dividend[] = data.results.map((item: any) => ({
          date: item.pay_date || item.ex_dividend_date,
          exDate: item.ex_dividend_date,
          amount: item.cash_amount || 0,
          type: item.type || 'regular',
          frequency: item.frequency || 'quarterly'
        }));
        
        // Sort by date (newest first)
        dividends.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setStockDividends(prev => ({ ...prev, [stockSymbol]: dividends }));
        setLastDividendUpdate(prev => ({ ...prev, [stockSymbol]: now }));
        
        // Show success message if dividends were found
        if (dividends.length > 0) {
          console.log(`Successfully loaded ${dividends.length} dividends for ${stockSymbol}`);
          // Check for upcoming dividends after loading
          setTimeout(() => checkUpcomingDividends(), 100);
        } else {
          console.log(`No dividends found for ${stockSymbol}`);
        }
      } else if (data.error) {
        throw new Error(`API Error: ${data.error}`);
      } else {
        console.log(`No dividend data available for ${stockSymbol}`);
        setStockDividends(prev => ({ ...prev, [stockSymbol]: [] }));
        setLastDividendUpdate(prev => ({ ...prev, [stockSymbol]: now }));
      }
    } catch (error) {
      console.error(`Error fetching dividends for ${stockSymbol}:`, error);
      // Set empty dividends array to prevent repeated failed attempts
      setStockDividends(prev => ({ ...prev, [stockSymbol]: [] }));
      setLastDividendUpdate(prev => ({ ...prev, [stockSymbol]: now }));
    } finally {
      setIsLoadingDividends(prev => ({ ...prev, [stockSymbol]: false }));
    }
  }, [settings.polygonApiKey, lastDividendUpdate]);

  // Auto-fetch dividends when opening stock detail (once per day)
  const ensureDividendsLoaded = useCallback((stockSymbol: string) => {
    const now = Date.now();
    const lastUpdate = lastDividendUpdate[stockSymbol] || 0;
    
    if (now - lastUpdate >= DIVIDEND_CACHE_DURATION) {
      fetchStockDividends(stockSymbol);
    }
  }, [fetchStockDividends, lastDividendUpdate]);





  // Check for upcoming dividend payments and show notifications
  const checkUpcomingDividends = useCallback(() => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next 7 days
    
    let hasUpcomingDividends = false;
    let upcomingDividendsList: string[] = [];
    
    for (const [stock, dividends] of Object.entries(stockDividends)) {
      const upcomingDividends = dividends.filter(d => {
        const dividendDate = new Date(d.date);
        return dividendDate > now && dividendDate <= nextWeek;
      });
      
      if (upcomingDividends.length > 0) {
        hasUpcomingDividends = true;
        const totalAmount = upcomingDividends.reduce((sum, d) => {
          // For upcoming dividends, use current holdings as approximation
          const currentHoldings = buyTransactions
            .filter(t => t.stockName === stock)
            .reduce((sum, t) => sum + t.quantity, 0) -
            sellTransactions
            .filter(t => t.stockName === stock)
            .reduce((sum, t) => sum + t.quantity, 0);
          return sum + (d.amount * Math.max(0, currentHoldings));
        }, 0);
        upcomingDividendsList.push(`${stock}: ${formatCurrency(totalAmount)} ב-${formatDate(upcomingDividends[0].date)}`);
      }
    }
    
    if (hasUpcomingDividends) {
      console.log('Upcoming dividends in the next week:', upcomingDividendsList);
      // Here you could add a toast notification or alert
      // For now, we'll just log to console
    }
  }, [stockDividends]);

    // Auth management (lightweight): set user and load settings + handle share token
    useEffect(() => {
        try {
            const unsubscribe = onAuthStateChange((u) => {
                setUser(u);
                setIsLoading(false);
                if (u) {
                    loadUserData(u.uid);
                } else {
                    setBuyTransactions([]);
                    setSellTransactions([]);
                    setShowMigration(false);
                }
            });
            return () => unsubscribe();
        } catch (error) {
            console.warn('Firebase Auth not available - using local mode');
            setIsLoading(false);
            // Don't set user - let user sign in manually
        }
    }, []);

    // Sharing removed: no read-only token handling

    // Offline/online indicator
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    // Realtime listeners for current portfolio (buy/sell)
    useEffect(() => {
        if (!user) return;
        // Clear current view while switching portfolios to avoid mixing entries
        setBuyTransactions([]);
        setSellTransactions([]);
        const unsubBuy = listenTransactions(user.uid, activePortfolioId, 'buy', setBuyTransactions);
        const unsubSell = listenTransactions(user.uid, activePortfolioId, 'sell', setSellTransactions);
        return () => { unsubBuy(); unsubSell(); };
    }, [user?.uid, activePortfolioId]);



    // Portfolios listener and active portfolio guard
    useEffect(() => {
        if (!user) return;
        const unsub = listenPortfolios(user.uid, (rows) => {
            // Keep all portfolios as-is; do not synthesize default here
            const list = rows.length ? rows : [{ id: 'default', name: 'ברירת מחדל' }];
            setPortfolios(list);
            if (!list.find(p => p.id === activePortfolioId)) {
                setActivePortfolioId(list[0].id);
            }
        });
        return () => unsub();
    }, [user?.uid]);

    // Migration visibility per active portfolio
    useEffect(() => {
        (async () => {
            try {
                if (!user) { setShowMigration(false); return; }
                const hasBuy = await hasAnyTransactions(user.uid, activePortfolioId, 'buy');
                const hasSell = await hasAnyTransactions(user.uid, activePortfolioId, 'sell');
                if (hasBuy || hasSell) { setShowMigration(false); return; }
                const legacy = await getUserData(user.uid);
                const legacyBuys = legacy?.buyTransactions || [];
                const legacySells = legacy?.sellTransactions || [];
                setShowMigration((legacyBuys.length + legacySells.length) > 0);
            } catch {
                setShowMigration(false);
            }
        })();
    }, [user?.uid, activePortfolioId]);

    const loadUserData = async (userId: string) => {
        // Skip Firebase when not configured
        try {
            // Try Firestore first (only if configured)
            const userData = await getUserData(userId);
            if (userData && userData.settings) {
                // Merge settings to preserve any missing fields like polygonApiKey
                const mergedSettings = { ...settings, ...userData.settings };
                setSettings(mergedSettings);
                return;
            }
        } catch (error) {
            console.warn('Firebase not available, using local storage');
        }
        // Fallback to local backup
        try {
            const localRaw = localStorage.getItem(`portfolio_backup_${userId}`);
            if (localRaw) {
                const localData = JSON.parse(localRaw);
                if (localData.settings) {
                    // Merge settings to preserve any missing fields like polygonApiKey
                    const mergedSettings = { ...settings, ...localData.settings };
                    setSettings(mergedSettings);
                }
            }
        } catch {
            // ignore
        }
    };

    // removed startRealtime (handled by useEffect dependencies)

    const saveUserDataToFirebase = async () => {
        if (!user) return;
            try {
                const payload = {
                    settings,
                    lastUpdated: new Date().toISOString()
                };
            // Try Firebase first (only if configured)
            try {
                await saveUserData(user.uid, payload);
            } catch (error) {
                console.warn('Firebase not available, saving to local storage only');
            }
            // Always save to local storage as backup
            try { 
                localStorage.setItem(`portfolio_settings_${user.uid}`, JSON.stringify(payload));
                localStorage.setItem(`portfolio_backup_${user.uid}`, JSON.stringify(payload));
            } catch {}
            } catch (error) {
            console.error('Error saving user settings:', error);
        }
    };

    // Flush/save when leaving the page or when app goes to background, and retry when coming back online
    useEffect(() => {
        const handleBeforeUnload = () => { saveUserDataToFirebase(); };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                saveUserDataToFirebase();
            }
        };
        const handleOnline = () => {
            if (user && localStorage.getItem(`portfolio_needs_sync_${user.uid}`) === '1') {
                saveUserDataToFirebase().then(() => {
                    try { localStorage.removeItem(`portfolio_needs_sync_${user.uid}`); } catch {}
                });
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
        };
    }, [user, buyTransactions, sellTransactions, settings]);

    const handleSignIn = async () => {
        try {
            setIsLoading(true);
            const result = await signInWithGoogle();
            if (!result) {
                console.warn('Firebase Auth not available - using local mode');
                // Create a mock user for local mode
                const mockUser = { uid: 'local_user_' + Date.now() };
                setUser(mockUser);
                setView('dashboard');
            }
        } catch (error) {
            console.error('Error signing in:', error);
        } finally {
            setIsLoading(false);
        }
    };

    

    const handleSignOut = async () => {
        try {
            // Try to save before sign out; do not block sign out on failure
        try {
            await saveUserDataToFirebase();
            } catch (saveError) {
                console.warn('Save before sign out failed (continuing):', saveError);
            }
            // Try Firebase sign out (only if configured)
            try {
            await signOutUser();
            } catch (error) {
                console.warn('Firebase sign out not available');
            }
            // Clear local user state
            setUser(null);
            setView('dashboard');
        } catch (error) {
            console.error('Error signing out:', error);
            setModal({ title: 'שגיאה', message: 'שגיאה בהתנתקות: ' + (error as any).message, actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
        }
    };

    // Auto-save data when transactions change
    useEffect(() => {
        if (user) {
            const timeoutId = setTimeout(() => {
                saveUserDataToFirebase();
            }, 2000); // Save after 2 seconds of no changes

            return () => clearTimeout(timeoutId);
        }
    }, [buyTransactions, sellTransactions, settings, user]);

    // Manual save handler
    const handleManualSave = () => {
        if (user) {
            saveUserDataToFirebase();
            setModal({ title: 'שמירה', message: 'התיק נשמר בהצלחה!', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
        } else {
            setModal({ title: 'שגיאה', message: 'יש להתחבר כדי לשמור את התיק', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
        }
    };

    // פונקציית ייצוא
    const handleExportToExcel = async () => {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const buySheet = XLSX.utils.json_to_sheet(buyTransactions);
      const sellSheet = XLSX.utils.json_to_sheet(sellTransactions);
      const settingsSheet = XLSX.utils.json_to_sheet([settings]);
      XLSX.utils.book_append_sheet(wb, buySheet, 'קניות');
      XLSX.utils.book_append_sheet(wb, sellSheet, 'מכירות');
      XLSX.utils.book_append_sheet(wb, settingsSheet, 'הגדרות');
      XLSX.writeFile(wb, 'portfolio.xlsx');
    };

    // פונקציית ייבוא
    const handleImportFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const buyRaw = XLSX.utils.sheet_to_json(wb.Sheets['קניות'] || wb.Sheets['Buy'] || {});
        const sellRaw = XLSX.utils.sheet_to_json(wb.Sheets['מכירות'] || wb.Sheets['Sell'] || {});
        const settRaw = XLSX.utils.sheet_to_json(wb.Sheets['הגדרות'] || wb.Sheets['Settings'] || {});
        const buy: Transaction[] = buyRaw.map((row: any) => ({
          id: Number(row.id) || Date.now(),
          stockName: String(row.stockName || row['stockName'] || row['שם מניה'] || ''),
          price: Number(row.price || row['price'] || row['מחיר'] || 0),
          quantity: Number(row.quantity || row['quantity'] || row['כמות'] || 0),
          total: Number(row.total || row['total'] || row['סך הכל'] || 0),
          commission: Number(row.commission || row['commission'] || row['עמלה'] || 0),
          date: normalizeExcelDateValue(row.date ?? row['date'] ?? row['תאריך']) || '',
        }));
        const sell: Transaction[] = sellRaw.map((row: any) => ({
          id: Number(row.id) || Date.now(),
          stockName: String(row.stockName || row['stockName'] || row['שם מניה'] || ''),
          price: Number(row.price || row['price'] || row['מחיר'] || 0),
          quantity: Number(row.quantity || row['quantity'] || row['כמות'] || 0),
          total: Number(row.total || row['total'] || row['סך הכל'] || 0),
          commission: Number(row.commission || row['commission'] || row['עמלה'] || 0),
          date: normalizeExcelDateValue(row.date ?? row['date'] ?? row['תאריך']) || '',
        }));
        const sett: Settings[] = settRaw.map((row: any) => ({
          minCommission: Number(row.minCommission || row['minCommission'] || row['עמלת מינימום'] || 0),
          commissionRate: Number(row.commissionRate || row['commissionRate'] || row['שיעור עמלה'] || 0),
          additionalFee: Number(row.additionalFee || row['additionalFee'] || row['עמלה נוספת'] || 0),
          taxRate: Number(row.taxRate || row['taxRate'] || row['שיעור מס רווחי הון'] || 0),
        }));
        if (buy.length) setBuyTransactions(buy);
        if (sell.length) setSellTransactions(sell);
        if (sett.length) setSettings(sett[0]);
        setModal({ title: 'ייבוא', message: 'הנתונים יובאו בהצלחה!', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
      };
      reader.readAsBinaryString(file);
    };

    // --- עדכון מחירי מניות אוטומטי בכניסה לדוח ביצועים ---
    useEffect(() => {
      if (view === 'performance') {
        fetchCurrentPricesForOpenPortfolio();
      }
    }, [view]);

    // Theme management
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            setIsDarkTheme(savedTheme === 'dark');
        }
    }, []);

    useEffect(() => {
        if (isDarkTheme) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkTheme]);

    const toggleTheme = () => {
        setIsDarkTheme(!isDarkTheme);
    };

    // Form states
    const [buyStockName, setBuyStockName] = useState<string>('');
    const [buyPrice, setBuyPrice] = useState<string>('');
    const [buyQuantity, setBuyQuantity] = useState<string>('');
    const [buyDate, setBuyDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [sellPrice, setSellPrice] = useState<string>('');
    const [sellQuantity, setSellQuantity] = useState<string>('');
    const [sellDate, setSellDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isBuyFormVisible, setIsBuyFormVisible] = useState(false);
    const [isFetchingPrice, setIsFetchingPrice] = useState<boolean>(false);
    const [showBuyDateWarning, setShowBuyDateWarning] = useState<boolean>(false);
    const [showSellDateWarning, setShowSellDateWarning] = useState<boolean>(false);


    // View-related state
    const [activeStock, setActiveStock] = useState<string | null>(null);

    // Autocomplete state
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastQueryRef = useRef<string>("");
    
    // AI Client - removed as we're using direct APIs now

    const allTimeStocks = [...new Set([...buyTransactions.map(t => t.stockName), ...sellTransactions.map(t => t.stockName)])].sort();

    // --- Calculation Logic ---
    const calculateCommission = (totalValue: number): number => {
        const { minCommission, commissionRate, additionalFee } = settings;
        return Math.max(minCommission, totalValue * commissionRate) + additionalFee;
    };

    const calculateStockSummary = (stockName: string | null): StockSummary => {
        const initialSummary: StockSummary = {
            totalBuyQuantity: 0,
            totalSellQuantity: 0,
            remainingQuantity: 0,
            weightedAvgBuyPrice: 0,
            weightedAvgCostBasis: 0,
            totalBuyCost: 0,
            totalBuyValue: 0,
            totalSellValue: 0,
            totalCommissions: 0,
            realizedGrossPnl: 0,
            realizedNetPnl: 0,
            roi: 0,
        };
        if (!stockName) return initialSummary;

        const buysForStock = buyTransactions
            .filter(t => t.stockName === stockName)
            .sort((a, b) => safeDateMs(a.date) - safeDateMs(b.date));
        const sellsForStock = sellTransactions
            .filter(t => t.stockName === stockName)
            .sort((a, b) => safeDateMs(a.date) - safeDateMs(b.date));

        const totalBuyQuantity = buysForStock.reduce((sum, t) => sum + t.quantity, 0);
        const totalSellQuantity = sellsForStock.reduce((sum, t) => sum + t.quantity, 0);

        const totalBuyValue = buysForStock.reduce((sum, t) => sum + (t.price * t.quantity), 0);
        const totalBuyCommissions = buysForStock.reduce((sum, t) => sum + t.commission, 0);
        const totalBuyCost = totalBuyValue + totalBuyCommissions; // כולל עמלות קנייה בלבד
        
        // Build FIFO buy lots with remaining quantities and per-share cost basis (כולל עמלות)
        type BuyLot = { remaining: number; pricePerShare: number; costBasisPerShare: number };
        const buyLots: BuyLot[] = buysForStock.map(buy => ({
            remaining: buy.quantity,
            pricePerShare: buy.price,
            costBasisPerShare: (buy.price * buy.quantity + buy.commission) / buy.quantity,
        }));

        let totalSellValue = 0;
        let costOfSoldShares = 0; // Based on FIFO cost basis (כולל עמלות)

        for (const sell of sellsForStock) {
            let remainingToMatch = sell.quantity;
            totalSellValue += sell.total; // price * quantity
            for (const lot of buyLots) {
                if (remainingToMatch <= 0) break;
                if (lot.remaining <= 0) continue;
                const qtyTaken = Math.min(lot.remaining, remainingToMatch);
                costOfSoldShares += lot.pricePerShare * qtyTaken; // שינוי: רק מחיר קנייה, בלי עמלות
                lot.remaining -= qtyTaken;
                remainingToMatch -= qtyTaken;
            }
        }

        const remainingQuantity = buyLots.reduce((sum, lot) => sum + lot.remaining, 0);
        const remainingPriceValue = buyLots.reduce((sum, lot) => sum + lot.pricePerShare * lot.remaining, 0);
        const remainingCostBasisValue = buyLots.reduce((sum, lot) => sum + lot.costBasisPerShare * lot.remaining, 0);

        const weightedAvgBuyPrice = remainingQuantity > 0 ? (remainingPriceValue / remainingQuantity) : 0;
        const weightedAvgCostBasis = remainingQuantity > 0 ? (remainingCostBasisValue / remainingQuantity) : 0;

        // חישוב רווח/הפסד ברוטו - ללא עמלות
        const realizedGrossPnl = totalSellValue - costOfSoldShares;
        // חישוב סך כל העמלות (מוצגות בנפרד בלבד)
        const totalSellCommissions = sellsForStock.reduce((sum, t) => sum + t.commission, 0);
        const totalCommissions = totalBuyCommissions + totalSellCommissions;
        // רווח/הפסד נטו: אחרי מס בלבד, ללא עמלות
        const taxOnProfit = realizedGrossPnl > 0 ? realizedGrossPnl * settings.taxRate : 0;
        const realizedNetPnl = realizedGrossPnl - taxOnProfit;
        const totalInvestedForSold = costOfSoldShares;
        const roi = totalInvestedForSold > 0 ? (realizedGrossPnl / totalInvestedForSold) * 100 : 0;

        return {
            totalBuyQuantity,
            totalSellQuantity,
            remainingQuantity,
            weightedAvgBuyPrice,
            weightedAvgCostBasis,
            totalBuyCost,
            totalBuyValue, // Total buy value without commissions
            totalSellValue, // Total value of sales
            totalCommissions, // שדה חדש/מעודכן
            realizedGrossPnl, // ללא עמלות
            realizedNetPnl,   // כולל עמלות ומס
            roi,
        };
    };

    const activeStockSummary = useMemo(() => calculateStockSummary(activeStock), [activeStock, buyTransactions, sellTransactions, settings]);
    
    const allSummaries = useMemo(() => {
        return allTimeStocks.map(stock => ({
            stock,
            summary: calculateStockSummary(stock),
        }));
    }, [allTimeStocks, buyTransactions, sellTransactions, settings]);

    // Calculate open and closed transactions
    const openTransactions = useMemo(() => {
        const open = [];
        for (const { stock, summary } of allSummaries) {
            if (summary.remainingQuantity > 0) {
                open.push({
                    stock,
                    quantity: summary.remainingQuantity,
                    avgPrice: summary.weightedAvgBuyPrice,
                    totalCost: summary.weightedAvgBuyPrice * summary.remainingQuantity,
                    currentPrice: currentStockPrices[stock] || 0,
                    currentValue: (currentStockPrices[stock] || 0) * summary.remainingQuantity,
                    unrealizedPnl: ((currentStockPrices[stock] || 0) - summary.weightedAvgBuyPrice) * summary.remainingQuantity,
                    unrealizedPnlPercent: summary.weightedAvgBuyPrice > 0 ? 
                        (((currentStockPrices[stock] || 0) - summary.weightedAvgBuyPrice) / summary.weightedAvgBuyPrice) * 100 : 0
                });
            }
        }
        return open;
    }, [allSummaries, currentStockPrices]);

    const closedTransactions = useMemo(() => {
        const closed = [];
        for (const { stock, summary } of allSummaries) {
            if (summary.totalSellQuantity > 0) {
                closed.push({
                    stock,
                    quantity: summary.totalSellQuantity,
                    avgBuyPrice: summary.weightedAvgBuyPrice,
                    avgSellPrice: summary.realizedGrossPnl > 0 ? 
                        (summary.realizedGrossPnl + summary.weightedAvgBuyPrice * summary.totalSellQuantity) / summary.totalSellQuantity :
                        summary.weightedAvgBuyPrice,
                    totalBuyCost: summary.totalBuyValue, // סך כל הקניות ללא עמלות (רק מחיר × כמות)
                    totalSellValue: summary.totalSellValue,
                    realizedGross: summary.realizedGrossPnl,
                    realizedPnl: summary.realizedNetPnl,
                    realizedPnlPercent: summary.roi,
                    totalCommissions: summary.totalCommissions
                });
            }
        }
        return closed;
    }, [allSummaries]);

    const portfolioSummary = useMemo(() => {
        return allSummaries.reduce((acc, { summary }) => {
            if (summary.remainingQuantity > 0) {
                 acc.totalCost += summary.weightedAvgCostBasis * summary.remainingQuantity;
            }
            acc.realizedGrossPnl += summary.realizedGrossPnl;
            acc.realizedNetPnl += summary.realizedNetPnl;
            acc.totalCommissions += summary.totalCommissions;
            
            if(summary.realizedGrossPnl !== 0) {
                acc.totalInvestedForPnl += summary.weightedAvgCostBasis * summary.totalSellQuantity;
            }
            return acc;
        }, { totalCost: 0, realizedGrossPnl: 0, realizedNetPnl: 0, totalCommissions: 0, totalInvestedForPnl: 0 });
    }, [allSummaries]);

    const overallRoi = useMemo(() => {
        return portfolioSummary.totalInvestedForPnl > 0 ? (portfolioSummary.realizedGrossPnl / portfolioSummary.totalInvestedForPnl) * 100 : 0;
    }, [portfolioSummary]);

     const unrealizedPnl = useMemo(() => {
        return allSummaries.reduce((acc, { stock, summary }) => {
            if (summary.remainingQuantity > 0 && currentStockPrices[stock]) {
                const currentMarketValue = currentStockPrices[stock] * summary.remainingQuantity;
                const costBasisOfHoldings = summary.weightedAvgBuyPrice * summary.remainingQuantity; // ללא עמלות
                acc += (currentMarketValue - costBasisOfHoldings);
            }
            return acc;
        }, 0);
    }, [allSummaries, currentStockPrices]);

    // --- Event Handlers ---
    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const isRate = name === 'commissionRate' || name === 'taxRate';
        setSettings(prev => ({
            ...prev,
            [name]: isRate ? parseFloat(value) / 100 : parseFloat(value) || 0
        }));
    };

    const resetBuyForm = () => {
        setEditingId(null);
        setBuyStockName('');
        setBuyPrice('');
        setBuyQuantity('');
        setBuyDate(new Date().toISOString().split('T')[0]);
        setSuggestions([]);
        setIsBuyFormVisible(false);
    };

    const handleSaveBuy = () => {
        // Use activeStock if we are buying more of an existing stock
        const stockName = (view === 'stockDetail' ? activeStock : buyStockName)?.trim().toUpperCase();
        const price = parseFloat(buyPrice);
        const quantity = parseInt(buyQuantity, 10);

        const normalizedDate = normalizeIsoDateString(buyDate);
        setShowBuyDateWarning(!normalizedDate);
        if (!stockName || isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0 || !normalizedDate) {
            if (!normalizedDate) setShowBuyDateWarning(true);
            return;
        }

        const total = price * quantity;
        const commission = calculateCommission(total);
        
        const newTx: Transaction = { id: editingId || Date.now(), stockName, price, quantity, total, commission, date: normalizedDate };
        setBuyTransactions(prev => {
            const exists = prev.some(t => t.id === newTx.id);
            return exists ? prev.map(t => (t.id === newTx.id ? newTx : t)) : [...prev, newTx];
        });
        if (user) { void upsertTransaction(user.uid, activePortfolioId, 'buy', newTx as any); }
        
        resetBuyForm();
    };

    const handleStartEdit = (transaction: Transaction) => {
        setEditingId(transaction.id);
        setBuyStockName(transaction.stockName);
        setBuyPrice(String(transaction.price));
        setBuyQuantity(String(transaction.quantity));
        setBuyDate(transaction.date);
        setIsBuyFormVisible(true);
    };

    const handleDeleteBuy = (id: number) => {
        setBuyTransactions(prev => prev.filter(t => t.id !== id));
        if (user) { void deleteTransaction(user.uid, activePortfolioId, 'buy', id); }
    };

    const handleDeleteSell = (id: number) => {
        setSellTransactions(prev => prev.filter(t => t.id !== id));
        if (user) { void deleteTransaction(user.uid, activePortfolioId, 'sell', id); }
    };
    
    const handleAddSell = () => {
        if (!activeStock) return;
        const price = parseFloat(sellPrice);
        const quantity = parseInt(sellQuantity, 10);
        const normalizedDate = normalizeIsoDateString(sellDate);
        setShowSellDateWarning(!normalizedDate);
        if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0 || quantity > activeStockSummary.remainingQuantity || !normalizedDate) {
            if (!normalizedDate) setShowSellDateWarning(true);
            return;
        }
    
        const total = price * quantity;
        const commission = calculateCommission(total);
        const newTransaction: Transaction = { id: Date.now(), stockName: activeStock, price, quantity, total, commission, date: normalizedDate };
    
        setSellTransactions(prev => [...prev, newTransaction]);
        if (user) { void upsertTransaction(user.uid, activePortfolioId, 'sell', newTransaction as any); }
        setSellPrice('');
        setSellQuantity('');
        setSellDate(new Date().toISOString().split('T')[0]);
    };

    const fetchStockPrice = useCallback(async (stockSymbol: string) => {
        if (!stockSymbol) return;
        setIsFetchingPrice(true);
        setBuyPrice('');
        // Check cache first
        const cached = priceCache.current[stockSymbol];
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            setBuyPrice(String(cached.price));
            setIsFetchingPrice(false);
            return;
        }
        try {
            // Prefer external quotes endpoint if configured
            if (QUOTES_ENDPOINT) {
                const res = await fetchFromQuotesEndpoint([stockSymbol]);
                const p = res?.[stockSymbol];
                if (typeof p === 'number' && p > 0) {
                    priceCache.current[stockSymbol] = { price: p, timestamp: Date.now() };
                    setBuyPrice(String(p));
                    setIsFetchingPrice(false);
                    return;
                }
            }

            // Fallback: Yahoo Finance API with CORS proxy
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
            let data: any;
            try {
                const response = await fetch(
                    `https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${stockSymbol}?interval=1d&range=1d`,
                    { signal: controller.signal }
                );
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                data = await response.json();
            } finally {
                clearTimeout(timeoutId);
            }
            
            const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (price && price > 0) {
                
                priceCache.current[stockSymbol] = { price, timestamp: Date.now() };
                setBuyPrice(String(price));
                setIsFetchingPrice(false);
                return;
            } else {
                
            }
            // Fallback to our callable function aggregator (if enabled)
            const res = await fetchQuotesViaFunction([stockSymbol]);
            const p = res?.[stockSymbol];
            if (typeof p === 'number' && p > 0) {
                priceCache.current[stockSymbol] = { price: p, timestamp: Date.now() };
                setBuyPrice(String(p));
                setIsFetchingPrice(false);
                return;
            }
            setModal({ title: 'מחיר לא נמצא', message: `לא הצלחתי למצוא מחיר עדכני עבור ${stockSymbol}. אנא הזן את המחיר ידנית.`, actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
        } catch (error) {
            console.error("Error fetching stock price:", error);
            setModal({ title: 'שגיאה', message: `שגיאה בעת הבאת מחיר עבור ${stockSymbol}. אנא הזן את המחיר ידנית.`, actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
        } finally {
            setIsFetchingPrice(false);
        }
    }, []);

    const fetchCurrentPricesForOpenPortfolio = useCallback(async () => {
        const openStocks = allSummaries
            .filter(s => s.summary.remainingQuantity > 0)
            .map(s => s.stock);

        if (openStocks.length === 0) return;

        setIsFetchingCurrentPrices(true);
        try {
            const priceData: Record<string, number> = {};
            // Fetch prices in parallel using Yahoo Finance + proxy for all stocks
            const pricePromises = openStocks.map(async (stock) => {
                // Check cache first
                const cached = priceCache.current[stock];
                if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
                    return { stock, price: cached.price };
                }
                try {
                    // Prefer external endpoint if configured
                    if (QUOTES_ENDPOINT) {
                        const res = await fetchFromQuotesEndpoint([stock]);
                        const p = res?.[stock];
                        if (typeof p === 'number' && p > 0) {
                            priceCache.current[stock] = { price: p, timestamp: Date.now() };
                            return { stock, price: p } as any;
                        }
                    }

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    try {
                        const response = await fetch(
                            `https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${stock}?interval=1d&range=1d`,
                            { signal: controller.signal }
                        );
                        if (response.ok) {
                            const data = await response.json();
                            const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
                            if (price && price > 0) {
                                priceCache.current[stock] = { price, timestamp: Date.now() };
                                return { stock, price };
                            }
                        }
                    } finally {
                        clearTimeout(timeoutId);
                    }
                } catch (error) {
                    console.error(`Yahoo Finance failed for ${stock}:`, error);
                    const res = await fetchQuotesViaFunction([stock]);
                    const p = res?.[stock];
                    if (typeof p === 'number' && p > 0) {
                        priceCache.current[stock] = { price: p, timestamp: Date.now() };
                        return { stock, price: p } as any;
                    }
                }
                return null;
            });
            // Wait for all promises to resolve
            const results = await Promise.all(pricePromises);
            // Process results
            results.forEach(result => {
                if (result) {
                    priceData[result.stock] = result.price;
                }
            });
            setCurrentStockPrices(prev => ({ ...prev, ...priceData }));
        } catch (error) {
            setModal({ title: 'שגיאה', message: 'שגיאה בעת טעינת מחירי מניות.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
        } finally {
            setIsFetchingCurrentPrices(false);
        }
    }, [allSummaries]);

    // Auto-fetch current prices on dashboard when there are open stocks without a shown price
    useEffect(() => {
        if (view !== 'dashboard') return;
        const openStocks = allSummaries
            .filter(s => s.summary.remainingQuantity > 0)
            .map(s => s.stock);
        if (openStocks.length === 0) return;
        const missing = openStocks.filter(s => currentStockPrices[s] == null);
        if (missing.length > 0 && !isFetchingCurrentPrices) {
            void fetchCurrentPricesForOpenPortfolio();
        }
    }, [view, allSummaries, currentStockPrices, isFetchingCurrentPrices, fetchCurrentPricesForOpenPortfolio]);

    useEffect(() => {
        // Initialize symbols list from cache and refresh daily in background
        (async () => {
            const list = await initSymbolsList(STOCK_LIST_BUNDLED);
            setSymbolList(list);
        })();
    }, []);

    const handleStockNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase();
        setBuyStockName(value);
        // Clear price whenever symbol input changes to avoid stale values
        setBuyPrice('');
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (value.length === 0) {
            setSuggestions([]);
            return;
        }
        debounceRef.current = setTimeout(() => {
            lastQueryRef.current = value;
            const results = symbolList.filter(sym => sym.includes(value)).slice(0, 10);
                    if (lastQueryRef.current === value) {
                setSuggestions(results);
            }
        }, 250);
    };
    
    const selectSuggestion = (suggestion: string) => {
        const symbol = suggestion.split(' - ')[0];
        setBuyStockName(symbol);
        setSuggestions([]);
        fetchStockPrice(symbol);
    };

    const handleStockNameBlur = () => {
        setTimeout(() => {
            if (buyStockName && !buyPrice) {
               fetchStockPrice(buyStockName);
            }
            setSuggestions([]);
        }, 200); // Delay to allow click on suggestion
    };

    const handleUpdateStockList = async () => {
        setIsUpdatingStocks(true);
        try {
            // For now, we'll use a static list
            setModal({ title: 'מידע', message: 'רשימת המניות הנוכחית כוללת את המניות הפופולריות ביותר. עדכון אוטומטי זמין בגרסה מתקדמת יותר.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
        } catch (error) {
            console.error("Error updating stock list:", error);
            setModal({ title: 'שגיאה', message: 'כשלון בעדכון רשימת המניות. נסה שוב מאוחר יותר.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
        } finally {
            setIsUpdatingStocks(false);
        }
    };


    // --- Navigation ---
    const goToStockDetail = (stock: string) => {
        setActiveStock(stock);
        setView('stockDetail');
    };
    
    const goToDashboard = () => {
        setActiveStock(null);
        setView('dashboard');
        resetBuyForm();
    };

    const goToPerformance = () => setView('performance');
    const goToAnalytics = () => setView('analytics');

    // Calculate shares owned at a specific date for dividend calculations
    const calculateSharesAtDate = (stockSymbol: string, targetDate: Date): number => {
        let sharesOwned = 0;
        
        // Sort transactions by date to process chronologically
        const sortedBuys = buyTransactions
            .filter(t => t.stockName === stockSymbol)
            .sort((a, b) => safeDateMs(a.date) - safeDateMs(b.date));
        
        const sortedSells = sellTransactions
            .filter(t => t.stockName === stockSymbol)
            .sort((a, b) => safeDateMs(a.date) - safeDateMs(b.date));
        
        // Calculate cumulative shares up to the target date
        for (const buy of sortedBuys) {
            if (safeDateMs(buy.date) <= targetDate.getTime()) {
                sharesOwned += buy.quantity;
            }
        }
        
        // Subtract sold shares up to the target date
        for (const sell of sortedSells) {
            if (safeDateMs(sell.date) <= targetDate.getTime()) {
                sharesOwned -= sell.quantity;
            }
        }
        
        return Math.max(0, sharesOwned);
    };

    // Auto-load dividends when viewing stock detail
    useEffect(() => {
        if (activeStock && view === 'stockDetail') {
            ensureDividendsLoaded(activeStock);
        }
    }, [activeStock, view, ensureDividendsLoaded]);

    // Calculate dividend summary for a stock
    const calculateDividendSummary = useCallback((stockSymbol: string, stockSummary: StockSummary) => {
        const dividends = stockDividends[stockSymbol] || [];
        if (dividends.length === 0) return null;
        
        const currentYear = new Date().getFullYear();
        const yearDividends = dividends.filter(d => 
            new Date(d.date).getFullYear() === currentYear
        );
        
        // Calculate total annual dividend based on actual shares owned at each dividend date
        const totalAnnualDividend = yearDividends.reduce((sum, d) => {
            const sharesAtDate = calculateSharesAtDate(stockSymbol, new Date(d.exDate));
            return sum + (d.amount * sharesAtDate);
        }, 0);
        
        // Calculate dividend per share (based on current holdings)
        const avgDividendPerShare = stockSummary.totalBuyQuantity > 0 ? 
            totalAnnualDividend / stockSummary.totalBuyQuantity : 0;
        
        // Calculate dividend yield (annual dividend / current market value)
        const currentPrice = currentStockPrices[stockSymbol] || 0;
        const currentMarketValue = stockSummary.remainingQuantity * currentPrice;
        const dividendYield = currentMarketValue > 0 ? 
            (totalAnnualDividend / currentMarketValue) * 100 : 0;
        
        // Get last and next payment
        const lastPayment = dividends[0]; // Already sorted by date
        const nextPayment = dividends.find(d => new Date(d.date) > new Date());
        
        // Calculate total dividends received (historical) based on actual shares owned
        const totalDividendsReceived = dividends.reduce((sum, d) => {
            const sharesAtDate = calculateSharesAtDate(stockSymbol, new Date(d.exDate));
            return sum + (d.amount * sharesAtDate);
        }, 0);
        
        return {
            totalAnnualDividend,
            avgDividendPerShare,
            dividendYield,
            lastPayment,
            nextPayment,
            totalDividendsReceived,
            dividendCount: dividends.length
        };
    }, [stockDividends, currentStockPrices, calculateSharesAtDate]);


    // --- Render Methods for Views ---
    const renderDashboard = () => {
        const filteredTransactions = dashboardFilter === 'open' ? openTransactions : closedTransactions;

        const requestSort = (key: string) => {
            setSortConfig(prev => {
                if (prev.key === key) {
                    return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                }
                return { key, direction: 'desc' };
            });
        };

        const SortIndicator: React.FC<{ columnKey: string }> = ({ columnKey }) => {
            if (sortConfig.key !== columnKey) return <span className="sort-indicator">↕</span>;
            return <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
        };

        return (
            <>
                {/* US Indices charts */}
                <IndicesWidget dark={isDarkTheme} />
                <div className="card" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ borderBottom: '2px solid var(--primary-color)', paddingBottom: '10px', marginBottom: '20px', width: '100%' }}>קניית מניה חדשה</h2>
                    </div>
                    <div className="form-grid buy-form">
                         <div className="form-group autocomplete-container">
                             <label htmlFor="stock-name">שם המניה</label>
                             <input id="stock-name" type="text" placeholder="הקלד סמל, למשל: AAPL" value={buyStockName} onChange={handleStockNameChange} onBlur={handleStockNameBlur} autoComplete="off"/>
                             {suggestions.length > 0 && (
                                 <div className="suggestions-list">
                                     {suggestions.map(s => <div key={s} className="suggestion-item" onClick={() => selectSuggestion(s)}>{s}</div>)}
                                 </div>
                             )}
                         </div>
                         <div className="form-group">
                            <label htmlFor="buy-price">מחיר מניה ($)</label>
                            <input id="buy-price" type="number" placeholder={isFetchingPrice ? "טוען מחיר..." : "למשל: 150.5"} value={buyPrice} onChange={e => setBuyPrice(e.target.value)} disabled={isFetchingPrice} />
                        </div>
                        <div className="form-group"><label htmlFor="buy-quantity">כמות מניות</label><input id="buy-quantity" type="number" placeholder="למשל: 10" value={buyQuantity} onChange={e => setBuyQuantity(e.target.value)} /></div>
                        <div className="form-group"><label htmlFor="buy-date">תאריך</label><input id="buy-date" type="date" value={buyDate} onChange={e => setBuyDate(e.target.value)} /></div>
                        <div className="form-actions">
                            <button onClick={handleSaveBuy} disabled={!buyStockName || !buyPrice || !buyQuantity || !buyDate || isFetchingPrice}><PlusIcon/> הוסף קנייה</button>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header-with-action">
                         <h2>סיכום תיק מניות - {dashboardFilter === 'open' ? 'עסקאות פתוחות' : 'עסקאות סגורות'}</h2>
                    </div>
                    <div className="summary-grid">

                        <div className="summary-item">
                            <div className="label">{dashboardFilter === 'open' ? 'שווי אחזקה' : 'עלות כוללת'}</div>
                            <div className="label-small">
                                {dashboardFilter === 'open' ? 'שווי נוכחי של המניות' : 'סך כל הקניות שבוצעו'}
                            </div>
                            <div className="value">
                                <span className="financial-number">
                                    {dashboardFilter === 'open' 
                                        ? formatCurrency(openTransactions.reduce((sum, t) => sum + t.currentValue, 0))
                                        : formatCurrency(closedTransactions.reduce((sum, t) => sum + t.totalBuyCost, 0))
                                    }
                                </span>
                            </div>
                        </div>
                        {dashboardFilter === 'closed' && (
                            <div className="summary-item">
                                <div className="label">שווי מכירה</div>
                                <div className="label-small">
                                    סך כל המכירות שבוצעו
                                </div>
                                <div className="value">
                                    <span className="financial-number">
                                        {formatCurrency(closedTransactions.reduce((sum, t) => sum + t.totalSellValue, 0))}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className="summary-item">
                            <div className="label">רווח/הפסד (%)</div>
                            <div className="label-small">
                                {dashboardFilter === 'open' ? 'אחוז רווח/הפסד נוכחי' : 'רווח/הפסד חלקי עלות כוללת'}
                            </div>
                            <div className={`value ${pnlClass(dashboardFilter === 'open' ? 
                                ((openTransactions.reduce((sum, t) => sum + t.currentValue, 0) / openTransactions.reduce((sum, t) => sum + t.totalCost, 0)) - 1) * 100 :
                                (() => {
                                    const buyCost = closedTransactions.reduce((sum, t) => sum + t.totalBuyCost, 0);
                                    const profitLoss = closedTransactions.reduce((sum, t) => sum + t.realizedGross, 0);
                                    return buyCost > 0 ? (profitLoss / buyCost) * 100 : 0;
                                })()
                            )}`}>
                                <span className="financial-number">
                                    {dashboardFilter === 'open' 
                                        ? (() => {
                                            const value = ((openTransactions.reduce((sum, t) => sum + t.currentValue, 0) / openTransactions.reduce((sum, t) => sum + t.totalCost, 0)) - 1) * 100;
                                            return value < 0 ? `${Math.abs(value).toFixed(2)}% -` : `${value.toFixed(2)}%`;
                                        })()
                                        : (() => {
                                            const buyCost = closedTransactions.reduce((sum, t) => sum + t.totalBuyCost, 0);
                                            const profitLoss = closedTransactions.reduce((sum, t) => sum + t.realizedGross, 0);
                                            const value = buyCost > 0 ? (profitLoss / buyCost) * 100 : 0;
                                            return value < 0 ? `${Math.abs(value).toFixed(2)}% -` : `${value.toFixed(2)}%`;
                                        })()
                                    }
                                </span>
                            </div>
                        </div>
                            <div className="summary-item">
                                <div className="label">רווח/הפסד ($)</div>
                            <div className="label-small">
                                {dashboardFilter === 'open' ? 'רווח/הפסד נוכחי' : 'רווח/הפסד ברוטו מהמכירות'}
                            </div>
                                <div className={`value ${pnlClass(dashboardFilter === 'open' ? 
                                    openTransactions.reduce((sum, t) => sum + t.unrealizedPnl, 0) :
                                    closedTransactions.reduce((sum, t) => sum + t.realizedGross, 0)
                                )}`}>
                                    <span className="financial-number">
                                        {dashboardFilter === 'open' 
                                            ? (() => {
                                                const value = openTransactions.reduce((sum, t) => sum + t.unrealizedPnl, 0);
                                                return value < 0 ? `${formatCurrency(Math.abs(value))} -` : formatCurrency(value);
                                            })()
                                            : (() => {
                                                const value = closedTransactions.reduce((sum, t) => sum + t.realizedGross, 0);
                                                return value < 0 ? `${formatCurrency(Math.abs(value))} -` : formatCurrency(value);
                                            })()
                                        }
                                    </span>
                                </div>
                            </div>
                        <div className="summary-item">
                            <div className="label">רווח/הפסד נטו</div>
                            <div className="label-small">
                                רווח/הפסד לאחר ניקוי מס
                            </div>
                            <div className={`value ${pnlClass(dashboardFilter === 'open' ? 
                                (() => {
                                    const unrealizedPnl = openTransactions.reduce((sum, t) => sum + t.unrealizedPnl, 0);
                                    const taxOnProfit = unrealizedPnl > 0 ? unrealizedPnl * settings.taxRate : 0;
                                    return unrealizedPnl - taxOnProfit;
                                })() :
                                closedTransactions.reduce((sum, t) => sum + t.realizedPnl, 0)
                            )}`}>
                                <span className="financial-number">
                                    {dashboardFilter === 'open' 
                                        ? (() => {
                                            const unrealizedPnl = openTransactions.reduce((sum, t) => sum + t.unrealizedPnl, 0);
                                            const taxOnProfit = unrealizedPnl > 0 ? unrealizedPnl * settings.taxRate : 0;
                                            const netPnl = unrealizedPnl - taxOnProfit;
                                            return netPnl < 0 ? `${formatCurrency(Math.abs(netPnl))} -` : formatCurrency(netPnl);
                                        })()
                                        : (() => {
                                            const value = closedTransactions.reduce((sum, t) => sum + t.realizedPnl, 0);
                                                return value < 0 ? `${formatCurrency(Math.abs(value))} -` : formatCurrency(value);
                                            })()
                                        }
                                    </span>
                                </div>
                            </div>
                        <div className="summary-item">
                            <div className="label">סה"כ עמלות</div>
                            <div className="label-small">
                                {dashboardFilter === 'open' ? 'עמלות על מניות פתוחות' : 'עמלות על עסקאות סגורות'}
                            </div>
                            <div className="value">
                                <span className="financial-number">
                                    {formatCurrency(dashboardFilter === 'open' 
                                        ? allSummaries
                                            .filter(s => s.summary.remainingQuantity > 0)
                                            .reduce((sum, { summary }) => sum + summary.totalCommissions, 0)
                                        : allSummaries
                                            .filter(s => s.summary.totalSellQuantity > 0)
                                            .reduce((sum, { summary }) => sum + summary.totalCommissions, 0)
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* דיבידנדים לסיכום הכללי */}
                        <div className="summary-item dividend-card">
                            <div className="label">דיבידנדים שנתיים</div>
                            <div className="label-small">
                                סך כל הדיבידנדים השנה
                            </div>
                            <div className="value dividend-value">
                                {(() => {
                                    const totalAnnualDividends = allSummaries.reduce((sum, { stock, summary }) => {
                                        const dividends = stockDividends[stock] || [];
                                        const currentYear = new Date().getFullYear();
                                        const yearDividends = dividends.filter(d => 
                                            new Date(d.date).getFullYear() === currentYear
                                        );
                                        return sum + yearDividends.reduce((s, d) => s + d.amount, 0);
                                    }, 0);
                                    return formatCurrency(totalAnnualDividends);
                                })()}
                            </div>
                        </div>

                        <div className="summary-item dividend-card">
                            <div className="label">תשואה כוללת</div>
                            <div className="label-small">
                                רווח/הפסד + דיבידנדים
                            </div>
                            <div className="value dividend-value">
                                {(() => {
                                    const totalPnl = dashboardFilter === 'open' 
                                        ? openTransactions.reduce((sum, t) => sum + t.unrealizedPnl, 0)
                                        : closedTransactions.reduce((sum, t) => sum + t.realizedGross, 0);
                                    
                                    const totalAnnualDividends = allSummaries.reduce((sum, { stock, summary }) => {
                                        const dividends = stockDividends[stock] || [];
                                        const currentYear = new Date().getFullYear();
                                        const yearDividends = dividends.filter(d => 
                                            new Date(d.date).getFullYear() === currentYear
                                        );
                                        return sum + yearDividends.reduce((s, d) => s + d.amount, 0);
                                    }, 0);
                                    
                                    const totalReturn = totalPnl + totalAnnualDividends;
                                    return <span className={pnlClass(totalReturn)}>{formatCurrency(totalReturn)}</span>;
                                })()}
                            </div>
                        </div>

                    </div>
                </div>
                 <div className="card">
                    <div className="dashboard-header">
                        <h2>המניות שלי</h2>
                        <div className="dashboard-filter-tabs">
                            <button className={`filter-btn ${dashboardFilter === 'open' ? 'active' : ''}`} onClick={() => setDashboardFilter('open')}>
                                עסקאות פתוחות
                            </button>
                            <button
                                className="icon-btn-sm refresh-btn"
                                aria-label="רענן מחירים"
                                title="רענן מחירים"
                                onClick={fetchCurrentPricesForOpenPortfolio}
                                disabled={isFetchingCurrentPrices || filteredTransactions.length === 0}
                            >
                                {isFetchingCurrentPrices ? <div className="spinner"></div> : <RefreshIcon />}
                            </button>
                            <button className={`filter-btn ${dashboardFilter === 'closed' ? 'active' : ''}`} onClick={() => setDashboardFilter('closed')}>עסקאות סגורות</button>
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="stocks-table">
                            <thead>
                                <tr>
                                    <th>
                                        <button type="button" className="th-sort-btn" onClick={() => requestSort('stock')}>
                                            <span>שם</span> <SortIndicator columnKey="stock" />
                                        </button>
                                    </th>
                                    {dashboardFilter === 'open' && (
                                      <>
                                    <th>
                                        <button type="button" className="th-sort-btn" onClick={() => requestSort('quantity')}>
                                            <span>כמות מניות</span> <SortIndicator columnKey="quantity" />
                                        </button>
                                    </th>
                                    <th>
                                            <button type="button" className="th-sort-btn" onClick={() => requestSort('avgPrice')}>
                                                <span>שער ממוצע</span> <SortIndicator columnKey={'avgPrice'} />
                                        </button>
                                    </th>
                                      </>
                                    )}
                                    {dashboardFilter === 'open' && (
                                      <th>
                                          <button type="button" className="th-sort-btn" onClick={() => requestSort('totalCost')}>
                                              <span>שווי אחזקה</span> <SortIndicator columnKey={'totalCost'} />
                                          </button>
                                      </th>
                                    )}
                                    {dashboardFilter === 'open' ? (
                                        <>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('currentValue')}>
                                                    <span>רווח נוכחי</span> <SortIndicator columnKey="currentValue" />
                                                </button>
                                            </th>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('currentPrice')}>
                                                    <span>שער אחרון</span> <SortIndicator columnKey="currentPrice" />
                                                </button>
                                            </th>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('unrealizedPnlPercent')}>
                                                    <span>אחוז תשואה</span> <SortIndicator columnKey="unrealizedPnlPercent" />
                                                </button>
                                            </th>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('unrealizedPnl')}>
                                                    <span>סה"כ רווח</span> <SortIndicator columnKey="unrealizedPnl" />
                                                </button>
                                            </th>
                                        </>
                                    ) : (
                                        <>

                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('realizedGross')}>
                                                    <span>רווח / הפסד</span> <SortIndicator columnKey="realizedGross" />
                                                </button>
                                            </th>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('realizedPnlPercent')}>
                                                    <span>אחוז תשואה</span> <SortIndicator columnKey="realizedPnlPercent" />
                                                </button>
                                            </th>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('realizedPnl')}>
                                                    <span>רווח / הפסד נטו</span> <SortIndicator columnKey="realizedPnl" />
                                                </button>
                                            </th>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('totalCommissions')}>
                                                    <span>סה"כ עמלות</span> <SortIndicator columnKey="totalCommissions" />
                                                </button>
                                            </th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {([...filteredTransactions].sort((a: any, b: any) => {
                                    const { key, direction } = sortConfig;
                                    const dir = direction === 'asc' ? 1 : -1;
                                    const av = a[key];
                                    const bv = b[key];
                                    if (av == null && bv == null) return 0;
                                    if (av == null) return 1;
                                    if (bv == null) return -1;
                                    if (typeof av === 'string' || typeof bv === 'string') {
                                        return String(av).localeCompare(String(bv)) * dir;
                                    }
                                    return (av - bv) * dir;
                                })).length > 0 ? (
                                    ([...filteredTransactions].sort((a: any, b: any) => {
                                        const { key, direction } = sortConfig;
                                        const dir = direction === 'asc' ? 1 : -1;
                                        const av = a[key];
                                        const bv = b[key];
                                        if (av == null && bv == null) return 0;
                                        if (av == null) return 1;
                                        if (bv == null) return -1;
                                        if (typeof av === 'string' || typeof bv === 'string') {
                                            return String(av).localeCompare(String(bv)) * dir;
                                        }
                                        return (av - bv) * dir;
                                    })).map((transaction) => {
                                        if (dashboardFilter === 'open') {
                                            return (
                                                <tr key={transaction.stock} className="stock-table-row" onClick={() => goToStockDetail(transaction.stock)}>
                                                    <td>{transaction.stock}</td>
                                                    <td>{transaction.quantity}</td>
                                                    <td>{formatCurrency(transaction.avgPrice)}</td>
                                                    <td>{formatCurrency(transaction.totalCost)}</td>
                                                    <td>{formatCurrency(transaction.currentValue)}</td>
                                                    <td>{transaction.currentPrice > 0 ? formatCurrency(transaction.currentPrice) : '---'}</td>
                                                    <td className={pnlClass(transaction.unrealizedPnlPercent)}>{transaction.unrealizedPnlPercent < 0 ? `${Math.abs(transaction.unrealizedPnlPercent).toFixed(2)}% -` : `${transaction.unrealizedPnlPercent.toFixed(2)}%`}</td>
                                                    <td className={pnlClass(transaction.unrealizedPnl)}>{transaction.unrealizedPnl < 0 ? `${formatCurrency(Math.abs(transaction.unrealizedPnl))} -` : formatCurrency(transaction.unrealizedPnl)}</td>
                                                </tr>
                                            );
                                        } else {
                                            return (
                                                <tr key={transaction.stock} className="stock-table-row" onClick={() => goToStockDetail(transaction.stock)}>
                                                    <td>{transaction.stock}</td>
                                                    <td className={pnlClass(transaction.realizedGross)}>{transaction.realizedGross < 0 ? `${formatCurrency(Math.abs(transaction.realizedGross))} -` : formatCurrency(transaction.realizedGross)}</td>
                                                    <td className={pnlClass(transaction.realizedPnlPercent)}>{transaction.realizedPnlPercent < 0 ? `${Math.abs(transaction.realizedPnlPercent).toFixed(2)}% -` : `${transaction.realizedPnlPercent.toFixed(2)}%`}</td>
                                                    <td className={pnlClass(transaction.realizedPnl)}>{transaction.realizedPnl < 0 ? `${formatCurrency(Math.abs(transaction.realizedPnl))} -` : formatCurrency(transaction.realizedPnl)}</td>
                                                    <td>{formatCurrency(transaction.totalCommissions || 0)}</td>
                                                </tr>
                                            );
                                        }
                                    })
                                 ) : (
                                    <tr>
                                        <td colSpan={dashboardFilter === 'open' ? 8 : 5}>
                                            {dashboardFilter === 'open' ? 'אין כרגע עסקאות פתוחות.' : 'אין עסקאות סגורות.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {dashboardFilter === 'open' && (
                        <p className="table-disclaimer">
                        </p>
                    )}
                </div>
            </>
        );
    };
    
    const renderBuyMoreForm = () => {
        const stockCurrentPrice = activeStock ? currentStockPrices[activeStock] : undefined;
        return (
        <div className="form-grid">
            <div className="form-group">
                <label htmlFor="buy-price">מחיר מניה ($)</label>
                <div className="input-with-icon">
                    <input id="buy-price" type="number" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder={stockCurrentPrice ? `מחיר נוכחי: ${stockCurrentPrice.toFixed(2)}` : undefined} />
                    <button type="button" className="icon-btn" title="רענן מחיר" onClick={async () => { if (activeStock) { await fetchStockPrice(activeStock); await fetchCurrentPricesForOpenPortfolio(); } }} disabled={isFetchingPrice}>
                        <RefreshIcon />
                    </button>
                 </div>
             </div>
            <div className="form-group"><label htmlFor="buy-quantity">כמות מניות</label><input id="buy-quantity" type="number" value={buyQuantity} onChange={e => setBuyQuantity(e.target.value)} /></div>
            <div className="form-group">
                <label htmlFor="buy-date">תאריך</label>
                <input
                    id="buy-date"
                    className={`date-input ${normalizeIsoDateString(buyDate) ? '' : 'invalid-input'}`}
                    type="date"
                    min={`${String(settings.minYear ?? MIN_YEAR).padStart(4,'0')}-01-01`}
                    max={`${String(settings.maxYear ?? MAX_YEAR).padStart(4,'0')}-12-31`}
                    value={buyDate}
                    onChange={e => setBuyDate(e.target.value)}
                />
            </div>
            <button onClick={handleSaveBuy} disabled={!buyPrice || !buyQuantity || !buyDate}><PlusIcon/> הוסף קנייה</button>
        </div>
    ); };

    const renderStockDetail = () => {
        const buysForActiveStock = activeStock ? buyTransactions.filter(t => t.stockName === activeStock) : [];
        const sellsForActiveStock = activeStock ? sellTransactions.filter(t => t.stockName === activeStock) : [];

        const isInSelectedRange = (dateString: string) => {
            if (dateRange === 'all') return true;
            const d = parseLooseDate(dateString) ?? new Date(0);
            const now = new Date();
            const start = new Date(now);
            if (dateRange === 'week') start.setDate(now.getDate() - 7);
            if (dateRange === 'month') start.setMonth(now.getMonth() - 1);
            if (dateRange === 'quarter') start.setMonth(now.getMonth() - 3);
            if (dateRange === 'year') start.setFullYear(now.getFullYear() - 1);
            if (dateRange === 'custom') {
                if (!customStart && !customEnd) return true;
                const s = customStart ? new Date(customStart) : new Date('1900-01-01');
                const e = customEnd ? new Date(customEnd) : now;
                return d >= s && d <= e;
            }
            return d >= start && d <= now;
        };

        const buysFiltered = buysForActiveStock.filter(t => isInSelectedRange(t.date));
        const sellsFiltered = sellsForActiveStock.filter(t => isInSelectedRange(t.date));

        // Prepare FIFO allocations for per-row realized PnL and remaining-by-buy
        type BuyLotDetail = { id: number; remaining: number; costBasisPerShare: number; pricePerShare: number; date: string };
        const buysSorted: BuyLotDetail[] = buysFiltered
            .slice()
            .sort((a, b) => safeDateMs(a.date) - safeDateMs(b.date))
            .map(b => ({
                id: b.id,
                remaining: b.quantity,
                costBasisPerShare: (b.price * b.quantity + b.commission) / b.quantity,
                pricePerShare: b.price,
                date: b.date,
            }));

        const sellsSorted = sellsFiltered
            .slice()
            .sort((a, b) => safeDateMs(a.date) - safeDateMs(b.date));

        const perSellRealized = sellsSorted.map(s => {
            let qtyToMatch = s.quantity;
            let allocatedCost = 0;
            for (const lot of buysSorted) {
                if (qtyToMatch <= 0) break;
                if (lot.remaining <= 0) continue;
                const taken = Math.min(lot.remaining, qtyToMatch);
                allocatedCost += taken * lot.pricePerShare; // ללא עמלות
                lot.remaining -= taken;
                qtyToMatch -= taken;
            }
            const proceeds = s.price * s.quantity;
            const realizedGross = proceeds - allocatedCost;
            const realizedPercent = allocatedCost > 0 ? (realizedGross / allocatedCost) * 100 : 0;
            return {
                id: s.id,
                date: s.date,
                price: s.price,
                quantity: s.quantity,
                commission: s.commission,
                totalProceeds: proceeds,
                investedCostNoFees: allocatedCost,
                realizedGross,
                realizedPercent,
            };
        });

        const remainingByBuyId: Record<number, number> = buysSorted.reduce((acc, lot) => {
            acc[lot.id] = lot.remaining;
            return acc;
        }, {} as Record<number, number>);

        const currentPrice = activeStock ? currentStockPrices[activeStock] : undefined;

        // Visible rows for buy table (respecting filters and date-range)
        const buysVisibleRows = buysForActiveStock
            .filter(t => {
                const remaining = remainingByBuyId[t.id] ?? t.quantity;
                if (buyHistoryFilter === 'unsold') return remaining > 0;
                if (buyHistoryFilter === 'sold') return remaining === 0;
                return true;
            })
            .filter(t => {
                if (dateRange === 'all') return true;
                const d = parseLooseDate(t.date) ?? new Date(0);
                const now = new Date();
                const start = new Date(now);
                if (dateRange === 'week') start.setDate(now.getDate() - 7);
                if (dateRange === 'month') start.setMonth(now.getMonth() - 1);
                if (dateRange === 'quarter') start.setMonth(now.getMonth() - 3);
                if (dateRange === 'year') start.setFullYear(now.getFullYear() - 1);
                if (dateRange === 'custom') {
                    if (!customStart && !customEnd) return true;
                    const s = customStart ? new Date(customStart) : new Date('1900-01-01');
                    const e = customEnd ? new Date(customEnd) : now;
                    return d >= s && d <= e;
                }
                return d >= start && d <= now;
            });

        // Build filtered summary (FIFO) for the selected range
        const filteredSummary = (() => {
            const totalBuyQuantity = buysFiltered.reduce((sum, t) => sum + t.quantity, 0);
            const totalSellQuantity = sellsFiltered.reduce((sum, t) => sum + t.quantity, 0);
            const totalBuyValue = buysFiltered.reduce((sum, t) => sum + (t.price * t.quantity), 0);
            const totalBuyCommissions = buysFiltered.reduce((sum, t) => sum + t.commission, 0);
            const totalBuyCost = totalBuyValue + totalBuyCommissions;
            const remainingQty = Object.values(remainingByBuyId).reduce((s, q) => s + q, 0);
            const remainingPriceValue = buysSorted.reduce((sum, lot) => sum + lot.pricePerShare * lot.remaining, 0);
            const remainingCostValue = buysSorted.reduce((sum, lot) => sum + lot.costBasisPerShare * lot.remaining, 0);
            const weightedAvgBuyPrice = remainingQty > 0 ? remainingPriceValue / remainingQty : 0;
            const weightedAvgCostBasis = remainingQty > 0 ? remainingCostValue / remainingQty : 0;

            const totalSellValue = sellsFiltered.reduce((sum, t) => sum + t.total, 0);
            // מחיר קנייה ממוצע ללא עמלות
            const avgBuyPriceNoFees = totalBuyQuantity > 0 ? (totalBuyValue / Math.max(totalBuyQuantity, 1)) : 0;
            // רווח/הפסד ברוטו ללא עמלות
            const realizedGrossPnl = totalSellValue - (totalSellQuantity * avgBuyPriceNoFees);
            // עמלות מוצגות בנפרד
            const totalSellCommissions = sellsFiltered.reduce((sum, t) => sum + t.commission, 0);
            const totalCommissions = totalBuyCommissions + totalSellCommissions;
            // מס רק על הברוטו
            const taxOnProfit = realizedGrossPnl > 0 ? realizedGrossPnl * settings.taxRate : 0;
            const realizedNetPnl = realizedGrossPnl - taxOnProfit;
            // ROI על בסיס עלות שנמכרה ללא עמלות
            const totalInvestedForSold = totalSellQuantity * avgBuyPriceNoFees;
            const roi = totalInvestedForSold > 0 ? (realizedGrossPnl / totalInvestedForSold) * 100 : 0;

            return { totalBuyQuantity, totalSellQuantity, remainingQuantity: remainingQty, weightedAvgBuyPrice, weightedAvgCostBasis, totalBuyCost, totalBuyValue, totalCommissions, realizedGrossPnl, realizedNetPnl, roi, totalSellValue };
        })();

        return (
            <>
                <div className="card">
                    <button className="back-btn" onClick={goToDashboard}><BackArrowIcon/> חזור לדשבורד</button>
                    <h2 className="stock-detail-header">ניתוח מניית: {activeStock}</h2>
                </div>

                <div className="card">
                    <h2>סיכום וביצועים</h2>
                    <div className="summary-grid">
                        {(() => {
                            const totalSaleProceeds = perSellRealized.reduce((s, r) => s + r.totalProceeds, 0);
                            const investedSoldNoFees = perSellRealized.reduce((s, r) => s + r.investedCostNoFees, 0);
                            // עלות קנייה תמיד מציגה את סך כל הקניות שבוצעו במניה (ללא עמלות)
                            const totalBuyValueNoFees = buysFiltered.reduce((sum, t) => sum + (t.price * t.quantity), 0);
                            const investedDisplay = totalBuyValueNoFees;
                            const realizedGrossNoFees = perSellRealized.reduce((s, r) => s + r.realizedGross, 0);
                            const pnlPercent = investedSoldNoFees > 0 ? (realizedGrossNoFees / investedSoldNoFees) * 100 : 0;
                            const taxOnGross = realizedGrossNoFees > 0 ? realizedGrossNoFees * settings.taxRate : 0;
                            const realizedNetAfterTaxNoFees = realizedGrossNoFees - taxOnGross;
                            const totalSellCommissions = sellsFiltered.reduce((sum, t) => sum + t.commission, 0);
                            const totalBuyCommissions = buysFiltered.reduce((sum, t) => sum + t.commission, 0);
                            const totalCommissionsAll = totalBuyCommissions + totalSellCommissions;
                            return (
                                <>
                                    <div className="summary-item">
                                        <div className="label">עלות כוללת</div>
                                        <div className="label-small">סך כל הקניות שבוצעו במניה</div>
                                        <div className="value"><span className="financial-number">{formatCurrency(investedDisplay)}</span></div>
                                    </div>
                                    <div className="summary-item">
                                        <div className="label">שווי מכירה</div>
                                        <div className="label-small">סך כל המכירות שבוצעו במניה</div>
                                        <div className="value"><span className="financial-number">{formatCurrency(totalSaleProceeds)}</span></div>
                                    </div>
                                    <div className="summary-item">
                                        <div className="label">רווח והפסד</div>
                                        <div className="label-small">רווח/הפסד ברוטו מהמכירות</div>
                                        <div className={`value ${pnlClass(realizedGrossNoFees)}`}><span className="financial-number">{formatCurrency(realizedGrossNoFees)}</span></div>
                                    </div>
                                    <div className="summary-item">
                                        <div className="label">אחוז תשואה</div>
                                        <div className="label-small">אחוז רווח/הפסד על המניות שנמכרו</div>
                                        <div className={`value ${pnlClass(pnlPercent)}`}><span className="financial-number">{pnlPercent.toFixed(2)}%</span></div>
                                    </div>
                                    <div className="summary-item">
                                        <div className="label">רווח/הפסד נטו</div>
                                        <div className="label-small">רווח/הפסד אחרי מסים</div>
                                        <div className={`value ${pnlClass(realizedNetAfterTaxNoFees)}`}><span className="financial-number">{formatCurrency(realizedNetAfterTaxNoFees)}</span></div>
                                    </div>
                                    <div className="summary-item">
                                        <div className="label">סה"כ עמלות</div>
                                        <div className="label-small">עמלות קנייה ומכירה</div>
                                        <div className="value"><span className="financial-number">{formatCurrency(totalCommissionsAll)}</span></div>
                                    </div>
                                    
                                    {/* דיבידנדים שנתיים */}
                                    {(() => {
                                        const dividendSummary = calculateDividendSummary(activeStock, filteredSummary);
                                        if (dividendSummary && dividendSummary.totalAnnualDividend > 0) {
                                            return (
                                                <div className="summary-item dividend-card">
                                                    <div className="label">דיבידנדים שנתיים</div>
                                                    <div className="label-small">סך כל הדיבידנדים השנה</div>
                                                    <div className="value dividend-value">
                                                        <span className="financial-number">{formatCurrency(dividendSummary.totalAnnualDividend)}</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                    
                                    {/* תשואה כוללת */}
                                    {(() => {
                                        const dividendSummary = calculateDividendSummary(activeStock, filteredSummary);
                                        if (dividendSummary && dividendSummary.totalAnnualDividend > 0) {
                                            const totalReturn = realizedGrossNoFees + dividendSummary.totalAnnualDividend;
                                            return (
                                                <div className="summary-item dividend-card">
                                                    <div className="label">תשואה כוללת</div>
                                                    <div className="label-small">רווח מהמכירה + דיבידנדים</div>
                                                    <div className={`value dividend-value ${pnlClass(totalReturn)}`}>
                                                        <span className="financial-number">{formatCurrency(totalReturn)}</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* קטגוריית דיבידנדים חדשה */}
                <div className="card">
                    <div className="card-header-with-action" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                        <h2>דיבידנדים ותשואה</h2>
                        <button 
                            className="icon-btn-sm refresh-btn"
                            onClick={() => activeStock && fetchStockDividends(activeStock)}
                            disabled={activeStock ? isLoadingDividends[activeStock] : false}
                            title="רענן דיבידנדים"
                        >
                            {activeStock && isLoadingDividends[activeStock] ? <div className="spinner"></div> : <RefreshIcon />}
                        </button>
                    </div>
                    
                    {(() => {
                        if (!activeStock) return <div className="no-data">בחר מניה להצגת דיבידנדים</div>;
                        
                        const dividendSummary = calculateDividendSummary(activeStock, filteredSummary);
                        
                        if (!dividendSummary) {
                            return (
                                <div className="no-data">
                                    אין נתוני דיבידנדים למניה זו
                                    <br />
                                    <small>לחץ על כפתור הרענון כדי לטעון דיבידנדים</small>
                                </div>
                            );
                        }
                        
                        return (
                            <>
                                <div className="summary-grid">
                                    <div className="summary-item dividend-card">
                                        <div className="label">דיבידנד שנתי</div>
                                        <div className="label-small">סך כל הדיבידנדים השנה</div>
                                        <div className="value dividend-value">{formatCurrency(dividendSummary.totalAnnualDividend)}</div>
                                    </div>
                                    
                                    <div className="summary-item dividend-card">
                                        <div className="label">דיבידנד למניה</div>
                                        <div className="label-small">דיבידנד ממוצע למניה השנה</div>
                                        <div className="value dividend-value">{formatCurrency(dividendSummary.avgDividendPerShare)}</div>
                                    </div>
                                    
                                    <div className="summary-item dividend-card">
                                        <div className="label">תשואה כוללת</div>
                                        <div className="label-small">רווח מהמכירה + דיבידנדים</div>
                                        <div className="value dividend-value">
                                            {(() => {
                                                const totalReturn = filteredSummary.realizedGrossPnl + dividendSummary.totalAnnualDividend;
                                                return <span className={pnlClass(totalReturn)}>{formatCurrency(totalReturn)}</span>;
                                            })()}
                                        </div>
                                    </div>
                                    
                                    <div className="summary-item dividend-card">
                                        <div className="label">אחוז דיבידנד</div>
                                        <div className="label-small">דיבידנד שנתי חלקי שווי שוק</div>
                                        <div className="value dividend-value">{dividendSummary.dividendYield.toFixed(2)}%</div>
                                    </div>
                                    
                                    <div className="summary-item dividend-card">
                                        <div className="label">תשלום אחרון</div>
                                        <div className="label-small">דיבידנד אחרון ששולם</div>
                                        <div className="value dividend-value">
                                            {dividendSummary.lastPayment ? (
                                                <>
                                                    {formatCurrency(dividendSummary.lastPayment.amount)}
                                                    <br />
                                                    <small>{formatDate(dividendSummary.lastPayment.date)}</small>
                                                </>
                                            ) : 'אין נתונים'}
                                        </div>
                                    </div>
                                    
                                    <div className="summary-item dividend-card">
                                        <div className="label">תשלום הבא</div>
                                        <div className="label-small">תאריך תשלום הדיבידנד הבא</div>
                                        <div className="value dividend-value">
                                            {dividendSummary.nextPayment ? (
                                                <>
                                                    {formatDate(dividendSummary.nextPayment.date)}
                                                    <br />
                                                    <small>{formatCurrency(dividendSummary.nextPayment.amount)}</small>
                                                </>
                                            ) : 'אין תשלום עתידי'}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* כפתור להסתרה/הצגה של טבלת הדיבידנדים */}
                                <div style={{display:'flex',justifyContent:'center',marginTop:'20px',marginBottom:'10px'}}>
                                    <button 
                                        className="filter-btn"
                                        onClick={() => setShowDividendsTable(s => !s)}
                                    >
                                        {showDividendsTable ? 'הסתר טבלת דיבידנדים' : 'הצג טבלת דיבידנדים'}
                                    </button>
                                </div>
                                
                                {/* טבלת היסטוריית דיבידנדים */}
                                {showDividendsTable && (
                                    <div className="table-container">
                                        <h3>היסטוריית דיבידנדים</h3>
                                        <table className="dividends-table">
                                        <thead>
                                            <tr>
                                                <th>תאריך תשלום</th>
                                                <th>תאריך ללא דיבידנד</th>
                                                <th>כמות מניות</th>
                                                <th>דיבידנד למניה</th>
                                                <th>סה"כ דיבידנד</th>
                                                <th>סוג</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stockDividends[activeStock]?.map((dividend, index) => {
                                                // חישוב הכמות המדויקת שהייתה לך בתאריך הדיבידנד
                                                const dividendDate = new Date(dividend.exDate);
                                                const sharesAtDate = calculateSharesAtDate(activeStock, dividendDate);
                                                const totalDividend = dividend.amount * sharesAtDate;
                                                return (
                                                    <tr key={index}>
                                                        <td>{formatDate(dividend.date)}</td>
                                                        <td>{formatDate(dividend.exDate)}</td>
                                                        <td>{sharesAtDate}</td>
                                                        <td><span className="financial-number">{formatCurrency(dividend.amount)}</span></td>
                                                        <td><span className="financial-number">{formatCurrency(totalDividend)}</span></td>
                                                        <td>
                                                            <span className={`dividend-type-badge ${dividend.type}`}>
                                                                {dividend.type === 'regular' ? 'רגיל' : 
                                                                 dividend.type === 'special' ? 'מיוחד' : 'פירוק'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>

                <div className="card">
                    <h2>טווח תאריכים</h2>
                    <div className="date-range-toolbar">
                        <div className="date-range-quick">
                            <button className={`filter-btn ${dateRange === 'week' ? 'active' : ''}`} onClick={() => setDateRange('week')}>שבוע</button>
                            <button className={`filter-btn ${dateRange === 'month' ? 'active' : ''}`} onClick={() => setDateRange('month')}>חודש</button>
                            <button className={`filter-btn ${dateRange === 'quarter' ? 'active' : ''}`} onClick={() => setDateRange('quarter')}>רבעון</button>
                            <button className={`filter-btn ${dateRange === 'year' ? 'active' : ''}`} onClick={() => setDateRange('year')}>שנה</button>
                            <button className={`filter-btn ${dateRange === 'all' ? 'active' : ''}`} onClick={() => setDateRange('all')}>הכול</button>
                            </div>
                        <div className="date-range-fields">
                            <label htmlFor="custom-start">מ:</label>
                            <input id="custom-start" type="date" className="date-input" min={`${String(settings.minYear ?? MIN_YEAR).padStart(4,'0')}-01-01`} max={`${String(settings.maxYear ?? MAX_YEAR).padStart(4,'0')}-12-31`} value={customStart} onChange={e=>{ setCustomStart(e.target.value); setDateRange('custom'); }} />
                            <label htmlFor="custom-end">עד:</label>
                            <input id="custom-end" type="date" className="date-input" min={`${String(settings.minYear ?? MIN_YEAR).padStart(4,'0')}-01-01`} max={`${String(settings.maxYear ?? MAX_YEAR).padStart(4,'0')}-12-31`} value={customEnd} onChange={e=>{ setCustomEnd(e.target.value); setDateRange('custom'); }} />
                        </div>
                    </div>
                </div>
                
                <div className="card">
                      <div className="card-header-with-action" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                        <h2>הוסף קנייה</h2>
                         <div className="dashboard-filter-tabs">
                            <button className={`filter-btn ${buyHistoryFilter === 'all' ? 'active' : ''}`} onClick={() => setBuyHistoryFilter('all')}>הכול</button>
                            <button className={`filter-btn ${buyHistoryFilter === 'unsold' ? 'active' : ''}`} onClick={() => setBuyHistoryFilter('unsold')}>יתרה</button>
                            <button className={`filter-btn ${buyHistoryFilter === 'sold' ? 'active' : ''}`} onClick={() => setBuyHistoryFilter('sold')}>נמכר</button>
                          <button className="filter-btn" onClick={() => setShowBuyTable(s => !s)}>{showBuyTable ? 'הסתר טבלת קניות' : 'הצג טבלת קניות'}</button>
                         </div>
                     </div>

                      {renderBuyMoreForm()}
                     
                      {showBuyTable && buysVisibleRows.length > 0 && (
                        <div className="transactions-list">
                            <table className="transactions-table">
                                <thead><tr><th>תאריך</th><th>שער קניה</th><th>כמות</th><th>שווי אחזקה</th><th>עמלה</th><th>רווח נוכחי</th><th>אחוז תשואה</th><th>סטאטוס</th><th>פעולות</th></tr></thead>
                                <tbody>
                                      {buysVisibleRows.map(t => {
                                            const remaining = remainingByBuyId[t.id] ?? t.quantity;
                                        const totalCost = t.price * t.quantity;
                                        const costBasisPerShare = t.price;
                                        const marketPrice = currentPrice || 0;
                                        const currentValue = marketPrice > 0 ? remaining * marketPrice : null;
                                        const currentCost = remaining * costBasisPerShare;
                                        const unrealizedNet = currentValue !== null ? (currentValue - currentCost) : null;
                                        const unrealizedPercent = currentValue !== null && currentCost > 0 ? (unrealizedNet! / currentCost) * 100 : null;
                                        return (
                                            <tr key={t.id}>
                                        <td>{formatDate(t.date)}</td>
                                        <td><span className="financial-number">{formatCurrency(t.price)}</span></td>
                                                <td>{buyHistoryFilter === 'unsold' ? remaining : t.quantity}</td>
                                                <td><span className="financial-number">{formatCurrency(buyHistoryFilter === 'unsold' ? (remaining * t.price) : totalCost)}</span></td>
                                        <td><span className="financial-number">{formatCurrency(t.commission)}</span></td>
                                                <td className={unrealizedNet !== null ? pnlClass(unrealizedNet) : ''}>
                                                    <span className="financial-number">{unrealizedNet !== null ? formatCurrency(unrealizedNet) : '---'}</span>
                                                </td>
                                                <td className={unrealizedNet !== null ? pnlClass(unrealizedNet) : ''}>
                                                    {unrealizedPercent !== null ? `${unrealizedPercent.toFixed(2)}%` : '---'}
                                                </td>
                                                    <td>
                                                        <span className={`status-badge ${remaining === 0 ? 'closed' : 'open'}`}>
                                                            {remaining === 0 ? 'סגור' : 'פתוח'}
                                                        </span>
                                                </td>
                                        <td className="actions-cell">
                                            <button className="edit-btn" title="ערוך" onClick={() => handleStartEdit(t)}><EditIcon /></button>
                                            <button className="delete-btn" title="מחק" onClick={() => handleDeleteBuy(t.id)}><DeleteIcon /></button>
                                        </td>
                                            </tr>
                                        );
                                     })}
                                     {(() => {
                                        const rows = buysVisibleRows;
                                        // עבור "יתרה" - הצג כמות נותרת, עבור "הכול" ו"נמכר" - הצג כמות מקורית
                                        const totalDisplayQuantity = buyHistoryFilter === 'unsold' 
                                            ? rows.reduce((s,t)=> s + (remainingByBuyId[t.id] ?? t.quantity),0)
                                            : rows.reduce((s,t)=> s + t.quantity,0);
                                        const totalPriceForDisplay = buyHistoryFilter === 'unsold'
                                            ? rows.reduce((s,t)=> s + (remainingByBuyId[t.id] ?? t.quantity) * t.price,0)
                                            : rows.reduce((s,t)=> s + t.quantity * t.price,0);
                                        const avgBuyPriceSummary = totalDisplayQuantity > 0 ? (totalPriceForDisplay / totalDisplayQuantity) : 0;
                                        const totalCostAll = buyHistoryFilter === 'unsold'
                                            ? rows.reduce((s,t)=> s + (remainingByBuyId[t.id] ?? t.quantity) * t.price,0)
                                            : rows.reduce((s,t)=> s + t.quantity * t.price,0);
                                        const totalUnrealized = rows.reduce((s,t)=>{
                                            const remaining = remainingByBuyId[t.id] ?? t.quantity;
                                             const cbps = t.price; // ללא עמלות
                                            const cv = currentPrice ? remaining * currentPrice : 0;
                                            const cc = remaining * cbps;
                                            return s + (currentPrice ? (cv - cc) : 0);
                                        },0);
                                         const totalCostBasisRemaining = rows.reduce((s,t)=>{
                                             const remaining = remainingByBuyId[t.id] ?? t.quantity;
                                             return s + (remaining * t.price);
                                         },0);
                                         const totalUnrealizedPercent = totalCostBasisRemaining > 0 && currentPrice ? (totalUnrealized / totalCostBasisRemaining) * 100 : 0;
                                         const totalCommissions = rows.reduce((s,t)=> s + t.commission, 0);
                                        return (
                                            <tr className="summary-row">
                                                <td>סיכום</td>
                                                <td><span className="financial-number">{formatCurrency(avgBuyPriceSummary)}</span></td>
                                                <td>{totalDisplayQuantity}</td>
                                                <td><span className="financial-number">{formatCurrency(totalCostAll)}</span></td>
                                                <td><span className="financial-number">{formatCurrency(totalCommissions)}</span></td>
                                                <td className={pnlClass(totalUnrealized)}><span className="financial-number">{currentPrice ? formatCurrency(totalUnrealized) : '---'}</span></td>
                                                <td className={pnlClass(totalUnrealizedPercent)}>{currentPrice ? `${totalUnrealizedPercent.toFixed(2)}%` : '---'}</td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        );
                                      })()}
                                </tbody>
                            </table>
                            {showBuyDateWarning && (
                              <div className="table-warning" role="alert">
                                * נמצאו תאריכים לא תקינים בטבלה זו. תקף פורמט YYYY-MM-DD ובטווח 1900–2200. נא לתקן את השדות המסומנים באדום.
                              </div>
                            )}
                        </div>
                     )}
                     {buysForActiveStock.length === 0 && !isBuyFormVisible && (
                        <p>אין היסטוריית קניות עבור מניה זו.</p>
                     )}
                </div>

                <div className="card">
                    <div className="card-header-with-action" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                        <h2>הוסף מכירה</h2>
                        <div className="dashboard-filter-tabs">
                            <button className="filter-btn" onClick={() => setShowSellTable(s => !s)}>{showSellTable ? 'הסתר טבלת מכירות' : 'הצג טבלת מכירות'}</button>
                        </div>
                    </div>
                    <div className="form-grid">
                        <div className="form-group"><label htmlFor="sell-price">מחיר מניה ($)</label><input id="sell-price" type="number" placeholder={`מחיר קנייה ממוצע: ${activeStockSummary.weightedAvgBuyPrice.toFixed(2)}`} value={sellPrice} onChange={e => setSellPrice(e.target.value)} /></div>
                        <div className="form-group">
                            <label htmlFor="sell-quantity">כמות מניות</label>
                            <div className="input-with-icon">
                                <input id="sell-quantity" type="number" placeholder={`יתרה: ${activeStockSummary.remainingQuantity}`} value={sellQuantity} onChange={e => setSellQuantity(e.target.value)} max={activeStockSummary.remainingQuantity} />
                                <button type="button" className="icon-btn" title="מלא את כל היתרה" onClick={() => setSellQuantity(String(activeStockSummary.remainingQuantity))} disabled={activeStockSummary.remainingQuantity <= 0}>
                                    <FillAllIcon />
                                </button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="sell-date">תאריך</label>
                            <input
                                id="sell-date"
                                className={`date-input ${normalizeIsoDateString(sellDate) ? '' : 'invalid-input'}`}
                                type="date"
                                min={`${String(settings.minYear ?? MIN_YEAR).padStart(4,'0')}-01-01`}
                                max={`${String(settings.maxYear ?? MAX_YEAR).padStart(4,'0')}-12-31`}
                                value={sellDate}
                                onChange={e => setSellDate(e.target.value)}
                            />
                        </div>
                        <button onClick={handleAddSell} disabled={!sellPrice || !sellQuantity || activeStockSummary.remainingQuantity <= 0 || parseInt(sellQuantity, 10) > activeStockSummary.remainingQuantity}><PlusIcon/> הוסף מכירה</button>
                    </div>
                    {showSellTable && sellsForActiveStock.length > 0 && <div className="transactions-list">
                        <table className="transactions-table">
                            <thead><tr><th>תאריך</th><th>שער קניה</th><th>שער מכירה</th><th>כמות</th><th>שווי אחזקה</th><th>עמלה</th><th>סה"כ רווח</th><th>אחוז תשואה</th><th>פעולות</th></tr></thead>
                            <tbody>
                                {perSellRealized.map(r => {
                                    const avgBuyPrice = r.investedCostNoFees / r.quantity;
                                    return (
                                    <tr key={r.id}>
                                        <td>{formatDate(r.date)}</td>
                                            <td><span className="financial-number">{formatCurrency(avgBuyPrice)}</span></td>
                                        <td><span className="financial-number">{formatCurrency(r.price)}</span></td>
                                        <td>{r.quantity}</td>
                                        <td><span className="financial-number">{formatCurrency(r.totalProceeds)}</span></td>
                                        <td><span className="financial-number">{formatCurrency(r.commission)}</span></td>
                                        <td className={pnlClass(r.realizedGross)}><span className="financial-number">{formatCurrency(r.realizedGross)}</span></td>
                                        <td className={pnlClass(r.realizedGross)}>{r.realizedPercent.toFixed(2)}%</td>
                                        <td className="actions-cell">
                                            <button className="delete-btn" title="מחק" onClick={() => handleDeleteSell(r.id)}><DeleteIcon /></button>
                                        </td>
                                    </tr>
                                    );
                                })}
                                {perSellRealized.length > 0 && (
                                    <tr className="summary-row">
                                        <td>סיכום</td>
                                        <td></td>
                                        <td></td>
                                        <td>{perSellRealized.reduce((s, r) => s + r.quantity, 0)}</td>
                                        <td><span className="financial-number">{formatCurrency(perSellRealized.reduce((s, r) => s + r.totalProceeds, 0))}</span></td>
                                        <td><span className="financial-number">{formatCurrency(perSellRealized.reduce((s, r) => s + r.commission, 0))}</span></td>
                                        <td className={pnlClass(perSellRealized.reduce((s, r) => s + r.realizedGross, 0))}><span className="financial-number">{formatCurrency(perSellRealized.reduce((s, r) => s + r.realizedGross, 0))}</span></td>
                                        <td className={(() => { const invested = perSellRealized.reduce((s,r)=> s + r.investedCostNoFees, 0); const gross = perSellRealized.reduce((s,r)=> s + r.realizedGross, 0); const pct = invested > 0 ? (gross / invested) * 100 : 0; return pnlClass(pct); })()}>
                                            {(() => { const invested = perSellRealized.reduce((s,r)=> s + r.investedCostNoFees, 0); const gross = perSellRealized.reduce((s,r)=> s + r.realizedGross, 0); const pct = invested > 0 ? (gross / invested) * 100 : 0; return pct < 0 ? `${Math.abs(pct).toFixed(2)}% -` : `${pct.toFixed(2)}%`; })()}
                                        </td>
                                        <td></td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {showSellDateWarning && (
                          <div className="table-warning" role="alert">
                            * נמצאו תאריכים לא תקינים בטבלה זו. תקף פורמט YYYY-MM-DD ובטווח 1900–2200. נא לתקן את השדות המסומנים באדום.
                          </div>
                        )}
                    </div>}
                </div>
            </>
        )
    };

    // --- Insights Helper ---
    const getPortfolioInsights = ({ allSummaries, portfolioSummary, currentStockPrices, PIE_CHART_COLORS }) => {
      const insights = [];
      // פיזור
      const allocations = allSummaries
        .filter(s => s.summary.remainingQuantity > 0)
        .map(s => ({
          stock: s.stock,
          value: s.summary.weightedAvgCostBasis * s.summary.remainingQuantity
        }));
      const total = allocations.reduce((a, b) => a + b.value, 0);
      const maxAlloc = allocations.length > 0 ? Math.max(...allocations.map(a => a.value / total)) : 0;
      if (maxAlloc > 0.3) {
        const stock = allocations.find(a => a.value / total === maxAlloc)?.stock;
        insights.push(`לתיק שלך יש ריכוז גבוה במניית ${stock} (${(maxAlloc*100).toFixed(1)}%). מומלץ לשקול פיזור רחב יותר.`);
      } else if (allocations.length > 0) {
        insights.push("פיזור התיק שלך סביר, אין ריכוז חריג במניה אחת.");
      }
      // מניות עם תשואה חריגה
      const best = allSummaries
        .filter(s => s.summary.roi !== 0)
        .sort((a, b) => b.summary.roi - a.summary.roi)[0];
      const worst = allSummaries
        .filter(s => s.summary.roi !== 0)
        .sort((a, b) => a.summary.roi - b.summary.roi)[0];
      if (best && best.summary.roi > 0) {
        insights.push(`המניה עם התשואה הגבוהה ביותר: ${best.stock} (${best.summary.roi.toFixed(1)}%).`);
      }
      if (worst && worst.summary.roi < 0) {
        insights.push(`המניה עם התשואה השלילית ביותר: ${worst.stock} (${worst.summary.roi.toFixed(1)}%).`);
      }
      // עמלות
      if (portfolioSummary.totalCommissions > 0 && portfolioSummary.realizedGrossPnl > 0 && portfolioSummary.totalCommissions > portfolioSummary.realizedGrossPnl * 0.2) {
        insights.push("העמלות גבוהות יחסית לרווחים. שקול לבדוק ברוקר זול יותר.");
      }
      // רווח/הפסד לא ממומש
      if (portfolioSummary.totalCost > 0 && portfolioSummary.realizedNetPnl < 0) {
        insights.push("התיק שלך במצב הפסד נטו. שקול לבחון מחדש את האסטרטגיה.");
      }
      // אין עסקאות?
      if (allSummaries.length === 0) {
        insights.push("לא קיימות עסקאות בתיק. התחל להשקיע כדי לראות ביצועים.");
      }
      return insights;
    };

    // --- Performance helpers ---
    const computeEquityCurveFromSells = useCallback(() => {
      // Cumulative realized net PnL over time (approximate equity curve using closed trades only)
      const sells = [...sellTransactions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      let cum = 0;
      const points: Array<{ x: number; y: number }> = [];
        for (const s of sells) {
        const date = new Date(s.date);
        const realizedNet = Number(((s as any).realizedNet) ?? 0);
        cum += realizedNet;
        points.push({ x: date.getTime(), y: cum });
      }
      return points;
    }, [sellTransactions]);

    const computeMaxDrawdown = useCallback((series: Array<{ x: number; y: number }>) => {
      let peak = -Infinity;
      let maxDd = 0;
      for (const p of series) {
        peak = Math.max(peak, p.y);
        const dd = peak - p.y;
        if (dd > maxDd) maxDd = dd;
      }
      return maxDd; // in currency units (same as y)
    }, []);

    const computeMonthlyHeatmap = useCallback((monthsBack: number = 12) => {
      // Aggregate realized net PnL by year-month from sell transactions
      const map = new Map<string, number>();
        for (const s of sellTransactions) {
        const d = parseLooseDate(s.date);
        if (!d) continue;
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        const realizedNet = Number(((s as any).realizedNet) ?? 0);
        map.set(key, (map.get(key) || 0) + realizedNet);
      }
      const now = new Date();
      const out: Array<{ key: string; label: string; value: number }> = [];
      for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        const label = `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCFullYear()).slice(-2)}`;
        out.push({ key, label, value: map.get(key) || 0 });
      }
      return out;
    }, [sellTransactions]);

    // --- Analytics helpers (realized trades) ---
    const computeRealizedTrades = useCallback(() => {
      type Lot = { remaining: number; costBasisPerShare: number; date: string };
      const results: Array<{ stock: string; date: string; realizedNet: number; realizedPercent: number; holdingDays: number }>
        = [];
      const stocks = new Set<string>([
        ...buyTransactions.map(t => t.stockName),
        ...sellTransactions.map(t => t.stockName)
      ]);
      for (const stock of stocks) {
        const buys: Lot[] = buyTransactions
          .filter(t => t.stockName === stock)
          .slice()
          .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
          .map(b => ({
            remaining: b.quantity,
            costBasisPerShare: (b.price * b.quantity + b.commission) / Math.max(1, b.quantity),
            date: b.date,
          }));
        const sells = sellTransactions
          .filter(t => t.stockName === stock)
          .slice()
          .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        for (const s of sells) {
          let qtyToMatch = s.quantity;
          let allocatedCost = 0;
          let weightedBuyDateMs = 0;
          let matchedQty = 0;
          for (const lot of buys) {
            if (qtyToMatch <= 0) break;
            if (lot.remaining <= 0) continue;
            const take = Math.min(lot.remaining, qtyToMatch);
            allocatedCost += take * lot.costBasisPerShare;
            weightedBuyDateMs += take * safeDateMs(lot.date);
            lot.remaining -= take;
            qtyToMatch -= take;
            matchedQty += take;
          }
          const proceeds = s.price * s.quantity;
          const realizedNet = (proceeds - allocatedCost) - s.commission;
          const realizedPercent = allocatedCost > 0 ? (realizedNet / allocatedCost) * 100 : 0;
          let holdingDays = 0;
          if (matchedQty > 0) {
            const avgBuyTime = weightedBuyDateMs / matchedQty;
            holdingDays = Math.max(0, Math.round((safeDateMs(s.date) - avgBuyTime) / (1000 * 60 * 60 * 24)));
          }
          results.push({ stock, date: s.date, realizedNet, realizedPercent, holdingDays });
        }
      }
      return results;
    }, [buyTransactions, sellTransactions]);

    const renderPerformancePage = () => {
      // KPI
      const kpiData = [
        { label: "שווי תיק נוכחי", value: formatCurrency(portfolioSummary.totalCost) },
        { label: "רווח/הפסד לא ממומש", value: (() => {
            const value = unrealizedPnl;
            return value < 0 ? `${formatCurrency(Math.abs(value))} -` : formatCurrency(value);
        })() },
        { label: "רווח/הפסד ממומש (נטו)", value: (() => {
            const value = portfolioSummary.realizedNetPnl;
            return value < 0 ? `${formatCurrency(Math.abs(value))} -` : formatCurrency(value);
        })() },
        { label: "תשואה ממומשת", value: overallRoi.toFixed(2) + "%" },
        { label: "סה\"כ עמלות", value: formatCurrency(portfolioSummary.totalCommissions) },
        { label: "מספר מניות בתיק", value: allSummaries.filter(s => s.summary.remainingQuantity > 0).length }
      ];
      
      // חלוקה למניות לפני מימוש ואחרי מימוש
      const activeStocks = allSummaries.filter(s => s.summary.remainingQuantity > 0);
      const closedStocks = allSummaries.filter(s => s.summary.remainingQuantity === 0 && s.summary.totalBuyQuantity > 0);
      
      // חישוב סיכומים
      const activeSummary = activeStocks.reduce((acc, { stock, summary }) => {
        acc.totalQuantity += summary.remainingQuantity;
        acc.totalCost += summary.weightedAvgCostBasis * summary.remainingQuantity;
        acc.totalCurrentValue += (currentStockPrices[stock] || 0) * summary.remainingQuantity;
        return acc;
      }, { totalQuantity: 0, totalCost: 0, totalCurrentValue: 0 });
      
      const closedSummary = closedStocks.reduce((acc, { stock, summary }) => {
        acc.totalRealizedPnl += summary.realizedNetPnl;
        acc.totalRealizedPercent += summary.roi;
        acc.totalQuantity += summary.totalSellQuantity;
        return acc;
      }, { totalRealizedPnl: 0, totalRealizedPercent: 0, totalQuantity: 0 });
      
      // Pie data for allocation
      const allocationData = activeStocks
        .map((s, index) => ({
          name: s.stock,
          value: s.summary.weightedAvgCostBasis * s.summary.remainingQuantity,
          color: PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]
        }));
      
      // Sector allocation based on real stock data
      const sectorMapping = {
        'AAPL': 'טכנולוגיה', 'MSFT': 'טכנולוגיה', 'GOOGL': 'טכנולוגיה', 'AMZN': 'טכנולוגיה', 'TSLA': 'טכנולוגיה',
        'JPM': 'פיננסים', 'BAC': 'פיננסים', 'WFC': 'פיננסים', 'GS': 'פיננסים',
        'JNJ': 'בריאות', 'PFE': 'בריאות', 'UNH': 'בריאות', 'ABBV': 'בריאות',
        'XOM': 'אנרגיה', 'CVX': 'אנרגיה', 'COP': 'אנרגיה',
        'KO': 'צריכה', 'PG': 'צריכה', 'WMT': 'צריכה', 'HD': 'צריכה'
      };
      
      const sectorData = activeStocks.reduce((acc, { stock, summary }) => {
        const sector = sectorMapping[stock] || 'אחר';
        const value = summary.weightedAvgCostBasis * summary.remainingQuantity;
        const existing = acc.find(item => item.name === sector);
        if (existing) {
          existing.value += value;
        } else {
          acc.push({ name: sector, value, color: PIE_CHART_COLORS[acc.length % PIE_CHART_COLORS.length] });
        }
        return acc;
      }, []);
      
      // Asset type allocation based on real data (all stocks for now)
      const assetTypeData = [
        { name: "מניות", value: 100, color: "#0088FE" }
      ];
      
      // Performance heatmap data
      const performanceData = activeStocks.map(({ stock, summary }) => {
        const currentPrice = currentStockPrices[stock];
        const avgPrice = summary.weightedAvgBuyPrice;
        const performance = currentPrice ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
        return {
          stock,
          performance,
          currentPrice,
          avgPrice
        };
      });
      
      // Insights
      const insights = getPortfolioInsights({
        allSummaries,
        portfolioSummary,
        currentStockPrices,
        PIE_CHART_COLORS
      });
      
      const handleChartHover = (e, data) => {
        const label = data.name || data.label;
        const content = `<strong>${label}</strong><br/>${formatCurrency(data.value)}`;
        setTooltip({ visible: true, x: e.clientX + 15, y: e.clientY + 15, content });
      };
      
      const handleChartLeave = () => {
        setTooltip({ ...tooltip, visible: false });
      };
      
      return (
        <div className="performance-page">
          <div className="card">
            <button className="back-btn" onClick={goToDashboard}><BackArrowIcon/> חזור לדשבורד</button>
            <h2 className="stock-detail-header">דוח ביצועים מקצועי</h2>
          </div>
          
          <div className="kpi-cards">
            {kpiData.map((k, i) => (
              <div className="kpi-card" key={i}>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value">{k.value}</div>
              </div>
            ))}
          </div>

          {/* Equity Curve + Max Drawdown */}
          <div className="card">
            <h2>עקומת הון (סגירות ממומשות)</h2>
            {(() => {
              const eq = computeEquityCurveFromSells();
              const maxDd = computeMaxDrawdown(eq);
              return (
                <>
                  <LineChart data={eq} />
                  <div className="table-disclaimer">Max Drawdown: {formatCurrency(maxDd)}</div>
                </>
              );
            })()}
          </div>
          
          {/* מניות פעילות (לפני מימוש) */}
          <div className="card">
            <h2>מניות פעילות (לפני מימוש)</h2>
            <div className="table-container">
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>שם</th>
                    <th>כמות מניות</th>
                    <th>מחיר ממוצע</th>
                    <th>שווי אחזקה</th>
                    <th>שווי נוכחי ($)</th>
                    <th>מחיר נוכחי</th>
                    <th>סה"כ רווח (%)</th>
                    <th>סה"כ רווח ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStocks.map(({ stock, summary }) => {
                    const currentPrice = currentStockPrices[stock];
                    const totalCost = summary.weightedAvgBuyPrice * summary.remainingQuantity; // ללא עמלות
                    const currentValue = currentPrice ? currentPrice * summary.remainingQuantity : 0;
                    const totalPnl = currentValue - totalCost;
                    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
                    
                    return (
                      <tr key={stock}>
                        <td>{stock}</td>
                        <td>{summary.remainingQuantity}</td>
                        <td>{formatCurrency(summary.weightedAvgBuyPrice)}</td>
                        <td>{formatCurrency(totalCost)}</td>
                        <td>{formatCurrency(currentValue)}</td>
                        <td>{currentPrice ? formatCurrency(currentPrice) : '---'}</td>
                        <td className={pnlClass(totalPnlPercent)}>{totalPnlPercent < 0 ? `${Math.abs(totalPnlPercent).toFixed(2)}% -` : `${totalPnlPercent.toFixed(2)}%`}</td>
                        <td className={pnlClass(totalPnl)}>{totalPnl < 0 ? `${formatCurrency(Math.abs(totalPnl))} -` : formatCurrency(totalPnl)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="summary-row">
                    <td><strong>סה"כ</strong></td>
                    <td>-</td>
                    <td>-</td>
                    <td><strong>{formatCurrency(activeSummary.totalCost)}</strong></td>
                    <td><strong>{formatCurrency(activeSummary.totalCurrentValue)}</strong></td>
                    <td>-</td>
                    <td><strong>{(() => {
                        const value = activeSummary.totalCost > 0 ? ((activeSummary.totalCurrentValue - activeSummary.totalCost) / activeSummary.totalCost * 100) : 0;
                        return value < 0 ? `${Math.abs(value).toFixed(2)}% -` : `${value.toFixed(2)}%`;
                    })()}</strong></td>
                    <td><strong className={pnlClass(activeSummary.totalCurrentValue - activeSummary.totalCost)}>{(() => {
                        const value = activeSummary.totalCurrentValue - activeSummary.totalCost;
                        return value < 0 ? `${formatCurrency(Math.abs(value))} -` : formatCurrency(value);
                    })()}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          {/* מניות סגורות (אחרי מימוש) */}
          <div className="card">
            <h2>מניות סגורות (אחרי מימוש)</h2>
            <div className="table-container">
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>שם</th>
                    <th>כמות שנמכרה</th>
                    <th>מחיר ממוצע</th>
                    <th>שווי אחזקה</th>
                    <th>שווי מכירה ($)</th>
                    <th>מחיר מכירה ממוצע</th>
                    <th>סה"כ רווח (%)</th>
                    <th>סה"כ רווח ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {closedStocks.map(({ stock, summary }) => {
                    const totalCost = summary.weightedAvgCostBasis * summary.totalSellQuantity;
                    const totalSaleValue = summary.realizedGrossPnl + totalCost;
                    const avgSalePrice = summary.totalSellQuantity > 0 ? totalSaleValue / summary.totalSellQuantity : 0;
                    
                    return (
                      <tr key={stock}>
                        <td>{stock}</td>
                        <td>{summary.totalSellQuantity}</td>
                        <td>{formatCurrency(summary.weightedAvgBuyPrice)}</td>
                        <td>{formatCurrency(totalCost)}</td>
                        <td>{formatCurrency(totalSaleValue)}</td>
                        <td>{formatCurrency(avgSalePrice)}</td>
                        <td className={pnlClass(summary.roi)}>{summary.roi < 0 ? `${Math.abs(summary.roi).toFixed(2)}% -` : `${summary.roi.toFixed(2)}%`}</td>
                        <td className={pnlClass(summary.realizedNetPnl)}>{summary.realizedNetPnl < 0 ? `${formatCurrency(Math.abs(summary.realizedNetPnl))} -` : formatCurrency(summary.realizedNetPnl)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="summary-row">
                    <td><strong>סה"כ</strong></td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td><strong className={pnlClass(closedSummary.totalRealizedPercent)}>{(() => {
                        const value = closedStocks.length > 0 ? (closedSummary.totalRealizedPercent / closedStocks.length) : 0;
                        return value < 0 ? `${Math.abs(value).toFixed(2)}% -` : `${value.toFixed(2)}%`;
                    })()}</strong></td>
                    <td><strong className={pnlClass(closedSummary.totalRealizedPnl)}>{(() => {
                        const value = closedSummary.totalRealizedPnl;
                        return value < 0 ? `${formatCurrency(Math.abs(value))} -` : formatCurrency(value);
                    })()}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          {/* גרפים נוספים */}
          <div className="performance-grid-2-col">
            <div className="card">
              <h2>חלוקה לפי סקטורים</h2>
              <div className="chart-container pie-chart-container">
                <PieChart data={sectorData} onHover={handleChartHover} onLeave={handleChartLeave} />
                <div className="pie-legend">
                  {sectorData.map(item => (
                    <div key={item.name} className="legend-item">
                      <div className="legend-color-box" style={{ backgroundColor: item.color }}></div>
                      <span>{item.name} ({item.value}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="card">
              <h2>חלוקה לפי סוג נכס</h2>
              <div className="chart-container pie-chart-container">
                <PieChart data={assetTypeData} onHover={handleChartHover} onLeave={handleChartLeave} />
                <div className="pie-legend">
                  {assetTypeData.map(item => (
                    <div key={item.name} className="legend-item">
                      <div className="legend-color-box" style={{ backgroundColor: item.color }}></div>
                      <span>{item.name} ({item.value}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* תובנות ושעון חום */}
          <div className="performance-grid-2-col">
            <div className="card">
              <h2>תובנות אוטומטיות</h2>
              <ul className="insights-list">
                {insights.map((insight, idx) => <li key={idx}>{insight}</li>)}
              </ul>
            </div>
            
            <div className="card">
              <h2>שעון חום - ביצועי מניות</h2>
              <div className="heatmap-container">
                {performanceData.map(({ stock, performance, currentPrice, avgPrice }) => (
                  <div key={stock} className="heatmap-item" style={{
                    backgroundColor: performance > 0 ? `rgba(34, 140, 59, ${Math.min(Math.abs(performance) / 50, 0.8)})` : `rgba(211, 47, 47, ${Math.min(Math.abs(performance) / 50, 0.8)})`,
                    color: Math.abs(performance) > 25 ? 'white' : 'black'
                  }}>
                    <div className="heatmap-stock">{stock}</div>
                    <div className="heatmap-performance">{performance < 0 ? `${Math.abs(performance).toFixed(1)}% -` : `${performance.toFixed(1)}%`}</div>
                    <div className="heatmap-price">{currentPrice ? formatCurrency(currentPrice) : '---'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Heatmap חודשי (ממומש) */}
          <div className="card">
            <h2>רווח/הפסד נטו חודשי (ממומש)</h2>
            {(() => {
              const hm = computeMonthlyHeatmap(12);
              return (
                <div className="heatmap-container">
                  {hm.map(cell => (
                    <div key={cell.key} className="heatmap-item" style={{
                      backgroundColor: cell.value >= 0 ? `rgba(34, 140, 59, ${Math.min(Math.abs(cell.value) / 1000, 0.8)})` : `rgba(211, 47, 47, ${Math.min(Math.abs(cell.value) / 1000, 0.8)})`,
                      color: Math.abs(cell.value) > 250 ? '#fff' : 'var(--text-color)'
                    }}>
                      <div className="heatmap-stock">{cell.label}</div>
                      <div className={"heatmap-performance " + pnlClass(cell.value)}>{formatCurrency(cell.value)}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      );
    };

    const renderAnalyticsPage = () => {
        const allStocks = [...new Set([...buyTransactions.map(t => t.stockName), ...sellTransactions.map(t => t.stockName)])];
        const stockAnalytics = allStocks.map(stock => {
            const summary = calculateStockSummary(stock);
            const currentPrice = currentStockPrices[stock] || 0;
            const marketValue = summary.remainingQuantity * currentPrice;
            const totalInvested = summary.totalBuyCost;
            const unrealizedPnl = marketValue - totalInvested;
            const unrealizedPnlPercent = totalInvested > 0 ? (unrealizedPnl / totalInvested) * 100 : 0;
            
            return {
                stock,
                summary,
                currentPrice,
                marketValue,
                totalInvested,
                unrealizedPnl,
                unrealizedPnlPercent,
                avgPrice: summary.weightedAvgBuyPrice,
                quantity: summary.remainingQuantity
            };
        });

        const realizedTrades = computeRealizedTrades();
        const wins = realizedTrades.filter(t => t.realizedNet > 0);
        const losses = realizedTrades.filter(t => t.realizedNet < 0);
        const winLossRatio = losses.length > 0 ? (wins.length / losses.length) : (wins.length > 0 ? Infinity : 0);
        const grossProfit = wins.reduce((s, t) => s + t.realizedNet, 0);
        const grossLoss = Math.abs(losses.reduce((s, t) => s + t.realizedNet, 0));
        const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? Infinity : 0);
        const expectancy = realizedTrades.length > 0 ? (grossProfit - grossLoss) / realizedTrades.length : 0;
        const avgHoldingDays = realizedTrades.length > 0 ? (realizedTrades.reduce((s,t)=> s + t.holdingDays, 0) / realizedTrades.length) : 0;

        const portfolioStats = {
            totalStocks: allStocks.length,
            totalInvested: stockAnalytics.reduce((sum, s) => sum + s.totalInvested, 0),
            totalMarketValue: stockAnalytics.reduce((sum, s) => sum + s.marketValue, 0),
            totalUnrealizedPnl: stockAnalytics.reduce((sum, s) => sum + s.unrealizedPnl, 0),
            bestPerformer: stockAnalytics.reduce((best, current) => 
                current.unrealizedPnlPercent > best.unrealizedPnlPercent ? current : best
            ),
            worstPerformer: stockAnalytics.reduce((worst, current) => 
                current.unrealizedPnlPercent < worst.unrealizedPnlPercent ? current : worst
            ),
            avgReturn: stockAnalytics.length > 0 ? 
                stockAnalytics.reduce((sum, s) => sum + s.unrealizedPnlPercent, 0) / stockAnalytics.length : 0
        };

        return (
            <div className="analytics-page">
                <div className="card">
                        <h2>סטטיסטיקות מתקדמות</h2>
                    
                    {/* Portfolio Overview */}
                    <div className="kpi-cards">
                        <div className="kpi-card">
                            <div className="kpi-label">סה"כ מניות</div>
                            <div className="kpi-value">{portfolioStats.totalStocks}</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">סה"כ השקעה</div>
                            <div className="kpi-value">{formatCurrency(portfolioStats.totalInvested)}</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">שווי שוק</div>
                            <div className="kpi-value">{formatCurrency(portfolioStats.totalMarketValue)}</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">רווח/הפסד</div>
                            <div className={`kpi-value ${pnlClass(portfolioStats.totalUnrealizedPnl)}`}>
                                {formatCurrency(portfolioStats.totalUnrealizedPnl)}
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">תשואה ממוצעת</div>
                            <div className={`kpi-value ${pnlClass(portfolioStats.avgReturn)}`}>
                                {portfolioStats.avgReturn.toFixed(2)}%
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">Win/Loss</div>
                            <div className="kpi-value">{wins.length}/{losses.length}</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">Profit Factor</div>
                            <div className="kpi-value">{profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">Expectancy (לעסקה)</div>
                            <div className={`kpi-value ${pnlClass(expectancy)}`}>{formatCurrency(expectancy)}</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">זמן החזקה ממוצע</div>
                            <div className="kpi-value">{avgHoldingDays.toFixed(1)} ימים</div>
                        </div>
                    </div>

                    {/* Top Performers */}
                    <div className="performance-grid-2-col">
                        <div className="card">
                            <h3>המניה הטובה ביותר</h3>
                            {portfolioStats.bestPerformer && (
                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '10px' }}>
                                        {portfolioStats.bestPerformer.stock}
                                    </div>
                                    <div className={`${pnlClass(portfolioStats.bestPerformer.unrealizedPnlPercent)}`} style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                        {portfolioStats.bestPerformer.unrealizedPnlPercent.toFixed(2)}%
                                    </div>
                                    <div style={{ marginTop: '10px', color: 'var(--secondary-color)' }}>
                                        {formatCurrency(portfolioStats.bestPerformer.unrealizedPnl)}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="card">
                            <h3>המניה הגרועה ביותר</h3>
                            {portfolioStats.worstPerformer && (
                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '10px' }}>
                                        {portfolioStats.worstPerformer.stock}
                                    </div>
                                    <div className={`${pnlClass(portfolioStats.worstPerformer.unrealizedPnlPercent)}`} style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                        {portfolioStats.worstPerformer.unrealizedPnlPercent.toFixed(2)}%
                                    </div>
                                    <div style={{ marginTop: '10px', color: 'var(--secondary-color)' }}>
                                        {formatCurrency(portfolioStats.worstPerformer.unrealizedPnl)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top-5 Winners/Losers (by realized net) */}
                    <div className="performance-grid-2-col">
                        <div className="card">
                            <h3>Top-5 מניות מנצחות (Realized)</h3>
                            <div className="table-container">
                                <table className="stocks-table">
                                    <thead>
                                        <tr>
                                            <th>מניה</th>
                                            <th>רווח נטו</th>
                                            <th>תשואה (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...realizedTrades]
                                          .sort((a,b)=> b.realizedNet - a.realizedNet)
                                          .slice(0,5)
                                          .map((t, idx)=> (
                                            <tr key={idx}>
                                              <td>{t.stock}</td>
                                              <td className={pnlClass(t.realizedNet)}>{formatCurrency(t.realizedNet)}</td>
                                              <td className={pnlClass(t.realizedPercent)}>{t.realizedPercent.toFixed(2)}%</td>
                                            </tr>
                                          ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="card">
                            <h3>Top-5 מניות מפסידות (Realized)</h3>
                            <div className="table-container">
                                <table className="stocks-table">
                                    <thead>
                                        <tr>
                                            <th>מניה</th>
                                            <th>הפסד נטו</th>
                                            <th>תשואה (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...realizedTrades]
                                          .sort((a,b)=> a.realizedNet - b.realizedNet)
                                          .slice(0,5)
                                          .map((t, idx)=> (
                                            <tr key={idx}>
                                              <td>{t.stock}</td>
                                              <td className={pnlClass(t.realizedNet)}>{formatCurrency(t.realizedNet)}</td>
                                              <td className={pnlClass(t.realizedPercent)}>{t.realizedPercent.toFixed(2)}%</td>
                                            </tr>
                                          ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Stock Analysis */}
                    <div className="card">
                        <h3>ניתוח מפורט לפי מניות</h3>
                        <div className="table-container">
                            <table className="stocks-table">
                                <thead>
                                    <tr>
                                        <th>מניה</th>
                                        <th>כמות</th>
                                        <th>מחיר ממוצע</th>
                                        <th>מחיר נוכחי</th>
                                        <th>שווי שוק</th>
                                        <th>השקעה</th>
                                        <th>רווח/הפסד</th>
                                        <th>תשואה (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockAnalytics
                                        .filter(stock => stock.quantity > 0)
                                        .sort((a, b) => b.unrealizedPnlPercent - a.unrealizedPnlPercent)
                                        .map(stock => (
                                            <tr key={stock.stock} className="stock-table-row" onClick={() => goToStockDetail(stock.stock)}>
                                                <td>{stock.stock}</td>
                                                <td>{stock.quantity}</td>
                                                <td>{formatCurrency(stock.avgPrice)}</td>
                                                <td>{formatCurrency(stock.currentPrice)}</td>
                                                <td>{formatCurrency(stock.marketValue)}</td>
                                                <td>{formatCurrency(stock.totalInvested)}</td>
                                                <td className={pnlClass(stock.unrealizedPnl)}>
                                                    {formatCurrency(stock.unrealizedPnl)}
                                                </td>
                                                <td className={pnlClass(stock.unrealizedPnlPercent)}>
                                                    {stock.unrealizedPnlPercent.toFixed(2)}%
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Risk Analysis */}
                    <div className="card">
                        <h3>ניתוח סיכונים</h3>
                        <div className="performance-grid-2-col">
                            <div>
                                <h4>התפלגות תשואות</h4>
                                <div style={{ marginTop: '15px' }}>
                                    {(() => {
                                        const profitable = stockAnalytics.filter(s => s.unrealizedPnlPercent > 0).length;
                                        const losing = stockAnalytics.filter(s => s.unrealizedPnlPercent < 0).length;
                                        const total = stockAnalytics.length;
                                        
                                        return (
                                            <div>
                                                <div className="performance-indicator">
                                                    <span className="label">רווחיות: {profitable}</span>
                                                    <span className={`value ${pnlClass(profitable > losing ? 1 : -1)}`}>
                                                        {((profitable / total) * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="performance-indicator">
                                                    <span className="label">הפסדים: {losing}</span>
                                                    <span className={`value ${pnlClass(-1)}`}>
                                                        {((losing / total) * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            
                            <div>
                                <h4>ריכוזיות תיק</h4>
                                <div style={{ marginTop: '15px' }}>
                                    {(() => {
                                        const totalValue = portfolioStats.totalMarketValue;
                                        const topHoldings = stockAnalytics
                                            .sort((a, b) => b.marketValue - a.marketValue)
                                            .slice(0, 3);
                                        
                                        const topConcentration = topHoldings.reduce((sum, holding) => 
                                            sum + (holding.marketValue / totalValue), 0
                                        );
                                        
                                        return (
                                            <div>
                                                {topHoldings.map((holding, index) => (
                                                    <div key={holding.stock} className="performance-indicator">
                                                        <span className="label">{index + 1}. {holding.stock}</span>
                                                        <span className="value">{((holding.marketValue / totalValue) * 100).toFixed(1)}%</span>
                                                    </div>
                                                ))}
                                                {topConcentration > 0.7 && (
                                                    <div className="concentration-warning">
                                                        ⚠️ התיק מרוכז מאוד - {topHoldings.length} מניות מהוות {(topConcentration * 100).toFixed(1)}% מהתיק
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Trends */}
                    <div className="card">
                        <h3>מגמות ביצועים</h3>
                        <div className="analytics-grid">
                            <div className="analytics-card">
                                <h4>ביצועים לפי מגזר</h4>
                                <div className="stock-performance-chart">
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</div>
                                        <div>ניתוח מגזרי יוצג כאן</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="analytics-card">
                                <h4>תנודתיות ממוצעת</h4>
                                <div style={{ marginTop: '15px' }}>
                                    <div className="performance-indicator">
                                        <span className="label">תשואה ממוצעת</span>
                                        <span className={`value ${pnlClass(portfolioStats.avgReturn)}`}>
                                            {portfolioStats.avgReturn.toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className="performance-indicator">
                                        <span className="label">סטיית תקן</span>
                                        <span className="value">
                                            {(() => {
                                                const returns = stockAnalytics.map(s => s.unrealizedPnlPercent);
                                                const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
                                                const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
                                                return Math.sqrt(variance).toFixed(2);
                                            })()}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderSettingsPage = () => {
        const minYearStr = String(settings.minYear ?? MIN_YEAR).padStart(4, '0');
        const maxYearStr = String(settings.maxYear ?? MAX_YEAR).padStart(4, '0');
        return (
            <div className="settings-page">
                {/* כללי */}
                <div className="card">
                    <h2>כללי</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>ערכת צבע</label>
                            <select value={isDarkTheme ? 'dark' : 'light'} onChange={(e) => setIsDarkTheme(e.target.value === 'dark')}>
                                <option value="light">בהיר</option>
                                <option value="dark">כהה</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* עמלות ומס */}
                <div className="card">
                    <h2>עמלות ומס</h2>
                    <div className="form-grid">
                        <div className="form-group"><label>עמלת מינימום ($)</label><input type="number" name="minCommission" value={settings.minCommission} onChange={handleSettingsChange}/></div>
                        <div className="form-group"><label>שיעור עמלה (%)</label><input type="number" name="commissionRate" value={settings.commissionRate * 100} onChange={handleSettingsChange}/></div>
                        <div className="form-group"><label>עמלה נוספת ($)</label><input type="number" name="additionalFee" value={settings.additionalFee} onChange={handleSettingsChange}/></div>
                        <div className="form-group"><label>שיעור מס רווחי הון (%)</label><input type="number" name="taxRate" value={settings.taxRate * 100} onChange={handleSettingsChange}/></div>
                    </div>
                </div>

                {/* טווח תאריכים */}
                <div className="card">
                    <h2>טווח תאריכים</h2>
                    <div className="form-grid">
                        <div className="form-group"><label>שנת מינימום</label><input type="number" name="minYear" value={settings.minYear ?? MIN_YEAR} onChange={(e)=>{ const v = parseInt(e.target.value || '0', 10); setSettings(prev=>({ ...prev, minYear: isNaN(v) ? MIN_YEAR : v })); }}/></div>
                        <div className="form-group"><label>שנת מקסימום</label><input type="number" name="maxYear" value={settings.maxYear ?? MAX_YEAR} onChange={(e)=>{ const v = parseInt(e.target.value || '0', 10); setSettings(prev=>({ ...prev, maxYear: isNaN(v) ? MAX_YEAR : v })); }}/></div>
                        <div className="form-group"><label>תצוגת טווח פעיל</label><input type="text" readOnly value={`${minYearStr}-01-01 → ${maxYearStr}-12-31`} /></div>
                    </div>
                </div>

                {/* ייבוא/ייצוא וכלים */}
                <div className="card">
                    <h2>ייבוא/ייצוא נתונים</h2>
                    <p style={{marginTop:0}}>בחר כיצד לייבא/לייצא נתונים. ניתן לעבוד עם קובץ אקסל או עם Google Sheets. לעבודה עם Sheets ודא שה‑APIs פעילים והוענקו הרשאות.</p>
                    <div className="settings-actions-header" style={{gap:12, flexWrap:'wrap', position:'initial'}}>
                        <button onClick={handleManualSave} title="שמור תיק" className="btn-save-inline">
                            <SaveIcon color="#34c759" />
                        </button>
                        <button className="action-btn-lg" title="ייצוא נתונים" onClick={() => {
                            setModal({
                                title: 'ייצוא נתונים',
                                message: 'בחר יעד הייצוא',
                                actions: [
                                    { label: 'Excel', value: 'excel', variant: 'primary' },
                                    { label: 'Google Sheets', value: 'sheets' },
                                    { label: 'ביטול', value: 'cancel' }
                                ],
                                onClose: async (v) => {
                                    setModal(null);
                                    if (v === 'excel') { await handleExportToExcel(); return; }
                                    if (v === 'sheets') {
                                        const token = await connectGoogleSheets();
                                        if (!token) { setModal({ title: 'שגיאה', message: 'נדרש חיבור ל‑Google Sheets.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) }); return; }
                                        let sid = settings.sheetsSpreadsheetId;
                                        if (!sid) {
                                            // הצע ליצור תבנית
                                            setModal({
                                                title: 'אין גיליון מחובר',
                                                message: 'לא נמצא מזהה גיליון בהגדרות. ליצור תבנית חדשה ולהשתמש בה?',
                                                actions: [{ label: 'לא', value: 'no' }, { label: 'כן', value: 'yes', variant: 'primary' }],
                                                onClose: async (ans) => {
                                                    setModal(null);
                                                    if (ans === 'yes') { sid = await createSheetsTemplate(token) || ''; setSettings(p=>({...p, sheetsSpreadsheetId: sid })); await exportToSheets(token, sid); }
                                                }
                                            });
                                            return;
                                        }
                                        const ok = await exportToSheets(token, sid);
                                        setModal({ title: ok ? 'הייצוא הושלם' : 'שגיאה', message: ok ? 'הנתונים נכתבו לגיליון המחובר.' : 'כתיבה לגיליון נכשלה.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
                                    }
                                }
                            });
                        }}>
                            <svg className="icon" viewBox="0 0 16 16" fill="#0070c0"><path d="M2 2h12v12H2z" fill="#fff"/><path d="M4 4h8v8H4z" fill="#0070c0"/><text x="8" y="11" textAnchor="middle" fontSize="7" fill="#fff" fontFamily="Arial">⇧</text></svg>
                            <span className="label">ייצוא נתונים</span>
                        </button>
                        <div className="helper-text">ייצוא לאקסל או ל‑Google Sheets (אם מחובר).</div>
                        <button className="action-btn-lg" title="ייבוא נתונים" onClick={() => {
                            setModal({
                                title: 'ייבוא נתונים',
                                message: 'בחר מקור ייבוא',
                                actions: [
                                    { label: 'Excel', value: 'excel', variant: 'primary' },
                                    { label: 'Google Sheets', value: 'sheets' },
                                    { label: 'ביטול', value: 'cancel' }
                                ],
                                onClose: async (v) => {
                                    setModal(null);
                                    if (v === 'excel') { importInputRef.current?.click(); return; }
                                    if (v === 'sheets') {
                                        const token = await connectGoogleSheets();
                                        if (!token) { setModal({ title: 'שגיאה', message: 'נדרש חיבור ל‑Google Sheets.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) }); return; }
                                        let sid = settings.sheetsSpreadsheetId;
                                        if (!sid) { setModal({ title: 'אין גיליון מחובר', message: 'הזן Spreadsheet ID בהגדרות או צור תבנית חדשה.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) }); return; }
                                        try { await importFromSheets(token, sid); setModal({ title: 'ייבוא הושלם', message: 'הנתונים נקראו מהגיליון המחובר.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) }); } catch (e:any) { setModal({ title: 'שגיאה', message: e?.message || 'קריאה מהגיליון נכשלה.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) }); }
                                    }
                                }
                            });
                        }}>
                            <svg className="icon" viewBox="0 0 16 16" fill="#0070c0"><path d="M2 2h12v12H2z" fill="#fff"/><path d="M4 4h8v8H4z" fill="#0070c0"/><text x="8" y="11" textAnchor="middle" fontSize="7" fill="#fff" fontFamily="Arial">⬇</text></svg>
                            <span className="label">ייבוא נתונים</span>
                        </button>
                        <div className="helper-text">ייבוא מקובץ אקסל בפורמט התבנית או מגיליון Sheets מחובר.</div>
                        <input ref={importInputRef as any} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportFromExcel} />
                        <button className="btn-export-inline" title="חיבור ל-Google Sheets" onClick={async ()=>{
                            const token = await connectGoogleSheets();
                            if (!token) {
                                setModal({ title: 'שגיאה', message: 'החיבור ל-Google Sheets נכשל. נסה שוב.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
                                return;
                            }
                            setModal({ title: 'חיבור הושלם', message: 'החיבור ל-Google Sheets בוצע בהצלחה. כעת ניתן לייצא/לייבא ישירות מהגיליון.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#0F9D58"><path d="M19 2H8c-1.1 0-2 .9-2 2v3H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2v-3h1c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 16H5V9h11v9zm3-5h-1V8c0-1.1-.9-2-2-2H8V4h11v9z"/></svg>
                        </button>
                        <button className="btn-export-inline" title="צור גיליון תבנית" onClick={async ()=>{
                            try {
                                const token = await connectGoogleSheets();
                                if (!token) { setModal({ title: 'שגיאה', message: 'נדרש חיבור ל-Google Sheets.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) }); return; }
                                const create = await googleApiRequest<any>('https://sheets.googleapis.com/v4/spreadsheets', { method: 'POST', token, body: { properties: { title: 'Stock Calculator - Template' }, sheets: [{ properties: { title: 'קניות' } }, { properties: { title: 'מכירות' } }, { properties: { title: 'הגדרות' } }] } });
                                if (!create.ok || !create.data?.spreadsheetId) throw new Error(create.errorText || 'create failed');
                                const sid = create.data.spreadsheetId as string;
                                const values = { valueInputOption: 'RAW', data: [ { range: 'קניות!A1:G1', values: [['id','stockName','price','quantity','total','commission','date']] }, { range: 'מכירות!A1:G1', values: [['id','stockName','price','quantity','total','commission','date']] }, { range: 'הגדרות!A1:D1', values: [['minCommission','commissionRate','additionalFee','taxRate']] } ] } as any;
                                const write = await googleApiRequest<any>(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values:batchUpdate`, { method: 'POST', token, body: values });
                                if (!write.ok) throw new Error(write.errorText || 'write failed');
                                setSettings(prev => ({ ...prev, sheetsSpreadsheetId: sid }));
                                setModal({ title: 'תבנית נוצרה', message: 'נוצר גיליון תבנית עם כותרות אחידות. ניתן לשתף/למלא נתונים וליבא/לייצא.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
                            } catch (e) {
                                const msg = e instanceof Error ? e.message : 'יצירת הגיליון נכשלה.';
                                setModal({ title: 'שגיאה', message: msg, actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
                            }
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#0F9D58"><path d="M3 3h18v18H3z" fill="#fff"/><path d="M7 7h10v2H7zm0 4h10v2H7zm0 4h6v2H7z" fill="#0F9D58"/></svg>
                        </button>
                    </div>
                    {showMigration && (<>
                        <div className="divider" style={{ margin: '16px 0', borderTop: '1px solid var(--border-color)' }} />
                        <div className="migrations">
                            <h3>הסבת נתונים ל-Cloud Firestore</h3>
                            <p>העברת הטרנזקציות מהמבנה הישן (מערכים במסמך משתמש) למבנה החדש (תתי-אוספים). הפעלה חד-פעמית למשתמש הנוכחי.</p>
                            <button
                              className="btn"
                              onClick={async () => {
                                try {
                                  if (!user) return;
                                  const legacy = await getUserData(user.uid);
                                  const legacyBuys = legacy?.buyTransactions || [];
                                  const legacySells = legacy?.sellTransactions || [];
                                  if (legacyBuys.length === 0 && legacySells.length === 0) {
                                    setModal({ title: 'מידע', message: 'לא נמצאו טרנזקציות להסבה.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
                                    return;
                                  }
                                  setModal({
                                    title: 'אישור הסבה',
                                    message: `יימחק הצורך במערכים במסמך המשתמש ויועברו ${legacyBuys.length} קניות ו-${legacySells.length} מכירות לתת-אוספים. האם להמשיך?`,
                                    actions: [
                                      { label: 'בטל', value: 'cancel' },
                                      { label: 'המשך', value: 'ok', variant: 'primary' }
                                    ],
                                    onClose: async (v) => {
                                      setModal(null);
                                      if (v !== 'ok') return;
                                      const { bulkImportTransactions } = await import('./data/transactions');
                                      await bulkImportTransactions(user.uid, activePortfolioId, 'buy', legacyBuys as any);
                                      await bulkImportTransactions(user.uid, activePortfolioId, 'sell', legacySells as any);
                                      setModal({ title: 'הצלחה', message: 'ההסבה הסתיימה בהצלחה! הנתונים יוצגו בזמן אמת מהמבנה החדש.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
                                      setShowMigration(false);
                                    }
                                  });
                                } catch (e) {
                                  console.error('Migration failed', e);
                                  setModal({ title: 'שגיאה', message: 'שגיאה בהסבה. נסה שוב.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
                                }
                              }}
                            >הסב נתונים למבנה החדש</button>
                        </div>
                    </>)}
                </div>
            </div>
        );
    };

    // --- Main Render Logic ---
    if (isLoading) {
        return (
            <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <h1>מחשבון מניות</h1>
                    <p>
                        התחבר עם Google כדי להתחיל לנהל את תיק המניות שלך
                    </p>
                    <button 
                        onClick={handleSignIn}
                        className="google-signin-btn"
                    >
                        <svg viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        התחבר עם Google
                    </button>
                </div>
            </div>
        );
    }

    

    return (
        <div className="app-container">
            <header className="app-header">
        {modal && (
          <Modal
            title={modal.title}
            message={modal.message}
            actions={modal.actions}
            withInput={modal.withInput}
            inputLabel={modal.inputLabel}
            inputPlaceholder={modal.inputPlaceholder}
            inputDefaultValue={modal.inputDefaultValue}
            onClose={(v, text) => modal.onClose ? modal.onClose(v, text) : setModal(null)}
          />
        )}
                {isOffline && (
                  <div className="offline-banner">אתה במצב אופליין (קריאה בלבד). שינויים יסתנכרנו כשיהיה חיבור.</div>
                )}
                <div className="brand">
                  <AppLogo />
                <h1>מחשבון רווח והפסד למניות</h1>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: 700 }}>תיק פעיל:</label>
                  <select value={activePortfolioId} onChange={(e) => {
                    const next = e.target.value || 'default';
                    setActivePortfolioId(next);
                  }}>
                    {portfolios.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button className="filter-btn" onClick={async () => {
                    if (!user) return;
                    setModal({
                      title: 'תיק חדש',
                      message: '',
                      withInput: true,
                      inputLabel: 'שם התיק החדש',
                      inputPlaceholder: 'למשל: חשבון מסחר',
                      actions: [
                        { label: 'בטל', value: 'cancel' },
                        { label: 'צור', value: 'ok', variant: 'primary' }
                      ],
                      onClose: async (v, text) => {
                        setModal(null);
                        if (v !== 'ok') return;
                        const name = (text || '').trim();
                        if (!name) return;
                        const id = await createPortfolio(user.uid, name);
                        setActivePortfolioId(id);
                      }
                    });
                  }}>תיק חדש</button>
                  <button className="filter-btn" onClick={async () => {
                    if (!user) return;
                    const p = portfolios.find(p => p.id === activePortfolioId);
                    if (!p) return;
                    setModal({
                      title: 'שינוי שם תיק',
                      message: '',
                      withInput: true,
                      inputLabel: `שם חדש לתיק "${p.name}"`,
                      inputDefaultValue: p.name,
                      actions: [
                        { label: 'בטל', value: 'cancel' },
                        { label: 'שמור', value: 'ok', variant: 'primary' }
                      ],
                      onClose: async (v, text) => {
                        setModal(null);
                        if (v !== 'ok') return;
                        const name = (text || '').trim();
                        if (!name) return;
                        await renamePortfolio(user.uid, activePortfolioId, name);
                      }
                    });
                  }}>שנה שם</button>
                  <button className="filter-btn" onClick={async () => {
                    if (!user) return;
                    const p = portfolios.find(p => p.id === activePortfolioId);
                    if (!p) return;
                    setModal({
                      title: 'ניהול תיק',
                      message: `בחר פעולה על התיק "${p.name}":`,
                      actions: [
                        { label: 'נקה תוכן', value: 'clear' },
                        { label: 'מחק תיק', value: 'delete', variant: 'danger' },
                        { label: 'בטל', value: 'cancel' }
                      ],
                      onClose: async (v) => {
                        setModal(null);
                        if (v === 'clear') {
                          const { clearPortfolio } = await import('./data/portfolios');
                          await clearPortfolio(user.uid!, activePortfolioId);
                          return;
                        }
                        if (v === 'delete') {
                          await deletePortfolio(user.uid!, activePortfolioId);
                          const next = portfolios.find(x => x.id !== activePortfolioId) || { id: 'default', name: 'ברירת מחדל' };
                          setActivePortfolioId(next.id);
                        }
                      }
                    });
                    // בחירה אוטומטית בתיק הראשון שנשאר
                    const next = portfolios.find(x => x.id !== activePortfolioId) || { id: 'default', name: 'ברירת מחדל' };
                    setActivePortfolioId(next.id);
                  }}>מחק תיק</button>
                  
                </div>
                <div className="user-info">
                    <span className="user-name">{user.displayName || user.email}</span>
                    <button 
                        onClick={(e) => {
                            
                            e.preventDefault();
                            e.stopPropagation();
                            handleSignOut();
                        }}
                        className="signout-btn"
                        title="התנתק"
                    >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 3a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5v-2A.5.5 0 0 1 4 3h4zM4 4.5v1h3v-1H4z"/>
                            <path d="M7 9.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-2z"/>
                            <path d="M1.5 14.5A1.5 1.5 0 0 1 0 13V3a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 11 3v1.5a.5.5 0 0 1-1 0V3a.5.5 0 0 0-.5-.5h-8A.5.5 0 0 0 1 3v10a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-1.5a.5.5 0 0 1 1 0V13a1.5 1.5 0 0 1-1.5 1.5h-8z"/>
                        </svg>
                    </button>
                </div>
            </header>
            {/* Tabs navigation */}
            <TabNav
              currentView={(view === 'stockDetail' ? 'dashboard' : view) as MainView}
              onChange={(next) => setView(next)}
            />
            <main>
                {view === 'dashboard' && renderDashboard()}
                {view === 'stockDetail' && renderStockDetail()}
                {view === 'performance' && renderPerformancePage()}
                {view === 'analytics' && renderAnalyticsPage()}
                {view === 'settings' && renderSettingsPage()}
            </main>
            {/* הגדרות עברו ללשונית ייעודית */}
            
            {/* Theme toggle moved into Settings page */}
            

            
            {tooltip.visible && (
                <div className="tooltip" style={{ left: tooltip.x, top: tooltip.y }} dangerouslySetInnerHTML={{ __html: tooltip.content }} />
            )}
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
