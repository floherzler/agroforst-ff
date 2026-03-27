import { cva } from "class-variance-authority";

export const surfaceRecipes = cva("", {
  variants: {
    tone: {
      default: "surface-card",
      strong: "surface-card-strong",
      band: "surface-band",
      brand: "surface-brand",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const textRecipes = cva("", {
  variants: {
    role: {
      display: "text-display-brand",
      headline: "text-headline-brand",
      title: "text-title-brand",
      label: "text-label-brand",
      meta: "text-meta-brand",
    },
  },
  defaultVariants: {
    role: "title",
  },
});

export const statusToneRecipes = cva("", {
  variants: {
    tone: {
      neutral: "border-border bg-muted text-muted-foreground",
      success: "border-transparent bg-success text-success-foreground",
      warning: "border-transparent bg-warning text-warning-foreground",
      admin: "border-transparent bg-lilac-200 text-lilac-800",
      community: "border-transparent bg-secondary text-secondary-foreground",
      seasonal: "border-transparent bg-accent text-accent-foreground",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});
