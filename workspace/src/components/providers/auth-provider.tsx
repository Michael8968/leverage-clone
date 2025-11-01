'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// API base URL from environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_TCB_API_URL || 'http://localhost:3000';

interface AuthContextType {
    user: any | null;
    role: string | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email, password) => Promise<any>;
    register: (userData) => Promise<any>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const verifyUser = useCallback(async () => {
        const storedToken = localStorage.getItem('jwt_token');
        if (storedToken) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
                    headers: { 'Authorization': `Bearer ${storedToken}` }
                });

                if (!response.ok) {
                    throw new Error('Token verification failed');
                }

                const data = await response.json();
                setUser(data.user);
                setToken(storedToken);
            } catch (error) {
                console.error("Verification failed:", error);
                localStorage.removeItem('jwt_token');
                setUser(null);
                setToken(null);
                router.push('/login');
            }
        }
        setIsLoading(false);
    }, [router]);

    useEffect(() => {
        verifyUser();
    }, [verifyUser]);

    const login = async (email, password) => {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        localStorage.setItem('jwt_token', data.token);
        setUser(data.user);
        setToken(data.token);
        return data;
    };

    const register = async (userData) => {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        localStorage.setItem('jwt_token', data.token);
        setUser(data.user);
        setToken(data.token);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('jwt_token');
        setUser(null);
        setToken(null);
        router.push('/login');
    };

    const value = {
        user,
        role: user?.role || null,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
