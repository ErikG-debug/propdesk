import { prisma } from "@/lib/prisma";
import { CaseRow } from "@/components/cases/CaseRow";
import type { CaseStatus } from "@prisma/client";

const DEMO_COMPANY_ID = process.env.DEMO_COMPANY_ID ?? "";

const STATUS_TABS: { label: string; value: CaseStatus | "ALL" }[] = [
  { label: "Alla", value: "ALL" },
  { label: "Brådskande", value: "ESCALATED" },
  { label: "Inväntar svar", value: "WAITING_FOR_RESIDENT" },
  { label: "Redo för granskning", value: "READY_FOR_REVIEW" },
  { label: "Pågående", value: "IN_PROGRESS" },
  { label: "Avslutade", value: "CLOSED" },
];

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { filter } = await searchParams;
  const activeFilter = filter ?? null;

  // Avgör om aktiv flik är status eller kategori-ID
  const knownStatuses = STATUS_TABS.map((t) => t.value as string);
  const isStatusFilter = !activeFilter || knownStatuses.includes(activeFilter);
  const activeStatus = isStatusFilter && activeFilter !== "ALL" ? (activeFilter as CaseStatus) : null;
  const activeCategoryId = !isStatusFilter ? activeFilter : null;

  const [cases, categories, statusCounts, categoryCounts] = await Promise.all([
    prisma.case.findMany({
      where: {
        ...(DEMO_COMPANY_ID ? { companyId: DEMO_COMPANY_ID } : {}),
        ...(activeStatus ? { status: activeStatus } : {}),
        ...(activeCategoryId ? { categoryId: activeCategoryId } : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        category: { select: { name: true } },
        property: { select: { name: true } },
        messages: { orderBy: { sentAt: "desc" }, take: 1 },
      },
    }),
    prisma.issueCategory.findMany({
      where: DEMO_COMPANY_ID ? { companyId: DEMO_COMPANY_ID } : {},
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.case.groupBy({
      by: ["status"],
      _count: { status: true },
      where: DEMO_COMPANY_ID ? { companyId: DEMO_COMPANY_ID } : {},
    }),
    prisma.case.groupBy({
      by: ["categoryId"],
      _count: { categoryId: true },
      where: DEMO_COMPANY_ID ? { companyId: DEMO_COMPANY_ID } : {},
    }),
  ]);

  const statusCountMap = Object.fromEntries(
    statusCounts.map((c) => [c.status, c._count.status])
  );
  const categoryCountMap = Object.fromEntries(
    categoryCounts.map((c) => [c.categoryId ?? "", c._count.categoryId])
  );
  const totalCount = statusCounts.reduce((sum, c) => sum + c._count.status, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ärenden</h1>
        <span className="text-sm text-gray-400">{cases.length} ärenden</span>
      </div>

      {/* Flikar */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200 pb-px">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === "ALL"
              ? totalCount
              : (statusCountMap[tab.value as CaseStatus] ?? 0);
          const isActive =
            tab.value === "ALL" ? !activeFilter || activeFilter === "ALL" : activeFilter === tab.value;

          return (
            <a
              key={tab.value}
              href={tab.value === "ALL" ? "/dashboard" : `/dashboard?filter=${tab.value}`}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-[#1a6ba8] text-[#1a6ba8]"
                  : "border-transparent text-gray-500 hover:text-[#1a6ba8]"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {count}
                </span>
              )}
            </a>
          );
        })}

        {/* Kategoriflikar — visas om kategorier finns */}
        {categories.length > 0 && (
          <>
            <div className="mx-2 my-2 w-px bg-gray-200" />
            {categories.map((cat) => {
              const count = categoryCountMap[cat.id] ?? 0;
              const isActive = activeFilter === cat.id;
              return (
                <a
                  key={cat.id}
                  href={`/dashboard?filter=${cat.id}`}
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {cat.name}
                  {count > 0 && (
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {count}
                    </span>
                  )}
                </a>
              );
            })}
          </>
        )}
      </div>

      {/* Ärendelista */}
      {cases.length === 0 ? (
        <div className="py-20 text-center text-gray-500">Inga ärenden att visa</div>
      ) : (
        <div className="divide-y divide-blue-50 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm shadow-blue-100">
          {cases.map((c) => (
            <CaseRow
              key={c.id}
              id={c.id}
              subject={c.subject}
              residentEmail={c.residentEmail}
              residentName={c.residentName}
              status={c.status}
              category={c.category}
              property={c.property}
              updatedAt={c.updatedAt.toISOString()}
              lastMessage={c.messages[0]?.body.slice(0, 100)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
