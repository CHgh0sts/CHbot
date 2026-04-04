import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "bg-violet-700 hover:bg-violet-600 text-white shadow-lg shadow-violet-900/30",
  ghost: "bg-transparent hover:bg-white/5 text-gray-300",
  danger: "bg-red-700 hover:bg-red-600 text-white",
  outline:
    "border border-[var(--border)] hover:border-violet-500 text-gray-300 hover:text-white bg-transparent",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  disabled,
  ...props
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 cursor-pointer
        ${variants[variant]} ${sizes[size]}
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
        ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
