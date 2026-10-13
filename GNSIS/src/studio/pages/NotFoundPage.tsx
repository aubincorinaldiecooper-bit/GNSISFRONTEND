import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { studioHomePath } from "../config";
import { StudioFooter } from "../components/Footer";
import { StudioNav } from "../components/Nav";
import { buttonArrow, studioButton } from "../ui/variants";

export default function NotFoundPage() {
  return (
    <>
      <StudioNav />
      <main className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-center justify-center px-5 py-24 text-center sm:px-8">
        <p className="text-[13px] font-medium text-ink-3">404</p>
        <h1 className="mt-3 text-[36px] font-semibold tracking-[-0.03em] text-ink sm:text-[48px]">Page not found</h1>
        <p className="mt-3 text-[16px] text-ink-2">There’s nothing at this address.</p>
        <Link to={studioHomePath()} className={`${studioButton({ variant: "primary", size: "md" })} mt-8`}>
          Go to GNSIS
          <ArrowRight aria-hidden className={buttonArrow} />
        </Link>
      </main>
      <StudioFooter />
    </>
  );
}
