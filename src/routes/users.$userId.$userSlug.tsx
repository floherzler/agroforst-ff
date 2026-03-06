import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/users/[userId]/[userSlug]/page";

export const Route = createFileRoute("/users/$userId/$userSlug")({ component: Page });
