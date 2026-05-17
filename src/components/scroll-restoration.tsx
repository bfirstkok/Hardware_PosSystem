"use client";

import { useEffect } from "react";

export function ScrollRestoration() {
  useEffect(() => {
    // Restore sidebar scroll position เมื่อ DOM ready
    const timer = setTimeout(() => {
      const sidebar = document.querySelector('[data-testid="sidebar-nav"]');
      if (sidebar) {
        const stored = sessionStorage.getItem("sidebar-scroll");
        if (stored) {
          sidebar.scrollTop = parseInt(stored, 10);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
