/**
 * LUXORA Store v2 — Arquitectura basada en Casos de Renta
 * 
 * PRINCIPIO CLAVE: Una persona = un registro (LuxUser)
 * Los roles (RESPONSABLE, AVAL, OPERADOR) se asignan por contexto de renta (RentalCase)
 *
 * En producción: reemplazar por API calls a NestJS + MongoDB con cifrado AES-256.
 * Schema completo en /docs/ARCHITECTURE.md
 */

// ─── Tipos base ───────────────────────────────────────────────────────────────

export type RiskLevel    = "PENDING" | "APPROVED" | "REVIEW" | "REJECTED";
export type ParticipantRole   = "RESPONSABLE" | "AVAL" | "OPERADOR";
export type ParticipantStatus = "PENDIENTE" | "INVITADO" | "EN_PROGRESO" | "COMPLETADO";
export type DocType      = "INE_FRONT" | "INE_BACK" | "LICENCIA" | "DOMICILIO" | "CFDI" | "PAGARE" | "OTRO";
// VehicleStatus, Vehicle, FuelType, VehicleCategory, IdealUseType — migrados a @/lib/stores/vehicles

export type CaseStatus =
  | "RESERVACION"         // Paso 1: datos del servicio + participantes
  | "INVITACION_ENVIADA"  // Paso 2: enviar links KYC por WhatsApp
  | "KYC_EN_PROGRESO"     // Paso 3
  | "LISTO_REVISION"      // Paso 4
  | "APROBADO"            // Paso 5
  | "RECHAZADO"
  | "CONTRATO_GENERADO"   // Paso 6
  | "FIRMADO"             // Paso 7
  | "ABONOS"              // Paso 8: pagos parciales
  | "PAGARE_GENERADO"     // Paso 9
  | "EVIDENCE_PACK"       // Paso 10
  | "ACTIVO"              // Paso 11: renta en curso
  | "CERRADO"
  | "CANCELADO"
  // Legacy — migrated automatically by getCases()
  | "PRE_FILTRO"
  | "APARTADO";

// ─── User (una persona, múltiples roles posibles) ──────────────────────────────

export interface UserDocument {
  id: string;
  type: DocType;
  label: string;
  data: string;        // base64 / URL
  verified: boolean;
  uploadedAt: string;
}

export interface UserAddress {
  calle: string;
  numero: string;
  colonia: string;
  ciudad: string;
  estado: string;
  cp: string;
  isPrimary: boolean;
  verified: boolean;
}

export interface LuxUser {
  id: string;
  // Identidad (CURP = identificador único)
  curp: string;
  rfc: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  emailVerified: boolean;    // ← Nuevo: verificación de email
  telefono: string;
  fechaNacimiento: string;
  actividadEconomica: string;
  // Documentos
  documents: UserDocument[];
  // Biométrico
  selfie: string;
  faceMatchScore: number;    // 0–1  (premium)
  livenessOk: boolean;       // premium
  // Domicilio
  address: UserAddress;
  // KYC
  kycStep: number;
  kycComplete: boolean;
  // Riesgo individual
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: string[];
  // Reputación (premium)
  totalRentals: number;
  incidents: number;
  avgScore: number;
  // Términos de uso
  acceptedTermsAt?: string;  // ← Nuevo: timestamp de aceptación
  // Meta
  createdAt: string;
  updatedAt: string;
}

// ─── Vehicle ─────────────────────────────────────────────────────────────────
// Migrado a @/lib/stores/vehicles (Supabase). Tipos: Vehicle, VehicleStatus,
// FuelType, VehicleCategory, IdealUseType, VehicleInsurance, VehicleVerification,
// VehicleMaintenance, VehicleTax, MaintenanceType, TaxType.

// ─── Operator (Conductor / Operador) ───────────────────────────────────────────

export interface Operator {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  edad: number;
  telefono: string;
  calle: string;
  numero: string;
  colonia: string;
  ciudad: string;
  estado: string;
  cp: string;
  // Tarifa por concepto
  salarioDia: number;        // pago por día de trabajo
  alimentosDia: number;      // subsidio diarios (viáticos)
  hospedajNoche: number;     // hospedaje por noche
  foto: string;              // base64 / URL
  notas: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Organization (Company/Empresa) ────────────────────────────────────────────

export type CompanyMemberRole = "LEGAL_REPRESENTATIVE" | "ADMIN" | "CONTACT";

export interface Organization {
  id: string;
  businessName: string;      // razón social
  rfc: string;
  calle: string;
  colonia: string;
  ciudad: string;
  estado: string;
  cp: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyMember {
  id: string;
  organizationId: string;
  userId: string;
  role: CompanyMemberRole;
  isPrimary: boolean;        // legal representative or primary contact
  createdAt: string;
  updatedAt: string;
}

// ─── Case (contenedor del proceso de renta) ────────────────────────────────────

export interface CaseParticipant {
  // Participant identity (one of these two must be set)
  userId?: string;           // individual person
  organizationId?: string;   // company
  representativeUserId?: string; // required if organizationId is set

