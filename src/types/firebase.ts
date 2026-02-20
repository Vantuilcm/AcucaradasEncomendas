import { Auth, User } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { Functions } from 'firebase/functions';

// Tipos explícitos para o Firebase
export interface FirebaseServices {
  auth: Auth;
  db: Firestore;
  functions: Functions;
}

// Tipo estendido para evitar problemas com currentUser
export interface AuthWithCurrentUser extends Auth {
  currentUser: User | null;
}
