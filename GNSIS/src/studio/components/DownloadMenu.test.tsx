import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MAC_DOWNLOAD_URL } from "../config";
import { DownloadMenu } from "./DownloadMenu";

afterEach(() => vi.restoreAllMocks());

describe("DownloadMenu", () => {
  it("downloads the DMG and shows how to install it", async () => {
    render(<DownloadMenu />);
    const link = screen.getByRole("link", { name: "Download for Mac" });
    expect(link).toHaveAttribute("href", MAC_DOWNLOAD_URL);
    link.addEventListener("click", (e) => e.preventDefault());
    await userEvent.click(link);
    expect(await screen.findByRole("dialog", { name: "How to install GNSIS" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download again" })).toHaveAttribute("href", MAC_DOWNLOAD_URL);
  });

  it("offers no download on phones", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148");
    render(<DownloadMenu size="lg" />);
    expect(screen.queryByRole("link", { name: "Download for Mac" })).not.toBeInTheDocument();
    expect(screen.getByText(/Open this page on your computer to download/)).toBeInTheDocument();
  });
});
