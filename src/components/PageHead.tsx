/** Kepala halaman dalam: label kecil, judul besar, dan keterangan singkat. */
export default function PageHead({
  label,
  judul,
  children,
}: {
  label: string;
  judul: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="px-kepala">
      <div className="wrap">
        <p className="px-chip">{label}</p>
        <h1>{judul}</h1>
        {children && <p className="px-kepala-ket">{children}</p>}
      </div>
    </header>
  );
}
