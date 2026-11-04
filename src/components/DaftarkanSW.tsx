"use client";

import { useEffect } from "react";

/** Mendaftarkan pelayan layanan sederhana (public/sw.js) supaya website bisa dipasang di HP. */
export default function DaftarkanSW() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* tidak masalah kalau gagal, website tetap jalan */
      });
    }
  }, []);
  return null;
}
