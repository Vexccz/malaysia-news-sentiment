// ─────────────────────────────────────────────────────────────
// Web Push subscription utilities.
//
// Flow:
//   1. Fetch VAPID public key from backend (/push/key).
//   2. Ask user for Notification permission.
//   3. registration.pushManager.subscribe() with the VAPID key.
//   4. POST subscription to /push/subscribe.
// ─────────────────────────────────────────────────────────────

import api from '../services/api';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const isPushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const getPushPermissionStatus = () =>
  typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;

export const getCurrentSubscription = async () => {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
};

export const subscribePush = async () => {
  if (!isPushSupported()) throw new Error('Push notifications not supported by this browser.');

  const reg = await navigator.serviceWorker.ready;

  // Reuse existing subscription if present.
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission denied.');

    const { data } = await api.get('/push/key');
    if (!data?.publicKey) throw new Error('Push service not configured on server.');

    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
  }

  await api.post('/push/subscribe', {
    subscription: subscription.toJSON(),
    deviceLabel: navigator.userAgent.slice(0, 120),
  });
  return subscription;
};

export const unsubscribePush = async () => {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;
  await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
  return true;
};

export const sendTestPush = async () => {
  const { data } = await api.post('/push/test');
  return data;
};

export const getPushTopics = async () => {
  const { data } = await api.get('/push/topics');
  return data.topics || [];
};

export const setPushTopics = async (topics) => {
  const { data } = await api.put('/push/topics', { topics });
  return data.topics || [];
};
