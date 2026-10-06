import { MODELS, type ModelId, type StudioModel } from "./models";

const DOCS_BASE = "https://github.com/aubincorinaldiecooper-bit/GNSISBACKEND/blob/main";

export interface DeveloperFeature {
  name: string;
  description: string;
  available: boolean;
  docsUrl?: string;
}

export interface DeveloperStep {
  title: string;
  description: string;
}

interface DeveloperCopy {
  description: string;
  docsUrl: string;
  features: readonly DeveloperFeature[];
  steps: readonly DeveloperStep[];
  quickstartCaption: string;
  quickstart: string;
  closingLine: string;
}

export interface DeveloperPageData extends DeveloperCopy {
  model: StudioModel;
  eyebrow: string;
  headingLines: readonly string[];
}

const COPY: Record<ModelId, DeveloperCopy> = {
  panoptic: {
    description:
      "Give your agent a live view of a browser tab or desktop. {model} describes what’s on screen and what just changed, and tells you what’s at any point you ask about. Your app stays in charge of every action.",
    docsUrl: `${DOCS_BASE}/docs/smaller-gnsis-service.md`,
    features: [
      {
        name: "REST API",
        description: "Open a session, stream frames, ask what’s on screen.",
        available: true,
        docsUrl: `${DOCS_BASE}/docs/smaller-gnsis-service.md`,
      },
      {
        name: "Python SDK",
        description: "Typed client, frame streaming and a ready-made browser host.",
        available: true,
        docsUrl: "https://github.com/aubincorinaldiecooper-bit/GNSISBACKEND/tree/main/sdks/python",
      },
      {
        name: "TypeScript SDK",
        description: "A lightweight client for the same API.",
        available: true,
        docsUrl: "https://github.com/aubincorinaldiecooper-bit/GNSISBACKEND/tree/main/sdks/typescript",
      },
      {
        name: "MCP server",
        description: "Let Claude Code, Codex and other MCP agents see the screen.",
        available: true,
        docsUrl: `${DOCS_BASE}/docs/smaller-gnsis-service.md#mcp-adapter`,
      },
    ],
    steps: [
      {
        title: "Request access",
        description: "Tell us what you’re building. We open access a few teams at a time.",
      },
      {
        title: "Get your API key",
        description: "We set up your workspace and send you a key scoped to {model}.",
      },
      {
        title: "Start a session",
        description: "Exchange the key for a short-lived grant, then open a session and stream frames.",
      },
    ],
    quickstartCaption: "Your key arrives with the address of your {model} endpoint.",
    quickstart: [
      "# Exchange your GNSIS key for a short-lived grant",
      "curl -s -X POST https://api.gnsis.studio/v1/visual/grants \\",
      '  -H "Authorization: Bearer $GNSIS_API_KEY"',
      "",
      "# Open a session with the grant it returns",
      'curl -s -X POST "$PANOPTIC_API_BASE/v1/visual/sessions" \\',
      '  -H "Authorization: Bearer $PANOPTIC_GRANT"',
    ].join("\n"),
    closingLine: "Ready to give your agent eyes?",
  },
  "gnsis-01": {
    description:
      "Hand {model} a task through the API and follow it to the finish. Every run is recorded, waits for your approval, and leaves a receipt.",
    docsUrl: `${DOCS_BASE}/docs/public_api.md`,
    features: [
      {
        name: "Runs API",
        description: "Start a run, follow its progress, approve the result.",
        available: true,
        docsUrl: `${DOCS_BASE}/docs/public_api.md`,
      },
      {
        name: "Receipts",
        description: "A record of what each run did and what it used.",
        available: true,
        docsUrl: `${DOCS_BASE}/docs/public_api.md`,
      },
      {
        name: "Realtime voice and vision",
        description: "Talk to {model} and share your screen from your own app.",
        available: false,
      },
    ],
    steps: [
      {
        title: "Request access",
        description: "Tell us what you’re building. We open access a few teams at a time.",
      },
      {
        title: "Get your API key",
        description: "We set up your workspace and send you a key.",
      },
      {
        title: "Start a run",
        description: "Send your first run with the key and follow it to the finish.",
      },
    ],
    quickstartCaption: "Runs work on repositories connected to your workspace.",
    quickstart: [
      "# Start a run",
      "curl -s -X POST https://api.gnsis.studio/v1/runs \\",
      '  -H "Authorization: Bearer $GNSIS_API_KEY" \\',
      '  -H "Content-Type: application/json" \\',
      `  -d '{"repository_id": "repo_abc123", "instruction": "Harden the authentication middleware"}'`,
      "",
      "# Follow its progress",
      "curl -s https://api.gnsis.studio/v1/runs/$RUN_ID/events \\",
      '  -H "Authorization: Bearer $GNSIS_API_KEY"',
    ].join("\n"),
    closingLine: "Ready to hand {model} a task?",
  },
};

export function developerPageData(id: ModelId): DeveloperPageData {
  const model = MODELS.find((item) => item.id === id);
  if (!model) throw new Error(`Unknown developer model: ${id}`);
  const copy = COPY[id];
  const withModelName = (value: string) => value.replace(/\{model\}/g, model.name);

  return {
    ...copy,
    description: withModelName(copy.description),
    features: copy.features.map((feature) => ({
      ...feature,
      description: withModelName(feature.description),
    })),
    steps: copy.steps.map((step) => ({
      ...step,
      description: withModelName(step.description),
    })),
    quickstartCaption: withModelName(copy.quickstartCaption),
    closingLine: withModelName(copy.closingLine),
    model,
    eyebrow: `Developers · ${model.name}`,
    headingLines: ["Build with", `${model.name}.`],
  };
}
