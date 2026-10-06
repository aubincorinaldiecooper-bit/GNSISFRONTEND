import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { describe, expect, it } from "vitest";

import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UIThemeProvider } from "@/components/ui/theme";

const root = `${resolve(__dirname, "../..")}/`;
const source = (path: string) => readFileSync(`${root}${path}`, "utf8");
// Git blob hashes verified against the actual MIT upstream at
// 44a274e598395ab61e7c96c26fda2758780253b7 (public/r/foundation.json + LICENSE).
const blobHash = (text: string) => createHash("sha1")
  .update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest("hex");

describe("one shared Beautiful UI frontend system", () => {
  it("retains the exact pinned registry foundation and MIT license", () => {
    expect(blobHash(source("src/styles/beautiful-foundation.css")))
      .toBe("c51952493b567229c6742936d3cff2544639fb88");
    expect(blobHash(source("BEAUTIFUL_UI_LICENSE")))
      .toBe("6635631aded86516cec8cab103c1a6f27b026c42");
  });

  it("keeps upstream Button geometry and variants, not a relabeled control aesthetic", () => {
    expect(buttonVariants({ variant: "secondary", size: "sm" }))
      .toContain("bg-surface text-ink shadow-btn hover:bg-inset aria-expanded:bg-hover");
    expect(buttonVariants({ size: "sm" }))
      .toContain("h-[27px] px-3 text-[13px] leading-none rounded-full gap-1.5");
    expect(buttonVariants({ variant: "primary" })).toContain("bg-ink text-canvas");
    expect(buttonVariants({ variant: "accent" })).toContain("bg-accent text-white hover:bg-accent-ink");
    expect(buttonVariants({ variant: "default" })).toBe(buttonVariants({ variant: "primary" }));
    expect(buttonVariants({ variant: "outline" })).toBe(buttonVariants({ variant: "secondary" }));
  });

  it("uses shared controls, chat and code in the console, and shared controls in the video surface", () => {
    const shared = {
      "src/App.tsx": ["button", "chat", "chat-composer"],
      "src/panoptic/pages/MomentsPage.tsx": ["button", "input", "chat-composer", "dialog", "loading-state"],
    };
    for (const [path, names] of Object.entries(shared)) {
      const content = source(path);
      for (const name of names) {
        expect(content, `${path} must consume shared ${name}`)
          .toContain(`from "@/components/ui/${name}"`);
      }
      expect(content).not.toMatch(/@astryxdesign|simple-icons|iconoir|@central-icons/);
    }
    expect(source("src/panoptic/pages/MomentsPage.tsx")).not.toMatch(/components\/ui\/chat"/);
    expect(source("src/App.tsx")).toContain('from "@/components/ui/code-block"');
    expect(source("src/panoptic/pages/WebSteeringPage.tsx"))
      .toContain('from "@/components/ui/code-block"');
    const manifest = JSON.parse(source("package.json"));
    const packages = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
    expect(packages.join(" ")).not.toMatch(/astryx|simple-icons|iconoir|central-icons/);
    expect(manifest.dependencies["react-router"]).toBeDefined();
    expect(manifest.devDependencies.vite).toBeDefined();
    expect(manifest.devDependencies.tailwindcss).toBe("4.1.18");
  });

  it("compiles legacy color aliases to full upstream colors without replacing the blue accent", async () => {
    const path = `${root}src/index.css`;
    const css = source("src/index.css") + '\n@source inline("bg-background text-foreground bg-primary text-primary-foreground bg-muted bg-accent text-accent-foreground border-border bg-signal text-signal-ink font-studio font-display");';
    const result = await postcss([tailwind({ base: root })]).process(css, { from: path });
    expect(result.warnings()).toHaveLength(0);
    const declarations = (selector: string) => {
      const values: Record<string, string> = {};
      result.root.walkRules(selector, (rule) => {
        rule.walkDecls((declaration) => { values[declaration.prop] = declaration.value; });
      });
      return values;
    };
    expect(declarations(".bg-background")["background-color"]).toBe("var(--page)");
    expect(declarations(".text-foreground").color).toBe("var(--ink)");
    expect(declarations(".bg-primary")["background-color"]).toBe("var(--ink)");
    expect(declarations(".text-primary-foreground").color).toBe("var(--canvas)");
    expect(declarations(".bg-muted")["background-color"]).toBe("var(--field)");
    expect(declarations(".bg-accent")["background-color"]).toBe("var(--accent)");
    expect(declarations(".text-accent-foreground").color).toBe("white");
    expect(declarations(".border-border")["border-color"]).toBe("var(--line)");
    expect(declarations(".bg-signal")["background-color"]).toBe("var(--signal)");
    expect(declarations(".text-signal-ink").color).toBe("var(--signal-ink)");
    expect(declarations(".font-studio")["font-family"]).toContain("Inter Tight");
    expect(declarations(".font-display")["font-family"]).toContain("Newsreader");
    expect(result.css).not.toContain("hsl(var(--accent))");
  });

  it.each(["light", "dark"] as const)("carries %s tokens into the dialog portal and restores focus on Escape", async (theme) => {
    const user = userEvent.setup();
    const { container } = render(createElement(UIThemeProvider, { theme,
      children: createElement(Dialog, null,
        createElement(DialogTrigger, { asChild: true }, createElement(Button, null, "Open review dialog")),
        createElement(DialogContent, null,
          createElement(DialogTitle, null, "Review dialog"),
          createElement(DialogDescription, null, "Real caller content"),
          createElement(Button, null, "Real caller action"),
        ),
      ),
    }));
    const trigger = screen.getByRole("button", { name: "Open review dialog" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Review dialog" });
    expect(container.contains(dialog)).toBe(false);
    expect(dialog).toHaveClass(theme, "bg-surface", "text-ink", "rounded-window", "shadow-overlay");
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
