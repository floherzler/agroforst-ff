"use client";

import { cn } from "@/lib/utils";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type AnimatePresenceProps,
  type Transition,
  type Variants,
} from "motion/react";
import {
  Children,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type TextLoopProps = {
  children: ReactNode | ReactNode[];
  className?: string;
  interval?: number;
  transition?: Transition;
  variants?: Variants;
  onIndexChange?: (index: number) => void;
  trigger?: boolean;
  mode?: AnimatePresenceProps["mode"];
};

export function TextLoop({
  children,
  className,
  interval = 2,
  transition = { duration: 0.3 },
  variants,
  onIndexChange,
  trigger = true,
  mode = "wait",
}: TextLoopProps) {
  const prefersReducedMotion = useReducedMotion();
  const items = Children.toArray(children);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxWidth, setMaxWidth] = useState<number>();

  useEffect(() => {
    if (!trigger || prefersReducedMotion || items.length <= 1) {
      return;
    }

    const intervalMs = interval * 1000;
    const timer = window.setInterval(() => {
      setCurrentIndex((current) => {
        const next = (current + 1) % items.length;
        onIndexChange?.(next);
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [interval, items.length, onIndexChange, prefersReducedMotion, trigger]);

  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) {
      return;
    }

    const updateWidth = () => {
      const nextWidth = Array.from(node.children).reduce((width, child) => {
        return Math.max(width, (child as HTMLElement).offsetWidth);
      }, 0);

      setMaxWidth(nextWidth || undefined);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    Array.from(node.children).forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [items]);

  const motionVariants: Variants = {
    initial: { y: 18, opacity: 0, filter: "blur(4px)" },
    animate: { y: 0, opacity: 1, filter: "blur(0px)" },
    exit: { y: -18, opacity: 0, filter: "blur(4px)" },
  };

  return (
    <>
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none absolute -z-10 flex h-0 overflow-hidden whitespace-nowrap opacity-0"
      >
        {items.map((item, index) => (
          <div key={index} className="shrink-0">
            {item}
          </div>
        ))}
      </div>

      <div
        className={cn("relative inline-flex overflow-hidden whitespace-nowrap align-baseline", className)}
        style={maxWidth ? { width: `${maxWidth}px` } : undefined}
      >
        <AnimatePresence mode={mode} initial={false}>
          <motion.div
            key={currentIndex}
            initial={prefersReducedMotion ? false : "initial"}
            animate="animate"
            exit={prefersReducedMotion ? undefined : "exit"}
            transition={transition}
            variants={variants || motionVariants}
            className="inline-flex"
          >
            {items[currentIndex]}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
