import React, { createContext, ReactNode } from 'react';
// import { User, onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
// import { auth } from '../firebaseConfig'; // Adjust path if necessary

// export const AuthContext = createContext<AuthContextType | undefined>(undefined);
// Temporary stub until Firebase auth issues are resolved.  We still
// create a context so components depending on `AuthContext` don't crash.
export const AuthContext = createContext(null as any);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const useAuth = () => ({
  currentUser: null,
  loading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});
