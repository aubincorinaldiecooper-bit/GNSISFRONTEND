// The frame for Privacy and Terms: the same nav and footer, one readable column.

import type { ReactNode } from "react";

import type { PageId } from "../config";
import { usePageMeta } from "../usePageMeta";
import { Footer } from "./Footer";
import { Nav } from "./Nav";

export function LegalPage({
  page,
  title,
  description,
  updated,
  children,
}: {
  page: PageId;
  title: string;
  description: string;
  updated: string;
  children: ReactNode;
}) {
  usePageMeta(`${title} — Panoptic`, description);
  return (
    <div className="pn-page">
      <div className="pn-wrap">
        <Nav page={page} />
      </div>
      <main className="pn-wrap pn-legal">
        <div className="pn-legal-head">
          <h1 className="pn-legal-title">{title}</h1>
          <p className="pn-legal-updated">Last updated {updated}</p>
        </div>
        <div className="pn-legal-body">{children}</div>
      </main>
      <Footer page={page} />
    </div>
  );
}
