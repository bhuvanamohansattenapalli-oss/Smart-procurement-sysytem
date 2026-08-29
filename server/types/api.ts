import type { Request } from "express";

export type ApiRole = "farmer" | "officer";

export type ApiPrincipal = {
  id: number;
  role: ApiRole;
  code: string;
  name: string;
  district?: string;
};

export interface AuthenticatedRequest extends Request {
  principal?: ApiPrincipal;
}

export type BookingContext = {
  farmerName: string;
  bookingCode: string;
  tokenNumber: string;
  centreName: string;
  slotDate: string;
  slotTime: string;
  queuePosition: number;
  peopleAhead: number;
  estimatedWaitMinutes: number;
  procurementStatus: string;
};

export type PaymentOutcome = "SUCCESS" | "FAILED";
export type PaymentMethod = "UPI" | "CARD" | "NET_BANKING";
export type AssistantLanguage = "EN" | "HI" | "TE";
