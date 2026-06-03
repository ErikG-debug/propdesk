import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Bolag
  const company = await prisma.company.upsert({
    where: { intakeEmail: "felanmalan@propdesk.test" },
    update: {},
    create: {
      name: "Testbolaget AB",
      intakeEmail: "felanmalan@propdesk.test",
    },
  });

  console.log(`Bolag: ${company.name} (${company.id})`);

  // Admin-användare
  const passwordHash = await bcrypt.hash("propdesk123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@propdesk.test" },
    update: {},
    create: {
      email: "admin@propdesk.test",
      name: "Admin",
      password: passwordHash,
      role: "ADMIN",
      companyId: company.id,
    },
  });

  console.log(`Admin: ${admin.email} / lösenord: propdesk123`);

  // Exempelkategori med fält
  const category = await prisma.issueCategory.upsert({
    where: { id: "seed-category-vattenläcka" },
    update: {},
    create: {
      id: "seed-category-vattenläcka",
      companyId: company.id,
      name: "Vattenläcka",
      description: "Läckor och vattenskador i lägenheten",
      fields: {
        create: [
          { key: "lagenhetsnummer", label: "Lägenhetsnummer", type: "TEXT", required: true, order: 0 },
          { key: "plats", label: "Var läcker det?", type: "TEXT", required: true, order: 1 },
          { key: "pagar_nu", label: "Pågår läckan just nu?", type: "BOOLEAN", required: true, order: 2 },
        ],
      },
    },
  });

  console.log(`Kategori: ${category.name}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
