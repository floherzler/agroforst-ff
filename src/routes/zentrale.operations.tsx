import { createFileRoute } from "@tanstack/react-router";

import Page from "@/app/zentrale/page";

export const Route = createFileRoute("/zentrale/operations")({
  component: Page,
});