  // Participant info
  role: ParticipantRole;
  status: ParticipantStatus;
  progress: number;          // 0–100
  kycComplete: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  inviteToken: string;
  inviteSentAt: string;
}

export interface CaseSignature {
  userId: string;
  role: ParticipantRole;
  firma: string;             // base64 canvas
  ip: string;
  userAgent: string;
  timestamp: string;
  otpValidado: boolean;
  signatureMatchScore: number; // premium
}

export interface EvidencePack {
  generado: boolean;
  generadoAt: string;
  contractPdf: string;
  pagarePdf: string;
  signatures: CaseSignature[];
  faceMatchScore: number;
  ipLogs: string[];
  timestamps: string[];
  deviceData: string[];
  otpValidated: boolean;
}

export interface Abono {
  id: string;
  monto: number;
  fecha: string;
  formaPago: string;
  notas: string;
}

export interface RentalCase {
  id: string;
  caseNumber: string;        // LUX-2025-0001
  status: CaseStatus;
  // ── Paso 1: Reservación ──
  apartadoMonto: number;     // depósito / apartado
  apartadoFecha: string;     // fecha de la reservación
  vehicleId: string;
  fechaInicio: string;
  horaInicio: string;        // "09:00"
  fechaFin: string;
  horaFin: string;           // "18:00"
  tipoContrato: "SIN_OPERADOR" | "CON_OPERADOR";
  montoRenta: number;
  deposito: number;
  formaPago: string;
  origenViaje: string;
  destinoViaje: string;
  lugarEntrega: string;
  lugarDevolucion: string;
  // ── Participantes ──
  participants: CaseParticipant[];
  // ── Paso 5: Risk Score global ──
  riskScore: number;
  riskLevel: RiskLevel;
  riskBreakdown: Record<string, number>;
  riskFlags: string[];
  // ── Paso 6: Contrato ──
  contratoNumero: string;
  contratoGenerado: boolean;
  // ── Paso 7: Firmas ──
  firmas: CaseSignature[];
  contratoFirmado: boolean;
  // ── Paso 8: Abonos ──
  abonos: Abono[];
  // ── Paso 9: Pagaré ──
  pagareNumero: string;
  pagareGenerado: boolean;
  pagareFirmado: boolean;
  // ── Paso 10: Evidence Pack ──
  evidencePack: EvidencePack;
  // ── Cierre ──
  cierreIncidentes: string;
  cierreCalificacion: number;  // 1–5 estrellas
  // Meta
  notas: string;
  cotizacionRef: string;
  // Legacy (kept for backward compat with old data)
  preFilterResult?: "PRE_APROBADO" | "REVISION" | "RECHAZADO" | null;
  apartadoComprobante?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => {
  // Use crypto for unpredictable IDs
  const arr = new Uint32Array(2);
  crypto.getRandomValues(arr);
  return `${Date.now()}-${arr[0].toString(36)}${arr[1].toString(36)}`;
};
const now = () => new Date().toISOString();
// Cryptographically secure invite token (not Math.random)
const token = () => {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
};

// Max size for base64-encoded document data (~4 MB decoded ≈ 5.5 MB base64)
const MAX_DOC_BYTES = 5_500_000;

// Safe localStorage.setItem — catches QuotaExceededError, returns false on quota failure.
// On quota error: removes the old value first (freeing space) then retries once.
// This allows delete/shrink operations to succeed even when storage is at the limit.
function lsSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      try {
        localStorage.removeItem(key);
        localStorage.setItem(key, value);
        return true;
      } catch {
        console.error("[LUXORA] localStorage quota exceeded. Considera limpiar documentos desde el menú superior.");
        return false;
      }
    }
    throw e;
  }
}

// ─── USERS CRUD ───────────────────────────────────────────────────────────────

const USERS_KEY = "luxora_users_v2";

const userDefaults = (): Omit<LuxUser, "id" | "createdAt" | "updatedAt"> => ({
  curp: "", rfc: "",
  nombre: "", apellidoPaterno: "", apellidoMaterno: "",
  email: "", emailVerified: false, telefono: "", fechaNacimiento: "", actividadEconomica: "",
  documents: [],
  selfie: "", faceMatchScore: 0, livenessOk: false,
  address: { calle: "", numero: "", colonia: "", ciudad: "", estado: "", cp: "", isPrimary: true, verified: false },
  kycStep: 0, kycComplete: false,
  riskScore: 0, riskLevel: "PENDING", riskFactors: [],
  totalRentals: 0, incidents: 0, avgScore: 0,
  acceptedTermsAt: undefined,
});

export function getUsers(): LuxUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]"); }
  catch { return []; }
}

