import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import * as XLSX from 'xlsx';
import { signInWithGoogle, signOutUser, getCurrentUser, saveUserData, getUserData, onAuthStateChange } from './firebase-config';

const FMP_API_KEY = "PhCBdZp7W35LO6fdsBBk2nFUOZNRuM6z";

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

    const [buyTransactions, setBuyTransactions] = useState<Transaction[]>([]);
    const [sellTransactions, setSellTransactions] = useState<Transaction[]>([]);
    const [isUpdatingStocks, setIsUpdatingStocks] = useState<boolean>(false);
    const [currentStockPrices, setCurrentStockPrices] = useState<Record<string, number>>({});
    const [isFetchingCurrentPrices, setIsFetchingCurrentPrices] = useState<boolean>(false);
    
    // Simple cache for stock prices (5 minutes)
    const priceCache = useRef<Record<string, { price: number; timestamp: number }>>({});
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // Auth management
    useEffect(() => {
        const unsubscribe = onAuthStateChange((user) => {
            setUser(user);
            setIsLoading(false);
            
            if (user) {
                // Load user data from Firestore
                loadUserData(user.uid);
            } else {
                // Clear data when user signs out
                setBuyTransactions([]);
                setSellTransactions([]);
            }
        });

        return () => unsubscribe();
    }, []);

    

    const loadUserData = async (userId: string) => {
        try {
            // Try Firestore first
            const userData = await getUserData(userId);
            if (userData) {
                setBuyTransactions(userData.buyTransactions || []);
                setSellTransactions(userData.sellTransactions || []);
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
                setBuyTransactions(localData.buyTransactions || []);
                setSellTransactions(localData.sellTransactions || []);
                if (localData.settings) setSettings(localData.settings);
            }
        } catch {
            // ignore
        }
    };

    const saveUserDataToFirebase = async () => {
        if (user) {
            try {
                const payload = {
                    buyTransactions,
                    sellTransactions,
                    settings,
                    lastUpdated: new Date().toISOString()
                };
                await saveUserData(user.uid, payload);
                // Also keep a local backup to ensure persistence on intermittent connectivity
                try { localStorage.setItem(`portfolio_backup_${user.uid}`, JSON.stringify(payload)); } catch {}
            } catch (error) {
                console.error('Error saving user data:', error);
                // Fallback: save locally and mark for later sync
                try {
                    const payload = {
                        buyTransactions,
                        sellTransactions,
                        settings,
                        lastUpdated: new Date().toISOString()
                    };
                    localStorage.setItem(`portfolio_backup_${user.uid}`, JSON.stringify(payload));
                    localStorage.setItem(`portfolio_needs_sync_${user.uid}`, '1');
                } catch {}
            }
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
            alert('שגיאה בהתנתקות: ' + (error as any).message);
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
            alert('התיק נשמר בהצלחה!');
        } else {
            alert('יש להתחבר כדי לשמור את התיק');
        }
    };

    // פונקציית ייצוא
    const handleExportToExcel = () => {
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
    const handleImportFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
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
        alert('הנתונים יובאו בהצלחה!');
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
        const initialSummary: StockSummary = { totalBuyQuantity: 0, totalSellQuantity: 0, remainingQuantity: 0, weightedAvgBuyPrice: 0, weightedAvgCostBasis: 0, totalBuyCost: 0, totalCommissions: 0, realizedGrossPnl: 0, realizedNetPnl: 0, roi: 0 };
        if (!stockName) return initialSummary;

        const buysForStock = buyTransactions.filter(t => t.stockName === stockName);
        const sellsForStock = sellTransactions.filter(t => t.stockName === stockName);

        const totalBuyQuantity = buysForStock.reduce((sum, t) => sum + t.quantity, 0);
        const totalSellQuantity = sellsForStock.reduce((sum, t) => sum + t.quantity, 0);
        const remainingQuantity = totalBuyQuantity - totalSellQuantity;

        const totalBuyValue = buysForStock.reduce((sum, t) => sum + (t.price * t.quantity), 0);
        const totalBuyCommissions = buysForStock.reduce((sum, t) => sum + t.commission, 0);
        const totalBuyCost = totalBuyValue + totalBuyCommissions;
        
        const weightedAvgBuyPrice = totalBuyQuantity > 0 ? totalBuyValue / totalBuyQuantity : 0;
        const weightedAvgCostBasis = totalBuyQuantity > 0 ? totalBuyCost / totalBuyQuantity : 0;

        let realizedGrossPnl = 0;
        let costOfSoldShares = 0;
        if (sellsForStock.length > 0 && weightedAvgBuyPrice > 0) {
            const totalSellValue = sellsForStock.reduce((sum, t) => sum + t.total, 0);
            costOfSoldShares = weightedAvgBuyPrice * totalSellQuantity; // ללא עמלות
            realizedGrossPnl = totalSellValue - costOfSoldShares;
        }

        const totalSellCommissions = sellsForStock.reduce((sum, t) => sum + t.commission, 0);
        const totalCommissions = totalBuyCommissions + totalSellCommissions;
        const taxOnProfit = realizedGrossPnl > 0 ? realizedGrossPnl * settings.taxRate : 0;
        const realizedNetPnl = realizedGrossPnl - taxOnProfit;

        const totalInvestedForSold = costOfSoldShares;
        const roi = totalInvestedForSold > 0 ? (realizedGrossPnl / totalInvestedForSold) * 100 : 0;

        return { totalBuyQuantity, totalSellQuantity, remainingQuantity, weightedAvgBuyPrice, weightedAvgCostBasis, totalBuyCost, totalCommissions, realizedGrossPnl, realizedNetPnl, roi };
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
        
        if (editingId) {
            setBuyTransactions(prev => prev.map(t => t.id === editingId ? { ...t, stockName, price, quantity, date: buyDate, total, commission } : t));
        } else {
            const newTransaction: Transaction = { id: Date.now(), stockName, price, quantity, total, commission, date: buyDate };
            setBuyTransactions(prev => [...prev, newTransaction]);
        }
        
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
    };

    const handleDeleteSell = (id: number) => {
        setSellTransactions(prev => prev.filter(t => t.id !== id));
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
            // Yahoo Finance API with CORS proxy
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
            // If Yahoo Finance fails, show error
            console.log('Yahoo Finance failed for:', stockSymbol);
            alert(`לא הצלחתי למצוא מחיר עדכני עבור ${stockSymbol}. אנא הזן את המחיר ידנית.`);
        } catch (error) {
            console.error("Error fetching stock price:", error);
            alert(`שגיאה בעת הבאת מחיר עבור ${stockSymbol}. אנא הזן את המחיר ידנית.`);
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
            alert('שגיאה בעת טעינת מחירי מניות.');
        } finally {
            setIsFetchingCurrentPrices(false);
        }
    }, [allSummaries]);

    const handleStockNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase();
        setBuyStockName(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (value.length === 0) {
            setSuggestions([]);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            lastQueryRef.current = value;
            try {
                const res = await fetch(`https://financialmodelingprep.com/api/v3/search?query=${value}&limit=10&exchange=NASDAQ&apikey=${FMP_API_KEY}`);
                if (res.ok) {
                    const data = await res.json();
                    // בדוק שהערך לא השתנה בזמן ההמתנה
                    if (lastQueryRef.current === value) {
                        setSuggestions(data.map((item: any) => `${item.symbol} - ${item.name}`));
                    }
                } else {
                    setSuggestions([]);
                }
            } catch {
                setSuggestions([]);
            }
        }, 350);
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
            // For now, we'll use a static list since we removed the AI dependency
            // In the future, you could integrate with a stock list API
            alert('רשימת המניות הנוכחית כוללת את המניות הפופולריות ביותר. עדכון אוטומטי זמין בגרסה מתקדמת יותר.');
        } catch (error) {
            console.error("Error updating stock list:", error);
            alert('כשלון בעדכון רשימת המניות. נסה שוב מאוחר יותר.');
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
                                className="icon-btn-sm"
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
                                    <th>שם</th>
                                    <th>כמות מניות</th>
                                    <th>מחיר ממוצע</th>
                                    <th>עלות כוללת ($)</th>
                                    {dashboardFilter === 'open' ? (
                                        <>
                                            <th>שווי נוכחי ($)</th>
                                            <th>מחיר נוכחי</th>
                                            <th>סה"כ רווח (%)</th>
                                            <th>סה"כ רווח ($)</th>
                                        </>
                                    ) : (
                                        <>
                                            <th>שווי מכירה ($)</th>
                                            <th>מחיר מכירה ממוצע</th>
                                            <th>סה"כ רווח (%)</th>
                                            <th>סה"כ רווח ($)</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.length > 0 ? (
                                    filteredTransactions.map((transaction) => {
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
    
    const renderBuyMoreForm = () => (
        <div className="buy-more-section">
            <h3>{editingId ? `עריכת קנייה עבור ${activeStock}` : `קנייה נוספת עבור ${activeStock}`}</h3>
             <div className="form-grid buy-form">
                 <div className="form-group"><label>מחיר מניה ($)</label><input type="number" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} /></div>
                 <div className="form-group"><label>כמות מניות</label><input type="number" value={buyQuantity} onChange={e => setBuyQuantity(e.target.value)} /></div>
                 <div className="form-group"><label>תאריך</label><input type="date" value={buyDate} onChange={e => setBuyDate(e.target.value)} /></div>
                 <div className="form-actions">
                     <button onClick={handleSaveBuy} disabled={!buyPrice || !buyQuantity || !buyDate}>{editingId ? 'עדכן' : <><PlusIcon/>הוסף</>}</button>
                     <button className="secondary" onClick={resetBuyForm}>בטל</button>
                 </div>
             </div>
        </div>
    );

    const renderStockDetail = () => {
        const buysForActiveStock = activeStock ? buyTransactions.filter(t => t.stockName === activeStock) : [];
        const sellsForActiveStock = activeStock ? sellTransactions.filter(t => t.stockName === activeStock) : [];

        return (
            <>
                <div className="card">
                    <button className="back-btn" onClick={goToDashboard}><BackArrowIcon/> חזור לדשבורד</button>
                    <h2 className="stock-detail-header">ניתוח מניית: {activeStock}</h2>
                </div>

                <div className="card">
                    <h2>סיכום וביצועים</h2>
                    <div className="summary-grid">
                        <div className="summary-item"><div className="label">מחיר קנייה ממוצע למניה</div><div className="value"><span className="financial-number">{formatCurrency(activeStockSummary.weightedAvgBuyPrice)}</span></div></div>
                        <div className="summary-item"><div className="label">מניות ביתרה</div><div className="value">{activeStockSummary.remainingQuantity} / {activeStockSummary.totalBuyQuantity}</div></div>
                        <div className="summary-item"><div className="label">סה"כ עלות קנייה</div><div className="value"><span className="financial-number">{formatCurrency(activeStockSummary.totalBuyCost)}</span></div></div>
                        <div className="summary-item"><div className="label">סה"כ עמלות</div><div className="value"><span className="financial-number">{formatCurrency(activeStockSummary.totalCommissions)}</span></div></div>
                        <div className="summary-item"><div className="label">רווח/הפסד ממומש (ברוטו)</div><div className={`value ${pnlClass(activeStockSummary.realizedGrossPnl)}`}><span className="financial-number">{activeStockSummary.realizedGrossPnl < 0 ? `${formatCurrency(Math.abs(activeStockSummary.realizedGrossPnl))} -` : formatCurrency(activeStockSummary.realizedGrossPnl)}</span></div></div>
                        <div className="summary-item"><div className="label">רווח/הפסד ממומש (נטו, אחרי מס)</div><div className={`value ${pnlClass(activeStockSummary.realizedNetPnl)}`}><span className="financial-number">{activeStockSummary.realizedNetPnl < 0 ? `${formatCurrency(Math.abs(activeStockSummary.realizedNetPnl))} -` : formatCurrency(activeStockSummary.realizedNetPnl)}</span></div></div>
                        <div className="summary-item"><div className="label">תשואה על ההשקעה (ROI)</div><div className={`value ${pnlClass(activeStockSummary.roi)}`}><span className="financial-number">{activeStockSummary.roi < 0 ? `${Math.abs(activeStockSummary.roi).toFixed(2)}% -` : `${activeStockSummary.roi.toFixed(2)}%`}</span></div></div>
                    </div>
                </div>

                <div className="card">
                    <h2>ביצוע מכירה</h2>
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
                        <h3>היסטוריית מכירות</h3>
                        <table className="transactions-table">
                            <thead><tr><th>תאריך</th><th>מחיר</th><th>כמות</th><th>עמלה</th><th>סה"כ</th><th>פעולות</th></tr></thead>
                            <tbody>
                                {sellsForActiveStock.map(t => <tr key={t.id}>
                                    <td>{formatDate(t.date)}</td>
                                    <td><span className="financial-number">{formatCurrency(t.price)}</span></td>
                                    <td>{t.quantity}</td>
                                    <td><span className="financial-number">{formatCurrency(t.commission)}</span></td>
                                    <td><span className="financial-number">{formatCurrency(t.total - t.commission)}</span></td>
                                    <td className="actions-cell">
                                        <button className="delete-btn" title="מחק" onClick={() => handleDeleteSell(t.id)}><DeleteIcon /></button>
                                    </td>
                                </tr>)}
                            </tbody>
                        </table>
                    </div>}
                </div>
                
                <div className="card">
                     <div className="card-header-with-action">
                        <h2>היסטוריית קניות</h2>
                        {!isBuyFormVisible && <button onClick={() => setIsBuyFormVisible(true)}><PlusIcon/> קנה עוד</button>}
                     </div>

                     {isBuyFormVisible && renderBuyMoreForm()}
                     
                     {buysForActiveStock.length > 0 && (
                        <div className="transactions-list">
                            <table className="transactions-table">
                                <thead><tr><th>תאריך</th><th>מחיר</th><th>כמות</th><th>עמלה</th><th>סה"כ</th><th>פעולות</th></tr></thead>
                                <tbody>
                                    {buysForActiveStock.map(t => <tr key={t.id}>
                                        <td>{formatDate(t.date)}</td>
                                        <td><span className="financial-number">{formatCurrency(t.price)}</span></td>
                                        <td>{t.quantity}</td>
                                        <td><span className="financial-number">{formatCurrency(t.commission)}</span></td>
                                        <td><span className="financial-number">{formatCurrency(t.total + t.commission)}</span></td>
                                        <td className="actions-cell">
                                            <button className="edit-btn" title="ערוך" onClick={() => handleStartEdit(t)}><EditIcon /></button>
                                            <button className="delete-btn" title="מחק" onClick={() => handleDeleteBuy(t.id)}><DeleteIcon /></button>
                                        </td>
                                    </tr>)}
                                </tbody>
                            </table>
                        </div>
                     )}
                     {buysForActiveStock.length === 0 && !isBuyFormVisible && (
                        <p>אין היסטוריית קניות עבור מניה זו.</p>
                     )}
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
                <div className="brand">
                  <AppLogo />
                <h1>מחשבון רווח והפסד למניות</h1>
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
