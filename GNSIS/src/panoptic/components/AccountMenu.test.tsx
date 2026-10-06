import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import type { SessionUser } from "@/lib/authClient";

const mocks = vi.hoisted(() => ({
  session: vi.fn(), social: vi.fn(), magicLink: vi.fn(), fetch: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), refetch: vi.fn(),
  clearToken: vi.fn(), clearSecrets: vi.fn(),
}));
vi.mock("@/lib/authClient", () => ({
  authClient: { useSession: mocks.session, signIn: { social: mocks.social, magicLink: mocks.magicLink }, updateUser: mocks.updateUser, signOut: mocks.signOut },
}));
vi.mock("@/lib/authToken", () => ({ clearBackendToken: mocks.clearToken }));
vi.mock("@/lib/keySecrets", () => ({ clearAllSecrets: mocks.clearSecrets }));

import AccountMenu from "./AccountMenu";

const account: SessionUser = { id: "user-1", name: "Ada Lovelace", email: "ada@example.com", image: null, githubLogin: "ada" };
const playback = { captions: true, muted: true, onCaptionsChange: vi.fn(), onMutedChange: vi.fn(), onInteract: vi.fn() };
function session(user: typeof account | null = account, options = {}) {
  mocks.session.mockReturnValue({ data: user ? { user } : null, isPending: false, error: null, refetch: mocks.refetch, ...options });
}
function mount(path = "/video-search", props = playback) {
  const user = userEvent.setup();
  const view = render(<MemoryRouter initialEntries={[path]}><AccountMenu {...props} /></MemoryRouter>);
  return { user, ...view };
}
async function openItem(item: string) {
  const { user, ...view } = mount();
  await user.click(screen.getByRole("button", { name: /^Open your/ }));
  await user.click(screen.getByRole("menuitem", { name: item }));
  return { user, ...view };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.__GNSIS_CONFIG__ = { VITE_AUTH_URL: "https://auth.example.test", VITE_HOME_EXPERIENCE: "live" };
  session();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ google: true, email: true })));
  mocks.social.mockResolvedValue({ data: { url: "https://accounts.google.com/o/oauth2/v2/auth" }, error: null });
  mocks.magicLink.mockResolvedValue({ data: { status: true }, error: null });
  mocks.updateUser.mockResolvedValue({ data: { status: true }, error: null });
  mocks.signOut.mockResolvedValue({ data: { success: true }, error: null });
});
afterEach(() => {
  delete window.__GNSIS_CONFIG__;
  vi.unstubAllGlobals();
});

