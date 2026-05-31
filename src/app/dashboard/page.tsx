import { prisma } from "@/lib/prisma";
import { CaseCard } from "@/components/cases/CaseCard";
import type { CaseStatus } from "@prisma/client";

const STATUS_TABS: { label: string; value: CaseStatus | "ALL" }[] = [
  { label: "Alla", value: "ALL" },
  { label: "Eskalerade", value: "ESCALATED" },
  { label: "Redo för granskning", value: "READY_FOR_REVIEW" },
  { label: "Väntar", value: "WAITING_FOR_RESIDENT" },
  { label: "Samlar info", value: "COLLECTING_INFORMATION" },
  { label: "Pågående", value: "IN_PROGRESS" },
  { label: "Avslutade", value: "CLOSED" },
];

// TODO: hämta companyId från session när auth är på plats
const DEMO_COMPANY_ID = process.env.DEMO_COMPANY_ID ?? "";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const activeStatus = (status as CaseStatus | undefined) ?? null;

  const cases = await prisma.case.findMany({
    where: {
      ...(DEMO_COMPANY_ID ? { companyId: DEMO_COMPANY_ID } : {}),
      ...(activeStatus ? { status: activeStatus } : {}),
    },
    orderBy: [
      // Eskalerade och redo-ärenden visas först
      { status: "asc" },
      { updatedAt: "desc" },
    ],
    include: {
      category: { select: { name: true } },
      property: { select: { name: true } },
      messages: { orderBy: { sentAt: "desc" }, take: 1 },
    },
  });

  const counts = await prisma.case.groupBy({
    by: ["status"],
    _count: { status: true },
    where: DEMO_COMPANY_ID ? { companyId: DEMO_COMPANY_ID } : {},
  });

  const countMap = Object.fromEntries(
    counts.map((c) => [c.status, c._count.status])
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Ärenden</h1>
        <span className="text-sm text-gray-500">{cases.length} ärenden</span>
      </div>

      {/* Statusflikar */}
      <div className="mb-6 flex gap-1 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const count = tab.value === "ALL"
            ? Object.values(countMap).reduce((a, b) => a + b, 0)
            : (countMap[tab.value as CaseStatus] ?? 0);
          const isActive =
            tab.value === "ALL" ? !activeStatus : activeStatus === tab.value;

          return (
            <a
              key={tab.value}
              href={tab.value === "ALL" ? "/dashboard" : `/dashboard?status=${tab.value}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </a>
          );
        })}
      </div>

      {/* Ärendelista */}
      {cases.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          Inga ärenden att visa
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <CaseCard
              key={c.id}
              id={c.id}
              subject={c.subject}
              residentEmail={c.residentEmail}
              residentName={c.residentName}
              status={c.status}
              category={c.category}
              property={c.property}
              updatedAt={c.updatedAt.toISOString()}
              lastMessage={c.messages[0]?.body.slice(0, 120)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
