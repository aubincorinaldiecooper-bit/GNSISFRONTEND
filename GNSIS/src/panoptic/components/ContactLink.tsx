import { useDialogs } from "../dialogContext";

/** "the contact form", inline in a sentence, opening the contact form. */
export function ContactLink({ source, children = "the contact form" }: { source: string; children?: string }) {
  const { openContact } = useDialogs();
  return (
    <button type="button" className="pn-linkbutton" aria-haspopup="dialog" onClick={(event) => openContact(source, event.currentTarget)}>
      {children}
    </button>
  );
}
