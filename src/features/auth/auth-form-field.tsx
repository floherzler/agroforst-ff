import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthFormFieldProps = {
  children: ReactNode;
  className?: string;
};

export function AuthFormField({ children, className }: AuthFormFieldProps) {
  return (
    <div className={cn("flex w-full flex-col space-y-2", className)}>
      {children}
    </div>
  );
}
