import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/bestellungen/page";

export const Route = createFileRoute("/bestellungen")({ component: Page });
