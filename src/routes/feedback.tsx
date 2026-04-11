import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/feedback/page";

export const Route = createFileRoute("/feedback")({ component: Page });
