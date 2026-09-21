import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const runtimeUrlMock = vi.hoisted(() => vi.fn(() => "https://runtime.example.test"));

vi.mock("@/lib/env", () => ({
  liveRuntimeUrl: () => runtimeUrlMock(),
  isLiveRuntimeConfigured: () => runtimeUrlMock().length > 0,
}));

import LandingPage from "./LandingPage";

beforeEach(() => {
  vi.clearAllMocks();
  runtimeUrlMock.mockReturnValue("https://runtime.example.test");
});

describe("LandingPage", () => {
  it("leads with the brand statement", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { name: /Let it see what you see/i })).toBeInTheDocument();
  });

  it("sends a phone to the runtime's own live page", () => {
    render(<LandingPage />);
    expect(screen.getByTestId("start-session")).toHaveAttribute(
      "href",
      "https://runtime.example.test/live",
    );
  });

  it("shows the QR the runtime draws for its own address, not one built here", () => {
    render(<LandingPage />);
    expect(screen.getByRole("img", { name: /QR code/i, hidden: true })).toHaveAttribute(
      "src",
      "https://runtime.example.test/live/qr.svg",
    );
  });

  it("also offers the address as a plain link, so it is usable without scanning", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("link", { name: "https://runtime.example.test/live", hidden: true }),
    ).toBeInTheDocument();
  });

  it("asks for nothing: no sign-in, and no link into the control plane", () => {
    render(<LandingPage />);
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="/admin"]')).toBeNull();
    expect(document.querySelector('a[href^="/login"]')).toBeNull();
  });

  it("says the runtime is unset rather than drawing a code that leads nowhere", () => {
    runtimeUrlMock.mockReturnValue("");
    render(<LandingPage />);

    expect(screen.getByText(/No runtime address is configured/i)).toBeInTheDocument();
    expect(screen.getByText(/VITE_LIVE_RUNTIME_URL/)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /QR code/i, hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByTestId("start-session")).not.toBeInTheDocument();
  });

  it("does not put a trailing slash into the live URL when one is configured", () => {
    runtimeUrlMock.mockReturnValue("https://runtime.example.test");
    render(<LandingPage />);
    const link = screen.getByTestId("start-session");
    expect(link.getAttribute("href")).not.toContain("//live");
  });
});
