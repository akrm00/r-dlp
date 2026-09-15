import { useEffect, useState } from "react";

/**
 * Whether the page has scrolled past `threshold`.
 *
 * Drives the scroll edge effect: floating chrome stays borderless at rest and
 * only materialises its hairline once content actually slides underneath it.
 */
export function useScrolled(threshold = 4): boolean {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsScrolled(window.scrollY > threshold);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);

  return isScrolled;
}
