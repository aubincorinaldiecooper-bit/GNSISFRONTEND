import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import SecretReveal from "@/components/SecretReveal";
import { rememberSecret, hasSecret, clearAllSecrets } from "@/lib/keySecrets";

beforeEach(() => clearAllSecrets());

describe("SecretReveal (one-time reveal)", () => {
  it("masks the secret by default and reveals it on toggle", () => {
    rememberSecret("vk1", "gns_test_abcdefgh");
    render(<SecretReveal keyId="vk1" />);
    expect(screen.queryByText("gns_test_abcdefgh")).toBeNull();
    fireEvent.click(screen.getByLabelText("Reveal secret"));
    expect(screen.getByText("gns_test_abcdefgh")).toBeInTheDocument();
  });

  it("forgets the secret and renders nothing afterwards", () => {
    rememberSecret("vk1", "gns_test_zzz");
    const { container } = render(<SecretReveal keyId="vk1" />);
    fireEvent.click(screen.getByLabelText("Forget secret"));
    expect(hasSecret("vk1")).toBe(false);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there is no secret in memory", () => {
    const { container } = render(<SecretReveal keyId="missing" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("copies the full secret to the clipboard and confirms with 'Copied'", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    rememberSecret("vk1", "gns_test_abcdefgh");
    render(<SecretReveal keyId="vk1" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("gns_test_abcdefgh"));
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });
});
