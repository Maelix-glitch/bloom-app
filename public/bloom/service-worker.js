// Bloom PWA Service Worker - v8 Clean Brand New 4
const CACHE_NAME = 'bloom-v10-clean-brand-new-4';
const STATIC_ASSETS = [
  './',
  './index.html',
  './mood.html',
  './trackers.html',
  './cycle.html',
  './manifest.json',
  './js/supabase.js',
  './js/habits.js',
  './js/trackers.js',
  './js/auth.js',
  './css/main.css',
  './css/habits.css',
  './css/auth.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {cache: 'reload'}))).catch(err=>{
        console.log('[SW] Cache addAll error', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate - clean old caches');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Deleting old cache', k);
        return caches.delete(k);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // NEVER cache Supabase API - always network
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) {
    return;
  }
  if (url.pathname.includes('/rest/') || url.pathname.includes('/auth/') || url.pathname.includes('/storage/') || url.pathname.includes('/realtime/')) {
    return;
  }

  // Navigation: network first, fallback to cache / index
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(res => {
        // Cache successful navigation
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      }).catch(() => {
        return caches.match('./index.html').then(cached => cached || caches.match('/index.html'));
      })
    );
    return;
  }

  // Static: cache first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Handle push for future reminders
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Bloom', body: 'Time to log your habits!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      backgroundColor: '#14151F'
    })
  );
});
