// ===========================================================================
// Service Worker Minimal — Network Only (SIN CACHE)
// ===========================================================================
// Este SW existe ÚNICAMENTE para habilitar la instalación de la PWA.
// No intercepta ni cachea ningún recurso.
// Todas las peticiones van directo a la red.
//
// Si deseas remover la PWA en el futuro, simplemente borra este archivo
// y el manifest.webmanifest. No hay cache que limpiar.
// ===========================================================================

const SW_VERSION = '1.0.0';

// Activar inmediatamente sin esperar a que se cierren otras pestañas
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Limpiar CUALQUIER cache que pudiera existir de implementaciones previas
    caches
      .keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});