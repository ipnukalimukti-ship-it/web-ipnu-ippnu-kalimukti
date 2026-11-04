import type { Metadata } from "next";
import FormDaftar from "@/components/FormDaftar";
import PageHead from "@/components/PageHead";

export const metadata: Metadata = { title: "Daftar jadi anggota" };

export default function Daftar() {
  return (
    <>
      <PageHead label="Bergabung" judul="Daftar jadi anggota">
        Isi formulir ini. Pengurus akan menghubungi Anda lewat nomor yang Anda isi.
      </PageHead>
      <div className="wrap px-seksi">
        <FormDaftar />
      </div>
    </>
  );
}
