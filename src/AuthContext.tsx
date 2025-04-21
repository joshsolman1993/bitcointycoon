import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

interface UserData {
  btcBalance: number;
  miningPower: number;
  transactions: number;
  rank?: string;
  buildCostMultiplier?: number;
  usdBalance?: number;
  nickname?: string; // Added nickname
  avatar?: string; // Added avatar
  totalMinedBtc?: number; // Added totalMinedBtc
  largestTransaction?: number; // Added largestTransaction
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setUserData(null);
      return;
    }

    const userRef = doc(db, `users/${user.uid}`);
    const unsubscribeData = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserData(doc.data() as UserData);
      } else {
        const initialData: UserData = {
          btcBalance: 10,
          miningPower: 0,
          transactions: 0,
          usdBalance: 10000,
          nickname: user.email?.split("@")[0] || "User", // Initial nickname
          avatar: "icon1", // Default avatar
          totalMinedBtc: 0,
          largestTransaction: 0,
        };
        setDoc(userRef, initialData).then(() => {
          setUserData(initialData);
        });
      }
    });

    return () => unsubscribeData();
  }, [user]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, userData, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
