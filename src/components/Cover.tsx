import { LogoIpnu, LogoIppnu } from "./Logo";

/** Gambar sampul. Kalau belum ada foto, tampil latar hijau dengan logo samar. */
export default function Cover({ url, alt = "" }: { url: string | null; alt?: string }) {
  if (url) {
    return <img className="px-cover" src={url} alt={alt} loading="lazy" />;
  }
  return (
    <div className="px-cover px-cover-kosong" aria-hidden="true">
      <LogoIpnu size={96} alt="" />
      <LogoIppnu size={96} alt="" />
    </div>
  );
}
