"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoadingSplash } from "@/components/loading-splash";

function NavigationSplashInner() {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Reset loading splash whenever route changes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  // Intercept internal link clicks and form submissions that navigate
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      // Find closest <a> tag
      const target = e.target as HTMLElement | null;
      const link = target?.closest("a") as HTMLAnchorElement | null;

      if (!link) return;

      const href = link.getAttribute("href");
      if (!href) return;

      // Ignore external links, hash anchors, new tabs, mailto/tel, or modifier keys
      if (
        link.target === "_blank" ||
        link.rel?.includes("external") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.defaultPrevented
      ) {
        return;
      }

      // Check if same origin and different URL
      try {
        const destination = new URL(link.href, window.location.href);
        const current = new URL(window.location.href);

        if (destination.origin !== current.origin) return;

        // If pathname or search is different, trigger splash
        if (
          destination.pathname !== current.pathname ||
          destination.search !== current.search
        ) {
          setIsNavigating(true);
        }
      } catch {
        // invalid URL ignore
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // Safety fallback: if navigation takes too long or gets cancelled, auto-hide splash
  useEffect(() => {
    if (!isNavigating) return;
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isNavigating]);

  return <LoadingSplash show={isNavigating} />;
}

export function NavigationSplash() {
  return (
    <Suspense fallback={null}>
      <NavigationSplashInner />
    </Suspense>
  );
}
