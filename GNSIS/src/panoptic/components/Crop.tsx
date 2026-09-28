// A window onto one of the two photos. The prototype draws every thumbnail,
// phone screen and product photo this way: the whole image, absolutely
// placed and sized in percentages, inside a box that clips it. The numbers
// come straight from the design source.

import type { CSSProperties, ReactNode } from "react";

export const SUMMIT = "/images/panoptic/summit.jpg";
export const KICKFLIP = "/images/panoptic/kickflip.jpg";

export interface CropSpec {
  src: string;
  /** Image width as a percentage of the box. */
  width: number;
  left: number;
  top: number;
  opacity?: number;
}

function cropStyle({ width, left, top, opacity }: CropSpec): CSSProperties {
  return { width: `${width}%`, left: `${left}%`, top: `${top}%`, opacity };
}

export function Crop({
  spec,
  aspect,
  className,
  style,
  children,
}: {
  spec: CropSpec;
  aspect?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <span className={className ? `pn-crop ${className}` : "pn-crop"} style={aspect ? { aspectRatio: aspect, ...style } : style}>
      <img src={spec.src} alt="" loading="lazy" decoding="async" style={cropStyle(spec)} />
      {children}
    </span>
  );
}
