'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient, authService } from '@/lib/axios';
import { toast } from 'sonner';

export interface User {
    id: string;
    username: string;
    email: string;
    isVerified: boolean;
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const response = await apiClient.get<{ user: User }>('/api/auth/me');
            setUser(response.data.user);
        } catch (error) {
            console.error('Error al obtener usuario', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        refreshUser();
    }, []);

    const logout = async () => {
        try {
            const res = await authService.logout();
            toast.success(res.message)
        } catch (error) {
            console.error('Error al cerrar sesión', error);
        } finally {
            setUser(null);
        }
    };

    return <AuthContext.Provider value={{ user, isLoading, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
}
