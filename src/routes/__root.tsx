import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";

import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Agroforst Frank Fege" },
      { name: "description", content: "Direktvermarktung und Angebote aus der Ostprignitz." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/img/agroforst_ff_icon_bg.png", type: "image/png" },
      { rel: "shortcut icon", href: "/img/agroforst_ff_icon_bg.png" },
      { rel: "apple-touch-icon", href: "/img/agroforst_ff_icon_bg.png" },
    ],
  }),
  shellComponent: RootDocument,
  component: RootShell,
  notFoundComponent: NotFoundPage,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootShell() {
  return (
    <AuthProvider>
      <Navbar />
      <div className="pt-4">
        <Outlet />
      </div>
    </AuthProvider>
  );
}

function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">404</p>
      <h1 className="mt-4 text-4xl font-bold text-neutral-900">Seite nicht gefunden</h1>
      <p className="mt-4 text-neutral-600">Diese Route existiert nicht oder wurde verschoben.</p>
    </main>
  );
}
