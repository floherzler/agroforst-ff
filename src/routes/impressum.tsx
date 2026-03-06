import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/impressum/page";

export const Route = createFileRoute("/impressum")({ component: Page });