export function saveUser(user: LuxUser): boolean {
  // Enforce max document size before persisting
  const sanitized: LuxUser = {
    ...user,
    documents: user.documents.map((d) => ({
      ...d,
      data: d.data.length > MAX_DOC_BYTES ? "" : d.data,
    })),
    selfie: user.selfie.length > MAX_DOC_BYTES ? "" : user.selfie,
  };
  const list = getUsers();
  const idx = list.findIndex((u) => u.id === sanitized.id);
  if (idx >= 0) list[idx] = { ...sanitized, updatedAt: now() };
  else list.unshift(sanitized);
  return lsSet(USERS_KEY, JSON.stringify(list));
}

export function createUser(): LuxUser {
  return { id: uid(), ...userDefaults(), createdAt: now(), updatedAt: now() };
}

export function deleteUser(id: string): void {
  lsSet(USERS_KEY, JSON.stringify(getUsers().filter((u) => u.id !== id)));
}

export function getUserById(id: string): LuxUser | undefined {
  return getUsers().find((u) => u.id === id);
}

export function getUserByCurp(curp: string): LuxUser | undefined {
  return getUsers().find((u) => u.curp === curp);
}

// ─── AUTHENTICATION ───────────────────────────────────────────────────────────

interface AuthCredential {
  email: string;
  passwordHash: string;  // simple hash: btoa(password) — in prod use bcrypt
}

const AUTH_KEY = "luxora_auth_credentials_v2";
const CURRENT_USER_KEY = "luxora_current_user_v2";

function getAuthCredentials(): AuthCredential[] {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveAuthCredentials(creds: AuthCredential[]): void {
  lsSet(AUTH_KEY, JSON.stringify(creds));
}

function hashPassword(password: string): string {
  // ⚠️ DEMO ONLY: In production, use bcrypt on backend
  return btoa(password);
}

/**
 * Authenticate or create user with email/password.
 * If user doesn't exist and name is provided, create new user.
 * Returns authenticated user or undefined if login fails.
 */
export function getOrCreateAuthUser(
  email: string,
  password: string,
  nombre?: string,
  apellidoPaterno?: string
): LuxUser | undefined {
  const creds = getAuthCredentials();
  const passwordHash = hashPassword(password);
  let existingCred = creds.find((c) => c.email === email);

  if (existingCred) {
    // Login: verify password
    if (existingCred.passwordHash !== passwordHash) {
      return undefined; // Wrong password
    }
    // Find corresponding user
    const user = getUsers().find((u) => u.email === email);
    return user;
  }

  // Sign up: create new credential and user
  if (!nombre || !apellidoPaterno) {
    return undefined; // Required fields for signup
  }

  const newUser = createUser();
  newUser.email = email;
  newUser.emailVerified = true;  // ← Marked as verified after email confirmation flow
  newUser.nombre = nombre;
  newUser.apellidoPaterno = apellidoPaterno;
  newUser.acceptedTermsAt = now();  // ← Record terms acceptance timestamp

  creds.push({ email, passwordHash });
  saveAuthCredentials(creds);
  saveUser(newUser);

  return newUser;
}

/**
 * Save currently authenticated user to session storage
 */
export function saveCurrentUser(user: LuxUser): void {
  lsSet(CURRENT_USER_KEY, JSON.stringify(user));
}

/**
 * Get currently authenticated user
 */
export function getCurrentUser(): LuxUser | undefined {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (!stored) return undefined;
    const user = JSON.parse(stored) as LuxUser;
    // Verify user still exists in users list
    const currentUser = getUserById(user.id);
    return currentUser;
  } catch {
    return undefined;
  }
}

/**
 * Mark email as verified for a user (for email verification flow)
 */
export function verifyUserEmail(userId: string): LuxUser | undefined {
  const user = getUserById(userId);
  if (!user) return undefined;
  user.emailVerified = true;
  user.updatedAt = now();
  saveUser(user);
  return user;
}

/**
 * Check if a user has verified their email
 */
export function isEmailVerified(userId: string): boolean {
  const user = getUserById(userId);
  return user?.emailVerified ?? false;
}

/**
 * Logout current user
 */
export function logout(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}

// ─── USER RISK SCORING ────────────────────────────────────────────────────────

export function calcularRiesgoUsuario(u: Partial<LuxUser>): {
  score: number; level: RiskLevel; factors: string[];
} {
  let score = 0;
  const factors: string[] = [];

  const docs = u.documents ?? [];
  const hasDoc = (t: DocType) => docs.some((d) => d.type === t && d.data);

  if (u.nombre && u.apellidoPaterno && u.curp && u.rfc && u.actividadEconomica) score += 20;
  else factors.push("Datos personales incompletos");

  if (u.curp && u.curp.length === 18) score += 10;
  else factors.push("CURP inválida o ausente");

  if (u.rfc && u.rfc.length >= 12) score += 5;
  else factors.push("RFC inválido o ausente");

  if (hasDoc("INE_FRONT") && hasDoc("INE_BACK")) score += 20;
  else factors.push("INE frente/reverso faltante");

  if (u.selfie) score += 15;
  else factors.push("Selfie biométrica faltante");

  if (hasDoc("DOMICILIO")) score += 10;
  else factors.push("Comprobante de domicilio faltante");

  if (hasDoc("CFDI")) score += 10;
  else factors.push("Comprobante de actividad económica (CFDI) faltante");

  if (u.address?.ciudad && u.address?.estado) score += 5;
  else factors.push("Domicilio incompleto");

  const level: RiskLevel =
    score >= 80 ? "APPROVED"
    : score >= 55 ? "REVIEW"
    : score > 0 ? "REJECTED"
    : "PENDING";

  return { score, level, factors };
}

