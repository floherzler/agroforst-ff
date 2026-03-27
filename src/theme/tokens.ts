export const themeTokens = {
  colors: {
    palette: ["soil", "forest", "harvest", "grain", "lilac"] as const,
    semantic: [
      "background",
      "foreground",
      "card",
      "popover",
      "primary",
      "secondary",
      "muted",
      "accent",
      "border",
      "input",
      "ring",
      "success",
      "warning",
      "destructive",
    ] as const,
    surfaces: [
      "surface-plain",
      "surface-soft",
      "surface-raised",
      "surface-inverse",
      "surface-brand",
      "surface-outline",
    ] as const,
  },
  typography: {
    fonts: ["body", "display", "accent"] as const,
    roles: ["display", "headline", "title", "label", "meta"] as const,
  },
  radius: ["sm", "md", "lg", "xl"] as const,
  shadows: ["soft", "strong", "floating", "lilac"] as const,
  motion: ["fast", "base", "slow", "emphasized"] as const,
} as const;

export type SemanticColorToken = typeof themeTokens.colors.semantic[number];
export type SurfaceToken = typeof themeTokens.colors.surfaces[number];
