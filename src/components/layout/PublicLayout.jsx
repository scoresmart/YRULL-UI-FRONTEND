import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { BrandMark } from '../brand/BrandMark';
import { Button } from '../ui/button';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', to: '/features' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

function NavBar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-sidebar text-sm font-bold text-brand-accent">
            Y
          </span>
          <BrandMark className="text-xl" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === l.to ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Log in
          </Link>
          <Link to="/register">
            <Button size="sm">Start free trial</Button>
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-2 md:hidden">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                pathname === l.to ? 'bg-gray-100 text-gray-900' : 'text-gray-600'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
            <Link to="/login" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-medium text-gray-600">
              Log in
            </Link>
            <Link to="/register" onClick={() => setOpen(false)}>
              <Button className="w-full" size="sm">
                Start free trial
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-gray-100 bg-brand-sidebar text-gray-400">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandMark variant="dark" className="text-lg" />
            <p className="mt-3 text-sm leading-relaxed">
              Automate Instagram, WhatsApp, and Facebook conversations from one unified inbox.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Product</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/features" className="hover:text-white">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/data-deletion" className="hover:text-white">
                  Data Deletion
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Support</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="mailto:support@yrull.com" className="hover:text-white">
                  support@yrull.com
                </a>
              </li>
              <li>
                <a href="mailto:privacy@yrull.com" className="hover:text-white">
                  privacy@yrull.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Prepsmart Pty Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
