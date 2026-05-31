import type { CaseStatus, FieldType } from "@prisma/client";

export type { CaseStatus, FieldType };

export interface CaseWithDetails {
  id: string;
  status: CaseStatus;
  residentEmail: string;
  residentName: string | null;
  subject: string;
  summary: string | null;
  escalationNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string } | null;
  property: { id: string; name: string } | null;
  fieldValues: {
    field: { key: string; label: string };
    value: string;
  }[];
  messages: {
    id: string;
    fromResident: boolean;
    body: string;
    sentAt: Date;
  }[];
}

export interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  messageId: string;
  inReplyTo?: string;
}
