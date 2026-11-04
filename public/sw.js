// Pelayan layanan sederhana. Tujuannya hanya supaya website bisa dipasang di layar HP.
// Tidak menyimpan (cache) apa pun, jadi data yang tampil selalu yang terbaru.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
