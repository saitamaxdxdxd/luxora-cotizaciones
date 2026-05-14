/**
 * Vehicles store — async, contra Supabase (tabla `vehicles` y sub-tablas).
 *
 * - Dominio en camelCase; DB en snake_case. Mappers en cada función.
 * - createX() es sync y solo devuelve un draft con id pre-generado.
 * - saveX() es upsert (insert-or-update).
 * - getX() lista del owner_id actual (RLS filtra).
 */

import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

// ─── Tipos de dominio ─────────────────────────────────────────────────────────

export type VehicleStatus = "DISPONIBLE" | "RENTADO" | "MANTENIMIENTO" | "INACTIVO";
export type FuelType = "magna" | "premium" | "diesel";
export type VehicleCategory = "suv" | "van" | "sprinter" | "executive";
export type IdealUseType = "airport" | "executive" | "tourism" | "long_distance";

export interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placas: string;
  vin: string;
  color: string;
  kilometraje: number;
  rentaDia: number;
  status: VehicleStatus;
  foto: string;
  notas: string;
  createdAt: string;
  updatedAt: string;
  capacidadPasajeros: number;
  fuelType: FuelType;
  fuelEfficiencyKmPerLiter: number;
  vehicleCategory: VehicleCategory;
  idealUseType: IdealUseType;
}

export interface VehicleInsurance {
  id: string;
  vehicleId: string;
  insuranceCompany: string;
  policyPdf: string;
  phone: string;
  annualCost: number;
  startDate: string;
  expirationDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleVerification {
  id: string;
  vehicleId: string;
  verificationDate: string;
  monthsValid: number;
  holomgramColor: string; // (sic) misspelled in legacy code — kept for compatibility
  hologramType: string;
  expirationDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceType = "oil_change" | "brakes" | "tires" | "inspection" | "alignment" | "custom";

export interface VehicleMaintenance {
  id: string;
  vehicleId: string;
  type: MaintenanceType;
  mileage: number;
  serviceDate: string;
  nextServiceMileage: number;
  nextServiceDate: string;
  cost: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type TaxType = "tenencia" | "refrendo";

export interface VehicleTax {
  id: string;
  vehicleId: string;
  type: TaxType;
  year: number;
  amount: number;
  dueDate: string;
  paid: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type InsuranceRow = Database["public"]["Tables"]["vehicle_insurances"]["Row"];
type VerificationRow = Database["public"]["Tables"]["vehicle_verifications"]["Row"];
type MaintenanceRow = Database["public"]["Tables"]["vehicle_maintenances"]["Row"];
type TaxRow = Database["public"]["Tables"]["vehicle_taxes"]["Row"];

const newId = () => crypto.randomUUID();
const today = () => new Date().toISOString();
const dateOnly = (iso: string) => (iso ? iso.slice(0, 10) : "");

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sin sesión activa");
  return data.user.id;
}

function logErr(prefix: string, e: unknown) {
  console.error(`[vehicles.${prefix}]`, e);
}

// ─── Mappers: Vehicle ─────────────────────────────────────────────────────────

function vehicleFromDb(r: VehicleRow): Vehicle {
  return {
    id: r.id,
    marca: r.marca,
    modelo: r.modelo,
    anio: r.anio,
    placas: r.placas,
    vin: r.vin,
    color: r.color,
    kilometraje: r.kilometraje,
    rentaDia: Number(r.renta_dia),
    status: r.status as VehicleStatus,
    foto: r.foto_url ?? "",
    notas: r.notas,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    capacidadPasajeros: r.capacidad_pasajeros,
    fuelType: r.fuel_type as FuelType,
    fuelEfficiencyKmPerLiter: Number(r.fuel_efficiency_km_per_liter),
    vehicleCategory: r.vehicle_category as VehicleCategory,
    idealUseType: r.ideal_use_type as IdealUseType,
  };
}

function vehicleToDb(v: Vehicle, ownerId: string) {
  return {
    id: v.id,
    owner_id: ownerId,
    marca: v.marca,
    modelo: v.modelo,
    anio: v.anio,
    placas: v.placas,
    vin: v.vin,
    color: v.color,
    kilometraje: v.kilometraje,
    renta_dia: v.rentaDia,
    status: v.status,
    foto_url: v.foto || null,
    notas: v.notas,
    capacidad_pasajeros: v.capacidadPasajeros,
    fuel_type: v.fuelType,
    fuel_efficiency_km_per_liter: v.fuelEfficiencyKmPerLiter,
    vehicle_category: v.vehicleCategory,
    ideal_use_type: v.idealUseType,
  };
}

// ─── Vehicles CRUD ────────────────────────────────────────────────────────────

export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { logErr("getVehicles", error); return []; }
  return (data ?? []).map(vehicleFromDb);
}

export async function getVehicleById(id: string): Promise<Vehicle | undefined> {
  if (!id) return undefined;
  const { data, error } = await supabase.from("vehicles").select("*").eq("id", id).maybeSingle();
  if (error) { logErr("getVehicleById", error); return undefined; }
  return data ? vehicleFromDb(data) : undefined;
}

export function createVehicle(): Vehicle {
  return {
    id: newId(),
    marca: "", modelo: "", anio: new Date().getFullYear(),
    placas: "", vin: "", color: "", kilometraje: 0, rentaDia: 0,
    status: "DISPONIBLE", foto: "", notas: "",
    capacidadPasajeros: 5,
    fuelType: "magna",
    fuelEfficiencyKmPerLiter: 10,
    vehicleCategory: "suv",
    idealUseType: "executive",
    createdAt: today(), updatedAt: today(),
  };
}

export async function saveVehicle(v: Vehicle): Promise<Vehicle | undefined> {
  const ownerId = await requireUserId();
  const { data, error } = await supabase
    .from("vehicles")
    .upsert(vehicleToDb(v, ownerId), { onConflict: "id" })
    .select("*")
    .single();
  if (error) { logErr("saveVehicle", error); return undefined; }
  return vehicleFromDb(data);
}

export async function deleteVehicle(id: string): Promise<boolean> {
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) { logErr("deleteVehicle", error); return false; }
  return true;
}

// ─── Mappers + CRUD: Insurance ────────────────────────────────────────────────

function insuranceFromDb(r: InsuranceRow): VehicleInsurance {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    insuranceCompany: r.insurance_company,
    policyPdf: r.policy_pdf_url ?? "",
    phone: r.phone,
    annualCost: Number(r.annual_cost),
    startDate: dateOnly(r.start_date ?? ""),
    expirationDate: dateOnly(r.expiration_date ?? ""),
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function insuranceToDb(i: VehicleInsurance, ownerId: string) {
  return {
    id: i.id,
    owner_id: ownerId,
    vehicle_id: i.vehicleId,
    insurance_company: i.insuranceCompany,
    policy_pdf_url: i.policyPdf || null,
    phone: i.phone,
    annual_cost: i.annualCost,
    start_date: i.startDate || null,
    expiration_date: i.expirationDate || null,
    notes: i.notes,
  };
}

export async function getVehicleInsurancesBy(vehicleId: string): Promise<VehicleInsurance[]> {
  const { data, error } = await supabase
    .from("vehicle_insurances")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });
  if (error) { logErr("getInsurancesBy", error); return []; }
  return (data ?? []).map(insuranceFromDb);
}

