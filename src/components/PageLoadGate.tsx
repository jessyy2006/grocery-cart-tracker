import { PropsWithChildren, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Spinner } from "@/components/Spinner";

interface PageLoadGateProps {
  /** Page renders only once every dependency it needs has resolved. */
  ready: boolean;
  /** Loader height while waiting — defaults to most of the viewport. */
  minHeight?: string;
  /** Grace period before the loader appears, so fast loads never flash it. */
  delayMs?: number;
  /** Applied to the wrapper once the page renders (e.g. "h-full"). */
  className?: string;
}

/**
 * Holds back an entire page (header included) until its data is ready, so
 * navigation shows a single loader instead of a header that flashes in
 * before the body arrives. The loader itself only appears if the wait
 * exceeds `delayMs`, avoiding a blink on near-instant loads.
 */
export function PageLoadGate({
  ready,
  minHeight = "80vh",
  delayMs = 200,
  className,
  children,
}: PropsWithChildren<PageLoadGateProps>) {
  const reduce = useReducedMotion();
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    if (ready) {
      setShowLoader(false);
      return;
    }
    const t = window.setTimeout(() => setShowLoader(true), delayMs);
    return () => window.clearTimeout(t);
  }, [ready, delayMs]);

  if (!ready)
    return showLoader ? (
      <div
        className="flex w-full items-center justify-center"
        style={{ minHeight }}
        role="status"
        aria-live="polite"
      >
        <Spinner size="lg" className="text-muted-foreground" />
      </div>
    ) : null;


  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0.1 : 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>

  );
}
