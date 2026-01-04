"use client";

import {
  motion,
  AnimatePresence,
  MotionConfig,
  type Transition,
  type Variants,
} from "framer-motion";
import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

type AccordionContextValue = {
  expandedValue: string | null;
  toggleItem: (value: string) => void;
  variants?: Variants;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordion() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error("useAccordion must be used within an AccordionProvider");
  }
  return context;
}

function AccordionProvider({
  children,
  variants,
}: {
  children: React.ReactNode;
  variants?: Variants;
}) {
  const [expandedValue, setExpandedValue] = useState<string | null>(null);

  const toggleItem = (value: string) => {
    setExpandedValue(expandedValue === value ? null : value);
  };

  return (
    <AccordionContext.Provider value={{ expandedValue, toggleItem, variants }}>
      {children}
    </AccordionContext.Provider>
  );
}

function Accordion({
  children,
  className,
  transition,
  variants,
}: {
  children: React.ReactNode;
  className?: string;
  transition?: Transition;
  variants?: Variants;
}) {
  return (
    <MotionConfig transition={transition}>
      <div className={cn("relative", className)} aria-orientation="vertical">
        <AccordionProvider variants={variants}>{children}</AccordionProvider>
      </div>
    </MotionConfig>
  );
}

type AccordionChildProps = {
  expanded?: boolean;
  onToggle?: () => void;
};

function AccordionItem({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactElement | React.ReactElement[];
  className?: string;
}) {
  const { expandedValue, toggleItem } = useAccordion();
  const isExpanded = value === expandedValue;

  return (
    <div
      className={cn("overflow-hidden", className)}
      {...(isExpanded ? { "data-expanded": "" } : {})}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement<AccordionChildProps>(child)
          ? React.cloneElement(child, {
              expanded: isExpanded,
              onToggle: () => toggleItem(value),
            })
          : child
      )}
    </div>
  );
}

function AccordionTrigger({
  children,
  className,
  onToggle,
  expanded,
}: {
  children: React.ReactNode;
  className?: string;
  onToggle?: () => void;
  expanded?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={expanded}
      type="button"
      className={cn("group", className)}
      {...(expanded ? { "data-expanded": "" } : {})}
    >
      {children}
    </button>
  );
}

function AccordionContent({
  children,
  expanded,
  className,
}: {
  children: React.ReactNode;
  expanded?: boolean;
  className?: string;
}) {
  const { variants } = useAccordion();
  const baseVariants: Variants = {
    expanded: { height: "auto" },
    collapsed: { height: 0 },
  };

  const combinedVariants: Variants = {
    expanded: { ...baseVariants.expanded, ...variants?.expanded },
    collapsed: { ...baseVariants.collapsed, ...variants?.collapsed },
  };

  return (
    <AnimatePresence>
      {expanded ? (
        <motion.div
          initial="collapsed"
          animate="expanded"
          exit="collapsed"
          variants={combinedVariants}
          className={className}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
