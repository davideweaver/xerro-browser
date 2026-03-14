import { useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetch';

const API_BASE = import.meta.env.VITE_XERRO_API_URL || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeAndRegister(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();

  if (existing) {
    // Re-register existing subscription with server (in case server restarted)
    await apiFetch(`${API_BASE}/api/v1/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing.toJSON()),
    });
    return;
  }

  if (Notification.permission === 'denied') return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const keyResponse = await apiFetch(`${API_BASE}/api/v1/push/vapid-public-key`);
  if (!keyResponse.ok) return;
  const { publicKey } = await keyResponse.json();

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  await apiFetch(`${API_BASE}/api/v1/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  });
}

export function usePushNotifications(): void {
  useEffect(() => {
    subscribeAndRegister().catch((err) => {
      console.warn('Push notification setup failed:', err);
    });
  }, []);
}
