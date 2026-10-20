import { api } from './api';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isIOS(): boolean {
  return (
    ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return await reg.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<{ success: boolean; message?: string }> {
  if (!isPushSupported()) {
    return { success: false, message: 'Web Push is not supported in this browser.' };
  }

  if (isIOS() && !isStandalone()) {
    return {
      success: false,
      message: 'On iPhone/iPad, Web Push requires installing the app to your Home Screen first (tap Share > Add to Home Screen).'
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, message: 'Notification permission was denied or dismissed.' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const { public_key } = await api.getVapidPublicKey();
    if (!public_key) {
      throw new Error('VAPID public key not configured on backend.');
    }

    const applicationServerKey = urlBase64ToUint8Array(public_key);
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as unknown as BufferSource,
    });

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      throw new Error('Malformed push subscription received from browser.');
    }

    await api.subscribePush({
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      },
      user_agent: navigator.userAgent,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Push subscription failed:', err);
    return { success: false, message: err.message || 'Failed to subscribe to push notifications.' };
  }
}

export async function unsubscribeFromPush(): Promise<{ success: boolean; message?: string }> {
  try {
    const sub = await getCurrentPushSubscription();
    if (sub) {
      const subJson = sub.toJSON();
      if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
        await api.unsubscribePush({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
        });
      }
      await sub.unsubscribe();
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to unsubscribe.' };
  }
}
