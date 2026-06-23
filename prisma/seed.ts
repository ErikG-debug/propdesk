import "dotenv/config";
import { PrismaClient, FieldType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Bolag
  const company = await prisma.company.upsert({
    where: { intakeEmail: "felanmalan@bodesk.test" },
    update: {},
    create: {
      name: "Testbolaget AB",
      intakeEmail: "felanmalan@bodesk.test",
    },
  });

  console.log(`Bolag: ${company.name} (${company.id})`);

  // Admin-användare
  const passwordHash = await bcrypt.hash("bodesk123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@bodesk.test" },
    update: {},
    create: {
      email: "admin@bodesk.test",
      name: "Admin",
      password: passwordHash,
      role: "ADMIN",
      companyId: company.id,
    },
  });

  console.log(`Admin: ${admin.email} / lösenord: bodesk123`);

  const categories = [
    {
      id: "seed-category-el",
      name: "El",
      description: "Elektriska fel och störningar i lägenheten eller fastigheten",
      fields: [
        { key: "lagenhetsnummer", label: "Lägenhetsnummer", type: FieldType.TEXT, required: true, order: 0 },
        { key: "plats", label: "Var i lägenheten/fastigheten?", type: FieldType.TEXT, required: true, order: 1 },
        { key: "beskrivning", label: "Beskriv felet", type: FieldType.TEXT, required: true, order: 2 },
        { key: "pagar_nu", label: "Pågår felet just nu?", type: FieldType.BOOLEAN, required: true, order: 3 },
      ],
    },
    {
      id: "seed-category-hiss-portal-dorrar",
      name: "Hiss/Portal/Dörrar",
      description: "Problem med hissar, portdörrar eller entrédörrar",
      fields: [
        { key: "fastighetsadress", label: "Fastighetsadress", type: FieldType.TEXT, required: true, order: 0 },
        { key: "vad", label: "Hiss, portal eller dörr?", type: FieldType.TEXT, required: true, order: 1 },
        { key: "beskrivning", label: "Beskriv felet", type: FieldType.TEXT, required: true, order: 2 },
      ],
    },
    {
      id: "seed-category-mark-tak-fasad",
      name: "Mark/Tak/Fasad",
      description: "Skador eller problem på mark, tak eller fasad",
      fields: [
        { key: "fastighetsadress", label: "Fastighetsadress", type: FieldType.TEXT, required: true, order: 0 },
        { key: "plats", label: "Var på byggnaden?", type: FieldType.TEXT, required: true, order: 1 },
        { key: "beskrivning", label: "Beskriv felet", type: FieldType.TEXT, required: true, order: 2 },
      ],
    },
    {
      id: "seed-category-vatten-avlopp",
      name: "Vatten/Avlopp",
      description: "Vattenläckor, igensatta avlopp eller problem med varmvatten",
      fields: [
        { key: "lagenhetsnummer", label: "Lägenhetsnummer", type: FieldType.TEXT, required: true, order: 0 },
        { key: "plats", label: "Var är problemet?", type: FieldType.TEXT, required: true, order: 1 },
        { key: "pagar_nu", label: "Pågår det just nu?", type: FieldType.BOOLEAN, required: true, order: 2 },
      ],
    },
    {
      id: "seed-category-vitvaror",
      name: "Vitvaror",
      description: "Fel på kyl, frys, spis, diskmaskin eller tvättmaskin",
      fields: [
        { key: "lagenhetsnummer", label: "Lägenhetsnummer", type: FieldType.TEXT, required: true, order: 0 },
        { key: "vitvara", label: "Vilken vitvara?", type: FieldType.TEXT, required: true, order: 1 },
        { key: "beskrivning", label: "Beskriv felet", type: FieldType.TEXT, required: true, order: 2 },
      ],
    },
    {
      id: "seed-category-varme-kyla-ventilation",
      name: "Värme/Kyla/Ventilation",
      description: "Problem med uppvärmning, kyla eller ventilation",
      fields: [
        { key: "lagenhetsnummer", label: "Lägenhetsnummer", type: FieldType.TEXT, required: true, order: 0 },
        { key: "typ", label: "Typ av problem (för kallt, för varmt, dålig ventilation)", type: FieldType.TEXT, required: true, order: 1 },
        { key: "sedan_nar", label: "Sedan när har problemet funnits?", type: FieldType.TEXT, required: true, order: 2 },
      ],
    },
    {
      id: "seed-category-ovrigt",
      name: "Övrigt",
      description: "Övriga fel och problem som inte passar i andra kategorier",
      fields: [
        { key: "lagenhetsnummer", label: "Lägenhetsnummer", type: FieldType.TEXT, required: false, order: 0 },
        { key: "beskrivning", label: "Beskriv ditt ärende", type: FieldType.TEXT, required: true, order: 1 },
      ],
    },
  ];

  for (const cat of categories) {
    const { fields, ...catData } = cat;
    const created = await prisma.issueCategory.upsert({
      where: { id: catData.id },
      update: { name: catData.name, description: catData.description },
      create: {
        ...catData,
        companyId: company.id,
        fields: { create: fields },
      },
    });
    console.log(`Kategori: ${created.name}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
