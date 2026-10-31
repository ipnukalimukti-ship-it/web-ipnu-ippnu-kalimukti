const TZ = "Asia/Jakarta";

export function rupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Tanggal panjang, contoh: 29 Oktober 2026 */
export function tanggal(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(iso));
}

/** Nama bulan dan tahun, contoh: Oktober 2026 */
export function bulanTahun(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(iso));
}

export function hari(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: TZ }).format(
    new Date(iso),
  );
}

export function tglAngka(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", timeZone: TZ }).format(
    new Date(iso),
  );
}

export function bulanSingkat(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: TZ }).format(
    new Date(iso),
  );
}

export function jam(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  })
    .format(new Date(iso))
    .replace(".", ":");
}

/** Inisial dua huruf untuk avatar tanpa foto */
export function inisial(nama: string): string {
  const parts = nama.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

/** Kunci bulan untuk pengelompokan, contoh: 2026-10 (memakai WIB) */
export function bulanKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}
