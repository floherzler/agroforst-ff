import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/verify-email/page";

export const Route = createFileRoute("/verify-email")({ component: Page });
