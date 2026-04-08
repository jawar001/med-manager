/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ServiceType {
  ROOT_CANAL = "Root Canal",
  EXTRACTION = "Extraction",
  FACIAL_SURGERY = "Facial Surgery",
  CLEANING = "Cleaning",
  FILLINGS = "Fillings",
  BRACES = "Braces",
  CROWNS = "Crowns",
  IMPLANTS = "Implants",
}

export const SERVICE_PRICES: Record<ServiceType, number> = {
  [ServiceType.ROOT_CANAL]: 5000,
  [ServiceType.EXTRACTION]: 1500,
  [ServiceType.FACIAL_SURGERY]: 15000,
  [ServiceType.CLEANING]: 1000,
  [ServiceType.FILLINGS]: 2000,
  [ServiceType.BRACES]: 45000,
  [ServiceType.CROWNS]: 8000,
  [ServiceType.IMPLANTS]: 25000,
};

export interface Installment {
  week: number;
  amount: number;
  date: string;
}

export interface Patient {
  id: string;
  serialNo: string;
  name: string;
  email: string;
  serviceType: ServiceType;
  amountDue: number;
  amountPaid: number;
  paymentType: "Direct" | "Installments";
  installments: Installment[];
  status: "Paid" | "Unpaid";
  medicalHistory: string[];
  allergies: string[];
  chronicConditions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  serviceType: ServiceType;
  status: "Scheduled" | "Completed" | "Cancelled";
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  medicineType?: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  lastRestocked: string;
}

export interface Transaction {
  id: string;
  patientId: string;
  patientName: string;
  amount: number;
  type: "Income" | "Expense";
  category: string;
  date: string;
  description: string;
}
