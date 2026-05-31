import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { CaseStatus } from "@prisma/client";

interface CaseCardProps {
  id: string;
  subject: string;
  residentEmail: string;
  residentName: string | null;
  status: CaseStatus;
  category: { name: string } | null;
  property: { name: string } | null;
  updatedAt: string;
  lastMessage?: string;
}

export function CaseCard({
  id,
  subject,
  residentEmail,
  residentName,
  status,
  category,
  property,
  updatedAt,
  lastMessage,
}: CaseCardProps) {
  const updated = new Date(updatedAt);
  const timeAgo = formatTimeAgo(updated);

  return (
    <Link href={`/dashboard/cases/${id}`}>
      <div className="group rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-gray-900">{subject}</p>
            <p className="mt-0.5 text-sm text-gray-500">
              {residentName ?? residentEmail}
              {residentName && <span className="ml-1 text-gray-400">({residentEmail})</span>}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {lastMessage && (
          <p className="mt-2 line-clamp-2 text-sm text-gray-600">{lastMessage}</p>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
          {category && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
              {category.name}
            </span>
          )}
          {property && <span>{property.name}</span>}
          <span className="ml-auto">{timeAgo}</span>
        </div>
      </div>
    </Link>
  );
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m sedan`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h sedan`;
  const days = Math.floor(hours / 24);
  return `${days}d sedan`;
}
