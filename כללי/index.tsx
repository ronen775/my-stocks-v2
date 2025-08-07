import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { stockList as initialStockList } from './stockList';

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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
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
    const [view, setView] = useState<'dashboard' | 'stockDetail' | 'performance'>('dashboard');
    const [dashboardFilter, setDashboardFilter] = useState<'open' | 'closed'>('open');
    const [settings, setSettings] = useState<Settings>({
        minCommission: 7,
        commissionRate: 0.0008,
        additionalFee: 2.5,
        taxRate: 0.25,
    });
    const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, content: '' });

    const [buyTransactions, setBuyTransactions] = useState<Transaction[]>([]);
    const [sellTransactions, setSellTransactions] = useState<Transaction[]>([]);
    const [stockOptions, setStockOptions] = useState<string[]>(initialStockList);
    const [isUpdatingStocks, setIsUpdatingStocks] = useState<boolean>(false);
    const [currentStockPrices, setCurrentStockPrices] = useState<Record<string, number>>({});
    const [isFetchingCurrentPrices, setIsFetchingCurrentPrices] = useState<boolean>(false);


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
    
    // AI Client
    const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), []);

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
        if (sellsForStock.length > 0 && weightedAvgCostBasis > 0) {
            const totalSellValue = sellsForStock.reduce((sum, t) => sum + t.total, 0);
            costOfSoldShares = weightedAvgCostBasis * totalSellQuantity;
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
                const costBasisOfHoldings = summary.weightedAvgCostBasis * summary.remainingQuantity;
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
        try {
            const prompt = `You are a highly specialized financial data bot.
Your ONLY task is to retrieve the most recent, real-time stock price for a given ticker symbol using Google Finance via Google Search.
The price MUST be the 'last trade price' from the most recent trading session.
For the ticker '${stockSymbol}', find this price.
Critically, ignore pre-market, after-hours, and historical data.
Respond ONLY with the numerical price in USD.
Do not add any symbols, text, or explanations.
Example for a stock trading at $123.45: 123.45`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });

            const priceText = response.text.replace(/[^0-9.]/g, '');
            const price = parseFloat(priceText);
            if (!isNaN(price) && price > 0) {
                setBuyPrice(String(price));
            } else {
                 alert(`לא הצלחתי למצוא מחיר עדכני עבור ${stockSymbol} מגוגל פיננס. אנא הזן אותו ידנית.`);
            }
        } catch (error) {
            console.error("Error fetching stock price:", error);
            alert(`שגיאה בעת הבאת מחיר עבור ${stockSymbol}.`);
        } finally {
            setIsFetchingPrice(false);
        }
    }, [ai]);

    const fetchCurrentPricesForOpenPortfolio = useCallback(async () => {
        const openStocks = allSummaries
            .filter(s => s.summary.remainingQuantity > 0)
            .map(s => s.stock);

        if (openStocks.length === 0) return;

        setIsFetchingCurrentPrices(true);
        
        try {
            const stockListString = openStocks.join(', ');
            const prompt = `You are a highly specialized financial data bot.
Your ONLY task is to retrieve the most recent, real-time stock prices for a list of ticker symbols using Google Finance via Google Search.
The prices MUST be the 'last trade price' from the most recent trading session for each symbol.
For the list [${stockListString}], create a single JSON object.
The keys must be the uppercase stock symbols, and the values must be their corresponding latest prices as numbers.
Critically, ignore pre-market, after-hours, and historical data.
Do not include any text or markdown formatting outside the JSON object.
Example for "MSFT, GOOG": {"MSFT": 450.12, "GOOG": 175.67}`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });

            let jsonString = response.text;
            const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("API response did not contain a valid JSON object.");
            }
            jsonString = jsonMatch[0];

            const priceData = JSON.parse(jsonString);

            if (typeof priceData === 'object' && priceData !== null) {
                 const validPrices = Object.entries(priceData).reduce((acc, [symbol, price]) => {
                    const upperSymbol = symbol.toUpperCase();
                    if (openStocks.includes(upperSymbol) && typeof price === 'number' && price > 0) {
                        acc[upperSymbol] = price;
                    }
                    return acc;
                }, {} as Record<string, number>);

                if (Object.keys(validPrices).length < openStocks.length) {
                    console.warn("Could not retrieve prices for all requested stocks.");
                }

                setCurrentStockPrices(prevPrices => ({
                    ...prevPrices,
                    ...validPrices,
                }));
            } else {
                throw new Error("API response was not a valid JSON object.");
            }

        } catch (error) {
            console.error("An unexpected error occurred while fetching portfolio prices:", error);
            alert('כשלון בעדכון מחירי השוק. ייתכן שה-API החזיר מידע לא תקין או שלא נמצאו מחירים מגוגל פיננס. נסה שוב מאוחר יותר.');
        } finally {
            setIsFetchingCurrentPrices(false);
        }
    }, [ai, allSummaries]);

    const handleStockNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase();
        setBuyStockName(value);
        if (value.length > 0) {
            setSuggestions(stockOptions.filter(s => s.startsWith(value)).slice(0, 10));
        } else {
            setSuggestions([]);
        }
    };
    
    const selectSuggestion = (stock: string) => {
        setBuyStockName(stock);
        setSuggestions([]);
        fetchStockPrice(stock);
    };

    const handleStockNameBlur = () => {
        setTimeout(() => {
            if (buyStockName && stockOptions.includes(buyStockName) && !buyPrice) {
               fetchStockPrice(buyStockName);
            }
            setSuggestions([]);
        }, 200); // Delay to allow click on suggestion
    };

    const handleUpdateStockList = async () => {
        setIsUpdatingStocks(true);
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: "Provide an updated list of stock symbols from the S&P 500 and Nasdaq 100 indexes. Combine them into a single list, remove duplicates, and sort them alphabetically. Respond with only a JSON array of strings, for example: [\"A\", \"AAPL\", \"GOOG\"]",
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        description: "A list of stock ticker symbols.",
                        items: {
                            type: Type.STRING,
                            description: "A single stock ticker symbol."
                        }
                    },
                }
            });
            const newList = JSON.parse(response.text);
            if (Array.isArray(newList) && newList.every(item => typeof item === 'string')) {
                const uniqueSortedList = [...new Set(newList)].sort();
                setStockOptions(uniqueSortedList);
                alert('רשימת המניות עודכנה בהצלחה!');
            } else {
                throw new Error("Invalid data format received from API.");
            }
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


    // --- Render Methods for Views ---
    const renderDashboard = () => {
        const filteredStocks = allSummaries.filter(({ summary }) => {
            if (dashboardFilter === 'open') return summary.remainingQuantity > 0;
            return summary.remainingQuantity === 0 && summary.totalBuyQuantity > 0;
        });

        return (
            <>
                <div className="card">
                    <h2>קניית מניה חדשה</h2>
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
                         <h2>סיכום תיק מניות</h2>
                         <button className="view-report-btn" onClick={goToPerformance}>צפה בדוח ביצועים</button>
                    </div>
                    <div className="summary-grid">
                        <div className="summary-item">
                            <div className="label">סה"כ אחזקות (לפני מימוש)</div>
                            <div className="value"><span className="financial-number">{formatCurrency(portfolioSummary.totalCost)}</span></div>
                        </div>
                        <div className="summary-item">
                            <div className="label">רווח/הפסד לא ממומש</div>
                             <div className={`value ${pnlClass(unrealizedPnl)} value-with-action`}>
                                <span className="financial-number">{Object.keys(currentStockPrices).length > 0 || (allSummaries.every(s => s.summary.remainingQuantity === 0)) ? formatCurrency(unrealizedPnl) : '---'}</span>
                                <button
                                    className="icon-btn-sm"
                                    aria-label="Refresh prices"
                                    title="רענן מחירים"
                                    onClick={fetchCurrentPricesForOpenPortfolio}
                                    disabled={isFetchingCurrentPrices || allSummaries.every(s => s.summary.remainingQuantity === 0)}
                                >
                                    {isFetchingCurrentPrices ? <div className="spinner"></div> : <RefreshIcon />}
                                </button>
                            </div>
                        </div>
                        <div className="summary-item"><div className="label">רווח/הפסד ממומש (ברוטו)</div><div className={`value ${pnlClass(portfolioSummary.realizedGrossPnl)}`}><span className="financial-number">{formatCurrency(portfolioSummary.realizedGrossPnl)}</span></div></div>
                        <div className="summary-item"><div className="label">רווח/הפסד ממומש (נטו)</div><div className={`value ${pnlClass(portfolioSummary.realizedNetPnl)}`}><span className="financial-number">{formatCurrency(portfolioSummary.realizedNetPnl)}</span></div></div>
                        <div className="summary-item"><div className="label">סה"כ עמלות</div><div className="value"><span className="financial-number">{formatCurrency(portfolioSummary.totalCommissions)}</span></div></div>
                    </div>
                </div>
                 <div className="card">
                    <div className="dashboard-header">
                        <h2>המניות שלי</h2>
                        <div className="dashboard-filter-tabs">
                            <button className={`filter-btn ${dashboardFilter === 'open' ? 'active' : ''}`} onClick={() => setDashboardFilter('open')}>תיקים פתוחים</button>
                            <button className={`filter-btn ${dashboardFilter === 'closed' ? 'active' : ''}`} onClick={() => setDashboardFilter('closed')}>תיקים סגורים</button>
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="stocks-table">
                            <thead>
                                <tr>
                                    <th>שם המניה</th>
                                    <th>כמות נוכחית</th>
                                    <th>מחיר ממוצע</th>
                                    <th>עלות החזקה</th>
                                    {dashboardFilter === 'open' ? (
                                        <>
                                            <th>מחיר נוכחי</th>
                                            <th className="th-with-button">
                                                <span>רווח/הפסד לא ממומש</span>
                                                <button
                                                    className="icon-btn-sm"
                                                    aria-label="רענן מחירים"
                                                    title="רענן מחירים"
                                                    onClick={fetchCurrentPricesForOpenPortfolio}
                                                    disabled={isFetchingCurrentPrices || filteredStocks.length === 0}
                                                >
                                                    {isFetchingCurrentPrices ? <div className="spinner"></div> : <RefreshIcon />}
                                                </button>
                                            </th>
                                        </>
                                    ) : (
                                        <th>רווח/הפסד ממומש (נטו)</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStocks.length > 0 ? (
                                    filteredStocks.map(({ stock, summary }) => {
                                        const costOfHoldings = summary.weightedAvgCostBasis * summary.remainingQuantity;
                                        return (
                                            <tr key={stock} className="stock-table-row" onClick={() => goToStockDetail(stock)}>
                                                <td>{stock}</td>
                                                <td>{summary.remainingQuantity}</td>
                                                <td><span className="financial-number">{formatCurrency(summary.weightedAvgBuyPrice)}</span></td>
                                                <td><span className="financial-number">{formatCurrency(costOfHoldings)}</span></td>
                                                {dashboardFilter === 'open' ? (
                                                    <>
                                                        <td>
                                                            <span className="financial-number">
                                                                {currentStockPrices[stock] ? formatCurrency(currentStockPrices[stock]) : '---'}
                                                            </span>
                                                        </td>
                                                        {(() => {
                                                            const currentPrice = currentStockPrices[stock];
                                                            const unrealizedPnlForStock = currentPrice ? (currentPrice * summary.remainingQuantity) - costOfHoldings : null;
                                                            return (
                                                                <td className={unrealizedPnlForStock !== null ? pnlClass(unrealizedPnlForStock) : ''}>
                                                                    <span className="financial-number">
                                                                        {unrealizedPnlForStock !== null ? formatCurrency(unrealizedPnlForStock) : '---'}
                                                                    </span>
                                                                </td>
                                                            );
                                                        })()}
                                                    </>
                                                ) : (
                                                    <td className={pnlClass(summary.realizedNetPnl)}>
                                                        <span className="financial-number">{formatCurrency(summary.realizedNetPnl)}</span>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                 ) : (
                                    <tr>
                                        <td colSpan={dashboardFilter === 'open' ? 6 : 5}>
                                            {dashboardFilter === 'open' ? 'אין כרגע תיקים פתוחים.' : 'אין תיקים סגורים.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {dashboardFilter === 'open' && (
                        <p className="table-disclaimer">
                            המחירים מאוחזרים מגוגל פיננס וייתכנו עיכובים קלים.
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
                        <div className="summary-item"><div className="label">רווח/הפסד ממומש (ברוטו)</div><div className={`value ${pnlClass(activeStockSummary.realizedGrossPnl)}`}><span className="financial-number">{formatCurrency(activeStockSummary.realizedGrossPnl)}</span></div></div>
                        <div className="summary-item"><div className="label">רווח/הפסד ממומש (נטו, אחרי מס)</div><div className={`value ${pnlClass(activeStockSummary.realizedNetPnl)}`}><span className="financial-number">{formatCurrency(activeStockSummary.realizedNetPnl)}</span></div></div>
                        <div className="summary-item"><div className="label">תשואה על ההשקעה (ROI)</div><div className={`value ${pnlClass(activeStockSummary.roi)}`}><span className="financial-number">{activeStockSummary.roi.toFixed(2)}%</span></div></div>
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

    const renderPerformancePage = () => {
        const allocationData = allSummaries
            .filter(s => s.summary.remainingQuantity > 0)
            .map((s, index) => ({
                name: s.stock,
                value: s.summary.weightedAvgCostBasis * s.summary.remainingQuantity,
                color: PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]
            }));

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
                    <h2 className="stock-detail-header">דוח ביצועים</h2>
                </div>

                <div className="performance-grid-2-col">
                     <div className="card">
                        <h2>הקצאת נכסים (לפי עלות)</h2>
                        <div className="chart-container pie-chart-container">
                             <PieChart data={allocationData} onHover={handleChartHover} onLeave={handleChartLeave} />
                             <div className="pie-legend">
                                {allocationData.slice(0, 10).map(item => (
                                    <div key={item.name} className="legend-item">
                                        <div className="legend-color-box" style={{ backgroundColor: item.color }}></div>
                                        <span>{item.name}</span>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h2>הגדרות וכלים</h2>
                    <div className="form-grid">
                        <div className="form-group"><label>עמלת מינימום ($)</label><input type="number" name="minCommission" value={settings.minCommission} onChange={handleSettingsChange}/></div>
                        <div className="form-group"><label>שיעור עמלה (%)</label><input type="number" name="commissionRate" value={settings.commissionRate * 100} onChange={handleSettingsChange}/></div>
                        <div className="form-group"><label>עמלה נוספת ($)</label><input type="number" name="additionalFee" value={settings.additionalFee} onChange={handleSettingsChange}/></div>
                        <div className="form-group"><label>שיעור מס רווחי הון (%)</label><input type="number" name="taxRate" value={settings.taxRate * 100} onChange={handleSettingsChange}/></div>
                    </div>
                     <div className="settings-actions">
                        <button onClick={handleUpdateStockList} disabled={isUpdatingStocks}>
                            {isUpdatingStocks ? <div className="spinner"></div> : <RefreshIcon/>}
                            עדכן רשימת מניות (S&P 500, Nasdaq 100)
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- Main Render Logic ---
    return (
        <div className="app-container">
            <header className="app-header">
                <h1>מחשבון רווח והפסד למניות</h1>
            </header>
            <main>
                {view === 'dashboard' && renderDashboard()}
                {view === 'stockDetail' && renderStockDetail()}
                {view === 'performance' && renderPerformancePage()}
            </main>
            {tooltip.visible && (
                <div className="tooltip" style={{ left: tooltip.x, top: tooltip.y }} dangerouslySetInnerHTML={{ __html: tooltip.content }} />
            )}
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);