import { getImageProps } from "next/image";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
  priority?: boolean;
};

/**
 * An optimized image without next/image's inline style attribute, which the site's
 * content security policy blocks. Size the image with className instead.
 */
export function ContentImage({ className, ...image }: Props) {
  const { props } = getImageProps(image);
  // eslint-disable-next-line @next/next/no-img-element -- getImageProps already supplies the optimized srcSet
  return <img {...props} style={undefined} alt={image.alt} className={className} />;
}
