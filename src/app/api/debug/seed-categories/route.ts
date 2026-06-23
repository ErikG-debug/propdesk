import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { FieldType } from "@prisma/client";

// Temporär setup-route — ta bort efter användning
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const companyId = session.user.companyId;

  const categories = [
    {
      id: `${companyId}-el`,
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
      id: `${companyId}-hiss`,
      name: "Hiss/Portal/Dörrar",
      description: "Problem med hissar, portdörrar eller entrédörrar",
      fields: [
        { key: "fastighetsadress", label: "Fastighetsadress", type: FieldType.TEXT, required: true, order: 0 },
        { key: "vad", label: "Hiss, portal eller dörr?", type: FieldType.TEXT, required: true, order: 1 },
        { key: "beskrivning", label: "Beskriv felet", type: FieldType.TEXT, required: true, order: 2 },
      ],
    },
    {
      id: `${companyId}-mark`,
      name: "Mark/Tak/Fasad",
      description: "Skador eller problem på mark, tak eller fasad",
      fields: [
        { key: "fastighetsadress", label: "Fastighetsadress", type: FieldType.TEXT, required: true, order: 0 },
        { key: "plats", label: "Var på byggnaden?", type: FieldType.TEXT, required: true, order: 1 },
        { key: "beskrivning", label: "Beskriv felet", type: FieldType.TEXT, required: true, order: 2 },
      ],
    },
    {
      id: `${companyId}-vatten`,
      name: "Vatten/Avlopp",
      description: "Vattenläckor, igensatta avlopp eller problem med varmvatten",
      fields: [
        { key: "lagenhetsnummer", label: "Lägenhetsnummer", type: FieldType.TEXT, required: true, order: 0 },
        { key: "plats", label: "Var är problemet?", type: FieldType.TEXT, required: true, order: 1 },
        { key: "pagar_nu", label: "Pågår det just nu?", type: FieldType.BOOLEAN, required: true, order: 2 },
      ],
    },
    {
      id: `${companyId}-vitvaror`,
      name: "Vitvaror",
      description: "Fel på kyl, frys, spis, diskmaskin eller tvättmaskin",
      fields: [
        { key: "lagenhetsnummer", label: "Lägenhetsnummer", type: FieldType.TEXT, required: true, order: 0 },
        { key: "vitvara", label: "Vilken vitvara?", type: FieldType.TEXT, required: true, order: 1 },
        { key: "beskrivning", label: "Beskriv felet", type: FieldType.TEXT, required: true, order: 2 },
      ],
    },
    {
      id: `${companyId}-varme`,
      name: "Värme/Kyla/Ventilation",
      description: "Problem med uppvärmning, kyla eller ventilation",
      fields: [
        { key: "lagenhetsnummer", label: "Lägenhetsnummer", type: FieldType.TEXT, required: true, order: 0 },
        { key: "typ", label: "Typ av problem (för kallt, för varmt, dålig ventilation)", type: FieldType.TEXT, required: true, order: 1 },
        { key: "sedan_nar", label: "Sedan när har problemet funnits?", type: FieldType.TEXT, required: true, order: 2 },
      ],
    },
    {
      id: `${companyId}-ovrigt`,
      name: "Övrigt",
      description: "Övriga fel och problem som inte passar i andra kategorier",
      fields: [
        { key: "lagenhetsnummer", label: "Lägenhetsnummer", type: FieldType.TEXT, required: false, order: 0 },
        { key: "beskrivning", label: "Beskriv ditt ärende", type: FieldType.TEXT, required: true, order: 1 },
      ],
    },
  ];

  const created: string[] = [];
  for (const cat of categories) {
    const { fields, ...catData } = cat;
    const existing = await prisma.issueCategory.findUnique({ where: { id: catData.id } });
    if (existing) {
      created.push(`${cat.name} (fanns redan)`);
      continue;
    }
    await prisma.issueCategory.create({
      data: { ...catData, companyId, fields: { create: fields } },
    });
    created.push(`${cat.name} ✓`);
  }

  return NextResponse.json({ ok: true, categories: created });
}
