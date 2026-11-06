import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { FONT_SATORI, UKURAN, type FormatGambar } from "./kartu";

export type FotoGambar = { uri: string; lebar: number; tinggi: number };

/** Membaca lebar dan tinggi gambar langsung dari kepala berkasnya (JPEG, PNG, GIF). */
function ukuranGambar(buf: Buffer): { lebar: number; tinggi: number; mime: string } | null {
  // PNG: lebar dan tinggi ada di blok IHDR (byte 16 dan 20).
  if (buf.length > 24 && buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return { mime: "image/png", lebar: buf.readUInt32BE(16), tinggi: buf.readUInt32BE(20) };
  }
  // GIF: byte 6 dan 8, urutan kecil dulu.
  if (buf.length > 10 && buf.subarray(0, 3).toString("latin1") === "GIF") {
    return { mime: "image/gif", lebar: buf.readUInt16LE(6), tinggi: buf.readUInt16LE(8) };
  }
  // JPEG: cari penanda SOF yang memuat ukuran.
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i += 1;
        continue;
      }
      const tanda = buf[i + 1];
      if (tanda >= 0xc0 && tanda <= 0xcf && tanda !== 0xc4 && tanda !== 0xc8 && tanda !== 0xcc) {
        return { mime: "image/jpeg", tinggi: buf.readUInt16BE(i + 5), lebar: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

/**
 * Mengambil foto dan mengubahnya menjadi data URI supaya bisa ditempel ke gambar.
 * Hanya foto dari penyimpanan Supabase milik website ini yang diambil.
 * Format yang tidak didukung pembuat gambar (misalnya WebP) mengembalikan null, dan kartu memakai inisial.
 */
export async function ambilFoto(url: string | null): Promise<FotoGambar | null> {
  if (!url) return null;
  try {
    const sumber = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!sumber) return null;
    const u = new URL(url);
    if (u.hostname !== new URL(sumber).hostname) return null;

    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > 6 * 1024 * 1024) return null;

    const uk = ukuranGambar(buf);
    if (!uk || uk.lebar < 1 || uk.tinggi < 1) return null;

    return { uri: `data:${uk.mime};base64,${buf.toString("base64")}`, lebar: uk.lebar, tinggi: uk.tinggi };
  } catch {
    return null;
  }
}

/** Nama berkas yang aman, contoh: kartu-ahmad-fauzan-feed.png */
export function namaBerkas(nama: string, format: FormatGambar): string {
  const slug = nama
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `kartu-${slug || "anggota"}-${format}.png`;
}

export function bacaFormat(v: string | null): FormatGambar {
  return v === "story" ? "story" : "feed";
}

/** Membuat respons PNG dengan pengaturan cache. Kalau unduh=true, browser langsung mengunduhnya. */
export function responsGambar(
  elemen: ReactElement,
  format: FormatGambar,
  berkas: string,
  unduh: boolean,
): ImageResponse {
  const { lebar, tinggi } = UKURAN[format];
  const headers: Record<string, string> = {
    // Disimpan sebentar di browser dan sehari di CDN, jadi permintaan berulang tidak membebani server.
    "Cache-Control": "public, max-age=600, s-maxage=86400, stale-while-revalidate=86400",
    "Content-Disposition": `${unduh ? "attachment" : "inline"}; filename="${berkas}"`,
  };
  return new ImageResponse(elemen, { width: lebar, height: tinggi, fonts: FONT_SATORI, headers });
}
