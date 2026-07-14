import { useEffect, useRef } from "react";
import { trackSectionVisible, type LandingSection } from "../landing-analytics";

/**
 * Attaches an IntersectionObserver to the returned ref.
 * Fires trackSectionVisible exactly once when 30% of the element is visible.
 */
export function useSectionTracking(section: LandingSection) {
  const ref = useRef<HTMLElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          trackSectionVisible(section);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [section]);

  return ref;
}
