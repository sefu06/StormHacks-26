import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-100",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-[#92553e] disabled:bg-[#e7d8cf] disabled:text-[#5a4033] disabled:shadow-none",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[#ede2da] disabled:bg-[#eee6e0] disabled:text-[#6b5a50]",
        outline: "border border-border bg-card text-foreground hover:bg-muted disabled:border-[#ddd2c9] disabled:bg-[#f4eee9] disabled:text-[#6b5a50]",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:text-[#6b5a50]",
      },
      size: {
        default: "min-h-11 px-4 py-2.5",
        sm: "min-h-10 px-3.5 py-2",
        lg: "min-h-12 px-5 py-3",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
