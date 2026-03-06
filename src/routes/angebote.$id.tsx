import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/angebote/[id]/page";

export const Route = createFileRoute("/angebote/$id")({ component: Page });
