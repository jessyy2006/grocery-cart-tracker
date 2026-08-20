import { PropsWithChildren } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MarketLoader } from "@/components/MarketLoader";

interface PageLoadGateProps {
  /** Page renders only once every dependency it needs has resolved. */
  ready: boolean;
  /** Loader height while waiting — defaults to most of the viewport. */
  minHeight?: string;
}

/**
 * Holds back an entire page (header included) until its data is ready, so
 * navigation shows a single loader instead of a header that flashes in
 * before the body arrives.
 */
export function PageLoadGate({
  ready,
  minHeight = "80vh",
  children,
}: PropsWithChildren<PageLoadGateProps>) {
  const reduce = useReducedMotion();

  if (!ready) return <MarketLoader minHeight={minHeight} />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0.1 : 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
