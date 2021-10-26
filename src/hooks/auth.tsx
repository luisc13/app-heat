import React, { createContext, useContext, useState, useEffect } from "react";
import * as AuthSessions from "expo-auth-session";
import { api } from "../services/api";
import asyncStorage from "@react-native-async-storage/async-storage";

const CLIENT_ID = "e093b9f4ca9d20d882f4";
const SCOPE = "read:user";
const USER_STORAGE = "@app-heat:user";
const TOKEN_STORAGE = "@app-heat:token";

type User = {
  id: string;
  avatar_url: string;
  name: string;
  login: string;
};

type AuthContextData = {
  user: User | null;
  isSigningIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

type AuthProviderProps = {
  children: React.ReactNode;
};

type AuthResponse = {
  token: string;
  user: User;
};

type AuthorizationResponse = {
  params: {
    code?: string;
    error?: string;
  },
  type?: string;
};

export const AuthContext = createContext({} as AuthContextData);

function AuthProvider({ children }: AuthProviderProps) {
  const [isSigningIn, setIsSigingIn] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  async function signIn() {
    try {
      setIsSigingIn(true);
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPE}`;
      const authSessionResponse = (await AuthSessions.startAsync({
        authUrl,
      })) as AuthorizationResponse;

      if (authSessionResponse.type === 'success' && authSessionResponse.params.error !== 'access_denied') {
        const authResponse = await api.post("/authenticate", {
          code: authSessionResponse.params.code,
        });
        const { user, token } = authResponse.data as AuthResponse;

        api.defaults.headers.common["authorization"] = `Bearer ${token}`;
        await asyncStorage.setItem(USER_STORAGE, JSON.stringify(user));
        await asyncStorage.setItem(TOKEN_STORAGE, token);
        setUser(user);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsSigingIn(false);
    }
  }
  async function signOut() {
    setUser(null);
    await asyncStorage.removeItem(USER_STORAGE);
    await asyncStorage.removeItem(TOKEN_STORAGE);
  }

  useEffect(() => {
    async function loadUserStorageData() {
      const userStorage = await asyncStorage.getItem(USER_STORAGE);
      const tokenStorage = await asyncStorage.getItem(TOKEN_STORAGE);

      if (userStorage && tokenStorage) {
        api.defaults.headers.common["authorization"] = `Bearer ${tokenStorage}`;
        setUser(JSON.parse(userStorage));
      }
      setIsSigingIn(false);
    }
    loadUserStorageData();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signOut,
        user,
        isSigningIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  return context;
}

export { AuthProvider, useAuth };