// ─── ORGANIZATIONS CRUD ───────────────────────────────────────────────────────

const ORGS_KEY = "luxora_organizations_v2";
const MEMBERS_KEY = "luxora_company_members_v2";

export function getOrganizations(): Organization[] {
  try { return JSON.parse(localStorage.getItem(ORGS_KEY) ?? "[]"); }
  catch { return []; }
}

export function saveOrganization(org: Organization): void {
  const list = getOrganizations();
  const idx = list.findIndex((o) => o.id === org.id);
  if (idx >= 0) list[idx] = { ...org, updatedAt: now() };
  else list.unshift(org);
  lsSet(ORGS_KEY, JSON.stringify(list));
}

export function createOrganization(): Organization {
  return {
    id: uid(),
    businessName: "",
    rfc: "",
    calle: "", colonia: "", ciudad: "", estado: "", cp: "",
    createdAt: now(),
    updatedAt: now(),
  };
}

export function deleteOrganization(id: string): void {
  lsSet(ORGS_KEY, JSON.stringify(getOrganizations().filter((o) => o.id !== id)));
  // Also delete all members of this organization
  deleteCompanyMembers(id);
}

export function getOrganizationById(id: string): Organization | undefined {
  return getOrganizations().find((o) => o.id === id);
}

// ─── COMPANY MEMBERS CRUD ─────────────────────────────────────────────────────

export function getCompanyMembers(): CompanyMember[] {
  try { return JSON.parse(localStorage.getItem(MEMBERS_KEY) ?? "[]"); }
  catch { return []; }
}

export function getCompanyMembersBy(organizationId: string): CompanyMember[] {
  return getCompanyMembers().filter((m) => m.organizationId === organizationId);
}

export function saveCompanyMember(member: CompanyMember): void {
  const list = getCompanyMembers();
  const idx = list.findIndex((m) => m.id === member.id);
  if (idx >= 0) list[idx] = { ...member, updatedAt: now() };
  else list.unshift(member);
  lsSet(MEMBERS_KEY, JSON.stringify(list));
}

export function createCompanyMember(organizationId: string, userId: string, role: CompanyMemberRole): CompanyMember {
  return {
    id: uid(),
    organizationId,
    userId,
    role,
    isPrimary: false,
    createdAt: now(),
    updatedAt: now(),
  };
}

export function deleteCompanyMember(id: string): void {
  lsSet(MEMBERS_KEY, JSON.stringify(getCompanyMembers().filter((m) => m.id !== id)));
}

export function deleteCompanyMembers(organizationId: string): void {
  lsSet(MEMBERS_KEY, JSON.stringify(getCompanyMembers().filter((m) => m.organizationId !== organizationId)));
}

export function setPrimaryRepresentative(organizationId: string, memberId: string): void {
  const list = getCompanyMembers();
  // Unset all primary flags for this org
  list.forEach((m) => {
    if (m.organizationId === organizationId) m.isPrimary = false;
  });
  // Set the new primary
  const member = list.find((m) => m.id === memberId);
  if (member) member.isPrimary = true;
  lsSet(MEMBERS_KEY, JSON.stringify(list));
}

// ─── VEHICLES CRUD ────────────────────────────────────────────────────────────
// Migrado a @/lib/stores/vehicles (Supabase + RLS multi-tenant).

// ─── OPERATORS CRUD ──────────────────────────────────────────────────────────

const OPERATORS_KEY = "luxora_operators_v2";

export function getOperators(): Operator[] {
  try { return JSON.parse(localStorage.getItem(OPERATORS_KEY) ?? "[]"); }
  catch { return []; }
}

export function saveOperator(o: Operator): void {
  const list = getOperators();
  const idx = list.findIndex((x) => x.id === o.id);
  if (idx >= 0) list[idx] = { ...o, updatedAt: now() };
  else list.unshift(o);
  lsSet(OPERATORS_KEY, JSON.stringify(list));
}

export function createOperator(): Operator {
  return {
    id: uid(),
    nombre: "", apellidoPaterno: "", apellidoMaterno: "",
    edad: 0, telefono: "",
    calle: "", numero: "", colonia: "", ciudad: "", estado: "", cp: "",
    salarioDia: 0, alimentosDia: 0, hospedajNoche: 0,
    foto: "", notas: "",
    createdAt: now(), updatedAt: now(),
  };
}

export function deleteOperator(id: string): void {
  lsSet(OPERATORS_KEY, JSON.stringify(getOperators().filter((o) => o.id !== id)));
}

export function getOperatorById(id: string): Operator | undefined {
  return getOperators().find((o) => o.id === id);
}

