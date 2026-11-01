"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export type Peran = "pengelola" | "admin" | "sekretaris" | "bendahara";
export type Profil = { id: string; nama: string; role: Peran };

/** Pengelola dan admin boleh semuanya; peran lain hanya yang disebut. */
export function bisa(profil: Profil | null, ...peran: Peran[]): boolean {
  if (!profil) return false;
  return profil.role === "pengelola" || profil.role === "admin" || peran.includes(profil.role);
}

export function pesanError(e: unknown): string {
  const m = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (/row-level security|permission denied|izin/i.test(m)) return "Anda tidak punya izin untuk tindakan ini.";
  if (/duplicate key|unique/i.test(m)) return "Data yang sama sudah ada.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Tidak bisa terhubung ke server. Periksa internet Anda.";
  return m;
}

/** Judul berita menjadi alamat URL, ditambah 4 karakter acak supaya tidak bentrok. */
export function buatSlug(judul: string): string {
  const dasar = judul
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  const acak = Math.random().toString(36).slice(2, 6);
  return `${dasar || "berita"}-${acak}`;
}

/** Tanggal hari ini (zona waktu perangkat) sebagai YYYY-MM-DD. */
export function hariIni(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Bulan ini sebagai YYYY-MM (untuk input type="month"). */
export function bulanIni(): string {
  return hariIni().slice(0, 7);
}

/** ISO atau tanggal menjadi nilai untuk input datetime-local. */
export function keInputWaktu(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Awal dan akhir (eksklusif) bulan dari "YYYY-MM". */
export function rentangBulan(ym: string): { awal: string; akhir: string } {
  const [y, m] = ym.split("-").map(Number);
  const berikut = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { awal: `${ym}-01`, akhir: berikut };
}

/** Perkecil foto di browser (maks 1000 px, JPEG) supaya hemat kuota gratis. */
async function perkecilFoto(file: File, maks = 1000): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
  const bmp = await createImageBitmap(file);
  const skala = Math.min(1, maks / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * skala);
  const h = Math.round(bmp.height * skala);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pengolahan gambar.");
  ctx.drawImage(bmp, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal memproses gambar."))), "image/jpeg", 0.82),
  );
}

/** Unggah foto ke bucket "media" dan kembalikan alamat publiknya. */
export async function unggahFoto(db: SupabaseClient, file: File, folder: string): Promise<string> {
  const blob = await perkecilFoto(file);
  const path = `${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await db.storage.from("media").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return db.storage.from("media").getPublicUrl(path).data.publicUrl;
}

/** Hapus file di storage dari alamat publiknya. Gagal pun tidak dianggap error. */
export async function hapusFoto(db: SupabaseClient, url: string | null | undefined): Promise<void> {
  if (!url) return;
  const i = url.indexOf("/media/");
  if (i < 0) return;
  try {
    await db.storage.from("media").remove([decodeURIComponent(url.slice(i + 7))]);
  } catch {
    /* abaikan: file yatim tidak merusak apa pun */
  }
}

function sel(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Unduh CSV yang langsung terbaca di Excel Indonesia (pemisah titik koma, UTF-8). */
export function unduhCsv(namaFile: string, baris: (string | number | null | undefined)[][]): void {
  const isi = "﻿" + baris.map((b) => b.map(sel).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([isi], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Penanda "periode" untuk iuran sekali bayar (bukan bulanan). Hanya dipakai di database. */
export const PERIODE_SEKALI = "2000-01-01";

/**
 * Saldo kas tepat sebelum tanggal `awal` (YYYY-MM-DD).
 * Dihitung dari ringkasan per bulan (bukan dari semua transaksi) supaya tidak
 * terpotong oleh batas 1000 baris per permintaan.
 */
export async function saldoSebelum(db: SupabaseClient, awal: string): Promise<number> {
  const { data, error } = await db.from("kas_ringkasan_bulanan").select("masuk,keluar").lt("bulan", awal);
  if (error) throw error;
  return (data ?? []).reduce((s: number, r: { masuk: number; keluar: number }) => s + Number(r.masuk) - Number(r.keluar), 0);
}
