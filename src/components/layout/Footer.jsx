import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <div className="mt-6 space-y-2 text-center text-xs text-gray-500">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link to="/privacy" className="font-medium text-gray-600 hover:text-green-600">
          Privacy Policy
        </Link>
        <span className="text-gray-300" aria-hidden>·</span>
        <Link to="/terms" className="font-medium text-gray-600 hover:text-green-600">
          Terms of Service
        </Link>
        <span className="text-gray-300" aria-hidden>·</span>
        <Link to="/data-deletion" className="font-medium text-gray-600 hover:text-green-600">
          Data Deletion
        </Link>
        <span className="text-gray-300" aria-hidden>·</span>
        <a href="mailto:support@yrull.com" className="font-medium text-gray-600 hover:text-green-600">
          Contact
        </a>
      </div>
      <p>&copy; 2025 Prepsmart Pty Ltd. All rights reserved.</p>
    </div>
  );
}
