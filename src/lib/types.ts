export type { CaseStatus } from "@prisma/client";

export type Urgency = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Message {
  id: string;
  fromResident: boolean;
  body: string;
  sentAt: string;
}

export interface CaseRowData {
  id: string;
  subject: string;
  residentEmail: string;
  residentName: string | null;
  urgency: Urgency;
}
