"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { Halaman, Notif, type Pesan } from "@/components/admin/ui";
import { pesanError } from "@/lib/admin-util";

type Catatan = {
  id: number;
  waktu: string;
  nama: string;
  aksi: "tambah" | "ubah" | "hapus" | "masuk";
  tabel: string | null;
  ringkasan: string | null;
};

const BAGIAN: Record<string, string> = {
  members: "Anggota",
  news: "Berita",
  events: "Agenda",
  gallery_albums: "Album galeri",
  gallery_photos: "Foto galeri",
  kas_transaksi: "Kas",
  iuran_jenis: "Jenis iuran",
  iuran_pembayaran: "Iuran",
  pengurus: "Pengurus (lama)",
  periode: "Periode",
  departemen: "Departemen",
  penugasan: "Jabatan struktur",
};

const KATA_AKSI: Record<Catatan["aksi"], string> = {
  tambah: "Menambah",
  ubah: "Mengubah",
  hapus: "Menghapus",
  masuk: "Masuk",
};

const LENCANA: Record<Catatan["aksi"], string> = {
  tambah: "adm-lencana",
  ubah: "adm-lencana kuning",
  hapus: "adm-lencana merah",
  masuk: "adm-lencana abu",
};

const SEKALI = 100;

function waktuWib(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

export default function AdminAktivitas() {
  return (
    <Halaman
      judul="Aktivitas"
      hanya="pengelola"
      deskripsi="Catatan siapa menambah, mengubah, menghapus, dan masuk. Hanya Pengelola yang bisa melihat halaman ini, dan catatannya tidak bisa diubah atau dihapus dari website."
    >
      <Isi />
    </Halaman>
  );
}

function Isi() {
  const { db } = useAdmin();
  const [jumlah, setJumlah] = useState(SEKALI);
  const [data, setData] = useState<Catatan[] | null>(null);
  const [pesan, setPesan] = useState<Pesan>(null);
  const [orang, setOrang] = useState("");
  const [aksi, setAksi] = useState("");
  const [bagian, setBagian] = useState("");

  const muat = useCallback(async () => {
    const { data: baris, error } = await db
      .from("aktivitas")
      .select("id,waktu,nama,aksi,tabel,ringkasan")
      .order("waktu", { ascending: false })
      .order("id", { ascending: false })
      .limit(jumlah);
    if (error) setPesan({ t: "err", teks: pesanError(error) });
    else {
      setPesan(null);
      setData((baris ?? []) as Catatan[]);
    }
  }, [db, jumlah]);

  useEffect(() => {
    muat();
  }, [muat]);

  const namaAda = useMemo(() => Array.from(new Set((data ?? []).map((c) => c.nama))).sort(), [data]);

  const tampil = (data ?? []).filter(
    (c) => (!orang || c.nama === orang) && (!aksi || c.aksi === aksi) && (!bagian || c.tabel === bagian),
  );
  const mungkinAdaLagi = (data?.length ?? 0) >= jumlah;

  return (
    <>
      <Notif pesan={pesan} />

      <div className="adm-kartu adm-form">
        <div className="adm-baris">
          <div className="adm-field">
            <label htmlFor="f-orang">Siapa</label>
            <select id="f-orang" value={orang} onChange={(e) => setOrang(e.target.value)}>
              <option value="">Semua orang</option>
              {namaAda.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="f-aksi">Tindakan</label>
            <select id="f-aksi" value={aksi} onChange={(e) => setAksi(e.target.value)}>
              <option value="">Semua tindakan</option>
              <option value="tambah">Menambah</option>
              <option value="ubah">Mengubah</option>
              <option value="hapus">Menghapus</option>
              <option value="masuk">Masuk</option>
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="f-bagian">Bagian</label>
            <select id="f-bagian" value={bagian} onChange={(e) => setBagian(e.target.value)}>
              <option value="">Semua bagian</option>
              {Object.entries(BAGIAN).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="adm-kartu">
        {!data ? (
          <p className="adm-kosong">Memuat…</p>
        ) : tampil.length === 0 ? (
          <p className="adm-kosong">
            {data.length === 0
              ? "Belum ada aktivitas tercatat. Catatan mulai terisi sejak fitur ini dipasang."
              : "Tidak ada catatan yang cocok dengan pilihan di atas."}
          </p>
        ) : (
          <div className="adm-gulir">
            <table className="adm-tabel">
              <thead>
                <tr>
                  <th>Waktu (WIB)</th>
                  <th>Siapa</th>
                  <th>Tindakan</th>
                  <th>Bagian</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((c) => (
                  <tr key={c.id}>
                    <td>{waktuWib(c.waktu)}</td>
                    <td>{c.nama}</td>
                    <td>
                      <span className={LENCANA[c.aksi]}>{KATA_AKSI[c.aksi]}</span>
                    </td>
                    <td>{c.tabel ? (BAGIAN[c.tabel] ?? c.tabel) : "-"}</td>
                    <td>{c.ringkasan ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && mungkinAdaLagi && (
          <div className="adm-aksi" style={{ marginTop: 16 }}>
            <button className="adm-btn" onClick={() => setJumlah((j) => j + SEKALI)}>
              Tampilkan lebih banyak
            </button>
          </div>
        )}
      </div>
    </>
  );
}
