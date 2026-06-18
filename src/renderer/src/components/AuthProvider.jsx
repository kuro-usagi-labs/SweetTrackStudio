import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { syncLocalToCloud } from '../lib/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const bypassAuth = () => {
    localStorage.setItem('useOfflineMode', 'true');
    setUser({ email: 'local@sweettrack.app', id: 'local-desktop-user', isLocal: true });
    setSession(null);
    setLoading(false);
  };

  const logoutOffline = () => {
    localStorage.removeItem('useOfflineMode');
    setUser(null);
    setSession(null);
  };

  useEffect(() => {
    if (window.electron && (!navigator.onLine || localStorage.getItem('useOfflineMode') === 'true')) {
      setUser({ email: 'local@sweettrack.app', id: 'local-desktop-user', isLocal: true });
      setSession(null);
      setLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === 'SIGNED_IN') {
        syncLocalToCloud();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, bypassAuth, logoutOffline }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
