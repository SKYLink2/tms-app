'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface RoleContextValue {
  currentUser: {
    id: string;
    username: string;
    role: string;
    driverId: number | null;
    active: boolean;
  } | null;
  currentRole: string;
  setSessionUser: (user: RoleContextValue['currentUser']) => void;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<RoleContextValue['currentUser']>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch(`${API_URL}/loads/auth/session`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as NonNullable<
          RoleContextValue['currentUser']
        >;
      })
      .then((user) => {
        if (active) setCurrentUser(user);
      })
      .catch(() => {
        if (active) setCurrentUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const currentRole = currentUser?.role ?? '';

  return (
    <RoleContext.Provider
      value={{ currentUser, currentRole, setSessionUser: setCurrentUser, isLoading }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within RoleProvider');
  }
  return context;
}
