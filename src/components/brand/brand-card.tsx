import * as React from "react";
import type { VariantProps } from "class-variance-authority";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { surfaceRecipes } from "@/theme/recipes";

type BrandCardProps = React.ComponentProps<typeof Card> &
  VariantProps<typeof surfaceRecipes>;

export function BrandCard({
  className,
  tone = "default",
  ...props
}: BrandCardProps) {
  return (
    <Card
      className={cn(surfaceRecipes({ tone }), className)}
      {...props}
    />
  );
}
