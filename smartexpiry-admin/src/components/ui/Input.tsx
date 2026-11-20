"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type InputSize = "sm" | "md" | "lg";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: ReactNode;
  /** Error text (or list, e.g. from Zod). Turns the field red and is announced to screen readers. */
  error?: string | string[];
  /** Helper text shown under the field when there is no error. */
  hint?: ReactNode;
  /** Icon rendered inside the field, on the left. */
  leftIcon?: ReactNode;
  /** Element rendered inside the field, on the right (ignored for password fields). */
  rightElement?: ReactNode;
  size?: InputSize;
  /** Classes for the outer wrapper (label + field + messages). */
  containerClassName?: string;
  /** Classes for the label. */
  labelClassName?: string;
  /** Classes for the <input> itself (same as `className`, kept for clarity). */
  inputClassName?: string;
};

const sizes: Record<InputSize, string> = {
  sm: "h-9 text-sm",
  md: "h-11 text-sm",
  lg: "h-12 text-base",
};

/**
 * Text field with label, icons, hint and error state.
 * Password fields get a show/hide toggle automatically.
 * Default styles apply when no classes are passed; any `className`,
 * `inputClassName`, `containerClassName` or `labelClassName` overrides them.
 *
 *   <Input name="email" type="email" label="Email" leftIcon={<Mail />} error={errors?.email} />
 */
export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightElement,
  size = "md",
  type = "text",
  id,
  required,
  disabled,
  className,
  inputClassName,
  containerClassName,
  labelClassName,
  ...props
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const errorList = Array.isArray(error) ? error : error ? [error] : [];
  const hasError = errorList.length > 0;

  const right = isPassword ? (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={showPassword ? "Hide password" : "Show password"}
      tabIndex={-1}
      disabled={disabled}
    >
      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  ) : (
    rightElement
  );

  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn("text-sm font-medium text-foreground", labelClassName)}
        >
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground [&_svg]:size-4">
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          type={isPassword && showPassword ? "text" : type}
          required={required}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError || hint ? messageId : undefined}
          className={cn(
            "w-full rounded-lg border border-input bg-card px-3 text-foreground shadow-xs",
            "placeholder:text-muted-foreground/70 transition-[border-color,box-shadow] duration-150",
            "focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/20",
            "disabled:cursor-not-allowed disabled:opacity-60",
            sizes[size],
            leftIcon && "pl-10",
            right && "pr-10",
            hasError && "border-danger focus:border-danger focus:ring-danger/20",
            className,
            inputClassName,
          )}
          {...props}
        />

        {right && (
          <span className="absolute inset-y-0 right-2 flex items-center">{right}</span>
        )}
      </div>

      {hasError ? (
        <div id={messageId} role="alert" className="text-xs text-danger">
          {errorList.length === 1 ? (
            errorList[0]
          ) : (
            <ul className="list-inside list-disc space-y-0.5">
              {errorList.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      ) : hint ? (
        <p id={messageId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
