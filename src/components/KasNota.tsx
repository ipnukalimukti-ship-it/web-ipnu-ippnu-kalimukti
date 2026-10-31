import Link from "next/link";
import { bulanTahun, rupiah } from "@/lib/format";
import type { KasSummary } from "@/lib/types";

export default function KasNota({ kas, jumlah = 3 }: { kas: KasSummary; jumlah?: number }) {
  const baris = kas.bulanan.slice(0, jumlah);
  return (
    <section className="px-kas" aria-labelledby="kas-judul">
      <h2 id="kas-judul">Kas ranting</h2>
      <p className="px-kas-label">Saldo saat ini</p>
      <p className="px-kas-saldo angka">{rupiah(kas.saldo)}</p>

      {baris.length === 0 ? (
        <p className="px-rincian" style={{ marginTop: 16 }}>
          Belum ada catatan kas.
        </p>
      ) : (
        baris.map((b) => (
          <div className="px-kas-baris" key={b.bulan}>
            <span className="px-kas-bulan">{bulanTahun(b.bulan)}</span>
            <span>Masuk</span>
            <span className="px-masuk angka">{rupiah(b.masuk)}</span>
            <span>Keluar</span>
            <span className="px-keluar angka">{rupiah(b.keluar)}</span>
          </div>
        ))
      )}

      <p className="px-kas-kaki">
        <Link href="/kas">Lihat ringkasan lengkap</Link>
      </p>
    </section>
  );
}
