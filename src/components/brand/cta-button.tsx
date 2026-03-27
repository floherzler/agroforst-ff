import * as React from "react";

import { Button } from "@/components/ui/button";

type CTAButtonProps = React.ComponentProps<typeof Button>;

export function CTAButton({
  variant = "brand-cta",
  size = "lg",
  ...props
}: CTAButtonProps) {
  return <Button variant={variant} size={size} {...props} />;
}
