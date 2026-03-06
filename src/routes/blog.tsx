import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/blog/page";

export const Route = createFileRoute("/blog")({ component: Page });
