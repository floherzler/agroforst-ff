import { createFileRoute } from "@tanstack/react-router";
import SignupPage from "@/app/(auth)/signup/page";

export const Route = createFileRoute("/signup")({ component: SignupPage });
