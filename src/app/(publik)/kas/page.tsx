import type { Metadata } from "next";
import KasNota from "@/components/KasNota";
import PageHead from "@/components/PageHead";
import { getKasSummary } from "@/lib/data";
import { bulanTahun, rupiah } from "@/lib/format";

export const revalidate = 60;
export const metadata: Metadata = { title: "Transparansi kas" };

export default async function Kas() {
  const kas = await getKasSummary();
  const maks = Math.max(1, ...kas.bulanan.flatMap((b) => [b.masuk, b.keluar]));

  return (
    <>
      <PageHead label="Terbuka untuk anggota" judul="Transparansi kas">
        Ringkasan pemasukan dan pengeluaran kas ranting per bulan. Data iuran tiap anggota tidak
        ditampilkan di sini.
      </PageHead>
      <div className="wrap px-seksi">
        <div className="px-kas-atas">
          <KasNota kas={kas} jumlah={1} />
          <div>
            {kas.bulanan.length === 0 ? (
              <p className="px-kosong">Belum ada catatan kas.</p>
            ) : (
              <table className="px-tabel">
                <caption className="sr-only">Pemasukan dan pengeluaran kas per bulan</caption>
                <thead>
                  <tr>
                    <th scope="col">Bulan</th>
                    <th scope="col">Masuk</th>
                    <th scope="col">Keluar</th>
                  </tr>
                </thead>
                <tbody>
                  {kas.bulanan.map((b) => (
                    <tr key={b.bulan}>
                      <td>
                        {bulanTahun(b.bulan)}
                        <div className="px-batang" aria-hidden="true">
                          <i className="px-b-masuk" style={{ width: `${(b.masuk / maks) * 100}%` }} />
                          <i className="px-b-keluar" style={{ width: `${(b.keluar / maks) * 100}%` }} />
                        </div>
                      </td>
                      <td className="px-masuk angka">{rupiah(b.masuk)}</td>
                      <td className="px-keluar angka">{rupiah(b.keluar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <p className="px-catatan">Ada pertanyaan soal kas? Tanyakan langsung ke bendahara ranting.</p>
      </div>
    </>
  );
}
