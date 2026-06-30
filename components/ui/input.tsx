import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-white",
          "text-[var(--foreground)] placeholder:text-[var(--foreground)]/40",
          "focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
          "transition-all disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full min-h-[100px] px-4 py-3 rounded-xl border border-[var(--border)] bg-white",
          "text-[var(--foreground)] placeholder:text-[var(--foreground)]/40",
          "focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
          "transition-all resize-y",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-white",
          "text-[var(--foreground)]",
          "focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
          "transition-all",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-sm font-medium text-[var(--foreground)] mb-1.5",
          className
        )}
        {...props}
      />
    );
  }
);
Label.displayName = "Label";