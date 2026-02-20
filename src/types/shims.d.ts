declare module 'expo-secure-store' {
  export function setItemAsync(key: string, value: string, options?: any): Promise<void>;
  export function getItemAsync(key: string, options?: any): Promise<string | null>;
  export function deleteItemAsync(key: string, options?: any): Promise<void>;
}

declare module 'expo-auth-session/providers/google' {
  export const useAuthRequest: (...args: any[]) => any;
}

declare module 'expo-auth-session/providers/facebook' {
  export const useAuthRequest: (...args: any[]) => any;
}

declare module 'jwt-decode' {
  export default function jwt_decode<T>(token: string): T;
}

declare module '@prisma/client' {
  export interface PrismaClient { [key: string]: any }
  export const PrismaClient: { new(): PrismaClient };
}

declare module 'expo-apple-authentication' {
  export interface AppleAuthenticationCredential {
    user: string;
    email?: string;
    fullName?: { givenName?: string; familyName?: string };
    identityToken?: string;
    authorizationCode?: string;
  }
  export function signInAsync(options?: any): Promise<AppleAuthenticationCredential>;
}
