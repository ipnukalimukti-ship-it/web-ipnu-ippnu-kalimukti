import { bulanSingkat, hari, jam, tglAngka } from "@/lib/format";
import type { EventItem } from "@/lib/types";

export default function AgendaList({ events }: { events: EventItem[] }) {
  if (events.length === 0) {
    return <p className="px-kosong">Belum ada agenda yang dijadwalkan.</p>;
  }
  return (
    <ul className="px-agenda">
      {events.map((e) => (
        <li key={e.id} className="px-agenda-item">
          <time className="px-tgl" dateTime={e.mulai}>
            <span className="px-tgl-angka angka">{tglAngka(e.mulai)}</span>
            <span className="px-tgl-bulan">{bulanSingkat(e.mulai)}</span>
          </time>
          <div>
            <h3>{e.judul}</h3>
            <p className="px-rincian">
              {hari(e.mulai)}, pukul {jam(e.mulai)} WIB
              {e.lokasi ? `, ${e.lokasi}` : ""}
            </p>
            {e.deskripsi && <p className="px-rincian">{e.deskripsi}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
