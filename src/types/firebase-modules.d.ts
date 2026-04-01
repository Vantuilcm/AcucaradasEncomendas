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

  export class GoogleAuthProvider {
    static credential(idToken: string, accessToken?: string): AuthCredential;
  }

  export class FacebookAuthProvider {
    static credential(accessToken: string): AuthCredential;
  }

  export function getAuth(app?: any): Auth;
  export function initializeAuth(app: any, options?: any): Auth;
  export function getReactNativePersistence(storage: any): any;

  export function applyActionCode(auth: Auth, oobCode: string): Promise<void>;
  export function confirmPasswordReset(
    auth: Auth,
    oobCode: string,
    newPassword: string
  ): Promise<void>;
  export function createUserWithEmailAndPassword(
    auth: Auth,
    email: string,
    password: string
  ): Promise<UserCredential>;
  export function sendPasswordResetEmail(auth: Auth, email: string): Promise<void>;
  export function signInWithEmailAndPassword(
    auth: Auth,
    email: string,
    password: string
  ): Promise<UserCredential>;
  export function signOut(auth: Auth): Promise<void>;
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
  export function updatePassword(user: User, newPassword: string): Promise<void>;
  export function signInWithCredential(auth: Auth, credential: AuthCredential): Promise<UserCredential>;
}

declare module 'firebase/app' {
  export interface FirebaseApp {
    name: string;
    options: any;
  }
  export function initializeApp(config: any): FirebaseApp;
  export function getApps(): FirebaseApp[];
  export function getApp(name?: string): FirebaseApp;
  export function deleteApp(app: FirebaseApp): Promise<void>;
}

declare module 'firebase/storage' {
  export interface FirebaseStorage {}
  export function getStorage(app?: any): FirebaseStorage;
}

declare module 'firebase/analytics' {
  export interface Analytics {}
  export function getAnalytics(app?: any): Analytics;
  export function isSupported(): Promise<boolean>;
}

declare module 'firebase/firestore' {
  export interface Firestore {}

  export interface DocumentData {
    [key: string]:
      | string
      | number
      | boolean
      | Date
      | DocumentData
      | DocumentData[]
      | (string | number | boolean | null)[]
      | FieldValue
      | null
      | undefined;
  }

  export interface DocumentSnapshot {
    exists(): boolean;
    data(): DocumentData | undefined;
    id: string;
  }

  export interface QueryDocumentSnapshot extends DocumentSnapshot {}

  export interface DocumentReference {
    id: string;
    path?: string;
  }

  export interface Query {}
  export interface QuerySnapshot {
    empty: boolean;
    docs: QueryDocumentSnapshot[];
  }
  export interface CollectionReference extends Query {}

  export function collection(firestore: Firestore, path: string): CollectionReference;
  export function query(collectionRef: CollectionReference, ...queryConstraints: any[]): Query;
  export function where(fieldPath: string, opStr: string, value: any): any;
  export function orderBy(fieldPath: string, directionStr?: 'asc' | 'desc'): any;
  export function limit(limit: number): any;
  export function getDocs(query: Query): Promise<QuerySnapshot>;
  export function getFirestore(app?: any): Firestore;
  export function doc(
    firestore: Firestore,
    path: string,
    ...pathSegments: string[]
  ): DocumentReference;
  export function doc(collectionRef: CollectionReference, path?: string): DocumentReference;
  export function getDoc(docRef: DocumentReference): Promise<DocumentSnapshot>;
  export function addDoc(
    collectionRef: CollectionReference,
    data: DocumentData
  ): Promise<DocumentReference>;
  export function setDoc(
    docRef: DocumentReference,
    data: DocumentData,
    options?: { merge?: boolean }
  ): Promise<void>;
  export function updateDoc(docRef: DocumentReference, data: Partial<DocumentData>): Promise<void>;
  export function deleteDoc(docRef: DocumentReference): Promise<void>;
  export function writeBatch(firestore: Firestore): WriteBatch;
  export function serverTimestamp(): FieldValue;
  export function deleteField(): FieldValue;

  export interface WriteBatch {
    update(docRef: DocumentReference, data: Partial<DocumentData>): void;
    commit(): Promise<void>;
  }

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

declare module 'expo-camera' {
  export class Camera {
    static requestCameraPermissionsAsync(): Promise<{ status: string }>;
    takePictureAsync(options?: any): Promise<{ uri: string; base64?: string }>;
  }
}
declare module 'expo-face-detector' {
  export interface FaceFeature {
    bounds?: any;
  }
}
declare module 'expo-document-picker' {
  export interface DocumentPickerAsset {
    uri: string;
    name?: string;
    mimeType?: string;
    size?: number;
  }
  export function getDocumentAsync(options?: any): Promise<{
    canceled: boolean;
    assets: DocumentPickerAsset[];
  }>;
}
declare module 'express' {
  const express: any;
  export default express;
  export function Router(): any;
  export type Request = any;
  export type Response = any;
}
declare module 'react-native-calendars' {
  export const Calendar: any;
  export const LocaleConfig: any;
}
declare module '@react-native-community/datetimepicker' {
  const DateTimePicker: any;
  export default DateTimePicker;
}
declare module 'supertest' {
  const request: any;
  export default request;
}
declare module '@prisma/client' {
  export class PrismaClient {
    [key: string]: any;
  }
}
declare const jest: any;
declare namespace jest {
  type Mock<T = any> = any;
  type Mocked<T> = T;
}
declare function describe(name: string, fn: any): void;
declare function it(name: string, fn: any): void;
declare function beforeAll(fn: any): void;
declare function afterAll(fn: any): void;
declare function beforeEach(fn: any): void;
declare function afterEach(fn: any): void;
declare const expect: any;
