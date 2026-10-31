import type { Metadata } from "next";
import AgendaList from "@/components/AgendaList";
import PageHead from "@/components/PageHead";
import { getUpcomingEvents } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = { title: "Agenda" };

export default async function Agenda() {
  const events = await getUpcomingEvents(50);
  return (
    <>
      <PageHead label="Jadwal kegiatan" judul="Agenda">
        Kegiatan yang akan datang. Waktu memakai WIB.
      </PageHead>
      <div className="wrap px-seksi">
        <div style={{ maxWidth: 720 }}>
          <AgendaList events={events} />
        </div>
      </div>
    </>
  );
}
