import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/produkte/page";

export const Route = createFileRoute("/produkte")({ component: Page });
