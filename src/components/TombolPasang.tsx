"use client";

import { useEffect, useState } from "react";

type PemicuPasang = Event & { prompt: () => Promise<void> };

/** Tombol "Pasang di layar HP". Di iPhone yang tampil adalah petunjuk, karena Safari tidak punya tombol ini. */
export default function TombolPasang() {
  const [pemicu, setPemicu] = useState<PemicuPasang | null>(null);
  const [ios, setIos] = useState(false);
  const [terpasang, setTerpasang] = useState(false);

  useEffect(() => {
    const mandiri =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setTerpasang(mandiri);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !mandiri);

    const tangkap = (e: Event) => {
      e.preventDefault();
      setPemicu(e as PemicuPasang);
    };
    const selesai = () => {
      setPemicu(null);
      setTerpasang(true);
    };
    window.addEventListener("beforeinstallprompt", tangkap);
    window.addEventListener("appinstalled", selesai);
    return () => {
      window.removeEventListener("beforeinstallprompt", tangkap);
      window.removeEventListener("appinstalled", selesai);
    };
  }, []);

  if (terpasang) return null;

  if (pemicu) {
    return (
      <button
        type="button"
        className="px-pil px-pil-garis px-pil-kecil"
        onClick={async () => {
          await pemicu.prompt();
          setPemicu(null);
        }}
      >
        Pasang di layar HP
      </button>
    );
  }

  if (ios) {
    return (
      <details className="px-pasang-ios">
        <summary>Pasang di layar HP</summary>
        <p>Ketuk tombol Bagikan di Safari, lalu pilih &quot;Tambahkan ke Layar Utama&quot;.</p>
      </details>
    );
  }

  return null;
}
