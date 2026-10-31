import { LogoIpnu, LogoIppnu } from "./Logo";
import { inisial } from "@/lib/format";
import type { Pengurus } from "@/lib/types";

/** Kartu pengurus: foto (atau inisial), nama, dan jabatan. */
export default function PengurusCard({ p }: { p: Pengurus }) {
  const kelas = p.jenis === "IPNU" ? "ipnu" : "ippnu";
  return (
    <li className={`px-anggota px-pengurus px-anggota-${kelas}`}>
      <div className="px-foto">
        {p.foto_url ? (
          <img src={p.foto_url} alt={`Foto ${p.nama}`} loading="lazy" />
        ) : (
          <div className="px-foto-kosong" aria-hidden="true">
            {inisial(p.nama)}
          </div>
        )}
        <span className="px-foto-logo">
          {p.jenis === "IPNU" ? <LogoIpnu size={30} alt={p.jenis} /> : <LogoIppnu size={30} alt={p.jenis} />}
        </span>
      </div>
      <h3>{p.nama}</h3>
      <p className="px-jabatan">{p.jabatan}</p>
    </li>
  );
}
