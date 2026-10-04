import * as React from "react";

import { cn } from "@/lib/utils";

function Avatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative flex shrink-0 overflow-hidden rounded-full", className)} {...props} />;
}

function AvatarFallback({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex h-full w-full items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground", className)}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback };
