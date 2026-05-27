import { createContext, useContext, useState, useCallback } from 'react';

const SidebarContext = createContext({ open: false, toggle: () => {}, close: () => {}, collapsed: false, toggleCollapse: () => {} });

export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === 'true'; } catch { return false; }
  });
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem('sidebarCollapsed', String(next)); } catch {}
      return next;
    });
  }, []);
  return (
    <SidebarContext.Provider value={{ open, toggle, close, collapsed, toggleCollapse }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
