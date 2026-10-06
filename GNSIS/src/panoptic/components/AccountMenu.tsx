import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { ChevronDown, LogIn, LogOut, Mail, Settings, UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { UIThemeProvider } from "@/components/ui/theme";
import { authClient, type SessionUser } from "@/lib/authClient";
import { authBaseUrl, isAuthConfigured } from "@/lib/env";
import { mapSessionUser, signOutIdentity } from "@/lib/identity";
import { landingPath } from "../config";

type Panel = "signin" | "profile" | "settings" | "signout" | null;
interface PlaybackSettings {
  captions: boolean;
  muted: boolean;
  onCaptionsChange: (enabled: boolean) => void;
  onMutedChange: (muted: boolean) => void;
  onInteract: () => void;
}

export default function AccountMenu(props: PlaybackSettings) {
  return isAuthConfigured()
    ? <ConnectedAccountMenu {...props} />
    : <AccountControl {...props} user={null} configured={false} />;
}

function ConnectedAccountMenu(props: PlaybackSettings) {
  // Identity only: public browsing must never probe the operator backend /v1/me.
  const session = authClient.useSession();
  return (
    <AccountControl
      {...props}
      configured
      user={mapSessionUser(session.data?.user)}
      pending={session.isPending}
      sessionError={!!session.error}
      retrySession={() => void session.refetch()}
    />
  );
}

function AccountControl({
  user, configured, pending = false, sessionError = false, retrySession,
  captions, muted, onCaptionsChange, onMutedChange, onInteract,
}: PlaybackSettings & {
  user: SessionUser | null;
  configured: boolean;
  pending?: boolean;
  sessionError?: boolean;
  retrySession?: () => void;
}) {
  const [params, setParams] = useSearchParams();
  const signInError = params.get("authError");
  const [panel, setPanel] = useState<Panel>(signInError ? "signin" : null);
  const [error, setError] = useState<string | null>(signInError === "email" ? "That sign-in link is invalid or expired. Request a new one." : signInError ? "Sign-in didn’t complete. Please try again." : null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [options, setOptions] = useState<{ google: boolean; email: boolean } | null>(null);
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const displayName = user?.name?.trim() || user?.githubLogin || user?.email || "Account";
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const title = panel === "profile" ? "Your profile" : panel === "settings" ? "Playback settings" : panel === "signout" ? "Sign out" : "Sign in to Panoptic";

  useEffect(() => {
    if (!configured || panel !== "signin") return;
    const controller = new AbortController();
    void fetch(`${authBaseUrl()}/api/accounts/options`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Sign-in options unavailable");
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("google" in data) || !("email" in data) || typeof data.google !== "boolean" || typeof data.email !== "boolean") throw new Error("Invalid sign-in options");
        if (!controller.signal.aborted) setOptions({ google: data.google, email: data.email });
      })
      .catch(() => { if (!controller.signal.aborted) setOptionsFailed(true); });
    return () => controller.abort();
  }, [configured, panel, attempt]);

  const openPanel = (next: Panel) => {
    setPanel(next);
    setError(null);
    setSaved(false);
    setSentEmail(null);
    if (next === "signin") { setOptions(null); setOptionsFailed(false); }
    setName(user?.name || user?.githubLogin || "");
    onInteract();
  };
  const closePanel = () => {
    if (inFlight.current) return;
    setPanel(null);
    if (params.has("authError")) {
      const next = new URLSearchParams(params);
      next.delete("authError");
      next.delete("error");
      next.delete("error_description");
      setParams(next, { replace: true });
    }
  };
  const run = async (action: () => Promise<void>, failure: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError(failure);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const signIn = () => run(async () => {
    if (!options?.google) return;
    const callback = `${window.location.origin}${landingPath()}`;
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: callback,
      errorCallbackURL: `${callback}?authError=oauth`,
    });
    if (result.error || !result.data?.url) throw new Error("Sign-in failed");
  }, "Couldn’t start sign-in. Please check your connection and try again.");
  const sendLink = () => run(async () => {
    if (!options?.email || !email.trim()) return;
    const callback = `${window.location.origin}${landingPath()}`;
    const result = await authClient.signIn.magicLink({
      email: email.trim(),
      callbackURL: callback,
      newUserCallbackURL: callback,
      errorCallbackURL: `${callback}?authError=email`,
    });
    if (result.error || !result.data?.status) throw new Error("Email sign-in failed");
    setSentEmail(email.trim());
  }, "Couldn’t send your sign-in link. Please try again in a moment.");
  const signOut = () => run(async () => {
    await signOutIdentity();
    setPanel(null);
  }, "Couldn’t sign out. Your session may still be active. Please try again.");
  const saveProfile = () => run(async () => {
    if (!user || !name.trim()) return;
    const result = await authClient.updateUser({ name: name.trim() });
    if (result.error) throw new Error("Profile update failed");
    setSaved(true);
  }, "Couldn’t save your name. Your changes are still here—please try again.");

  return (
    <UIThemeProvider theme="light">
      <div className="pv-account" onKeyDown={(event) => event.stopPropagation()}>
        <DropdownMenu onOpenChange={(open) => { if (open) onInteract(); }}>
          <DropdownMenuTrigger asChild>
            <Button ref={trigger} variant="quiet" className="pv-account-trigger" aria-label={user ? `Open your profile: ${displayName}` : "Open your account"} disabled={pending} aria-busy={pending}>
              <Avatar aria-hidden="true">
                {user?.image && <AvatarImage src={user.image} alt="" referrerPolicy="no-referrer" />}
                <AvatarFallback>{user ? initials : <UserRound className="size-4" />}</AvatarFallback>
              </Avatar>
              <ChevronDown aria-hidden="true" className="size-3.5 text-ink-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="pv-account-surface w-56">
            <DropdownMenuLabel className="font-medium">
              <span className="block truncate">{user ? displayName : sessionError ? "Account unavailable" : "Guest"}</span>
              {user?.email && <span className="block truncate text-xs font-normal text-ink-3">{user.email}</span>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sessionError ? (
              <DropdownMenuItem onSelect={retrySession}>Retry account check</DropdownMenuItem>
            ) : user ? (
              <>
                <DropdownMenuItem onSelect={() => openPanel("profile")}><UserRound aria-hidden="true" />Profile</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openPanel("settings")}><Settings aria-hidden="true" />Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => openPanel("signout")}><LogOut aria-hidden="true" />Sign out</DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => openPanel("signin")}><LogIn aria-hidden="true" />Sign in</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={panel !== null} onOpenChange={(open) => { if (!open) closePanel(); }}>
          <DialogContent
            className="pv-account-surface sm:max-w-sm"
            onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus(); }}
            onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}
            onInteractOutside={(event) => { if (busy) event.preventDefault(); }}
            showCloseButton={!busy}
          >
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {panel === "profile" ? "Your Panoptic account details." : panel === "settings" ? "These preferences apply to this browsing session." : panel === "signout" ? "This signs you out of the shared GNSIS account on this browser." : "Use your existing account, or create one when you continue."}
            </DialogDescription>
            {panel === "signin" && (!configured || (options && !options.google && !options.email) ? (
              <p className="text-sm text-ink-2">Sign-in isn’t available right now. You can keep searching without an account.</p>
            ) : optionsFailed ? (
              <div className="grid gap-3"><p role="alert" className="text-sm text-ink-2">Couldn’t load sign-in. You can keep searching or try again.</p><Button variant="secondary" onClick={() => { setOptions(null); setOptionsFailed(false); setAttempt((value) => value + 1); }}>Retry</Button></div>
            ) : !options ? <p role="status" className="text-sm text-ink-3">Checking sign-in options…</p> : sentEmail ? (
              <div className="grid gap-3">
                <p role="status" className="text-sm text-ink-2">Check your email. We sent a sign-in link to <strong className="font-medium break-all">{sentEmail}</strong>.</p>
                <p className="text-xs text-ink-3">The link expires in 10 minutes and can be used once. Check your spam folder if you don’t see it.</p>
                <Button variant="secondary" onClick={() => { setSentEmail(null); setError(null); }}>Use another email</Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {options.google && <Button variant="primary" disabled={busy || pending || !!user} onClick={() => void signIn()} className="w-full">Continue with Google</Button>}
                {options.google && options.email && <p className="text-center text-xs text-ink-3">or use your email</p>}
                {options.email && <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void sendLink(); }} aria-busy={busy}>
                  <label className="grid gap-1.5 text-[13px] text-ink-2">Email address
                    <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" required disabled={busy} placeholder="you@example.com" />
                  </label>
                  <Button type="submit" variant="secondary" disabled={busy || pending || !!user || !email.trim()}><Mail aria-hidden="true" className="size-4" />Email me a sign-in link</Button>
                </form>}
                <p className="text-xs text-ink-3">No password needed. You’ll return to Panoptic.</p>
                {busy && <p role="status" className="text-xs text-ink-3">Please wait…</p>}
              </div>
            ))}
            {panel === "profile" && (user ? (
              <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void saveProfile(); }} aria-busy={busy}>
                <label className="grid gap-1.5 text-[13px] text-ink-2">Name
                  <Input value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} maxLength={100} autoComplete="name" required disabled={busy} />
                </label>
                <label className="grid gap-1.5 text-[13px] text-ink-2">Email
                  <Input value={user.email || ""} readOnly autoComplete="email" />
                </label>
                <p className="text-xs text-ink-3">Your name is shared across GNSIS. Your email is managed by your sign-in method.</p>
                <Button type="submit" variant="primary" disabled={busy || !name.trim()}>{busy ? "Saving…" : "Save changes"}</Button>
                {saved && <p role="status" className="text-sm text-ink-2">Profile saved.</p>}
              </form>
            ) : <p className="text-sm text-ink-2">Your session ended. Sign in again to edit your profile.</p>)}
            {panel === "settings" && (
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span>Captions</span><Button variant="secondary" size="sm" aria-label="Show captions" aria-pressed={captions} onClick={() => onCaptionsChange(!captions)}>{captions ? "On" : "Off"}</Button>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span>Sound</span><Button variant="secondary" size="sm" aria-label="Play sound" aria-pressed={!muted} onClick={() => onMutedChange(!muted)}>{muted ? "Off" : "On"}</Button>
                </div>
              </div>
            )}
            {panel === "signout" && <Button variant="primary" disabled={busy} onClick={() => void signOut()}>{busy ? "Signing out…" : "Sign out"}</Button>}
            {error && <p role="alert" className="text-sm text-red">{error}</p>}
          </DialogContent>
        </Dialog>
      </div>
    </UIThemeProvider>
  );
}
