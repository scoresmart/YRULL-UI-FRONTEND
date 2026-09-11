import { useEffect } from 'react';

export function useDocumentTitle(title, description) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — Yrull` : 'Yrull — Automate every customer conversation';

    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute('content') ?? '';
    if (description) {
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);
    }

    return () => {
      document.title = prev;
      if (metaDesc && prevDesc) metaDesc.setAttribute('content', prevDesc);
    };
  }, [title, description]);
}
