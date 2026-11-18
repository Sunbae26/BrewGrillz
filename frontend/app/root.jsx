import { useState } from "react";
import { Links, Meta, Outlet, Scripts, isRouteErrorResponse, Link, useLocation } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import "@fontsource/anton/400.css";
import "@fontsource/rye/400.css";
import "@fontsource/permanent-marker/400.css";
import "@fontsource-variable/manrope";
import "./app.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/home.css";
import "./styles/pages.css";
import "./styles/menu.css";
import "./styles/order.css";
import "./styles/sprint4.css";
import "./styles/auth.css";
import "./styles/admin.css";
import "./motion/gsap";
import { createQueryClient } from "./lib/queries.js";
import { CartProvider } from "./lib/cart.jsx";
import SmoothScroll from "./motion/SmoothScroll";
import MoCoProvider from "./motion/MoCoProvider";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Cursor from "./components/layout/Cursor";
import CartDrawer from "./components/cart/CartDrawer";
import { Flame } from "./components/ui/ui";
import { API_ORIGIN } from "./lib/api.js";
// The two fonts every page shows first (headings and body text), fetched straight away instead of
// after the stylesheet: the headings appear sooner and nothing jumps when the font arrives.
import antonFont from "@fontsource/anton/files/anton-latin-400-normal.woff2?url";
import manropeFont from "@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?url";

export const links = () => [
  { rel: "icon", type: "image/png", href: "/brand/favicon.png" },
  { rel: "preload", href: antonFont, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: manropeFont, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  ...(import.meta.env.PROD && API_ORIGIN ? [{ rel: "preconnect", href: API_ORIGIN, crossOrigin: "use-credentials" }] : []),
];

// Run before the page paints: no browser scroll restoration (the page transitions handle scrolling).
const EARLY = `try{if("scrollRestoration" in history)history.scrollRestoration="manual"}catch(e){}`;

export function Layout({ children }) {
  return (
    <html lang="en-SG">
      <head>
        <script dangerouslySetInnerHTML={{ __html: EARLY }} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#141110" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const [queryClient] = useState(createQueryClient);
  const { pathname } = useLocation();
  // The staff dashboard is a work tool: no site navbar, footer, cart or custom cursor.
  const path = pathname.replace(/\/+$/, "") || "/";
  const dashboard = path === "/admin" || (path.startsWith("/admin/") && path !== "/admin/login");
  if (dashboard)
    return (
      <QueryClientProvider client={queryClient}>
        <main className="page page--admin" id="main">
          <Outlet />
        </main>
      </QueryClientProvider>
    );
  return (
    <QueryClientProvider client={queryClient}>
      <SmoothScroll>
        <CartProvider>
          <MoCoProvider>
            <Navbar />
            <main className="page" id="main">
              <Outlet />
              <Footer />
            </main>
            <CartDrawer />
            <Cursor />
            <div className="grain" aria-hidden="true" />
          </MoCoProvider>
        </CartProvider>
      </SmoothScroll>
    </QueryClientProvider>
  );
}

// Shown for a moment on pages that aren't pre-built (like an order's status page) while the app loads.
export function HydrateFallback() {
  return (
    <div className="boot" role="status">
      <Flame />
      <span>Firing up the grill…</span>
    </div>
  );
}

export function ErrorBoundary({ error }) {
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="page">
      <section className="ph">
        <div className="container ph__inner">
          <span className="eyebrow">{isNotFound ? "404" : "Oops"}</span>
          <h1 className="display ph__title">{isNotFound ? "Over-grilled" : "Something went wrong"}</h1>
          <p className="lead">
            {isNotFound
              ? "This page got left on the grill a little too long."
              : "Refresh the page. If it keeps happening, call us on +65 6312 2847."}
          </p>
          <Link to="/" className="btn btn--primary">Back to home</Link>
        </div>
      </section>
    </main>
  );
}
