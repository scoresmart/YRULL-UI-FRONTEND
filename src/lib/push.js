/* PWA push notifications: register the service worker, subscribe/unsubscribe,
 * and report the current state. On iPhone this only works once the app has been
 * added to the Home Screen (iOS 16.4+). */
import { pushApi } from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Standalone = launched from the Home Screen (how iOS requires push to run).
export function isStandalone() {
  return (
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
    (typeof navigator !== 'undefined' && navigator.standalone === true)
  );
}

export function isiOS() {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function getPushState() {
  if (!pushSupported()) return { supported: false, subscribed: false, permission: 'default' };
  let subscribed = false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    subscribed = Boolean(sub);
  } catch {
    /* ignore */
  }
  return { supported: true, subscribed, permission: Notification.permission };
}

export async function enablePush() {
  if (!pushSupported()) {
    throw new Error(
      isiOS() && !isStandalone()
        ? 'On iPhone, first add this app to your Home Screen, open it from there, then enable notifications.'
        : 'Notifications are not supported on this browser.',
    );
  }
  const { enabled, key } = await pushApi.vapidKey();
  if (!enabled || !key) throw new Error('Notifications are not configured on the server yet.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');

  await registerServiceWorker();
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }
  await pushApi.subscribe(sub.toJSON());
  return true;
}

export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      try {
        await pushApi.unsubscribe(sub.endpoint);
      } catch {
        /* server cleanup is best-effort */
      }
      await sub.unsubscribe();
    }
  } catch {
    /* ignore */
  }
  return true;
}
