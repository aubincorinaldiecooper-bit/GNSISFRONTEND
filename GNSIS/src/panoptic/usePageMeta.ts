// Title, description and, while the pages are dormant, noindex, for each page.

import { useEffect } from "react";

import { isDormant } from "./config";

function setMeta(name: string, content: string): () => void {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (tag) {
    const previous = tag.content;
    tag.content = content;
    const existing = tag;
    return () => {
      existing.content = previous;
    };
  }
  tag = document.createElement("meta");
  tag.name = name;
  tag.content = content;
  document.head.appendChild(tag);
  const created = tag;
  return () => created.remove();
}

export function usePageMeta(title: string, description: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    const restore = [setMeta("description", description)];
    if (isDormant()) restore.push(setMeta("robots", "noindex, nofollow"));
    return () => {
      document.title = previousTitle;
      restore.forEach((undo) => undo());
    };
  }, [title, description]);
}
