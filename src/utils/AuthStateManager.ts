import { useEffect, useState } from "react";

type AuthListener = (isAuthenticated: boolean, userId: string | null) => void;

class AuthStateManager {
  private static instance: AuthStateManager;
  private _authenticated: boolean = false;
  private _userId: string | null = null;
  private listeners: AuthListener[] = [];

  private constructor() {
    // Check localStorage on initialization
    this.checkStoredAuth();
  }

  public static getInstance(): AuthStateManager {
    if (!AuthStateManager.instance) {
      AuthStateManager.instance = new AuthStateManager();
    }
    return AuthStateManager.instance;
  }

  private checkStoredAuth() {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const token = localStorage.getItem("token");

      if (token && user && user.id) {
        this._authenticated = true;
        this._userId = user.id;
      } else {
        this._authenticated = false;
        this._userId = null;
      }
    } catch (e) {
      console.error("Error checking stored auth:", e);
      this._authenticated = false;
      this._userId = null;
    }
  }

  public get isAuthenticated(): boolean {
    return this._authenticated;
  }

  public get userId(): string | null {
    return this._userId;
  }

  public setAuthenticated(isAuth: boolean, userId: string | null = null) {
    this._authenticated = isAuth;
    this._userId = userId;

    // Notify all listeners
    this.listeners.forEach((listener) => listener(isAuth, userId));
  }

  public addListener(listener: AuthListener): () => void {
    this.listeners.push(listener);

    // Return function to remove this listener
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public handleLogin(userData: any, token: string) {
    // Store auth data
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);

    localStorage.removeItem("wingman_user");
    localStorage.removeItem("wingman_token");
    localStorage.removeItem("authToken");
    this.setAuthenticated(false, null);
    // Update state
    this.setAuthenticated(true, userData.id);
  }

  public handleLogout() {
    // Clear storage
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    // Update state
    this.setAuthenticated(false, null);
  }
}

export const Auth = AuthStateManager.getInstance();

// Helper hook for components
export function useAuthStatus() {
  const [isAuthenticated, setIsAuthenticated] = useState(Auth.isAuthenticated);
  const [userId, setUserId] = useState(Auth.userId);

  useEffect(() => {
    return Auth.addListener((isAuth, uid) => {
      setIsAuthenticated(isAuth);
      setUserId(uid);
    });
  }, []);

  return { isAuthenticated, userId };
}
