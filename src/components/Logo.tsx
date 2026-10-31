// Logo resmi IPNU (bulat) dan IPPNU (segitiga). Berkas gambar ada di folder public/.
type Props = { size?: number; className?: string; alt?: string };

export function LogoIpnu({ size = 40, className, alt = "Logo IPNU" }: Props) {
  return <img src="/logo-ipnu.png" alt={alt} width={size} height={size} className={className} />;
}

export function LogoIppnu({ size = 40, className, alt = "Logo IPPNU" }: Props) {
  return <img src="/logo-ippnu.png" alt={alt} width={size} height={size} className={className} />;
}
