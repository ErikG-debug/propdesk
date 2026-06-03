import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CaseRow } from "@/components/cases/CaseRow";
import type { CaseStatus } from "@prisma/client";

const STATUS_TABS: { label: string; value: CaseStatus | "ALL" }[] = [
  { label: "Alla", value: "ALL" },
  { label: "Brådskande", value: "ESCALATED" },
  { label: "Inväntar svar", value: "WAITING_FOR_RESIDENT" },
  { label: "Redo för granskning", value: "READY_FOR_REVIEW" },
  { label: "Pågående", value: "IN_PROGRESS" },
  { label: "Avslutade", value: "CLOSED" },
];

interface PageProps {
  searchParams: Promise<{ filter?: string; assigned?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { companyId, id: userId } = session.user;
  const { filter, assigned } = await searchParams;
  const activeFilter = filter ?? null;
  const showMine = assigned === "me";

  const knownStatuses = STATUS_TABS.map((t) => t.value as string);
  const isStatusFilter = !activeFilter || knownStatuses.includes(activeFilter);
  const activeStatus = isStatusFilter && activeFilter !== "ALL" ? (activeFilter as CaseStatus) : null;
  const activeCategoryId = !isStatusFilter ? activeFilter : null;

  const baseWhere = {
    companyId,
    ...(showMine ? { assignedToId: userId } : {}),
    ...(activeStatus ? { status: activeStatus } : {}),
    ...(activeCategoryId ? { categoryId: activeCategoryId } : {}),
  };

  const countWhere = { companyId, ...(showMine ? { assignedToId: userId } : {}) };

  const [cases, categories, statusCounts, categoryCounts] = await Promise.all([
    prisma.case.findMany({
      where: baseWhere,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        category: { select: { name: true } },
        property: { select: { name: true } },
        messages: { orderBy: { sentAt: "desc" }, take: 1 },
      },
    }),
    prisma.issueCategory.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.case.groupBy({
      by: ["status"],
      _count: { status: true },
      where: countWhere,
    }),
    prisma.case.groupBy({
      by: ["categoryId"],
      _count: { categoryId: true },
      where: countWhere,
    }),
  ]);

  const statusCountMap = Object.fromEntries(
    statusCounts.map((c) => [c.status, c._count.status])
  );
  const categoryCountMap = Object.fromEntries(
    categoryCounts.map((c) => [c.categoryId ?? "", c._count.categoryId])
  );
  const totalCount = statusCounts.reduce((sum, c) => sum + c._count.status, 0);

  const assignedBase = showMine ? "&assigned=me" : "";
  const assignedBaseQ = showMine ? "?assigned=me" : "";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ärenden</h1>
        <span className="text-sm text-gray-400">{cases.length} ärenden</span>
      </div>

      {/* Mina / Alla toggle */}
      <div className="mb-4 flex gap-1">
        <a
          href="/dashboard"
          className={`rounded-full px-3 py-1 text-sm font-medium transition ${
            !showMine
              ? "bg-[#1a6ba8] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Alla ärenden
        </a>
        <a
          href="/dashboard?assigned=me"
          className={`rounded-full px-3 py-1 text-sm font-medium transition ${
            showMine
              ? "bg-[#1a6ba8] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Mina ärenden
        </a>
      </div>

      {/* Statusflikar */}
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
              href={
                tab.value === "ALL"
                  ? `/dashboard${assignedBaseQ}`
                  : `/dashboard?filter=${tab.value}${assignedBase}`
              }
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

        {categories.length > 0 && (
          <>
            <div className="mx-2 my-2 w-px bg-gray-200" />
            {categories.map((cat) => {
              const count = categoryCountMap[cat.id] ?? 0;
              const isActive = activeFilter === cat.id;
              return (
                <a
                  key={cat.id}
                  href={`/dashboard?filter=${cat.id}${assignedBase}`}
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
