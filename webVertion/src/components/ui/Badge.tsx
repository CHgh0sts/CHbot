interface Props {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color = "#7c3aed", className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
    >
      {children}
    </span>
  );
}
