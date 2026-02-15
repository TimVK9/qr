const CACHE_NAME = 'qr-generator-v1';
const urlsToCache = [
    '/',
    '/static/css/style.css',
    '/static/js/script.js',
    '/static/favicon/favicon.ico',
    '/static/favicon/apple-icon-180x180.png',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// Установка Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Кэш открыт');
                return cache.addAll(urlsToCache);
            })
    );
});

// Активация и очистка старого кэша
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Стратегия кэширования: сначала сеть, потом кэш
self.addEventListener('fetch', event => {
    // Не кэшировать POST запросы
    if (event.request.method === 'POST') {
        return;
    }
    
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Клонируем ответ, так как его можно использовать только один раз
                const responseClone = response.clone();
                
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then(response => {
                    if (response) {
                        return response;
                    }
                    // Если страница не в кэше и нет сети
                    if (event.request.mode === 'navigate') {
                        return caches.match('/');
                    }
                    return new Response('Нет подключения к интернету', {
                        status: 404,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                });
            })
    );
});

// Обработка push-уведомлений (опционально)
self.addEventListener('push', event => {
    const title = 'QR Генератор';
    const options = {
        body: event.data.text(),
        icon: '/static/favicon/android-icon-192x192.png',
        badge: '/static/favicon/favicon-32x32.png'
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
});