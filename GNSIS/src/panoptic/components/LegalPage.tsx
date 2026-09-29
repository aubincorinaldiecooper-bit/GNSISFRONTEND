// The frame for Privacy and Terms: the same nav and footer, one readable column.

import type { ReactNode } from "react";

import type { PageId } from "../config";
import type { PageMeta } from "../pageMeta";
import { usePageMeta } from "../usePageMeta";
import { Footer } from "./Footer";
import { Nav } from "./Nav";

export function LegalPage({
  page,
  title,
  meta,
  updated,
  children,
}: {
  page: PageId;
  /** The heading on the page. */
  title: string;
  /** Tab title and description, shared with the build (pageMeta.ts). */
  meta: PageMeta;
  updated: string;
  children: ReactNode;
}) {
  usePageMeta(meta.title, meta.description);
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
