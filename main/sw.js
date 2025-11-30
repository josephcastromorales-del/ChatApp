self.addEventListener('install', () => {
  console.log("Service Worker instalado");
});

self.addEventListener('fetch', (event) => {
  // Permite navegar incluso offline si quieres agregar cache
});
