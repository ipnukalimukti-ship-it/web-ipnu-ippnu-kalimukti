// Jenjang kaderisasi yang bisa dicentang untuk anggota.
// Kalau ranting memakai jenjang lain, ubah daftar ini lalu unggah ulang.
export const JENJANG_KADERISASI = ["Makesta", "Lakmud", "Lakut"] as const;

/** Ambil hanya jenjang yang dikenal, dengan urutan tetap (bukan urutan ketik). */
export function jenjangValid(daftar: string[] | null | undefined): string[] {
  const ada = new Set(daftar ?? []);
  return JENJANG_KADERISASI.filter((j) => ada.has(j));
}
