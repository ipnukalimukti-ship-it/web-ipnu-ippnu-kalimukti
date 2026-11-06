// Desain gambar kartu (diunduh sebagai PNG). Dirender di server dengan Satori (next/og).
//
// CATATAN UNTUK MENGGANTI DESAIN:
//  - Semua ukuran dan warna ada di sini, dalam satu berkas.
//  - Satori hanya mengerti sebagian CSS: gunakan flexbox (display: "flex"), tanpa grid, dan tanpa lineClamp
//    (jumlah baris dijaga dengan fungsi aturNama dan potong).
//  - Kalau nanti memakai desain kosongan sendiri, letakkan gambar latarnya sebagai data URI di
//    `latar` lalu atur posisi tiap elemen dengan position: "absolute".
import { FONT, LOGO_IPNU, LOGO_IPPNU } from "./aset";

export type FotoKartu = { uri: string; lebar: number; tinggi: number };

export type FormatGambar = "feed" | "story";

export const UKURAN: Record<FormatGambar, { lebar: number; tinggi: number }> = {
  feed: { lebar: 1080, tinggi: 1350 },
  story: { lebar: 1080, tinggi: 1920 },
};

export const FONT_SATORI = [
  { name: "Bricolage", data: FONT.bricolage800, weight: 800 as const, style: "normal" as const },
  { name: "Bricolage", data: FONT.bricolage700, weight: 700 as const, style: "normal" as const },
  { name: "Public Sans", data: FONT.publicSans500, weight: 500 as const, style: "normal" as const },
  { name: "Public Sans", data: FONT.publicSans700, weight: 700 as const, style: "normal" as const },
];

const WARNA = {
  latar: "#050c08",
  teks: "#eef6f0",
  teks2: "#a3b9ab",
  kuning: "#f5ea14",
  tinta: "#0b1a10",
  hijau: "#1fb36a",
  garis: "rgba(255,255,255,0.22)",
};

/** Potong teks dengan "…" kalau lebih panjang dari batas. */
function potong(teks: string, maks: number): string {
  const t = teks.trim();
  return t.length <= maks ? t : `${t.slice(0, Math.max(1, maks - 1)).trimEnd()}…`;
}

/**
 * Pembuat gambar tidak bisa membatasi jumlah baris, jadi ukuran huruf nama diperkecil bertahap
 * sampai muat dalam dua baris. Kalau masih terlalu panjang, namanya dipotong dengan "…".
 * Lebar rata-rata huruf Bricolage tebal sekitar 0,55 x ukuran huruf.
 */
function aturNama(nama: string, lebarTersedia: number, ukuranAwal: number): { teks: string; ukuran: number } {
  const t = nama.trim();
  const muat = (ukuran: number) => Math.floor(((lebarTersedia / (0.55 * ukuran)) * 2) * 0.82);
  for (const ukuran of [ukuranAwal, 64, 56, 48, 42]) {
    if (ukuran > ukuranAwal) continue;
    if (t.length <= muat(ukuran)) return { teks: t, ukuran };
  }
  return { teks: potong(t, muat(42)), ukuran: 42 };
}

export type IsiKartu = {
  format: FormatGambar;
  nama: string;
  jenis: "IPNU" | "IPPNU";
  /** Foto (data URI dan ukurannya), atau null kalau tidak ada (diganti inisial). */
  foto: FotoKartu | null;
  inisial: string;
  /** Hanya untuk pengurus. */
  jabatan?: string;
  /** Baris keterangan di bawah nama, misalnya departemen dan periode. */
  keterangan?: string[];
  moto?: string | null;
  kaderisasi?: string[];
  /** Contoh: ["Instagram @nama", "TikTok @nama"]. Hanya yang sudah diizinkan tampil. */
  medsos?: string[];
  /** Alamat website untuk tulisan kecil di bawah. */
  host: string;
};

