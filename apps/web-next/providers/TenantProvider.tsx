'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

// ========================================
// TYPES
// ========================================

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings: TenantSettings;
  features: string[];
}

export interface TenantSettings {
  branding: {
    logo?: string;
    primaryColor: string;
    accentColor: string;
  };
  features: {
    enableMessaging: boolean;
    enablePayments: boolean;
    enableReviews: boolean;
    enableAnalytics: boolean;
  };
  limits: {
    maxUsers: number;
    maxVendors: number;
    storageGB: number;
  };
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
  setTenant: (tenant: Tenant | null) => void;
  refreshTenant: () => Promise<void>;
  hasFeature: (feature: string) => boolean;
  isWithinLimit: (resource: keyof TenantSettings['limits'], current: number) => boolean;
}

// ========================================
// CONTEXT
// ========================================

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}

// ========================================
// PROVIDER
// ========================================

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenantState] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setTenant = useCallback((newTenant: Tenant | null) => {
    setTenantState(newTenant);
    // Store in localStorage for persistence
    if (newTenant) {
      localStorage.setItem('tenant', JSON.stringify(newTenant));
    } else {
      localStorage.removeItem('tenant');
    }
  }, []);

  const refreshTenant = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/tenant/current', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tenant');
      }

      const data = await response.json();
      setTenant(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [setTenant]);

  const hasFeature = useCallback((feature: string): boolean => {
    if (!tenant) return false;
    return tenant.features.includes(feature);
  }, [tenant]);

  const isWithinLimit = useCallback((resource: keyof TenantSettings['limits'], current: number): boolean => {
    if (!tenant) return true;
    return current < tenant.settings.limits[resource];
  }, [tenant]);

  const value: TenantContextType = {
    tenant,
    isLoading,
    error,
    setTenant,
    refreshTenant,
    hasFeature,
    isWithinLimit,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}