export function seedOperatorsIfEmpty(): void {
  if (getOperators().length > 0) return;
  const seeds: Omit<Operator, "id" | "createdAt" | "updatedAt">[] = [
    { nombre: "Carlos", apellidoPaterno: "Rodríguez", apellidoMaterno: "García", edad: 42, telefono: "5551234567", calle: "Av. Paseo", numero: "123", colonia: "Centro", ciudad: "CDMX", estado: "Ciudad de México", cp: "06600", salarioDia: 800, alimentosDia: 300, hospedajNoche: 500, foto: "", notas: "Experiencia 15 años, ruta CDMX-Monterrey" },
    { nombre: "Jorge", apellidoPaterno: "Martínez", apellidoMaterno: "López", edad: 38, telefono: "5559876543", calle: "Calle Morelos", numero: "456", colonia: "Juárez", ciudad: "CDMX", estado: "Ciudad de México", cp: "06500", salarioDia: 750, alimentosDia: 280, hospedajNoche: 450, foto: "", notas: "Especializado en viajes ejecutivos" },
    { nombre: "Antonio", apellidoPaterno: "Sánchez", apellidoMaterno: "Pérez", edad: 35, telefono: "5552468135", calle: "Blvd. Reforma", numero: "789", colonia: "Cuauhtémoc", ciudad: "CDMX", estado: "Ciudad de México", cp: "06700", salarioDia: 900, alimentosDia: 320, hospedajNoche: 600, foto: "", notas: "VIP, inglés básico" },
  ];
  seeds.forEach((s) => saveOperator({ id: uid(), ...s, createdAt: now(), updatedAt: now() }));
}

// ─── CASES CRUD ───────────────────────────────────────────────────────────────

const CASES_KEY = "luxora_cases_v2";

