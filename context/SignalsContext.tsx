'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UnifiedSignal } from '@/lib/signals/types';
import { api } from '@/lib/api';

interface SignalsContextType {
    signals: UnifiedSignal[];
    loading: boolean;
    error: string | null;
    totalCount: number;
    pendingCount: number;
    winCount: number;
    lossCount: number;
    refresh: () => Promise<void>;
    lastUpdated: Date | null;
}

const SignalsContext = createContext<SignalsContextType | null>(null);

interface SignalsProviderProps {
    children: ReactNode;
    refreshInterval?: number; // milliseconds, default 60000 (1 minute)
}

export function SignalsProvider({
    children,
    refreshInterval = 60000
}: SignalsProviderProps) {
    const [signals, setSignals] = useState<UnifiedSignal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await api.getSignals({ limit: 200 });
            const fetchedSignals = data.signals || [];

            setSignals(fetchedSignals);
            setLastUpdated(new Date());
        } catch (e: any) {
            console.error('Failed to fetch signals:', e);
            setError(e.message || 'Failed to fetch setups');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        refresh();
    }, [refresh]);

    // Periodic refresh
    useEffect(() => {
        if (refreshInterval <= 0) return;

        const interval = setInterval(refresh, refreshInterval);
        return () => clearInterval(interval);
    }, [refresh, refreshInterval]);

    // Computed values
    const pendingCount = signals.filter(s => s.status === 'pending' || !s.status).length;
    const winCount = signals.filter(s => s.status === 'win').length;
    const lossCount = signals.filter(s => s.status === 'loss').length;

    return (
        <SignalsContext.Provider
            value={{
                signals,
                loading,
                error,
                totalCount: signals.length,
                pendingCount,
                winCount,
                lossCount,
                refresh,
                lastUpdated
            }}
        >
            {children}
        </SignalsContext.Provider>
    );
}

export function useSignals() {
    const context = useContext(SignalsContext);
    if (!context) {
        throw new Error('useSignals must be used within SignalsProvider');
    }
    return context;
}

/**
 * Hook for components that just need the count (e.g., Sidebar badge)
 */
export function useSignalCount() {
    const { totalCount, pendingCount, loading } = useSignals();
    return { totalCount, pendingCount, loading };
}

/**
 * Hook for win rate calculation
 */
export function useWinRate() {
    const { winCount, lossCount } = useSignals();
    const totalResolved = winCount + lossCount;

    if (totalResolved === 0) {
        return { winRate: 0, totalResolved: 0, winCount, lossCount };
    }

    const winRate = Math.round((winCount / totalResolved) * 100);
    return { winRate, totalResolved, winCount, lossCount };
}
