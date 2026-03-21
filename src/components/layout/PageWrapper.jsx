import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/whatsapp': 'WhatsApp Inbox',
  '/contacts': 'Contacts',
  '/tags': 'Tags',
  '/audiences': 'Audiences',
  '/settings': 'Settings',
  '/admin': 'Admin Overview',
};

export function usePageTitle() {
  const { pathname } = useLocation();
  return useMemo(() => TITLES[pathname] ?? 'FlowDesk', [pathname]);
}

export function PageWrapper({ children }) {
  return <div className="fade-in">{children}</div>;
}