export function KartuGambar(k: IsiKartu) {
  const { lebar, tinggi } = UKURAN[k.format];
  const story = k.format === "story";
  const pad = story ? 88 : 72;
  const nama = aturNama(k.nama, lebar - pad * 2, story ? 84 : 72);
  // Foto mengalah kalau isi kartu banyak: tiap bagian isi mengurangi tinggi foto, dengan batas bawah.
  const beban =
    (nama.teks.length > 24 ? 1 : 0) +
    (k.moto ? Math.ceil(Math.min(k.moto.length, 130) / 40) : 0) +
    (k.kaderisasi && k.kaderisasi.length > 0 ? 1 : 0) +
    (k.medsos ? Math.min(k.medsos.length, 2) : 0) +
    (k.keterangan?.length ?? 0);
  const tinggiFoto = story
    ? Math.max(620, 880 - 45 * beban)
    : Math.max(400, 640 - 50 * beban);
  // Ukuran bagian dalam bingkai foto (dikurangi garis tepi 6px di kiri dan kanan).
  const lebarDalam = lebar - pad * 2 - 12;
  const tinggiDalam = tinggiFoto - 12;
  const logoOrg = k.jenis === "IPNU" ? LOGO_IPNU : LOGO_IPPNU;

  return (
    <div
      style={{
        width: lebar,
        height: tinggi,
        display: "flex",
        flexDirection: "column",
        padding: pad,
        color: WARNA.teks,
        fontFamily: "Public Sans",
        backgroundColor: WARNA.latar,
        backgroundImage:
          "radial-gradient(circle at 12% 0%, rgba(31,179,106,0.38), rgba(5,12,8,0) 55%), radial-gradient(circle at 100% 8%, rgba(245,234,20,0.16), rgba(5,12,8,0) 45%), radial-gradient(circle at 50% 110%, rgba(31,179,106,0.22), rgba(5,12,8,0) 55%)",
      }}
    >
      {/* Kepala: logo dan nama organisasi */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: story ? 52 : 36 }}>
        <img src={LOGO_IPNU} width={84} height={84} style={{ marginRight: 14 }} />
        <img src={LOGO_IPPNU} width={84} height={84} style={{ marginRight: 24 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Bricolage", fontWeight: 800, fontSize: 42, lineHeight: 1 }}>IPNU IPPNU</div>
          <div style={{ fontWeight: 500, fontSize: 28, color: WARNA.teks2, marginTop: 6 }}>Ranting Kalimukti</div>
        </div>
      </div>

      {/* Foto */}
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: tinggiFoto,
          borderRadius: 48,
          overflow: "hidden",
          border: `6px solid ${WARNA.kuning}`,
          backgroundColor: "#0f6b3c",
          backgroundImage: "linear-gradient(160deg, #1a9a5b, #07391f)",
        }}
      >
        {k.foto ? (
          // Pembuat gambar mengabaikan object-position, jadi posisi dihitung sendiri:
          // foto memenuhi bingkai, rata tengah ke samping, dan 22% dari atas supaya wajah tidak terpotong.
          (() => {
            const skala = Math.max(lebarDalam / k.foto.lebar, tinggiDalam / k.foto.tinggi);
            const w = Math.round(k.foto.lebar * skala);
            const h = Math.round(k.foto.tinggi * skala);
            return (
              <img
                src={k.foto.uri}
                width={w}
                height={h}
                style={{
                  position: "absolute",
                  left: Math.round((lebarDalam - w) * 0.5),
                  top: Math.round((tinggiDalam - h) * 0.22),
                }}
              />
            );
          })()
        ) : (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Bricolage",
              fontWeight: 800,
              fontSize: story ? 300 : 240,
              color: "rgba(255,255,255,0.92)",
            }}
          >
            {k.inisial}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            right: 28,
            bottom: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 132,
            height: 132,
            borderRadius: 66,
            backgroundColor: "rgba(5,12,8,0.82)",
            border: `2px solid ${WARNA.garis}`,
          }}
        >
          <img src={logoOrg} width={100} height={100} />
        </div>
      </div>

      {/* Nama (paling banyak dua baris, lalu dipotong "...") */}
      <div
        style={{
          display: "flex",
          marginTop: story ? 48 : 34,
          fontFamily: "Bricolage",
          fontWeight: 800,
          fontSize: nama.ukuran,
          lineHeight: 1.05,
          letterSpacing: -1.5,
        }}
      >
        {nama.teks}
      </div>

      {/* Jabatan dan organisasi */}
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: 24 }}>
        {k.jabatan && (
          <div
            style={{
              display: "flex",
              padding: "10px 30px",
              marginRight: 14,
              marginBottom: 12,
              borderRadius: 999,
              backgroundColor: WARNA.kuning,
              color: WARNA.tinta,
              fontWeight: 700,
              fontSize: 34,
            }}
          >
            {potong(k.jabatan, 34)}
          </div>
        )}
        <div
          style={{
            display: "flex",
            padding: "10px 30px",
            marginRight: 14,
            marginBottom: 12,
            borderRadius: 999,
            border: `2px solid ${WARNA.garis}`,
            fontWeight: 700,
            fontSize: 34,
          }}
        >
          {k.jenis}
        </div>
      </div>

      {k.keterangan?.map((t, i) => (
        <div key={i} style={{ display: "flex", fontSize: 32, color: WARNA.teks2, marginTop: i === 0 ? 4 : 6 }}>
          {t}
        </div>
      ))}

      {k.moto && (
        <div
          style={{
            display: "flex",
            marginTop: 30,
            paddingLeft: 28,
            borderLeft: `8px solid ${WARNA.kuning}`,
            fontFamily: "Bricolage",
            fontWeight: 700,
            fontSize: 38,
            lineHeight: 1.3,
            color: WARNA.kuning,
          }}
        >
          {`“${potong(k.moto, 130)}”`}
        </div>
      )}

      {k.kaderisasi && k.kaderisasi.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 26 }}>
          {k.kaderisasi.map((j) => (
            <div
              key={j}
              style={{
                display: "flex",
                padding: "6px 22px",
                marginRight: 12,
                borderRadius: 999,
                border: `2px solid ${WARNA.kuning}`,
                color: WARNA.kuning,
                fontWeight: 700,
                fontSize: 28,
              }}
            >
              {j}
            </div>
          ))}
        </div>
      )}

      {k.medsos && k.medsos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 22, fontSize: 30, fontWeight: 700 }}>
          {k.medsos.map((m, i) => (
            <div key={i} style={{ display: "flex", marginRight: 30 }}>
              {m}
            </div>
          ))}
        </div>
      )}

      {/* Penutup */}
      <div style={{ display: "flex", flexGrow: 1 }} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 22,
          borderTop: `2px solid ${WARNA.garis}`,
          fontSize: 28,
          fontWeight: 500,
          color: WARNA.teks2,
        }}
      >
        <div style={{ display: "flex" }}>{k.host}</div>
        <div style={{ display: "flex", color: WARNA.kuning, fontWeight: 700 }}>Kenali kami</div>
      </div>
    </div>
  );
}