export function createVehicleInsurance(vehicleId: string): VehicleInsurance {
  return {
    id: newId(),
    vehicleId,
    insuranceCompany: "",
    policyPdf: "",
    phone: "",
    annualCost: 0,
    startDate: "",
    expirationDate: "",
    notes: "",
    createdAt: today(),
    updatedAt: today(),
  };
}

export async function saveVehicleInsurance(i: VehicleInsurance): Promise<VehicleInsurance | undefined> {
  const ownerId = await requireUserId();
  const { data, error } = await supabase
    .from("vehicle_insurances")
    .upsert(insuranceToDb(i, ownerId), { onConflict: "id" })
    .select("*")
    .single();
  if (error) { logErr("saveInsurance", error); return undefined; }
  return insuranceFromDb(data);
}

export async function deleteVehicleInsurance(id: string): Promise<boolean> {
  const { error } = await supabase.from("vehicle_insurances").delete().eq("id", id);
  if (error) { logErr("deleteInsurance", error); return false; }
  return true;
}

// ─── Mappers + CRUD: Verification ─────────────────────────────────────────────

function verificationFromDb(r: VerificationRow): VehicleVerification {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    verificationDate: dateOnly(r.verification_date ?? ""),
    monthsValid: r.months_valid,
    holomgramColor: r.hologram_color,
    hologramType: r.hologram_type,
    expirationDate: dateOnly(r.expiration_date ?? ""),
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function verificationToDb(v: VehicleVerification, ownerId: string) {
  return {
    id: v.id,
    owner_id: ownerId,
    vehicle_id: v.vehicleId,
    verification_date: v.verificationDate || null,
    months_valid: v.monthsValid,
    hologram_color: v.holomgramColor,
    hologram_type: v.hologramType,
    expiration_date: v.expirationDate || null,
    notes: v.notes,
  };
}

export async function getVehicleVerificationsBy(vehicleId: string): Promise<VehicleVerification[]> {
  const { data, error } = await supabase
    .from("vehicle_verifications")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });
  if (error) { logErr("getVerificationsBy", error); return []; }
  return (data ?? []).map(verificationFromDb);
}

export function createVehicleVerification(vehicleId: string): VehicleVerification {
  return {
    id: newId(),
    vehicleId,
    verificationDate: "",
    monthsValid: 12,
    holomgramColor: "",
    hologramType: "",
    expirationDate: "",
    notes: "",
    createdAt: today(),
    updatedAt: today(),
  };
}

