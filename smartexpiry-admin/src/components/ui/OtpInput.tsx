"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type OtpInputProps = {
  /** Form field name; the full code is submitted under this name. */
  name: string;
  /** Number of digits. Default 6. */
  length?: number;
  label?: ReactNode;
  error?: string | string[];
  hint?: ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Called once when every box is filled (e.g. to auto-submit the form). */
  onComplete?: (code: string) => void;
  /** Classes for the outer wrapper. */
  className?: string;
  /** Classes for each digit box (override the defaults). */
  inputClassName?: string;
};

/**
 * One-time-code input: a row of single-digit boxes.
 * Supports typing, backspace, arrow keys, pasting the whole code and the
 * phone keyboard's "From Messages/Mail" autofill.
 *
 *   <OtpInput name="otp" onComplete={() => formRef.current?.requestSubmit()} />
 */
export function OtpInput({
  name,
  length = 6,
  label,
  error,
  hint,
  disabled,
  autoFocus,
  onComplete,
  className,
  inputClassName,
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const lastCompleted = useRef<string | null>(null);
  const id = useId();

  const code = digits.join("");
  const errorList = Array.isArray(error) ? error : error ? [error] : [];
  const hasError = errorList.length > 0;

  // Fire onComplete after the DOM has the full value (so a form submit includes it).
  useEffect(() => {
    if (code.length === length && code !== lastCompleted.current) {
      lastCompleted.current = code;
      onComplete?.(code);
    }
    if (code.length < length) lastCompleted.current = null;
  }, [code, length, onComplete]);

  const focus = (index: number) => refs.current[Math.max(0, Math.min(length - 1, index))]?.focus();

  /** Writes digits starting at `start` and moves focus after the last one. */
  const fillFrom = (start: number, value: string) => {
    const incoming = value.replace(/\D/g, "").slice(0, length - start).split("");
    if (incoming.length === 0) return;
    setDigits((prev) => {
      const next = [...prev];
      incoming.forEach((d, i) => (next[start + i] = d));
      return next;
    });
    focus(start + incoming.length);
  };

  const handleChange = (index: number, value: string) => {
    if (value === "") {
      setDigits((prev) => prev.map((d, i) => (i === index ? "" : d)));
      return;
    }
    // Autofill / fast typing can put several digits in one box.
    fillFrom(index, value.length > 1 && digits[index] ? value.replace(digits[index], "") : value);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      setDigits((prev) => prev.map((d, i) => (i === index - 1 ? "" : d)));
      focus(index - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focus(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focus(index + 1);
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    fillFrom(index, event.clipboardData.getData("text"));
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label htmlFor={`${id}-0`} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <input type="hidden" name={name} value={code} />

      <div
        role="group"
        aria-label={typeof label === "string" ? label : "Verification code"}
        className="flex justify-between gap-2 sm:gap-3"
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            id={`${id}-${index}`}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={index === 0 ? length : 1}
            value={digit}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError || hint ? `${id}-message` : undefined}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePaste(index, e)}
            onFocus={(e) => e.target.select()}
            className={cn(
              "h-14 w-full min-w-0 rounded-lg border border-input bg-card text-center font-mono text-2xl font-semibold text-foreground shadow-xs",
              "transition-[border-color,box-shadow] duration-150 caret-primary",
              "focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/20",
              "disabled:cursor-not-allowed disabled:opacity-60",
              digit && "border-primary/60",
              hasError && "border-danger focus:border-danger focus:ring-danger/20",
              inputClassName,
            )}
          />
        ))}
      </div>

      {hasError ? (
        <p id={`${id}-message`} role="alert" className="text-xs text-danger">
          {errorList[0]}
        </p>
      ) : hint ? (
        <p id={`${id}-message`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
