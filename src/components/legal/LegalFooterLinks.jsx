import { Link } from 'react-router-dom';

export function LegalFooterLinks() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-gray-500">
      <Link to="/privacy" className="font-medium text-gray-600 hover:text-green-600">
        Privacy Policy
      </Link>
      <span className="text-gray-300" aria-hidden>
        ·
      </span>
      <Link to="/terms" className="font-medium text-gray-600 hover:text-green-600">
        Terms of Service
      </Link>
    </div>
  );
}
