import type { ReactNode } from "react";
import { Link } from "react-router";
import type { StudioModel } from "../models";

/** A client-side link to a model's page. */
export function ModelLink({
  model,
  className,
  children,
  ...rest
}: {
  model: StudioModel;
  className?: string;
  children: ReactNode;
  "data-menu-row"?: boolean;
}) {
  return (
    <Link to={model.href} className={className} {...rest}>
      {children}
    </Link>
  );
}
