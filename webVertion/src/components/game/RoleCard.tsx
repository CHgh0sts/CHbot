"use client";
import { ROLES } from "@/lib/game/roles";
import type { RoleKey } from "@/types/game";
import { Badge } from "@/components/ui/Badge";

interface Props {
  roleKey: RoleKey;
  compact?: boolean;
}

const CAMP_LABELS: Record<string, string> = {
  village: "Village",
  wolves: "Loups",
  solo: "Solo",
};

const CAMP_COLORS: Record<string, string> = {
  village: "#22c55e",
  wolves: "#ef4444",
  solo: "#f59e0b",
};

export function RoleCard({ roleKey, compact = false }: Props) {
  const role = ROLES[roleKey];
  if (!role) return null;

  if (compact) {
    return (
      <div
        className="glass p-3 flex items-center gap-3 rounded-xl"
        style={{ borderColor: `${role.color}30` }}
      >
        <span className="text-3xl">{role.icon}</span>
        <div>
          <div className="font-bold text-sm" style={{ color: role.color }}>
            {role.name}
          </div>
          <Badge color={CAMP_COLORS[role.camp]}>{CAMP_LABELS[role.camp]}</Badge>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass p-5 rounded-2xl"
      style={{ borderColor: `${role.color}40`, boxShadow: `0 0 30px ${role.color}15` }}
    >
      <div className="text-center mb-4">
        <div className="text-5xl mb-2 animate-float">{role.icon}</div>
        <h3 className="text-xl font-bold" style={{ color: role.color }}>
          {role.name}
        </h3>
        <div className="mt-1">
          <Badge color={CAMP_COLORS[role.camp]}>{CAMP_LABELS[role.camp]}</Badge>
        </div>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed">{role.description}</p>
    </div>
  );
}
