import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import * as XLSX from 'xlsx';
import { signInWithGoogle, signOutUser, getCurrentUser, saveUserData, getUserData, onAuthStateChange, fetchQuotesViaFunction } from './firebase-config';
import { Modal } from './components/Modal';
import { listenTransactions, upsertTransaction, deleteTransaction, hasAnyTransactions } from './data/transactions';
// Sharing features removed for now
import { listenPortfolios, createPortfolio, renamePortfolio, deletePortfolio } from './data/portfolios';
import { stockList as STOCK_LIST_BUNDLED } from './כללי/stockList';
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
    { s: 'COINBASE:BTCUSD', alt: 'BINANCE:BTCUSDT', d: 'Bitcoin' },
    { s: 'AMEX:IWM', d: 'Russell 2000' }
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
          {symbols.map(sym => (
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
}

interface StockSummary {
    totalBuyQuantity: number;
    totalSellQuantity: number;
    remainingQuantity: number;
    weightedAvgBuyPrice: number; // Pure price average
    weightedAvgCostBasis: number; // Price + commission average
    totalBuyCost: number;
    totalCommissions: number;
    realizedGrossPnl: number;
    realizedNetPnl: number;
    roi: number;
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

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00Z');
    return new Intl.DateTimeFormat('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
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
    const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
    const [modal, setModal] = useState<null | { title?: string; message: any; actions: Array<{ label: string; value: string; variant?: 'primary' | 'danger' | 'default' }>; onClose?: (v: string | null) => void }>(null);
    
    // Simple cache for stock prices (5 minutes)
    const priceCache = useRef<Record<string, { price: number; timestamp: number }>>({});
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // Auth management (lightweight): set user and load settings + handle share token
    useEffect(() => {
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
        try {
            // Try Firestore first
            const userData = await getUserData(userId);
            if (userData) {
                setSettings(userData.settings || settings);
                return;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
        // Fallback to local backup if Firestore unavailable or empty
        try {
            const localRaw = localStorage.getItem(`portfolio_backup_${userId}`);
            if (localRaw) {
                const localData = JSON.parse(localRaw);
                if (localData.settings) setSettings(localData.settings);
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
                await saveUserData(user.uid, payload);
            try { localStorage.setItem(`portfolio_settings_${user.uid}`, JSON.stringify(payload)); } catch {}
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
            await signInWithGoogle();
        } catch (error) {
            console.error('Error signing in:', error);
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
            await signOutUser();
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
          date: String(row.date || row['date'] || row['תאריך'] || ''),
        }));
        const sell: Transaction[] = sellRaw.map((row: any) => ({
          id: Number(row.id) || Date.now(),
          stockName: String(row.stockName || row['stockName'] || row['שם מניה'] || ''),
          price: Number(row.price || row['price'] || row['מחיר'] || 0),
          quantity: Number(row.quantity || row['quantity'] || row['כמות'] || 0),
          total: Number(row.total || row['total'] || row['סך הכל'] || 0),
          commission: Number(row.commission || row['commission'] || row['עמלה'] || 0),
          date: String(row.date || row['date'] || row['תאריך'] || ''),
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
    const [isBuyFormVisible, setIsBuyFormVisible] = useState(false);
    const [isFetchingPrice, setIsFetchingPrice] = useState<boolean>(false);


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
            totalCommissions: 0,
            realizedGrossPnl: 0,
            realizedNetPnl: 0,
            roi: 0,
        };
        if (!stockName) return initialSummary;

        const buysForStock = buyTransactions
            .filter(t => t.stockName === stockName)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const sellsForStock = sellTransactions
            .filter(t => t.stockName === stockName)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const totalBuyQuantity = buysForStock.reduce((sum, t) => sum + t.quantity, 0);
        const totalSellQuantity = sellsForStock.reduce((sum, t) => sum + t.quantity, 0);

        const totalBuyValue = buysForStock.reduce((sum, t) => sum + (t.price * t.quantity), 0);
        const totalBuyCommissions = buysForStock.reduce((sum, t) => sum + t.commission, 0);
        const totalBuyCost = totalBuyValue + totalBuyCommissions;
        
        // Build FIFO buy lots with remaining quantities and per-share cost basis (including allocated buy commission)
        type BuyLot = { remaining: number; pricePerShare: number; costBasisPerShare: number };
        const buyLots: BuyLot[] = buysForStock.map(buy => ({
            remaining: buy.quantity,
            pricePerShare: buy.price,
            costBasisPerShare: (buy.price * buy.quantity + buy.commission) / buy.quantity,
        }));

        let totalSellValue = 0;
        let costOfSoldShares = 0; // Based on FIFO cost basis (including allocated buy commissions)

        for (const sell of sellsForStock) {
            let remainingToMatch = sell.quantity;
            totalSellValue += sell.total; // price * quantity
            for (const lot of buyLots) {
                if (remainingToMatch <= 0) break;
                if (lot.remaining <= 0) continue;
                const qtyTaken = Math.min(lot.remaining, remainingToMatch);
                costOfSoldShares += lot.costBasisPerShare * qtyTaken;
                lot.remaining -= qtyTaken;
                remainingToMatch -= qtyTaken;
            }
        }

        const remainingQuantity = buyLots.reduce((sum, lot) => sum + lot.remaining, 0);
        const remainingPriceValue = buyLots.reduce((sum, lot) => sum + lot.pricePerShare * lot.remaining, 0);
        const remainingCostBasisValue = buyLots.reduce((sum, lot) => sum + lot.costBasisPerShare * lot.remaining, 0);

        const weightedAvgBuyPrice = remainingQuantity > 0 ? (remainingPriceValue / remainingQuantity) : 0;
        const weightedAvgCostBasis = remainingQuantity > 0 ? (remainingCostBasisValue / remainingQuantity) : 0;

        const realizedGrossPnl = totalSellValue - costOfSoldShares; // Commissions are tracked separately
        const totalSellCommissions = sellsForStock.reduce((sum, t) => sum + t.commission, 0);
        const totalCommissions = totalBuyCommissions + totalSellCommissions;
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
            totalCommissions,
            realizedGrossPnl,
            realizedNetPnl,
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
                    totalBuyCost: summary.weightedAvgBuyPrice * summary.totalSellQuantity,
                    totalSellValue: summary.realizedGrossPnl + summary.weightedAvgBuyPrice * summary.totalSellQuantity,
                    realizedPnl: summary.realizedNetPnl,
                    realizedPnlPercent: summary.roi
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

        if (!stockName || isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0 || !buyDate) return;

        const total = price * quantity;
        const commission = calculateCommission(total);
        
        const newTx: Transaction = { id: editingId || Date.now(), stockName, price, quantity, total, commission, date: buyDate };
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
        if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0 || quantity > activeStockSummary.remainingQuantity) return;
    
        const total = price * quantity;
        const commission = calculateCommission(total);
        const newTransaction: Transaction = { id: Date.now(), stockName: activeStock, price, quantity, total, commission, date: new Date().toISOString().split('T')[0] };
    
        setSellTransactions(prev => [...prev, newTransaction]);
        if (user) { void upsertTransaction(user.uid, activePortfolioId, 'sell', newTransaction as any); }
        setSellPrice('');
        setSellQuantity('');
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
            console.log('Fetching price for:', stockSymbol);
            const response = await fetch(
                `https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${stockSymbol}?interval=1d&range=1d`,
                { signal: controller.signal }
            );
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            clearTimeout(timeoutId);
            console.log('API response:', data);
            const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (price && price > 0) {
                console.log('Price found:', price);
                priceCache.current[stockSymbol] = { price, timestamp: Date.now() };
                setBuyPrice(String(price));
                setIsFetchingPrice(false);
                return;
            } else {
                console.log('No valid price found in response');
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
                    const response = await fetch(
                        `https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${stock}?interval=1d&range=1d`,
                        { signal: controller.signal }
                    );
                    if (response.ok) {
                        const data = await response.json();
                        clearTimeout(timeoutId);
                        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
                        if (price && price > 0) {
                            priceCache.current[stock] = { price, timestamp: Date.now() };
                            return { stock, price };
                        }
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
            setCurrentStockPrices(priceData);
        } catch (error) {
            setModal({ title: 'שגיאה', message: 'שגיאה בעת טעינת מחירי מניות.', actions: [{ label: 'סגור', value: 'ok', variant: 'primary' }], onClose: () => setModal(null) });
        } finally {
            setIsFetchingCurrentPrices(false);
        }
    }, [allSummaries]);

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
                            <div className="label">שווי אחזקות</div>
                            <div className="value">
                                <span className="financial-number">
                                    {dashboardFilter === 'open' 
                                        ? formatCurrency(openTransactions.reduce((sum, t) => sum + t.totalCost, 0))
                                        : formatCurrency(closedTransactions.reduce((sum, t) => sum + t.totalBuyCost, 0))
                                    }
                                </span>
                            </div>
                        </div>
                        <div className="summary-item">
                            <div className="label">רווח/הפסד (%)</div>
                            <div className={`value ${pnlClass(dashboardFilter === 'open' ? 
                                openTransactions.reduce((sum, t) => sum + t.unrealizedPnlPercent, 0) / Math.max(openTransactions.length, 1) :
                                closedTransactions.reduce((sum, t) => sum + t.realizedPnlPercent, 0) / Math.max(closedTransactions.length, 1)
                            )}`}>
                                <span className="financial-number">
                                    {dashboardFilter === 'open' 
                                        ? (() => {
                                            const value = openTransactions.reduce((sum, t) => sum + t.unrealizedPnlPercent, 0) / Math.max(openTransactions.length, 1);
                                            return value < 0 ? `${Math.abs(value).toFixed(2)}% -` : `${value.toFixed(2)}%`;
                                        })()
                                        : (() => {
                                            const value = closedTransactions.reduce((sum, t) => sum + t.realizedPnlPercent, 0) / Math.max(closedTransactions.length, 1);
                                            return value < 0 ? `${Math.abs(value).toFixed(2)}% -` : `${value.toFixed(2)}%`;
                                        })()
                                    }
                                </span>
                            </div>
                        </div>
                        <div className="summary-item">
                            <div className="label">רווח/הפסד ($)</div>
                            <div className={`value ${pnlClass(dashboardFilter === 'open' ? 
                                openTransactions.reduce((sum, t) => sum + t.unrealizedPnl, 0) :
                                closedTransactions.reduce((sum, t) => sum + t.realizedPnl, 0)
                            )}`}>
                                <span className="financial-number">
                                    {dashboardFilter === 'open' 
                                        ? (() => {
                                            const value = openTransactions.reduce((sum, t) => sum + t.unrealizedPnl, 0);
                                            return value < 0 ? `${formatCurrency(Math.abs(value))} -` : formatCurrency(value);
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
                                    <th>
                                        <button type="button" className="th-sort-btn" onClick={() => requestSort('quantity')}>
                                            <span>כמות מניות</span> <SortIndicator columnKey="quantity" />
                                        </button>
                                    </th>
                                    <th>
                                        <button type="button" className="th-sort-btn" onClick={() => requestSort(dashboardFilter === 'open' ? 'avgPrice' : 'avgBuyPrice')}>
                                            <span>מחיר ממוצע</span> <SortIndicator columnKey={dashboardFilter === 'open' ? 'avgPrice' : 'avgBuyPrice'} />
                                        </button>
                                    </th>
                                    <th>
                                        <button type="button" className="th-sort-btn" onClick={() => requestSort(dashboardFilter === 'open' ? 'totalCost' : 'totalBuyCost')}>
                                            <span>עלות כוללת ($)</span> <SortIndicator columnKey={dashboardFilter === 'open' ? 'totalCost' : 'totalBuyCost'} />
                                        </button>
                                    </th>
                                    {dashboardFilter === 'open' ? (
                                        <>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('currentValue')}>
                                                    <span>שווי נוכחי ($)</span> <SortIndicator columnKey="currentValue" />
                                                </button>
                                            </th>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('currentPrice')}>
                                                    <span>מחיר נוכחי</span> <SortIndicator columnKey="currentPrice" />
                                                </button>
                                            </th>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('unrealizedPnlPercent')}>
                                                    <span>סה"כ רווח (%)</span> <SortIndicator columnKey="unrealizedPnlPercent" />
                                                </button>
                                            </th>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('unrealizedPnl')}>
                                                    <span>סה"כ רווח ($)</span> <SortIndicator columnKey="unrealizedPnl" />
                                                </button>
                                            </th>
                                        </>
                                    ) : (
                                        <>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('totalSellValue')}>
                                                    <span>שווי מכירה ($)</span> <SortIndicator columnKey="totalSellValue" />
                                                </button>
                                            </th>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('avgSellPrice')}>
                                                    <span>מחיר מכירה ממוצע</span> <SortIndicator columnKey="avgSellPrice" />
                                                </button>
                                            </th>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('realizedPnlPercent')}>
                                                    <span>סה"כ רווח (%)</span> <SortIndicator columnKey="realizedPnlPercent" />
                                                </button>
                                            </th>
                                            <th>
                                                <button type="button" className="th-sort-btn" onClick={() => requestSort('realizedPnl')}>
                                                    <span>סה"כ רווח ($)</span> <SortIndicator columnKey="realizedPnl" />
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
                                                    <td>{transaction.quantity}</td>
                                                    <td>{formatCurrency(transaction.avgBuyPrice)}</td>
                                                    <td>{formatCurrency(transaction.totalBuyCost)}</td>
                                                    <td>{formatCurrency(transaction.totalSellValue)}</td>
                                                    <td>{formatCurrency(transaction.avgSellPrice)}</td>
                                                    <td className={pnlClass(transaction.realizedPnlPercent)}>{transaction.realizedPnlPercent < 0 ? `${Math.abs(transaction.realizedPnlPercent).toFixed(2)}% -` : `${transaction.realizedPnlPercent.toFixed(2)}%`}</td>
                                                    <td className={pnlClass(transaction.realizedPnl)}>{transaction.realizedPnl < 0 ? `${formatCurrency(Math.abs(transaction.realizedPnl))} -` : formatCurrency(transaction.realizedPnl)}</td>
                                                </tr>
                                            );
                                        }
                                    })
                                 ) : (
                                    <tr>
                                        <td colSpan={8}>
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
            <div className="form-group"><label htmlFor="buy-date">תאריך</label><input id="buy-date" className="date-input" type="date" value={buyDate} onChange={e => setBuyDate(e.target.value)} /></div>
            <button onClick={handleSaveBuy} disabled={!buyPrice || !buyQuantity || !buyDate}><PlusIcon/> הוסף קנייה</button>
        </div>
    ); };

    const renderStockDetail = () => {
        const buysForActiveStock = activeStock ? buyTransactions.filter(t => t.stockName === activeStock) : [];
        const sellsForActiveStock = activeStock ? sellTransactions.filter(t => t.stockName === activeStock) : [];

        const isInSelectedRange = (dateString: string) => {
            if (dateRange === 'all') return true;
            const d = new Date(dateString);
            const now = new Date();
            const start = new Date(now);
            if (dateRange === 'week') start.setDate(now.getDate() - 7);
            if (dateRange === 'month') start.setMonth(now.getMonth() - 1);
            if (dateRange === 'quarter') start.setMonth(now.getMonth() - 3);
            if (dateRange === 'year') start.setFullYear(now.getFullYear() - 1);
            if (dateRange === 'custom') {
                if (!customStart && !customEnd) return true;
                const s = customStart ? new Date(customStart) : new Date('1970-01-01');
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
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(b => ({
                id: b.id,
                remaining: b.quantity,
                costBasisPerShare: (b.price * b.quantity + b.commission) / b.quantity,
                pricePerShare: b.price,
                date: b.date,
            }));

        const sellsSorted = sellsFiltered
            .slice()
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const perSellRealized = sellsSorted.map(s => {
            let qtyToMatch = s.quantity;
            let allocatedCost = 0;
            for (const lot of buysSorted) {
                if (qtyToMatch <= 0) break;
                if (lot.remaining <= 0) continue;
                const taken = Math.min(lot.remaining, qtyToMatch);
                allocatedCost += taken * lot.costBasisPerShare;
                lot.remaining -= taken;
                qtyToMatch -= taken;
            }
            const proceeds = s.price * s.quantity;
            const realizedGross = proceeds - allocatedCost;
            const realizedNet = realizedGross - s.commission;
            const realizedPercent = allocatedCost > 0 ? (realizedNet / allocatedCost) * 100 : 0;
            return {
                id: s.id,
                date: s.date,
                price: s.price,
                quantity: s.quantity,
                commission: s.commission,
                totalProceeds: proceeds,
                realizedNet,
                realizedPercent,
            };
        });

        const remainingByBuyId: Record<number, number> = buysSorted.reduce((acc, lot) => {
            acc[lot.id] = lot.remaining;
            return acc;
        }, {} as Record<number, number>);

        const currentPrice = activeStock ? currentStockPrices[activeStock] : undefined;

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
            const realizedGrossPnl = totalSellValue - (totalSellQuantity > 0 ? (totalSellQuantity * ((totalBuyValue + totalBuyCommissions) / Math.max(totalBuyQuantity,1))) : 0);
            const totalSellCommissions = sellsFiltered.reduce((sum, t) => sum + t.commission, 0);
            const totalCommissions = totalBuyCommissions + totalSellCommissions;
            const taxOnProfit = realizedGrossPnl > 0 ? realizedGrossPnl * settings.taxRate : 0;
            const realizedNetPnl = realizedGrossPnl - taxOnProfit;
            const totalInvestedForSold = totalSellQuantity > 0 ? (totalSellQuantity * weightedAvgCostBasis) : 0;
            const roi = totalInvestedForSold > 0 ? (realizedGrossPnl / totalInvestedForSold) * 100 : 0;
            return { totalBuyQuantity, totalSellQuantity, remainingQuantity: remainingQty, weightedAvgBuyPrice, weightedAvgCostBasis, totalBuyCost, totalCommissions, realizedGrossPnl, realizedNetPnl, roi };
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
                        <div className="summary-item"><div className="label">מחיר קנייה ממוצע למניה</div><div className="value"><span className="financial-number">{formatCurrency(filteredSummary.weightedAvgBuyPrice)}</span></div></div>
                        <div className="summary-item"><div className="label">מניות ביתרה</div><div className="value">{filteredSummary.remainingQuantity} / {filteredSummary.totalBuyQuantity}</div></div>
                        <div className="summary-item"><div className="label">סה"כ עלות קנייה</div><div className="value"><span className="financial-number">{formatCurrency(filteredSummary.totalBuyCost)}</span></div></div>
                        <div className="summary-item"><div className="label">סה"כ עמלות</div><div className="value"><span className="financial-number">{formatCurrency(filteredSummary.totalCommissions)}</span></div></div>
                        <div className="summary-item"><div className="label">רווח/הפסד ממומש (ברוטו)</div><div className={`value ${pnlClass(filteredSummary.realizedGrossPnl)}`}><span className="financial-number">{filteredSummary.realizedGrossPnl < 0 ? `${formatCurrency(Math.abs(filteredSummary.realizedGrossPnl))} -` : formatCurrency(filteredSummary.realizedGrossPnl)}</span></div></div>
                        <div className="summary-item"><div className="label">רווח/הפסד ממומש (נטו, אחרי מס)</div><div className={`value ${pnlClass(filteredSummary.realizedNetPnl)}`}><span className="financial-number">{filteredSummary.realizedNetPnl < 0 ? `${formatCurrency(Math.abs(filteredSummary.realizedNetPnl))} -` : formatCurrency(filteredSummary.realizedNetPnl)}</span></div></div>
                        <div className="summary-item"><div className="label">תשואה על ההשקעה (ROI)</div><div className={`value ${pnlClass(filteredSummary.roi)}`}><span className="financial-number">{filteredSummary.roi < 0 ? `${Math.abs(filteredSummary.roi).toFixed(2)}% -` : `${filteredSummary.roi.toFixed(2)}%`}</span></div></div>
                    </div>
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
                            <input id="custom-start" type="date" className="date-input" value={customStart} onChange={e=>{ setCustomStart(e.target.value); setDateRange('custom'); }} />
                            <label htmlFor="custom-end">עד:</label>
                            <input id="custom-end" type="date" className="date-input" value={customEnd} onChange={e=>{ setCustomEnd(e.target.value); setDateRange('custom'); }} />
                        </div>
                    </div>
                </div>
                
                <div className="card">
                      <div className="card-header-with-action" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                        <h2>היסטוריית קניות</h2>
                         <div className="dashboard-filter-tabs">
                            <button className={`filter-btn ${buyHistoryFilter === 'all' ? 'active' : ''}`} onClick={() => setBuyHistoryFilter('all')}>הכול</button>
                            <button className={`filter-btn ${buyHistoryFilter === 'unsold' ? 'active' : ''}`} onClick={() => setBuyHistoryFilter('unsold')}>יתרה</button>
                            <button className={`filter-btn ${buyHistoryFilter === 'sold' ? 'active' : ''}`} onClick={() => setBuyHistoryFilter('sold')}>נמכר</button>
                         </div>
                     </div>

                      {renderBuyMoreForm()}
                     
                     {buysForActiveStock.length > 0 && (
                        <div className="transactions-list">
                            <table className="transactions-table">
                                <thead><tr><th>תאריך</th><th>מחיר</th><th>כמות</th><th>עלות כוללת ($)</th><th>עמלה</th><th>רווח נוכחי ($)</th><th>רווח נוכחי (%)</th><th>פעולות</th></tr></thead>
                                <tbody>
                                      {buysForActiveStock
                                        .filter(t => {
                                            const remaining = remainingByBuyId[t.id] ?? t.quantity;
                                            if (buyHistoryFilter === 'unsold') return remaining > 0;
                                            if (buyHistoryFilter === 'sold') return remaining === 0;
                                            return true;
                                        })
                                         .filter(t => {
                                            if (dateRange === 'all') return true;
                                            const d = new Date(t.date);
                                            const now = new Date();
                                            const start = new Date(now);
                                            if (dateRange === 'week') start.setDate(now.getDate() - 7);
                                            if (dateRange === 'month') start.setMonth(now.getMonth() - 1);
                                            if (dateRange === 'quarter') start.setMonth(now.getMonth() - 3);
                                            if (dateRange === 'year') start.setFullYear(now.getFullYear() - 1);
                                            if (dateRange === 'custom') {
                                                if (!customStart && !customEnd) return true;
                                                const s = customStart ? new Date(customStart) : new Date('1970-01-01');
                                                const e = customEnd ? new Date(customEnd) : now;
                                                return d >= s && d <= e;
                                            }
                                            return d >= start && d <= now;
                                         })
                                        .map(t => {
                                        const remaining = remainingByBuyId[t.id] ?? t.quantity;
                                        const totalCost = t.price * t.quantity + t.commission;
                                        const costBasisPerShare = totalCost / t.quantity;
                                        const marketPrice = currentPrice || 0;
                                        const currentValue = marketPrice > 0 ? remaining * marketPrice : null;
                                        const currentCost = remaining * costBasisPerShare;
                                        const unrealizedNet = currentValue !== null ? (currentValue - currentCost) : null;
                                        const unrealizedPercent = currentValue !== null && currentCost > 0 ? (unrealizedNet! / currentCost) * 100 : null;
                                        return (
                                            <tr key={t.id}>
                                        <td>{formatDate(t.date)}</td>
                                        <td><span className="financial-number">{formatCurrency(t.price)}</span></td>
                                                <td>{remaining}</td>
                                                <td><span className="financial-number">{formatCurrency(totalCost)}</span></td>
                                        <td><span className="financial-number">{formatCurrency(t.commission)}</span></td>
                                                <td className={unrealizedNet !== null ? pnlClass(unrealizedNet) : ''}>
                                                    <span className="financial-number">{unrealizedNet !== null ? formatCurrency(unrealizedNet) : '---'}</span>
                                                </td>
                                                <td className={unrealizedNet !== null ? pnlClass(unrealizedNet) : ''}>
                                                    {unrealizedPercent !== null ? `${unrealizedPercent.toFixed(2)}%` : '---'}
                                                </td>
                                        <td className="actions-cell">
                                            <button className="edit-btn" title="ערוך" onClick={() => handleStartEdit(t)}><EditIcon /></button>
                                            <button className="delete-btn" title="מחק" onClick={() => handleDeleteBuy(t.id)}><DeleteIcon /></button>
                                        </td>
                                            </tr>
                                        );
                                     })}
                                     {(() => {
                                        const rows = buysForActiveStock
                                          .filter(t => {
                                            const remaining = remainingByBuyId[t.id] ?? t.quantity;
                                            if (buyHistoryFilter === 'unsold') return remaining > 0;
                                            if (buyHistoryFilter === 'sold') return remaining === 0;
                                            return true;
                                          });
                                        const totalRemaining = rows.reduce((s,t)=> s + (remainingByBuyId[t.id] ?? t.quantity),0);
                                        const totalCostAll = rows.reduce((s,t)=> s + (t.price * t.quantity + t.commission),0);
                                        const totalUnrealized = rows.reduce((s,t)=>{
                                            const remaining = remainingByBuyId[t.id] ?? t.quantity;
                                            const cbps = (t.price * t.quantity + t.commission) / t.quantity;
                                            const cv = currentPrice ? remaining * currentPrice : 0;
                                            const cc = remaining * cbps;
                                            return s + (currentPrice ? (cv - cc) : 0);
                                        },0);
                                        return (
                                            <tr className="summary-row">
                                                <td>סיכום</td>
                                                <td></td>
                                                <td>{totalRemaining}</td>
                                                <td><span className="financial-number">{formatCurrency(totalCostAll)}</span></td>
                                                <td></td>
                                                <td className={pnlClass(totalUnrealized)}><span className="financial-number">{currentPrice ? formatCurrency(totalUnrealized) : '---'}</span></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        );
                                     })()}
                                </tbody>
                            </table>
                        </div>
                     )}
                     {buysForActiveStock.length === 0 && !isBuyFormVisible && (
                        <p>אין היסטוריית קניות עבור מניה זו.</p>
                     )}
                </div>

                <div className="card">
                    <h2>היסטוריית מכירות</h2>
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
                        <button onClick={handleAddSell} disabled={!sellPrice || !sellQuantity || activeStockSummary.remainingQuantity <= 0 || parseInt(sellQuantity, 10) > activeStockSummary.remainingQuantity}><PlusIcon/> הוסף מכירה</button>
                    </div>
                    {sellsForActiveStock.length > 0 && <div className="transactions-list">
                        <table className="transactions-table">
                            <thead><tr><th>תאריך</th><th>מחיר</th><th>כמות</th><th>עלות כוללת ($)</th><th>עמלה</th><th>רווח ממומש ($)</th><th>רווח ממומש (%)</th><th>פעולות</th></tr></thead>
                            <tbody>
                                {perSellRealized.map(r => (
                                    <tr key={r.id}>
                                        <td>{formatDate(r.date)}</td>
                                        <td><span className="financial-number">{formatCurrency(r.price)}</span></td>
                                        <td>{r.quantity}</td>
                                        <td><span className="financial-number">{formatCurrency(r.totalProceeds)}</span></td>
                                        <td><span className="financial-number">{formatCurrency(r.commission)}</span></td>
                                        <td className={pnlClass(r.realizedNet)}><span className="financial-number">{formatCurrency(r.realizedNet)}</span></td>
                                        <td className={pnlClass(r.realizedNet)}>{r.realizedPercent.toFixed(2)}%</td>
                                        <td className="actions-cell">
                                            <button className="delete-btn" title="מחק" onClick={() => handleDeleteSell(r.id)}><DeleteIcon /></button>
                                        </td>
                                    </tr>
                                ))}
                                {perSellRealized.length > 0 && (
                                    <tr className="summary-row">
                                        <td>סיכום</td>
                                        <td></td>
                                        <td>{perSellRealized.reduce((s, r) => s + r.quantity, 0)}</td>
                                        <td><span className="financial-number">{formatCurrency(perSellRealized.reduce((s, r) => s + r.totalProceeds, 0))}</span></td>
                                        <td><span className="financial-number">{formatCurrency(perSellRealized.reduce((s, r) => s + r.commission, 0))}</span></td>
                                        <td className={pnlClass(perSellRealized.reduce((s, r) => s + r.realizedNet, 0))}><span className="financial-number">{formatCurrency(perSellRealized.reduce((s, r) => s + r.realizedNet, 0))}</span></td>
                                        <td></td>
                                        <td></td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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
        const d = new Date(s.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const realizedNet = Number(((s as any).realizedNet) ?? 0);
        map.set(key, (map.get(key) || 0) + realizedNet);
      }
      const now = new Date();
      const out: Array<{ key: string; label: string; value: number }> = [];
      for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
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
            weightedBuyDateMs += take * new Date(lot.date).getTime();
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
            holdingDays = Math.max(0, Math.round((new Date(s.date).getTime() - avgBuyTime) / (1000 * 60 * 60 * 24)));
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
                    <th>עלות כוללת ($)</th>
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
                    <th>עלות כוללת ($)</th>
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
        return (
            <div className="settings-page">
                <div className="card">
                    <h2>הגדרות וכלים</h2>
                    <div className="form-grid">
                        <div className="form-group"><label>עמלת מינימום ($)</label><input type="number" name="minCommission" value={settings.minCommission} onChange={handleSettingsChange}/></div>
                        <div className="form-group"><label>שיעור עמלה (%)</label><input type="number" name="commissionRate" value={settings.commissionRate * 100} onChange={handleSettingsChange}/></div>
                        <div className="form-group"><label>עמלה נוספת ($)</label><input type="number" name="additionalFee" value={settings.additionalFee} onChange={handleSettingsChange}/></div>
                        <div className="form-group"><label>שיעור מס רווחי הון (%)</label><input type="number" name="taxRate" value={settings.taxRate * 100} onChange={handleSettingsChange}/></div>
                        <div className="form-group">
                            <label>ערכת צבע</label>
                            <select value={isDarkTheme ? 'dark' : 'light'} onChange={(e) => setIsDarkTheme(e.target.value === 'dark')}>
                                <option value="light">בהיר</option>
                                <option value="dark">כהה</option>
                            </select>
                        </div>
                    </div>
                    <div className="settings-actions-header">
                        <button onClick={handleManualSave} title="שמור תיק" className="btn-save-inline">
                            <SaveIcon color="#34c759" />
                        </button>
                        <button className="btn-export-inline" title="ייצוא לאקסל" onClick={handleExportToExcel}>
                            <svg width="18" height="18" fill="#0070c0" viewBox="0 0 16 16"><path d="M2 2h12v12H2z" fill="#fff"/><path d="M4 4h8v8H4z" fill="#0070c0"/><text x="8" y="11" textAnchor="middle" fontSize="7" fill="#fff" fontFamily="Arial">X</text></svg>
                        </button>
                        <label className="btn-export-inline" title="ייבוא מאקסל">
                            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportFromExcel} />
                            <svg width="18" height="18" fill="#0070c0" viewBox="0 0 16 16"><path d="M2 2h12v12H2z" fill="#fff"/><path d="M4 4h8v8H4z" fill="#0070c0"/><text x="8" y="11" textAnchor="middle" fontSize="7" fill="#fff" fontFamily="Arial">⇧</text></svg>
                        </label>
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
                            console.log('Sign out button clicked!');
                            console.log('Event type:', e.type);
                            console.log('Event target:', e.target);
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
