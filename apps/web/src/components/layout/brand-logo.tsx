import Image from "next/image";

/** Approved artwork, unchanged. Theme follows the pre-hydration root class. */
export function BrandLogo({ mark = false }: { mark?: boolean }) {
  if (mark)
    return (
      <Image
        alt=""
        src="/brand/stylus-mark.png"
        width={32}
        height={32}
        className="size-8 object-contain"
        priority
      />
    );
  return (
    <span className="brand-wordmark" aria-hidden="true">
      <Image
        alt=""
        src="/brand/stylus-logo.png"
        width={1341}
        sizes="132px"
        height={511}
        className="brand-logo-light"
        priority
      />
      <Image
        alt=""
        src="/brand/stylus-logo-light.png"
        width={1341}
        sizes="132px"
        height={511}
        className="brand-logo-dark"
        priority
      />
    </span>
  );
}
