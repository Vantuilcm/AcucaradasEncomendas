// Minimal type shims for Firebase modular SDK used in this project

declare module 'firebase/auth' {
  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    phoneNumber: string | null;
    providerData: Array<{ providerId: string; uid: string | null; email: string | null; displayName: string | null; photoURL: string | null }>;
    stsTokenManager?: { accessToken?: string };
    // Optional methods used by app code
    getIdToken: (forceRefresh?: boolean) => Promise<string>;
  }

  export interface Auth {
    currentUser: User | null;
    languageCode: string | null;
    tenantId: string | null;
  }

  export interface UserCredential {
    user: User;
    providerId: string | null;
    operationType?: string;
    additionalUserInfo?: { isNewUser?: boolean; providerId?: string; profile?: any };
  }

  export interface AuthCredential {
    providerId: string;
    signInMethod: string;
  }

  export class EmailAuthProvider {
    static credential(email: string, password: string): AuthCredential;
  }

  // Auth functions used by the app
  export function createUserWithEmailAndPassword(
    auth: Auth,
    email: string,
    password: string
  ): Promise<UserCredential>;
  export function signInWithEmailAndPassword(
    auth: Auth,
    email: string,
    password: string
  ): Promise<UserCredential>;
  export function signOut(auth: Auth): Promise<void>;
  export function sendPasswordResetEmail(auth: Auth, email: string): Promise<void>;
  export function confirmPasswordReset(auth: Auth, code: string, newPassword: string): Promise<void>;
  export function updatePassword(user: User, newPassword: string): Promise<void>;
  export function applyActionCode(auth: Auth, code: string): Promise<void>;

  export function sendEmailVerification(user: User): Promise<void>;
  export function updateProfile(
    user: User,
    profile: { displayName?: string; photoURL?: string }
  ): Promise<void>;
  export function reauthenticateWithCredential(
    user: User,
    credential: AuthCredential
  ): Promise<UserCredential>;
  export function updateEmail(user: User, newEmail: string): Promise<void>;

  // Additional providers and helpers required by SocialAuthService
  export function signInWithCredential(auth: Auth, credential: AuthCredential): Promise<UserCredential>;
  export function getAuth(): Auth;

  export class GoogleAuthProvider {
    static credential(idToken?: string | null, accessToken?: string | null): AuthCredential;
  }
  export class FacebookAuthProvider {
    static credential(accessToken: string): AuthCredential;
  }
  export class OAuthProvider {
    constructor(providerId: string);
    credential(params?: { accessToken?: string; idToken?: string; rawNonce?: string }): AuthCredential;
  }
}

declare module 'firebase/firestore' {
  export interface Firestore {}

    export interface DocumentData {
    [key: string]: any;
  }
  export interface DocumentReference<T = DocumentData> {
    id: string;
    // Minimal methods used in code
  }

  export interface DocumentSnapshot<T = DocumentData> {
    exists(): boolean;
    data(): T | undefined;
    id: string;
    ref: DocumentReference<T>;
  }

  export interface CollectionReference<T = DocumentData> {
    id: string;
    path: string;
  }

  export interface Query<T = DocumentData> {}
  export interface QuerySnapshot<T = DocumentData> {
    docs: Array<DocumentSnapshot<T>>;
    empty: boolean;
    size: number;
    forEach(callback: (doc: DocumentSnapshot<T>) => void): void;
  }
  export type QueryConstraint = any;
  export type WhereFilterOp = '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'in' | 'not-in' | 'array-contains-any';
  

  // Extra helpers
  export function deleteField(): any;

  // Overloads for doc
  export function doc<T = DocumentData>(
    firestore: Firestore,
    path: string,
    ...pathSegments: string[]
  ): DocumentReference<T>;
  export function doc<T = DocumentData>(
    collectionRef: CollectionReference<T>,
    documentId?: string
  ): DocumentReference<T>;

  export function getDoc<T = DocumentData>(docRef: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
  export function setDoc<T = DocumentData>(
    docRef: DocumentReference<T>,
    data: T,
    options?: { merge?: boolean }
  ): Promise<void>;
  export function updateDoc<T = DocumentData>(docRef: DocumentReference<T>, data: Partial<T>): Promise<void>;
  export function addDoc<T = DocumentData>(collectionRef: CollectionReference<T>, data: T): Promise<DocumentReference<T>>;
  export function deleteDoc<T = DocumentData>(docRef: DocumentReference<T>): Promise<void>;

  export function collection<T = DocumentData>(firestore: Firestore, path: string, ...pathSegments: string[]): CollectionReference<T>;
  export function query<T = DocumentData>(base: Query<T> | CollectionReference<T>, ...constraints: QueryConstraint[]): Query<T>;
  export function where(fieldPath: string, opStr: WhereFilterOp, value: any): any;
  export function getDocs<T = DocumentData>(q: Query<T>): Promise<QuerySnapshot<T>>;
  export function orderBy(fieldPath: string, directionStr?: 'asc' | 'desc'): any;
  export function limit(n: number): any;
  export function startAfter(...fieldValues: any[]): any;
  export function arrayUnion(...elements: any[]): FieldValue;
  export function arrayRemove(...elements: any[]): FieldValue;
  export function increment(n: number): FieldValue;

  export function serverTimestamp(): FieldValue;

  export interface FieldValue {
    isEqual(other: FieldValue): boolean;
  }
  export class Timestamp {
    seconds: number;
    nanoseconds: number;
    toDate(): Date;
    static now(): Timestamp;
  }
}

declare module 'firebase/functions' {
  export interface Functions {}
  export interface HttpsCallableResult<T = unknown> { data: T }
  export interface HttpsCallableOptions { timeout?: number }
  export type HttpsCallable<T = unknown, R = unknown> = (data?: T) => Promise<HttpsCallableResult<R>>;

  export function getFunctions(): Functions;
  export function httpsCallable<T = unknown, R = unknown>(functions: Functions, name: string, options?: HttpsCallableOptions): HttpsCallable<T, R>;
}












