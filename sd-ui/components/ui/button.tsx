"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[.98]",
  {
    variants: {
      variant: {
        default:  "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        secondary:"bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:  "border border-border bg-background hover:bg-muted hover:text-foreground",
        ghost:    "hover:bg-muted hover:text-foreground",
        danger:   "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link:     "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 px-3 text-xs",
        lg:      "h-11 px-6",
        icon:    "h-9 w-9 p-0",
        "icon-sm":"h-7 w-7 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = "Button";
