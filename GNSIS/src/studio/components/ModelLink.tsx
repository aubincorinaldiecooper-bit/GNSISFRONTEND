import type { ReactNode } from "react";
import { Link } from "react-router";
import type { StudioModel } from "../models";

/** A link to a model's page: client-side when it is in this bundle, a full load when Caddy serves it. */
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
  if (model.external) {
    return (
      <a href={model.href} className={className} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={model.href} className={className} {...rest}>
      {children}
    </Link>
  );
}
