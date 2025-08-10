import { db } from '../firebase-config';
import { collection, doc, onSnapshot, orderBy, query, setDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';

export interface TransactionDoc {
  id: number; // we use numeric timestamp as the document id string
  stockName: string;
  price: number;
  quantity: number;
  total: number;
  commission: number;
  date: string; // YYYY-MM-DD
}

const path = (uid: string, portfolioId: string, kind: 'buy' | 'sell') =>
  `users/${uid}/portfolios/${portfolioId}/${kind === 'buy' ? 'buyTransactions' : 'sellTransactions'}`;

export function listenTransactions(
  uid: string,
  portfolioId: string,
  kind: 'buy' | 'sell',
  onChange: (rows: TransactionDoc[]) => void
) {
  // Order by date only to avoid composite index requirement during build
  const q = query(collection(db, path(uid, portfolioId, kind)), orderBy('date', 'asc'));
  return onSnapshot(q, (snap) => {
    const rows: TransactionDoc[] = snap.docs.map(d => d.data() as TransactionDoc);
    onChange(rows);
  });
}

export async function upsertTransaction(uid: string, portfolioId: string, kind: 'buy' | 'sell', tx: TransactionDoc): Promise<void> {
  const docId = String(tx.id);
  await setDoc(doc(db, path(uid, portfolioId, kind), docId), tx, { merge: true });
}

export async function deleteTransaction(uid: string, portfolioId: string, kind: 'buy' | 'sell', id: number): Promise<void> {
  await deleteDoc(doc(db, path(uid, portfolioId, kind), String(id)));
}

export async function hasAnyTransactions(uid: string, portfolioId: string, kind: 'buy' | 'sell'): Promise<boolean> {
  const snap = await getDocs(query(collection(db, path(uid, portfolioId, kind))));
  return !snap.empty;
}

export async function bulkImportTransactions(uid: string, portfolioId: string, kind: 'buy' | 'sell', list: TransactionDoc[]): Promise<void> {
  if (!list || list.length === 0) return;
  const batch = writeBatch(db);
  for (const tx of list) {
    const ref = doc(db, path(uid, portfolioId, kind), String(tx.id));
    batch.set(ref, tx, { merge: true });
  }
  await batch.commit();
}

export async function fetchTransactionsOnce(uid: string, portfolioId: string, kind: 'buy' | 'sell'): Promise<TransactionDoc[]> {
  const snap = await getDocs(query(collection(db, path(uid, portfolioId, kind)), orderBy('date', 'asc')));
  return snap.docs.map(d => d.data() as TransactionDoc);
}


