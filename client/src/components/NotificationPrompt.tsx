import { useEffect, useState } from 'react';
import { getVapidKey, subscribePush } from '../api';

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'subscribing' | 'done'>('idle');

  useEffect(() => {
    // Don't show prompt if notifications aren't supported
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    // Already granted or denied — don't ask again
    if (Notification.permission !== 'default') return;

    // Wait a few seconds so it doesn't feel aggressive
    const timer = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  async function handleEnable() {
    setStatus('subscribing');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setShow(false);
        return;
      }

      const { key } = await getVapidKey();
      if (!key) {
        setShow(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      await subscribePush(subscription);
      setStatus('done');

      // Hide after a moment
      setTimeout(() => setShow(false), 2000);
    } catch (err) {
      console.error('Push subscription failed:', err);
      setShow(false);
    }
  }

  if (!show) return null;

  return (
    <div className="notification-prompt">
      {status === 'done' ? (
        <p>Notifications enabled ✓</p>
      ) : (
        <>
          <p>Want deadline reminders? We'll ping you at 9 AM and 7 PM.</p>
          <div className="prompt-actions">
            <button onClick={handleEnable} disabled={status === 'subscribing'} className="btn-enable">
              {status === 'subscribing' ? 'Setting up…' : 'Enable'}
            </button>
            <button onClick={() => setShow(false)} className="btn-dismiss">
              Not now
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}
