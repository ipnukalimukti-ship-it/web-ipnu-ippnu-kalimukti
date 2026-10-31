// Penanganan username Instagram dan TikTok.
// Yang disimpan di database hanya username. Tautan dibuat di sini setelah divalidasi,
// jadi isi database yang aneh tidak pernah menjadi tautan berbahaya.

export type Platform = "instagram" | "tiktok";

const POLA = /^[A-Za-z0-9._]{1,30}$/;

/** Username yang aman dipakai untuk membuat tautan, atau null kalau tidak valid. */
export function usernameAman(v: string | null | undefined): string | null {
  const s = (v ?? "").trim().replace(/^@/, "");
  return POLA.test(s) ? s : null;
}

export function tautanMedsos(platform: Platform, username: string): string {
  return platform === "instagram"
    ? `https://www.instagram.com/${username}/`
    : `https://www.tiktok.com/@${username}`;
}

/**
 * Untuk formulir admin. Menerima "@user", "user", atau alamat profil lengkap.
 * Kosong menghasilkan null. Isi yang tidak valid melempar Error dengan pesan yang jelas.
 */
export function bacaUsername(input: string, platform: Platform): string | null {
  let s = input.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || /(instagram|tiktok)\.com/i.test(s)) {
    try {
      const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
      s = u.pathname.split("/").filter(Boolean)[0] ?? "";
    } catch {
      /* dibiarkan, divalidasi di bawah */
    }
  }
  s = s.replace(/^@/, "");
  if (!POLA.test(s)) {
    const nama = platform === "instagram" ? "Instagram" : "TikTok";
    throw new Error(`Username ${nama} tidak valid. Tulis username saja, misalnya @namaanda.`);
  }
  return s;
}
