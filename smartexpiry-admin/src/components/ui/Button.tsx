import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium " +
  "transition-colors duration-150 select-none cursor-pointer " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:pointer-events-none disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
  outline: "border border-input bg-card text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  danger: "bg-danger text-danger-foreground shadow-sm hover:bg-danger-hover",
  link: "text-primary underline-offset-4 hover:underline px-0 h-auto",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
};

export type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

/**
 * Button class names without the element — use it to style a <Link> like a button:
 *   <Link href="/login" className={buttonVariants({ variant: "secondary" })}>…</Link>
 */
export function buttonVariants({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}) {
  return cn(
    base,
    variants[variant],
    variant === "link" ? undefined : sizes[size],
    fullWidth && "w-full",
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyleOptions & {
    /** Shows a spinner and disables the button. */
    loading?: boolean;
    /** Text shown while loading (defaults to children). */
    loadingText?: ReactNode;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
  };

/**
 * Button with variants. Defaults: variant="primary", size="md", type="button".
 * Any `className` passed in overrides the defaults (merged with tailwind-merge).
 *
 *   <Button>Save</Button>
 *   <Button variant="secondary" size="lg" fullWidth>Cancel</Button>
 *   <Button type="submit" loading={pending} loadingText="Saving…">Save</Button>
 */
export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonVariants({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      ) : (
        leftIcon
      )}
      {loading && loadingText ? loadingText : children}
      {!loading && rightIcon}
    </button>
  );
}
