import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/authClient";
import { authBaseUrl } from "@/lib/env";
import { DEVELOPERS_GNSIS01_META, DEVELOPERS_PANOPTIC_META } from "@/panoptic/pageMeta";
import { usePageMeta } from "@/panoptic/usePageMeta";
import { developerPath } from "../config";
import { developerPageData, type DeveloperFeature } from "../developers";
import type { ModelId } from "../models";
import { useEarlyAccess } from "../earlyAccess";
import { StudioFooter } from "../components/Footer";
import { StudioNav } from "../components/Nav";
import { Eyebrow, RevealSection, RiseLines } from "../components/Reveal";
import { StatusPill } from "../ui/StatusPill";
import { buttonArrow, studioButton } from "../ui/variants";

function FeatureRow({ feature }: { feature: DeveloperFeature }) {
  const content = (
    <>
      <div className="min-w-0">
        <h3 className="font-medium text-ink">{feature.name}</h3>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{feature.description}</p>
      </div>
      <StatusPill tone={feature.available ? "ok" : "neutral"} className="shrink-0">
        {feature.available ? "Available" : "Not yet open"}
      </StatusPill>
    </>
  );
  const className =
    "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-3 py-4 transition-colors hover:bg-hover sm:gap-6";

  return feature.docsUrl ? (
    <a href={feature.docsUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

export default function DevelopersPage({ modelId }: { modelId: ModelId }) {
  const { open } = useEarlyAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const [connectingGitHub, setConnectingGitHub] = useState(false);
  const [githubError, setGitHubError] = useState(false);
  const content = developerPageData(modelId);
  const meta = modelId === "panoptic" ? DEVELOPERS_PANOPTIC_META : DEVELOPERS_GNSIS01_META;
  usePageMeta(meta.title, meta.description);

  const openForLinkedGitHub = useCallback(async (placement: "hero" | "closing") => {
    const base = authBaseUrl();
    if (!base) return false;
    const response = await fetch(`${base}/api/accounts/developer-identity`, { credentials: "include" });
    if (!response.ok) return false;
    const identity = await response.json() as { email?: unknown };
    if (typeof identity.email !== "string") return false;
    open(`developers-${modelId}:${placement}`, modelId, identity.email);
    return true;
  }, [modelId, open]);

  useEffect(() => {
    const placement = new URLSearchParams(location.search).get("developerRequest");
    if (placement !== "hero" && placement !== "closing") return;
    navigate(location.pathname, { replace: true });
    void openForLinkedGitHub(placement)
      .then((opened) => setGitHubError(!opened))
      .catch(() => setGitHubError(true));
  }, [location.pathname, location.search, navigate, openForLinkedGitHub]);

  const startDeveloperRequest = async (placement: "hero" | "closing") => {
    if (connectingGitHub) return;
    setConnectingGitHub(true);
    setGitHubError(false);
    try {
      if (!authBaseUrl()) throw new Error("Authentication is not configured");
      if (await openForLinkedGitHub(placement)) return;
      const callback = new URL(location.pathname, window.location.origin);
      callback.searchParams.set("developerRequest", placement);
      const session = await authClient.getSession();
      const result = session.data
        ? await authClient.linkSocial({ provider: "github", callbackURL: callback.toString() })
        : await authClient.signIn.social({
            provider: "github",
            callbackURL: callback.toString(),
            errorCallbackURL: `${window.location.origin}${location.pathname}?githubError=oauth`,
          });
      if (result.error) throw new Error("GitHub connection failed");
    } catch {
      setGitHubError(true);
    } finally {
      setConnectingGitHub(false);
    }
  };

  return (
    <div className="relative overflow-x-clip">
      <StudioNav />
      <main className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <section aria-labelledby="developers-title" className="pb-16 pt-10 sm:pb-20 sm:pt-16">
          <nav
            aria-label="Developer pages"
            className="inline-flex rounded-full bg-inset p-1 shadow-hairline"
          >
            {(["panoptic", "gnsis-01"] as const).map((id) => {
              const model = developerPageData(id).model;
              const current = id === modelId;
              return (
                <Link
                  key={id}
                  to={developerPath(id)}
                  aria-current={current ? "page" : undefined}
                  className={cn("relative rounded-full px-4 py-2.5 text-[13px] font-medium transition-colors hover:text-ink", current ? "text-ink" : "text-ink-3")}
                >
                  {current && (
                    <motion.span
                      aria-hidden
                      layoutId="developer-page-tab"
                      className="absolute inset-0 rounded-full bg-surface shadow-raised"
                      transition={{ type: "spring", stiffness: 520, damping: 42 }}
                    />
                  )}
                  <span className="relative">{model.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-14 max-w-3xl sm:mt-20">
            <Eyebrow>{content.eyebrow}</Eyebrow>
            <h1
              id="developers-title"
              className="mt-5 font-display text-[52px] font-light leading-[1.02] tracking-[-0.04em] text-ink sm:text-[76px]"
            >
              <RiseLines lines={content.headingLines} delay={0.05} />
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-ink-2">{content.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => void startDeveloperRequest("hero")}
                disabled={connectingGitHub}
                className={studioButton({ variant: "primary", size: "lg" })}
              >
                {connectingGitHub ? "Connecting GitHub…" : "Request with GitHub"}
                <ArrowRight aria-hidden className={buttonArrow} />
              </motion.button>
              <a
                href={content.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={studioButton({ variant: "secondary", size: "lg" })}
              >
                Read the docs
                <ExternalLink aria-hidden className="size-4" />
              </a>
            </div>
            {(githubError || new URLSearchParams(location.search).has("githubError")) && (
              <p role="alert" className="mt-3 text-[13px] text-[oklch(0.55_0.19_25)]">
                GitHub sign-in didn’t complete. Please try again.
              </p>
            )}
          </div>
        </section>

        <RevealSection aria-labelledby="developer-features-title" className="border-t border-line py-16 sm:py-20">
          <h2
            id="developer-features-title"
            className="font-display text-[36px] leading-[1.08] tracking-[-0.015em] text-ink sm:text-[48px]"
          >
            What you get
          </h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {content.features.map((feature) => (
              <FeatureRow key={feature.name} feature={feature} />
            ))}
          </div>
        </RevealSection>

        <RevealSection aria-labelledby="developer-access-title" className="border-t border-line py-16 sm:py-20">
          <h2
            id="developer-access-title"
            className="font-display text-[36px] leading-[1.08] tracking-[-0.015em] text-ink sm:text-[48px]"
          >
            How access works
          </h2>
          <ol className="mt-8 divide-y divide-line border-y border-line">
            {content.steps.map((step, index) => (
              <li key={step.title} className="grid gap-2 py-5 sm:grid-cols-[56px_minmax(0,1fr)] sm:gap-5">
                <span className="font-mono text-[14px] text-ink-3">0{index + 1}</span>
                <div>
                  <h3 className="font-medium text-ink">{step.title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </RevealSection>

        <RevealSection aria-labelledby="developer-quickstart-title" className="border-t border-line py-16 sm:py-20">
          <h2
            id="developer-quickstart-title"
            className="font-display text-[36px] leading-[1.08] tracking-[-0.015em] text-ink sm:text-[48px]"
          >
            Quickstart
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{content.quickstartCaption}</p>
          <pre className="mt-7 max-w-full overflow-x-auto rounded-[16px] border border-line bg-white p-5 font-mono text-[12.5px] leading-relaxed text-ink shadow-card sm:p-7">
            <code>{content.quickstart}</code>
          </pre>
        </RevealSection>

        <section className="border-t border-line py-16 sm:py-20">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <h2 className="font-display text-[28px] leading-tight tracking-[-0.02em] text-ink sm:text-[36px]">
              {content.closingLine}
            </h2>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => void startDeveloperRequest("closing")}
              disabled={connectingGitHub}
              className={studioButton({ variant: "primary", size: "lg" })}
            >
              {connectingGitHub ? "Connecting GitHub…" : "Request with GitHub"}
              <ArrowRight aria-hidden className={buttonArrow} />
            </motion.button>
          </div>
        </section>
      </main>
      <StudioFooter />
    </div>
  );
}
