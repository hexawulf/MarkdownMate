import React, { ReactNode } from 'react';
// import { User, onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
// import { auth } from '../firebaseConfig'; // Adjust path if necessary

// export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthContext = null; // Temporary placeholder

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const useAuth = () => ({
  currentUser: null,
  loading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});
