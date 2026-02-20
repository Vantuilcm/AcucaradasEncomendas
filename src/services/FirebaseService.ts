import { db } from '../config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  type DocumentData,
} from 'firebase/firestore';

export interface QueryFilter {
  field: string;
  operator: '<' | '<=' | '==' | '>' | '>=' | '!=';
  value: any;
}

/**
 * Minimal FirebaseService wrapper used by WishlistService
 */
export class FirebaseService {
  private static instance: FirebaseService;

  private constructor() {}

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  async getCollection(collectionName: string, filters: QueryFilter[] = []) {
    const colRef = collection(db as any, collectionName);
    const constraints = filters.map(f => where(f.field, f.operator, f.value));
    const q = constraints.length ? query(colRef, ...constraints) : query(colRef);
    return await getDocs(q);
  }

  async addDocument(collectionName: string, data: Omit<DocumentData, 'id'>): Promise<string> {
    const colRef = collection(db as any, collectionName);
    const ref = await addDoc(colRef as any, data as DocumentData);
    return (ref as any).id ?? '';
  }

  async updateDocument(collectionName: string, id: string, data: Partial<DocumentData>) {
    const ref = doc(db as any, collectionName, id);
    await updateDoc(ref as any, data as Partial<DocumentData>);
  }

  async getDocumentById(collectionName: string, id: string) {
    const ref = doc(db as any, collectionName, id);
    return await getDoc(ref as any);
  }
}