export async function saveVehicleVerification(v: VehicleVerification): Promise<VehicleVerification | undefined> {
  const ownerId = await requireUserId();
  const { data, error } = await supabase
    .from("vehicle_verifications")
    .upsert(verificationToDb(v, ownerId), { onConflict: "id" })
    .select("*")
    .single();
  if (error) { logErr("saveVerification", error); return undefined; }
  return verificationFromDb(data);
}

export async function deleteVehicleVerification(id: string): Promise<boolean> {
  const { error } = await supabase.from("vehicle_verifications").delete().eq("id", id);
  if (error) { logErr("deleteVerification", error); return false; }
  return true;
}

// ─── Mappers + CRUD: Maintenance ──────────────────────────────────────────────

function maintenanceFromDb(r: MaintenanceRow): VehicleMaintenance {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    type: r.type as MaintenanceType,
    mileage: r.mileage,
    serviceDate: dateOnly(r.service_date ?? ""),
    nextServiceMileage: r.next_service_mileage,
    nextServiceDate: dateOnly(r.next_service_date ?? ""),
    cost: Number(r.cost),
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function maintenanceToDb(m: VehicleMaintenance, ownerId: string) {
  return {
    id: m.id,
    owner_id: ownerId,
    vehicle_id: m.vehicleId,
    type: m.type,
    mileage: m.mileage,
    service_date: m.serviceDate || null,
    next_service_mileage: m.nextServiceMileage,
    next_service_date: m.nextServiceDate || null,
    cost: m.cost,
    notes: m.notes,
  };
}

export async function getVehicleMaintenancesBy(vehicleId: string): Promise<VehicleMaintenance[]> {
  const { data, error } = await supabase
    .from("vehicle_maintenances")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });
  if (error) { logErr("getMaintenancesBy", error); return []; }
  return (data ?? []).map(maintenanceFromDb);
}

export function createVehicleMaintenance(vehicleId: string): VehicleMaintenance {
  return {
    id: newId(),
    vehicleId,
    type: "custom",
    mileage: 0,
    serviceDate: "",
    nextServiceMileage: 0,
    nextServiceDate: "",
    cost: 0,
    notes: "",
    createdAt: today(),
    updatedAt: today(),
  };
}

export async function saveVehicleMaintenance(m: VehicleMaintenance): Promise<VehicleMaintenance | undefined> {
  const ownerId = await requireUserId();
  const { data, error } = await supabase
    .from("vehicle_maintenances")
    .upsert(maintenanceToDb(m, ownerId), { onConflict: "id" })
    .select("*")
    .single();
  if (error) { logErr("saveMaintenance", error); return undefined; }
  return maintenanceFromDb(data);
}

export async function deleteVehicleMaintenance(id: string): Promise<boolean> {
  const { error } = await supabase.from("vehicle_maintenances").delete().eq("id", id);
  if (error) { logErr("deleteMaintenance", error); return false; }
  return true;
}

// ─── Mappers + CRUD: Tax ──────────────────────────────────────────────────────

function taxFromDb(r: TaxRow): VehicleTax {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    type: r.type as TaxType,
    year: r.year,
    amount: Number(r.amount),
    dueDate: dateOnly(r.due_date ?? ""),
    paid: r.paid,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function taxToDb(t: VehicleTax, ownerId: string) {
  return {
    id: t.id,
    owner_id: ownerId,
    vehicle_id: t.vehicleId,
    type: t.type,
    year: t.year,
    amount: t.amount,
    due_date: t.dueDate || null,
    paid: t.paid,
    notes: t.notes,
  };
}

export async function getVehicleTaxesBy(vehicleId: string): Promise<VehicleTax[]> {
  const { data, error } = await supabase
    .from("vehicle_taxes")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("year", { ascending: false });
  if (error) { logErr("getTaxesBy", error); return []; }
  return (data ?? []).map(taxFromDb);
}

export function createVehicleTax(vehicleId: string): VehicleTax {
  return {
    id: newId(),
    vehicleId,
    type: "tenencia",
    year: new Date().getFullYear(),
    amount: 0,
    dueDate: "",
    paid: false,
    notes: "",
    createdAt: today(),
    updatedAt: today(),
  };
}

export async function saveVehicleTax(t: VehicleTax): Promise<VehicleTax | undefined> {
  const ownerId = await requireUserId();
  const { data, error } = await supabase
    .from("vehicle_taxes")
    .upsert(taxToDb(t, ownerId), { onConflict: "id" })
    .select("*")
    .single();
  if (error) { logErr("saveTax", error); return undefined; }
  return taxFromDb(data);
}

export async function deleteVehicleTax(id: string): Promise<boolean> {
  const { error } = await supabase.from("vehicle_taxes").delete().eq("id", id);
  if (error) { logErr("deleteTax", error); return false; }
  return true;
}
