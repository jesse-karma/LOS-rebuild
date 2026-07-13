type TagVariant =
  | "default"
  | "green"
  | "blue"
  | "amber"
  | "red"
  | "purple"
  | "pink"
  | "gray"
  | "syariah";

const variantStyles: Record<TagVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  green: "bg-emerald-100 text-emerald-800",
  blue: "bg-blue-100 text-blue-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  purple: "bg-purple-100 text-purple-800",
  pink: "bg-pink-100 text-pink-800",
  gray: "bg-gray-100 text-gray-500",
  syariah: "bg-teal-100 text-teal-800",
};

interface TagProps {
  label: string;
  variant?: TagVariant;
  className?: string;
}

export function Tag({ label, variant = "default", className = "" }: TagProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${variantStyles[variant]} ${className}`}
    >
      {label}
    </span>
  );
}

export function approvalTypeVariant(type: string): TagVariant {
  if (type.includes("Plafond")) return "purple";
  if (type.includes("PO")) return "blue";
  return "green";
}

export function assetClassVariant(cls: string): TagVariant {
  const map: Record<string, TagVariant> = {
    "Asset A": "green",
    "Asset B": "blue",
    "Asset C": "amber",
    "Asset D": "purple",
  };
  return map[cls] ?? "default";
}

export function statusVariant(status: string): TagVariant {
  const map: Record<string, TagVariant> = {
    Proposed: "blue",
    "IC Review": "purple",
    "Pending IC submission": "amber",
    Active: "green",
    Completed: "gray",
    Rescheduled: "amber",
    Rejected: "red",
  };
  return map[status] ?? "default";
}

export function irrColor(irr: number | null, projected: number): string {
  if (irr === null) return "text-gray-400";
  if (irr >= projected * 0.95) return "text-emerald-700 font-semibold";
  if (irr >= projected * 0.8) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}
