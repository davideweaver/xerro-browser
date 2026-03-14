// Service Worker for Web Push Notifications
// Place this in graphiti-browser/public/sw.js

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

// Listen for push events
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  let data = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/apple-touch-icon.png',
    badge: '/apple-touch-icon.png',
    data: { url: '/' }
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (error) {
    console.error('Error parsing push data:', error);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/apple-touch-icon.png',
    badge: data.badge || '/apple-touch-icon.png',
    data: data.data || {},
    requireInteraction: false,
    tag: 'notification-' + Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if not open
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});
