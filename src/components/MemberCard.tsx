import { LogoIpnu, LogoIppnu } from "./Logo";
import { inisial, tanggal } from "@/lib/format";
import type { Member } from "@/lib/types";

/** Kartu anggota: foto (atau inisial), nama, tempat dan tanggal lahir. */
export default function MemberCard({ m }: { m: Member }) {
  const kelas = m.jenis === "IPNU" ? "ipnu" : "ippnu";
  const ttl = [m.tempat_lahir, m.tanggal_lahir ? tanggal(m.tanggal_lahir) : null]
    .filter(Boolean)
    .join(", ");

  return (
    <li className={`px-anggota px-anggota-${kelas}`}>
      <div className="px-foto">
        {m.foto_url ? (
          <img src={m.foto_url} alt={`Foto ${m.nama}`} loading="lazy" />
        ) : (
          <div className="px-foto-kosong" aria-hidden="true">
            {inisial(m.nama)}
          </div>
        )}
        <span className="px-foto-logo">
          {m.jenis === "IPNU" ? (
            <LogoIpnu size={30} alt="IPNU" />
          ) : (
            <LogoIppnu size={30} alt="IPPNU" />
          )}
        </span>
      </div>
      <h3>{m.nama}</h3>
      {ttl && <p>{ttl}</p>}
    </li>
  );
}