function nextCaseNumber(): string {
  const n = getCases().length + 1;
  return `LUX-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
}

const evidencePackDefault = (): EvidencePack => ({
  generado: false, generadoAt: "",
  contractPdf: "", pagarePdf: "", signatures: [],
  faceMatchScore: 0, ipLogs: [], timestamps: [], deviceData: [], otpValidated: false,
});

// Allowlist of keys accepted from raw localStorage data to prevent prototype pollution
const CASE_SAFE_KEYS = new Set([
  "id","caseNumber","status","apartadoMonto","apartadoFecha","vehicleId",
  "fechaInicio","horaInicio","fechaFin","horaFin","tipoContrato","montoRenta",
  "deposito","formaPago","origenViaje","destinoViaje","lugarEntrega","lugarDevolucion",
  "participants","riskScore","riskLevel","riskBreakdown","riskFlags",
  "contratoNumero","contratoGenerado","firmas","contratoFirmado",
  "abonos","pagareNumero","pagareGenerado","pagareFirmado","evidencePack",
  "cierreIncidentes","cierreCalificacion","notas","cotizacionRef",
  "preFilterResult","apartadoComprobante","createdAt","updatedAt",
]);

function migrateCase(raw: Record<string, unknown>): RentalCase {
  const statusMap: Partial<Record<string, CaseStatus>> = {
    PRE_FILTRO: "RESERVACION",
    APARTADO:   "RESERVACION",
  };
  // Only copy known safe keys — prevents prototype pollution from tampered localStorage
  const safe: Record<string, unknown> = {};
  for (const key of CASE_SAFE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) safe[key] = raw[key];
  }
  return {
    horaInicio: "", horaFin: "", abonos: [],
    cierreIncidentes: "", cierreCalificacion: 0,
    lugarEntrega: "Coacalco de Berriozábal, CP 55700",
    lugarDevolucion: "Coacalco de Berriozábal, CP 55700",
    ...safe,
    status: (statusMap[safe.status as string] ?? safe.status) as CaseStatus,
  } as RentalCase;
}

export function getCases(): RentalCase[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CASES_KEY) ?? "[]") as Record<string, unknown>[];
    return raw.map(migrateCase);
  } catch { return []; }
}

export function saveCase(c: RentalCase): void {
  const list = getCases();
  const idx = list.findIndex((x) => x.id === c.id);
  if (idx >= 0) list[idx] = { ...c, updatedAt: now() };
  else list.unshift(c);
  lsSet(CASES_KEY, JSON.stringify(list));
}

export function createCase(): RentalCase {
  const c: RentalCase = {
    id: uid(), caseNumber: nextCaseNumber(), status: "RESERVACION",
    apartadoMonto: 0, apartadoFecha: new Date().toISOString().slice(0, 10),
    vehicleId: "", fechaInicio: "", horaInicio: "", fechaFin: "", horaFin: "",
    lugarEntrega: "Coacalco de Berriozábal, CP 55700",
    lugarDevolucion: "Coacalco de Berriozábal, CP 55700",
    tipoContrato: "SIN_OPERADOR",
    montoRenta: 0, deposito: 0, formaPago: "Transferencia",
    origenViaje: "", destinoViaje: "",
    participants: [],
    riskScore: 0, riskLevel: "PENDING", riskBreakdown: {}, riskFlags: [],
    contratoNumero: "", contratoGenerado: false,
    firmas: [], contratoFirmado: false,
    abonos: [],
    pagareNumero: "", pagareGenerado: false, pagareFirmado: false,
    evidencePack: evidencePackDefault(),
    cierreIncidentes: "", cierreCalificacion: 0,
    notas: "", cotizacionRef: "", preFilterResult: null,
    createdAt: now(), updatedAt: now(),
  };
  saveCase(c);
  return c;
}

export function deleteCase(id: string): void {
  lsSet(CASES_KEY, JSON.stringify(getCases().filter((c) => c.id !== id)));
}

export function addParticipant(caseId: string, userId: string, role: ParticipantRole): void {
  const list = getCases();
  const idx = list.findIndex((c) => c.id === caseId);
  if (idx < 0) return;
  const existing = list[idx].participants.find((p) => p.userId === userId && p.role === role);
  if (existing) return;
  list[idx].participants.push({
    userId, role, status: "PENDIENTE", progress: 0,
    kycComplete: false, riskScore: 0, riskLevel: "PENDING",
    inviteToken: token(), inviteSentAt: "",
  });
  list[idx].updatedAt = now();
  lsSet(CASES_KEY, JSON.stringify(list));
}

// ─── RISK ENGINE (Case level) ─────────────────────────────────────────────────

export function evaluatePreFilter(data: { edad: number; domicilio: string; actividadEconomica: string; tienePropiedades: boolean; notas: string }): "PRE_APROBADO" | "REVISION" | "RECHAZADO" {
  if (data.edad < 18 || data.edad > 75) return "RECHAZADO";
  if (!data.domicilio) return "REVISION";
  const actividades = ["Empleado", "Empresario / Dueño de negocio", "Comerciante", "Profesionista (médico, abogado, etc.)"];
  if (!actividades.some((a) => data.actividadEconomica.includes(a.split("/")[0].trim()))) return "REVISION";
  return "PRE_APROBADO";
}

export function calcularRiesgoCase(rentalCase: RentalCase): {
  score: number; level: RiskLevel; breakdown: Record<string, number>; flags: string[];
} {
  let score = 0;
  const breakdown: Record<string, number> = {};
  const flags: string[] = [];

  const responsable = rentalCase.participants.find((p) => p.role === "RESPONSABLE");
  const aval        = rentalCase.participants.find((p) => p.role === "AVAL");

  if (responsable) {
    breakdown.responsable = responsable.riskScore;
    score += responsable.riskScore * 0.5;
  } else {
    flags.push("Sin responsable asignado");
  }

  if (aval) {
    breakdown.aval = aval.riskScore;
    score += aval.riskScore * 0.35;
  } else {
    flags.push("Sin aval asignado");
  }

  const operador = rentalCase.participants.find((p) => p.role === "OPERADOR");
  if (operador) {
    breakdown.operador = operador.riskScore;
    score += operador.riskScore * 0.15;
  }

  if (rentalCase.apartadoMonto > 0) { score += 5; breakdown.apartado = 5; }
  if (rentalCase.preFilterResult === "PRE_APROBADO") { score += 5; breakdown.preFilterro = 5; }

  const finalScore = Math.min(100, Math.round(score));
  const level: RiskLevel = finalScore >= 80 ? "APPROVED" : finalScore >= 55 ? "REVIEW" : finalScore > 0 ? "REJECTED" : "PENDING";

  return { score: finalScore, level, breakdown, flags };
}

// ─── STATS ────────────────────────────────────────────────────────────────────

/**
 * Stats parciales — los vehículos viven en Supabase. Para totales de flota usa
 * @/lib/stores/vehicles → getVehicles() y cuenta en cliente, o crea un RPC.
 */
export function getStats() {
  const users    = getUsers();
  const cases    = getCases();
  return {
    totalUsers:       users.length,
    usersAprobados:   users.filter((u) => u.riskLevel === "APPROVED").length,
    totalCases:       cases.length,
    casesActivos:     cases.filter((c) => c.status === "ACTIVO").length,
    casesFirmados:    cases.filter((c) => c.status === "FIRMADO" || c.status === "EVIDENCE_PACK").length,
    casesEnRevision:  cases.filter((c) => c.status === "LISTO_REVISION").length,
  };
}

// ─── VEHICLE SUB-ENTITIES ───────────────────────────────────────────────────
// Migradas a @/lib/stores/vehicles (Supabase):
//   VehicleInsurance, VehicleVerification, VehicleMaintenance, VehicleTax
//   + sus CRUDs y los tipos MaintenanceType / TaxType.

// ─── ALERTS (Centralized alert system) ─────────────────────────────────────────

export type AlertEntityType = "vehicle" | "operator" | "case" | "user";
export type AlertType = "insurance_expiring" | "verification_expired" | "maintenance_due" | "tax_due" | "custom";
export type AlertSeverity = "low" | "medium" | "high";

export interface Alert {
  id: string;
  entityType: AlertEntityType;
  entityId: string;            // vehicle ID, operator ID, etc.
  alertType: AlertType;
  title: string;
  description: string;
  dueDate: string;             // YYYY-MM-DD
  severity: AlertSeverity;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

const ALERTS_KEY = "luxora_alerts_v2";

export function getAlerts(): Alert[] {
  try { return JSON.parse(localStorage.getItem(ALERTS_KEY) ?? "[]"); }
  catch { return []; }
}

export function getAlertsBy(entityType: AlertEntityType, entityId: string): Alert[] {
  return getAlerts().filter((a) => a.entityType === entityType && a.entityId === entityId && !a.resolved);
}

export function getActiveAlerts(): Alert[] {
  return getAlerts().filter((a) => !a.resolved);
}

export function saveAlert(alert: Alert): void {
  const list = getAlerts();
  const idx = list.findIndex((x) => x.id === alert.id);
  if (idx >= 0) list[idx] = { ...alert, updatedAt: now() };
  else list.unshift(alert);
  lsSet(ALERTS_KEY, JSON.stringify(list));
}

export function createAlert(entityType: AlertEntityType, entityId: string, alertType: AlertType, title: string, description: string, dueDate: string, severity: AlertSeverity): Alert {
  return {
    id: uid(),
    entityType,
    entityId,
    alertType,
    title,
    description,
    dueDate,
    severity,
    resolved: false,
    createdAt: now(),
    updatedAt: now(),
  };
}

export function resolveAlert(id: string): void {
  const list = getAlerts();
  const alert = list.find((a) => a.id === id);
  if (alert) {
    alert.resolved = true;
    alert.updatedAt = now();
    lsSet(ALERTS_KEY, JSON.stringify(list));
  }
}

export function deleteAlert(id: string): void {
  lsSet(ALERTS_KEY, JSON.stringify(getAlerts().filter((a) => a.id !== id)));
}

// ─── OPERATOR PROFILES (Refactored to use userId, not duplicate data) ──────────

export interface OperatorProfile {
  id: string;
  userId: string;              // reference to LuxUser
  salaryPerDay: number;        // $MXN
  foodPerDay: number;          // $MXN
  lodgingPerNight: number;     // $MXN
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const OPERATOR_PROFILES_KEY = "luxora_operator_profiles_v2";

export function getOperatorProfiles(): OperatorProfile[] {
  try { return JSON.parse(localStorage.getItem(OPERATOR_PROFILES_KEY) ?? "[]"); }
  catch { return []; }
}

export function getOperatorProfileByUserId(userId: string): OperatorProfile | undefined {
  return getOperatorProfiles().find((op) => op.userId === userId);
}

export function saveOperatorProfile(profile: OperatorProfile): void {
  const list = getOperatorProfiles();
  const idx = list.findIndex((x) => x.id === profile.id);
  if (idx >= 0) list[idx] = { ...profile, updatedAt: now() };
  else list.unshift(profile);
  lsSet(OPERATOR_PROFILES_KEY, JSON.stringify(list));
}

export function createOperatorProfile(userId: string): OperatorProfile {
  return {
    id: uid(),
    userId,
    salaryPerDay: 0,
    foodPerDay: 0,
    lodgingPerNight: 0,
    notes: "",
    createdAt: now(),
    updatedAt: now(),
  };
}

export function deleteOperatorProfile(id: string): void {
  lsSet(OPERATOR_PROFILES_KEY, JSON.stringify(getOperatorProfiles().filter((op) => op.id !== id)));
}

// ─── ALERT ENGINE (Automatic alert generation) ────────────────────────────────

function alertAlreadyExists(entityType: AlertEntityType, entityId: string, alertType: AlertType): boolean {
  return getAlerts().some((a) =>
    a.entityType === entityType &&
    a.entityId === entityId &&
    a.alertType === alertType &&
    !a.resolved
  );
}

/**
 * checkVehicleAlerts()
 * Scan all vehicles for upcoming issues and generate alerts automatically.
 * Called on dashboard load and vehicle detail view.
 */
export function checkVehicleAlerts(): void {
  // No-op temporal. Las alertas se regenerarán en una fase futura una vez que
  // todo el lifecycle del vehículo (vehicles, insurances, verifications,
  // maintenances, taxes) viva en Supabase y podamos calcularlas async.
}

// ─── LEGACY COMPATIBILITY (Contratos module still works) ──────────────────────
// The old Cliente / Contrato types are kept for the existing Contratos page.

export type RiskLevelLegacy = RiskLevel;

export interface Cliente {
  id: string;
  nombre: string; apellidoPaterno: string; apellidoMaterno: string;
  curp: string; rfc: string; fechaNacimiento: string;
  email: string; telefono: string; actividadEconomica: string;
  calle: string; colonia: string; ciudad: string; estado: string; cp: string;
  ineFrente: string; ineReverso: string; selfie: string;
  comprobanteDomicilio: string; cfdi: string;
  avalNombre: string; avalTelefono: string; avalRelacion: string; curpAval: string;
  kycStep: number; kycComplete: boolean;
  riskScore: number; riskLevel: RiskLevel; riskFactors: string[];
  createdAt: string; updatedAt: string;
}

export type ContratoEstado = "borrador" | "pendiente_firma" | "firmado" | "activo" | "cerrado" | "cancelado";

export interface Contrato {
  id: string; numero: string; clienteId: string;
  vehiculo: string; placas: string; color: string;
  fechaInicio: string; fechaFin: string;
  lugarEntrega: string; lugarDevolucion: string;
  montoRenta: number; deposito: number; formaPago: string;
  origenViaje: string; destinoViaje: string;
  estado: "borrador" | "pendiente_firma" | "firmado" | "activo" | "cerrado" | "cancelado";
  firmaCliente: string; firmadoEn: string;
  notas: string; cotizacionRef?: string;
  createdAt: string; updatedAt: string;
}

const CLIENTES_KEY = "luxora_clientes";
const CONTRATOS_KEY = "luxora_contratos";

export const clienteDefaults = (): Omit<Cliente, "id" | "createdAt" | "updatedAt"> => ({
  nombre: "", apellidoPaterno: "", apellidoMaterno: "",
  curp: "", rfc: "", fechaNacimiento: "", email: "", telefono: "", actividadEconomica: "",
  calle: "", colonia: "", ciudad: "", estado: "", cp: "",
  ineFrente: "", ineReverso: "", selfie: "", comprobanteDomicilio: "", cfdi: "",
  avalNombre: "", avalTelefono: "", avalRelacion: "", curpAval: "",
  kycStep: 0, kycComplete: false, riskScore: 0, riskLevel: "PENDING", riskFactors: [],
});
export const getClientes = (): Cliente[] => { try { return JSON.parse(localStorage.getItem(CLIENTES_KEY) ?? "[]"); } catch { return []; } };
export const saveCliente = (c: Cliente): void => { const l = getClientes(); const i = l.findIndex((x) => x.id === c.id); if (i >= 0) l[i] = { ...c, updatedAt: now() }; else l.unshift(c); lsSet(CLIENTES_KEY, JSON.stringify(l)); };
export const createCliente = (): Cliente => ({ id: uid(), ...clienteDefaults(), createdAt: now(), updatedAt: now() });
export const deleteCliente = (id: string): void => { lsSet(CLIENTES_KEY, JSON.stringify(getClientes().filter((c) => c.id !== id))); };
export const getContratos = (): Contrato[] => { try { return JSON.parse(localStorage.getItem(CONTRATOS_KEY) ?? "[]"); } catch { return []; } };
export const saveContrato = (c: Contrato): void => { const l = getContratos(); const i = l.findIndex((x) => x.id === c.id); if (i >= 0) l[i] = { ...c, updatedAt: now() }; else l.unshift(c); lsSet(CONTRATOS_KEY, JSON.stringify(l)); };
export const createContrato = (clienteId: string): Contrato => { const n = getContratos().length + 1; return { id: uid(), numero: `LUX-${new Date().getFullYear()}-${String(n).padStart(4,"0")}`, clienteId, vehiculo: "", placas: "", color: "", fechaInicio: "", fechaFin: "", lugarEntrega: "Coacalco de Berriozábal, CP 55700", lugarDevolucion: "Coacalco de Berriozábal, CP 55700", montoRenta: 0, deposito: 0, formaPago: "Transferencia", origenViaje: "", destinoViaje: "", estado: "borrador", firmaCliente: "", firmadoEn: "", notas: "", createdAt: now(), updatedAt: now() }; };
export const deleteContrato = (id: string): void => { lsSet(CONTRATOS_KEY, JSON.stringify(getContratos().filter((c) => c.id !== id))); };
export const calcularRiesgo = (c: Partial<Cliente>) => calcularRiesgoUsuario({ nombre: c.nombre, apellidoPaterno: c.apellidoPaterno, curp: c.curp, rfc: c.rfc, actividadEconomica: c.actividadEconomica, selfie: c.selfie, documents: [ ...(c.ineFrente ? [{ id:"", type: "INE_FRONT" as DocType, label:"", data: c.ineFrente, verified: false, uploadedAt:"" }] : []), ...(c.ineReverso ? [{ id:"", type: "INE_BACK" as DocType, label:"", data: c.ineReverso, verified: false, uploadedAt:"" }] : []), ...(c.comprobanteDomicilio ? [{ id:"", type: "DOMICILIO" as DocType, label:"", data: c.comprobanteDomicilio, verified: false, uploadedAt:"" }] : []), ...(c.cfdi ? [{ id:"", type: "CFDI" as DocType, label:"", data: c.cfdi, verified: false, uploadedAt:"" }] : []), ], address: { calle: c.calle ?? "", numero:"", colonia: c.colonia ?? "", ciudad: c.ciudad ?? "", estado: c.estado ?? "", cp: c.cp ?? "", isPrimary: true, verified: false } });
