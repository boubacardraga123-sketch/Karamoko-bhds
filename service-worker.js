// KaramokoBHDS Service Worker
// Version du cache — incrémente à chaque mise à jour
const CACHE_NAME = 'karamoko-bhds-v1';

// Fichiers à mettre en cache pour le mode hors-ligne
const ASSETS = [
  './',
  './index.html',
  './carte_aventure_college_lycee.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,400&display=swap'
];

// ===== INSTALLATION =====
self.addEventListener('install', event => {
  console.log('[SW] Installation KaramokoBHDS...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Mise en cache des ressources...');
      // On met en cache les ressources locales (les fonts peuvent échouer offline, c'est ok)
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(err => console.warn('[SW] Impossible de cacher:', url, err)))
      );
    })
  );
  self.skipWaiting();
});

// ===== ACTIVATION =====
self.addEventListener('activate', event => {
  console.log('[SW] Activation KaramokoBHDS...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Suppression ancien cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ===== FETCH (stratégie Cache First pour les assets locaux) =====
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignore les requêtes non-GET
  if (event.request.method !== 'GET') return;

  // Stratégie : Cache d'abord, réseau en fallback
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Ressource trouvée dans le cache
        return cachedResponse;
      }

      // Pas dans le cache → on va chercher sur le réseau
      return fetch(event.request)
        .then(networkResponse => {
          // On met en cache les nouvelles ressources locales
          if (
            networkResponse.ok &&
            url.origin === self.location.origin
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Hors ligne et pas en cache → page de fallback
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
