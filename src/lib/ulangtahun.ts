import type { Member } from "./types";

export type UlangTahun = {
  id: string;
  nama: string;
  jenis: Member["jenis"];
  hari: number;
  hariIni: boolean;
};

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Anggota yang berulang tahun pada bulan berjalan (waktu WIB). Hanya hari dan bulan yang dipakai. */
export function ulangTahunBulanIni(
  anggota: Pick<Member, "id" | "nama" | "jenis" | "tanggal_lahir">[],
  sekarang: Date = new Date(),
): { namaBulan: string; daftar: UlangTahun[] } {
  const wib = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(sekarang); // contoh: 2026-11-03
  const bulan = wib.slice(5, 7);
  const hariIni = Number.parseInt(wib.slice(8, 10), 10);

  const daftar = anggota
    .filter((a) => a.tanggal_lahir && a.tanggal_lahir.slice(5, 7) === bulan)
    .map((a) => {
      const hari = Number.parseInt((a.tanggal_lahir as string).slice(8, 10), 10);
      return { id: a.id, nama: a.nama, jenis: a.jenis, hari, hariIni: hari === hariIni };
    })
    .sort((a, b) => a.hari - b.hari || a.nama.localeCompare(b.nama));

  return { namaBulan: BULAN[Number.parseInt(bulan, 10) - 1], daftar };
}