describe("Panoptic accounts", () => {
  it("shows the real identity in the approved avatar + chevron, with no admin links", async () => {
    const { user } = mount();
    const trigger = screen.getByRole("button", { name: "Open your profile: Ada Lovelace" });
    expect(trigger.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent("AL");
    expect(trigger.querySelector(".lucide-chevron-down")).not.toBeNull();
    await user.click(trigger);
    const menu = screen.getByRole("menu");
    expect(menu).toHaveClass("light", "pv-account-surface");
    expect(menu).toHaveTextContent("Ada Lovelace");
    expect(menu).toHaveTextContent("ada@example.com");
    expect(screen.getByRole("menuitem", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
    expect(document.querySelector('a[href*="admin"], a[href*="login"]')).toBeNull();
  });

  it("uses the account image when available", async () => {
    class LoadedImage extends EventTarget {
      complete = true;
      naturalWidth = 100;
      set src(_src: string) { queueMicrotask(() => this.dispatchEvent(new Event("load"))); }
    }
    vi.stubGlobal("Image", LoadedImage);
    session({ ...account, image: "https://avatars.example.test/ada.png" });
    mount();
    const avatar = await waitFor(() => {
      const image = document.querySelector('[data-slot="avatar-image"]');
      expect(image).not.toBeNull();
      return image;
    });
    expect(avatar).toHaveAttribute("src", "https://avatars.example.test/ada.png");
    expect(avatar).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("sends guests through Google OAuth and returns to Panoptic, not /admin", async () => {
    session(null);
    const { user } = await openItem("Sign in");
    expect(screen.getByRole("dialog", { name: "Sign in to Panoptic" })).toHaveClass("light");
    await user.click(await screen.findByRole("button", { name: "Continue with Google" }));
    expect(mocks.social).toHaveBeenCalledWith({
      provider: "google", callbackURL: `${window.location.origin}/video-search`,
      errorCallbackURL: `${window.location.origin}/video-search?authError=oauth`,
    });
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(screen.queryByText(/GitHub/)).toBeNull();
  });

  it("uses the public home callback when video-search is the home experience", async () => {
    window.__GNSIS_CONFIG__!.VITE_HOME_EXPERIENCE = "video-search";
    session(null);
    const { user } = await openItem("Sign in");
    await user.click(await screen.findByRole("button", { name: "Continue with Google" }));
    expect(mocks.social).toHaveBeenCalledWith(expect.objectContaining({ callbackURL: `${window.location.origin}/` }));
  });

  it("reports both returned OAuth errors and cancelled callbacks without pretending to sign in", async () => {
    session(null);
    mocks.social.mockResolvedValue({ error: { message: "Provider unavailable" } });
    const { user } = mount("/video-search?authError=oauth");
    expect(screen.getByRole("alert")).toHaveTextContent("Sign-in didn’t complete");
    await user.click(await screen.findByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t start sign-in");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps search usable and avoids session requests when auth is unconfigured", async () => {
    window.__GNSIS_CONFIG__!.VITE_AUTH_URL = "";
    const { user } = await openItem("Sign in");
    expect(mocks.session).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("You can keep searching without an account");
    expect(screen.queryByRole("button", { name: "Continue with Google" })).toBeNull();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("button", { name: "Open your account" })).toHaveFocus());
  });

  it("sends a passwordless link without treating email submission as a signed-in session", async () => {
    session(null);
    const { user } = await openItem("Sign in");
    await user.type(await screen.findByRole("textbox", { name: "Email address" }), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
    expect(mocks.magicLink).toHaveBeenCalledWith({
      email: "ada@example.com", callbackURL: `${window.location.origin}/video-search`,
      newUserCallbackURL: `${window.location.origin}/video-search`, errorCallbackURL: `${window.location.origin}/video-search?authError=email`,
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Check your email");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Open your account" })).toBeInTheDocument();
    expect(mocks.fetch).toHaveBeenCalledWith("https://auth.example.test/api/accounts/options", expect.objectContaining({ credentials: "include" }));
  });

  it("retains the email after delivery failure and offers recovery for expired links", async () => {
    session(null);
    mocks.magicLink.mockResolvedValue({ error: { message: "Delivery unavailable" } });
    const { user } = mount("/video-search?authError=email&error=INVALID_TOKEN");
    expect(screen.getByRole("alert")).toHaveTextContent("invalid or expired");
    const email = await screen.findByRole("textbox", { name: "Email address" });
    await user.type(email, "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t send your sign-in link");
    expect(email).toHaveValue("ada@example.com");
    expect(screen.queryByText(/Check your email/)).toBeNull();
  });

  it("uses native email validation before requesting a link", async () => {
    session(null);
    const { user } = await openItem("Sign in");
    const email = await screen.findByRole("textbox", { name: "Email address" }) as HTMLInputElement;
    await user.type(email, "not-an-email");
    expect(email.checkValidity()).toBe(false);
    await user.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
    expect(mocks.magicLink).not.toHaveBeenCalled();
    expect(email).toHaveValue("not-an-email");
  });

  it("does not offer unconfigured providers or silently fall back to GitHub", async () => {
    session(null);
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ google: false, email: false })));
    await openItem("Sign in");
    expect(await screen.findByText(/Sign-in isn’t available right now/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue with/ })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Email address" })).toBeNull();
  });

  it("lets guests retry failed option loading instead of sending broken requests", async () => {
    session(null);
    mocks.fetch.mockResolvedValueOnce(new Response("", { status: 503 }));
    const { user } = await openItem("Sign in");
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t load sign-in");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
  });

  it("does not mistake pending or failed session checks for signed-out accounts", async () => {
    session(null, { isPending: true });
    const { user, rerender } = mount();
    expect(screen.getByRole("button", { name: "Open your account" })).toBeDisabled();
    session(null, { error: new Error("network") });
    rerender(<MemoryRouter><AccountMenu {...playback} /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Open your account" }));
    expect(screen.getByRole("menu")).toHaveTextContent("Account unavailable");
    expect(screen.queryByRole("menuitem", { name: "Sign in" })).toBeNull();
    await user.click(screen.getByRole("menuitem", { name: "Retry account check" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("saves a real profile name and leaves the provider-managed email read-only", async () => {
    const { user } = await openItem("Profile");
    const name = screen.getByRole("textbox", { name: "Name" });
    await user.clear(name);
    await user.type(name, "  Ada Byron  ");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("readonly");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mocks.updateUser).toHaveBeenCalledWith({ name: "Ada Byron" });
    expect(await screen.findByRole("status")).toHaveTextContent("Profile saved");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("button", { name: /^Open your profile/ })).toHaveFocus());
  });

  it("preserves a failed profile draft and suppresses duplicate pending submissions", async () => {
    let resolve!: (value: unknown) => void;
    mocks.updateUser.mockReturnValue(new Promise((done) => { resolve = done; }));
    const { user } = await openItem("Profile");
    const name = screen.getByRole("textbox", { name: "Name" });
    await user.clear(name);
    await user.type(name, "Ada Byron");
    const form = name.closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mocks.updateUser).toHaveBeenCalledOnce();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => resolve({ error: { message: "expired" } }));
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t save your name");
    expect(name).toHaveValue("Ada Byron");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("wires playback settings to the actual captions and sound controls", async () => {
    const { user } = await openItem("Settings");
    await user.click(screen.getByRole("button", { name: "Show captions" }));
    await user.click(screen.getByRole("button", { name: "Play sound" }));
    expect(playback.onCaptionsChange).toHaveBeenCalledWith(false);
    expect(playback.onMutedChange).toHaveBeenCalledWith(false);
    expect(playback.onInteract).toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("signs out via Better Auth and clears cached tokens and secrets before and after", async () => {
    const { user } = await openItem("Sign out");
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.clearToken).toHaveBeenCalledTimes(2);
    expect(mocks.clearSecrets).toHaveBeenCalledTimes(2);
    expect(mocks.clearToken.mock.invocationCallOrder[0]).toBeLessThan(mocks.signOut.mock.invocationCallOrder[0]);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("does not claim a failed remote sign-out succeeded", async () => {
    mocks.signOut.mockResolvedValue({ error: { message: "network" } });
    const { user } = await openItem("Sign out");
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your session may still be active");
    expect(screen.getByRole("dialog", { name: "Sign out" })).toBeInTheDocument();
    expect(mocks.clearSecrets).toHaveBeenCalledTimes(2);
  });
});
