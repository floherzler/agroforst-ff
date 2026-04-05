import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/konto/page";

export const Route = createFileRoute("/konto")({ component: RouteComponent });

function RouteComponent() {
  return <Page />;
}
