import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-medium tracking-wide transition-[filter] duration-150 disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" && "ui-btn ui-btn-on text-fg hover:brightness-125",
        variant === "secondary" && "ui-btn text-fg hover:brightness-110",
        variant === "ghost" && "text-muted hover:text-fg",
        variant === "ghost" && "text-muted hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}
