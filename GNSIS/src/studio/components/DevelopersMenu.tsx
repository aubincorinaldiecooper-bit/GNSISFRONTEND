import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { developerPath } from "../config";
import { MODELS } from "../models";
import { StudioDropdown } from "./StudioDropdown";
import { StudioDropdownRow } from "./StudioDropdownRow";

/** "Developers" in the nav: direct links to each model's developer access page. */
export function DevelopersMenu() {
  return (
    <StudioDropdown label="Developers" eyebrow="Developer access" triggerClassName="px-2 sm:px-3.5">
      {MODELS.map((model, index) => (
        <DropdownMenu.Item key={model.id} asChild>
          <StudioDropdownRow
            modelId={model.id}
            title={model.name}
            subtitle={model.id === "panoptic" ? "API, SDKs and MCP server" : "Runs API"}
            index={index}
            to={developerPath(model.id)}
          />
        </DropdownMenu.Item>
      ))}
    </StudioDropdown>
  );
}
