/* Yrull inbox service worker — Web Push + open-the-exact-chat on tap.
 *
 * Only notifies when the app is NOT actively on screen (phone locked, app in
 * the background, or closed). When Yrull is open and visible, the new message
 * already arrives live in the inbox, so no banner is shown. */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch (e) {
        data = { body: event.data ? event.data.text() : '' };
      }

      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const appInUse = wins.some((w) => w.visibilityState === 'visible');
      if (appInUse) {
        // The user is actively using Yrull — don't buzz them; the message shows
        // up live in the inbox. Nudge the open window to refresh, just in case.
        wins.forEach((w) => {
          try {
            w.postMessage({ type: 'yrull-new-message', wa_id: data.wa_id });
          } catch (e) {
            /* ignore */
          }
        });
        return;
      }

      const title = data.title || 'New message';
      await self.registration.showNotification(title, {
        body: data.body || '',
        tag: data.tag || 'yrull',
        renotify: true,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        data: { url: data.url || '/whatsapp', wa_id: data.wa_id || '' },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const info = event.notification.data || {};
  const waId = info.wa_id || '';
  const target = info.url || (waId ? `/whatsapp?chat=${waId}` : '/whatsapp');

  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const win of wins) {
        // An app window is already open: focus it and route it to the chat
        // in-app (no reload).
        try {
          await win.focus();
        } catch (e) {
          /* ignore */
        }
        try {
          win.postMessage({ type: 'yrull-open-chat', waId, url: target });
        } catch (e) {
          /* ignore */
        }
        return;
      }
      // Nothing open — launch the app straight at the chat.
      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })(),
  );
});
