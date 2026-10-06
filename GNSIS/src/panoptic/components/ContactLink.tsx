import { Button } from "@/components/ui/button";
import { useDialogs } from "../dialogContext";

/** "the contact form", inline in a sentence, opening the contact form. */
export function ContactLink({ source, children = "the contact form" }: { source: string; children?: string }) {
  const { openContact } = useDialogs();
  return (
    <Button variant="quiet" type="button" className="px-0 py-0 underline-offset-4 hover:underline" aria-haspopup="dialog" onClick={(event) => openContact(source, event.currentTarget)}>
      {children}
    </Button>
  );
}
