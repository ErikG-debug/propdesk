import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { CaseStatus } from "@prisma/client";

interface CaseRowProps {
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

export function CaseRow({
  id,
  subject,
  residentEmail,
  residentName,
  status,
  category,
  property,
  updatedAt,
  lastMessage,
}: CaseRowProps) {
  const timeAgo = formatTimeAgo(new Date(updatedAt));

  return (
    <Link href={`/dashboard/cases/${id}`} className="block">
      <div className="flex items-center gap-4 border-l-2 border-transparent px-5 py-4 transition hover:border-[#1a6ba8] hover:bg-[#1a6ba8]/5">
        {/* Vänster: ämne + avsändare */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-gray-900">{subject}</p>
          </div>
          <p className="mt-0.5 truncate text-sm text-gray-500">
            {residentName ?? residentEmail}
            {residentName && (
              <span className="ml-1 text-gray-400">· {residentEmail}</span>
            )}
            {lastMessage && (
              <span className="ml-2 text-gray-400">— {lastMessage}</span>
            )}
          </p>
        </div>

        {/* Höger: kategori, fastighet, status, tid */}
        <div className="flex shrink-0 items-center gap-3">
          {property && (
            <span className="hidden text-xs text-gray-400 sm:block">{property.name}</span>
          )}
          {category && (
            <span className="hidden rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 sm:block">
              {category.name}
            </span>
          )}
          <StatusBadge status={status} />
          <span className="w-16 text-right text-xs text-gray-400">{timeAgo}</span>
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
