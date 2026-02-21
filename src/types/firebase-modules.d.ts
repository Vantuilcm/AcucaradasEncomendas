declare module 'firebase/auth' {
  export interface User {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    phoneNumber: string | null;
    photoURL: string | null;
    providerId: string;
    metadata: {
      // Removido acesso a APIs privadas para conformidade com a App Store
      // creationTime?: string;
      // lastSignInTime?: string;
    };
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
  }

  export interface AuthCredential {
    providerId: string;
    signInMethod: string;
  }

  export class EmailAuthProvider {
    static credential(email: string, password: string): AuthCredential;
  }

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
}

declare module 'firebase/firestore' {
  export interface Firestore {}

  export interface DocumentData {
    [key: string]: string | number | boolean | Date | DocumentData | DocumentData[] | null | undefined;
  }

  export interface DocumentSnapshot {
    exists(): boolean;
    data(): DocumentData | undefined;
    id: string;
  }

  export interface DocumentReference {
    id: string;
  }

  export function doc(
    firestore: Firestore,
    path: string,
    ...pathSegments: string[]
  ): DocumentReference;
  export function getDoc(docRef: DocumentReference): Promise<DocumentSnapshot>;
  export function setDoc(
    docRef: DocumentReference,
    data: DocumentData,
    options?: { merge?: boolean }
  ): Promise<void>;
  export function updateDoc(docRef: DocumentReference, data: Partial<DocumentData>): Promise<void>;
  export function deleteField(): FieldValue;

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
  export interface HttpsCallableResult<T = unknown> {
    data: T;
  }
  export interface HttpsCallableOptions {
    timeout?: number;
  }
  export type HttpsCallable<T = unknown, R = unknown> = (data?: T) => Promise<HttpsCallableResult<R>>;

  export function getFunctions(): Functions;
  export function httpsCallable<T = unknown, R = unknown>(
    functions: Functions,
    name: string,
    options?: HttpsCallableOptions
  ): HttpsCallable<T, R>;
}
