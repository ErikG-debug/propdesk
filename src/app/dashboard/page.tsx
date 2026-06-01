import { prisma } from "@/lib/prisma";
import { CaseRow } from "@/components/cases/CaseRow";

const DEMO_COMPANY_ID = process.env.DEMO_COMPANY_ID ?? "";

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { category } = await searchParams;
  const activeCategory = category ?? null;

  const [cases, categories, categoryCounts] = await Promise.all([
    prisma.case.findMany({
      where: {
        ...(DEMO_COMPANY_ID ? { companyId: DEMO_COMPANY_ID } : {}),
        ...(activeCategory ? { categoryId: activeCategory } : {}),
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
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
      by: ["categoryId"],
      _count: { categoryId: true },
      where: DEMO_COMPANY_ID ? { companyId: DEMO_COMPANY_ID } : {},
    }),
  ]);

  const countMap = Object.fromEntries(
    categoryCounts.map((c) => [c.categoryId ?? "__none__", c._count.categoryId])
  );
  const totalCount = categoryCounts.reduce((sum, c) => sum + c._count.categoryId, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Ärenden</h1>
        <span className="text-sm text-gray-500">{cases.length} ärenden</span>
      </div>

      {/* Kategoriflikar */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200 pb-px">
        <a
          href="/dashboard"
          className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
            !activeCategory
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Alla
          {totalCount > 0 && (
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
              {totalCount}
            </span>
          )}
        </a>
        {categories.map((cat) => {
          const count = countMap[cat.id] ?? 0;
          const isActive = activeCategory === cat.id;
          return (
            <a
              key={cat.id}
              href={`/dashboard?category=${cat.id}`}
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
      </div>

      {/* Ärendelista */}
      {cases.length === 0 ? (
        <div className="py-20 text-center text-gray-500">Inga ärenden att visa</div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
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
