/**
 * Perkecil foto di browser: sisi terpanjang maksimal 1080 px, JPEG, dan di bawah 900 KB.
 * Mengubah ke JPEG juga membuang data lokasi (EXIF) dari foto.
 */
export async function perkecilFoto(file: File, maks = 1080, batasByte = 900 * 1024): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
  const bmp = await createImageBitmap(file);

  let sisi = maks;
  for (let percobaan = 0; percobaan < 4; percobaan++) {
    const skala = Math.min(1, sisi / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * skala));
    const h = Math.max(1, Math.round(bmp.height * skala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung pengolahan gambar.");
    ctx.drawImage(bmp, 0, 0, w, h);

    const mutu = [0.82, 0.72, 0.62, 0.55][percobaan];
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", mutu));
    if (!blob) throw new Error("Gagal memproses gambar.");
    if (blob.size <= batasByte) return blob;
    sisi = Math.round(sisi * 0.8); // masih terlalu besar: kecilkan lagi
  }
  throw new Error("Foto terlalu besar. Coba foto lain.");
}
