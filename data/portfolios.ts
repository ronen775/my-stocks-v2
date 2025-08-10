import { db } from '../firebase-config';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';

export interface PortfolioDoc {
  name: string;
  createdAt?: any;
}

const portfoliosPath = (uid: string) => `users/${uid}/portfolios`;

export function listenPortfolios(
  uid: string,
  onChange: (rows: Array<{ id: string; name: string }>) => void
) {
  const ref = collection(db, portfoliosPath(uid));
  return onSnapshot(ref, (snap) => {
    const rows = snap.docs.map(d => ({ id: d.id, name: (d.data() as any)?.name || d.id }));
    onChange(rows);
  });
}

export async function createPortfolio(uid: string, name: string): Promise<string> {
  const ref = doc(collection(db, portfoliosPath(uid)));
  await setDoc(ref, { name, createdAt: serverTimestamp() } as PortfolioDoc, { merge: true });
  return ref.id;
}

export async function renamePortfolio(uid: string, portfolioId: string, name: string): Promise<void> {
  const ref = doc(db, portfoliosPath(uid), portfolioId);
  await setDoc(ref, { name }, { merge: true });
}

export async function deletePortfolio(uid: string, portfolioId: string): Promise<void> {
  // Delete subcollection documents (buy/sell) in batches of 300 to avoid limits
  for (const sub of ['buyTransactions', 'sellTransactions']) {
    while (true) {
      const subRef = collection(db, `${portfoliosPath(uid)}/${portfolioId}/${sub}`);
      const snap = await getDocs(subRef);
      if (snap.empty) break;
      const batch = writeBatch(db);
      let count = 0;
      for (const d of snap.docs) {
        batch.delete(d.ref);
        count++;
        if (count >= 300) break;
      }
      await batch.commit();
      if (count < snap.size) continue; // more docs remain
      // re-loop to check if more exist
    }
  }
  await deleteDoc(doc(db, portfoliosPath(uid), portfolioId));
}

export async function clearPortfolio(uid: string, portfolioId: string): Promise<void> {
  // Delete all docs in subcollections but keep the portfolio document
  for (const sub of ['buyTransactions', 'sellTransactions']) {
    while (true) {
      const subRef = collection(db, `${portfoliosPath(uid)}/${portfolioId}/${sub}`);
      const snap = await getDocs(subRef);
      if (snap.empty) break;
      const batch = writeBatch(db);
      let count = 0;
      for (const d of snap.docs) {
        batch.delete(d.ref);
        count++;
        if (count >= 300) break;
      }
      await batch.commit();
      if (count < snap.size) continue;
    }
  }
}



