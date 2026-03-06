import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/team/page";

export const Route = createFileRoute("/team")({ component: Page });
