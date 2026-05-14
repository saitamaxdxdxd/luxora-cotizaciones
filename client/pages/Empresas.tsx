/**
 * LUXORA — Módulo de Empresas (Organizaciones)
 * Gestión de empresas, asignación de usuarios, y roles dentro de la empresa
 */
import { useState, useEffect, useRef } from "react";
import {
  Plus, Search, ArrowLeft, Trash2, Eye, ChevronRight, Users,
  AlertTriangle, CheckCircle2, Building2, Mail, Phone, MapPin,
  Edit, Save, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavShell } from "@/components/luxora/NavShell";
import {
  type Organization, type CompanyMember, type CompanyMemberRole,
  getOrganizations, saveOrganization, createOrganization, deleteOrganization, getOrganizationById,
  getCompanyMembers, getCompanyMembersBy, saveCompanyMember, createCompanyMember, deleteCompanyMember,
  getUsers, getUserById, setPrimaryRepresentative,
} from "@/lib/store";

const MEMBER_ROLE_CONFIG: Record<CompanyMemberRole, { label: string; color: string; desc: string }> = {
  LEGAL_REPRESENTATIVE: { label: "Representante Legal", color: "text-purple-400 bg-purple-500/10 border-purple-500/25", desc: "Autorizado para firmar contratos" },
  ADMIN: { label: "Administrador", color: "text-blue-400 bg-blue-500/10 border-blue-500/25", desc: "Gestión de empresa y miembros" },
  CONTACT: { label: "Contacto", color: "text-amber-400 bg-amber-500/10 border-amber-500/25", desc: "Contacto principal" },
};

const ESTADOS_MX = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua",
  "Ciudad de México","Coahuila","Colima","Durango","Guanajuato","Guerrero","Hidalgo","Jalisco",
  "México","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro",
  "Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala",
  "Veracruz","Yucatán","Zacatecas",
];

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label, value, onChange, type = "text", placeholder = "", error = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all",
          error ? "border-red-500/70" : "border-[hsl(217,25%,14%)]"
        )}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── List View Sub-component ──────────────────────────────────────────────────

function ListView({
  orgs,
  search,
  onSearch,
  onNew,
  onEdit,
  onMembers,
  onDelete,
}: {
  orgs: Organization[];
  search: string;
  onSearch: (q: string) => void;
  onNew: () => void;
  onEdit: (o: Organization) => void;
  onMembers: (o: Organization) => void;
  onDelete: (id: string) => void;
}) {
  const filtered = orgs.filter((o) => {
    const q = search.toLowerCase();
    return `${o.businessName} ${o.rfc}`.toLowerCase().includes(q);
  });

  return (
    <NavShell>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-[hsl(210,40%,95%)]">Empresas</h1>
            <p className="text-sm text-[hsl(215,20%,45%)] mt-0.5">Gestión de organizaciones y miembros</p>
          </div>
          <button
            onClick={onNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all"
          >
            <Plus className="w-4 h-4" /> Nueva Empresa
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20%,40%)]" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar por razón social o RFC…"
            className="w-full bg-[hsl(217,25%,8%)] text-[hsl(210,40%,90%)] placeholder:text-[hsl(215,20%,38%)] rounded-xl border border-[hsl(217,25%,13%)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-amber-500/40 transition-all"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Building2 className="w-12 h-12 text-amber-500/20 mx-auto mb-3" />
            <p className="text-[hsl(215,20%,50%)] text-sm mb-4">
              {orgs.length === 0 ? "Sin empresas registradas" : "Sin resultados"}
            </p>
            {orgs.length === 0 && (
              <button
                onClick={onNew}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/25 text-amber-400"
              >
                Registrar primera empresa
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((o) => {
              const memberCount = getCompanyMembersBy(o.id).length;
              return (
                <div
                  key={o.id}
                  className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:border-amber-500/20 transition-all border border-transparent group cursor-pointer"
                  onClick={() => onEdit(o)}
                >
                  <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[hsl(210,40%,92%)] text-sm">{o.businessName}</p>
                    <p className="text-xs text-amber-400/60 font-mono">{o.rfc}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400">
                        <Users className="w-2.5 h-2.5" /> {memberCount} miembro{memberCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMembers(o);
                      }}
                      className="p-2 rounded-xl text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      title="Gestionar miembros"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(o.id);
                      }}
                      className="p-2 rounded-xl text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-[hsl(215,20%,30%)] group-hover:text-amber-500/50" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </NavShell>
  );
}

// ─── Form View Sub-component ──────────────────────────────────────────────────

function FormView({
  active,
  saveError,
  onUpdate,
  onSave,
  onBack,
}: {
  active: Organization;
  saveError: string;
  onUpdate: (fields: Partial<Organization>) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <NavShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-[hsl(215,20%,50%)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-lg text-[hsl(210,40%,95%)]">
            {active.businessName || "Nueva Empresa"}
          </h1>
        </div>

        {saveError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl bg-red-500/8 border border-red-500/20 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {saveError}
          </div>
        )}

        <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Razón Social"
              value={active.businessName}
              onChange={(v) => onUpdate({ businessName: v })}
              placeholder="Nombre legal de la empresa"
            />
            <Field
              label="RFC"
              value={active.rfc}
              onChange={(v) => onUpdate({ rfc: v.toUpperCase() })}
              placeholder="XXXXXXXX000000XXX"
            />
          </div>

          <div className="border-t border-amber-500/10 pt-4">
            <p className="text-xs font-semibold text-amber-500/60 uppercase tracking-widest mb-3">Domicilio</p>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Calle"
                value={active.calle}
                onChange={(v) => onUpdate({ calle: v })}
              />
              <Field
                label="Colonia"
                value={active.colonia}
                onChange={(v) => onUpdate({ colonia: v })}
              />
              <Field
                label="Ciudad"
                value={active.ciudad}
                onChange={(v) => onUpdate({ ciudad: v })}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Estado</label>
                <select
                  value={active.estado}
                  onChange={(e) => onUpdate({ estado: e.target.value })}
                  className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all"
                >
                  <option value="">— Estado —</option>
                  {ESTADOS_MX.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
              <Field label="CP" value={active.cp} onChange={(v) => onUpdate({ cp: v })} placeholder="00000" />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-amber-500/10">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[hsl(215,20%,55%)] border border-[hsl(217,25%,18%)] hover:border-amber-500/25 hover:text-amber-400 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all"
            >
              <Save className="w-4 h-4" /> Guardar Empresa
            </button>
          </div>
        </div>
      </div>
    </NavShell>
  );
}

// ─── Members View Sub-component ────────────────────────────────────────────────

function MembersView({
  active,
  members,
  editingMemberId,
  editingUserId,
  onEditMemberId,
  onEditUserId,
  onSaveUser,
  onAddMember,
  onDeleteMember,
  onSetPrimary,
  onBack,
}: {
  active: Organization;
  members: CompanyMember[];
  editingMemberId: string | null;
  editingUserId: string;
  onEditMemberId: (id: string | null) => void;
  onEditUserId: (id: string) => void;
  onSaveUser: (memberId: string, userId: string) => void;
  onAddMember: () => void;
  onDeleteMember: (memberId: string) => void;
  onSetPrimary: (memberId: string) => void;
  onBack: () => void;
}) {
  return (
    <NavShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-[hsl(215,20%,50%)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-[hsl(210,40%,95%)]">{active.businessName}</h1>
            <p className="text-xs text-amber-400/70 font-mono">{active.rfc}</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[hsl(210,40%,92%)]">Miembros ({members.length})</h2>
            <button
              onClick={onAddMember}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/15 border border-blue-500/25 text-blue-400 hover:bg-blue-500/25 transition-colors"
            >
              <Plus className="w-3 h-3" /> Agregar Miembro
            </button>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-8 text-[hsl(215,20%,50%)]">
              <Users className="w-8 h-8 mx-auto mb-2 text-[hsl(215,20%,35%)]" />
              <p className="text-xs">Sin miembros asignados</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {members.map((member) => {
                const user = getUserById(member.userId);
                const roleConfig = MEMBER_ROLE_CONFIG[member.role];
                const isEditing = editingMemberId === member.id;

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[hsl(217,25%,16%)] bg-[hsl(217,25%,8%)]"
                  >
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <select
                          value={editingUserId}
                          onChange={(e) => onEditUserId(e.target.value)}
                          className="flex-1 bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-lg border border-blue-500/50 px-2 py-1.5 text-xs outline-none"
                        >
                          <option value="">— Seleccionar usuario —</option>
                          {getUsers().map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nombre} {u.apellidoPaterno}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => onSaveUser(member.id, editingUserId)}
                          disabled={!editingUserId}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => {
                            onEditMemberId(null);
                            onEditUserId("");
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[hsl(217,25%,12%)] border border-[hsl(217,25%,20%)] text-[hsl(215,20%,50%)] hover:border-amber-500/20 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-bold text-[hsl(210,40%,92%)]">
                              {user ? (
                                `${user.nombre} ${user.apellidoPaterno}`
                              ) : (
                                <button
                                  onClick={() => {
                                    onEditMemberId(member.id);
                                    onEditUserId("");
                                  }}
                                  className="text-blue-400 hover:text-blue-300 underline"
                                >
                                  Asignar usuario...
                                </button>
                              )}
                            </p>
                            {member.isPrimary && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                                Representante
                              </span>
                            )}
                          </div>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block", roleConfig.color)}>
                            {roleConfig.label}
                          </span>
                        </div>
                        {user && !member.isPrimary && (
                          <button
                            onClick={() => onSetPrimary(member.id)}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                          >
                            Asignar como Representante
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteMember(member.id)}
                          className="p-1.5 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[hsl(215,20%,55%)] border border-[hsl(217,25%,18%)] hover:border-amber-500/25 hover:text-amber-400 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
        </div>
      </div>
    </NavShell>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Empresas() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "form" | "members">("list");
  const [active, setActive] = useState<Organization | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [saveError, setSaveError] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState("");
  const isNewOrg = useRef(false);

  const reload = () => setOrgs(getOrganizations());
  useEffect(() => { reload(); }, []);

  const handleSaveUser = (memberId: string, userId: string) => {
    if (!userId) return;
    const updated = members.map((m) =>
      m.id === memberId ? { ...m, userId } : m
    );
    setMembers(updated);
    const member = updated.find((m) => m.id === memberId);
    if (member) saveCompanyMember(member);
    setEditingMemberId(null);
    setEditingUserId("");
  };

  const openNew = () => {
    isNewOrg.current = true;
    setActive(createOrganization());
    setSaveError("");
    setView("form");
  };

  const openEdit = (o: Organization) => {
    isNewOrg.current = false;
    setActive(o);
    setSaveError("");
    setView("form");
  };

  const openMembers = (o: Organization) => {
    setActive(o);
    setMembers(getCompanyMembersBy(o.id));
    setSaveError("");
    setView("members");
  };

  const goBack = () => {
    if (isNewOrg.current && active && !active.businessName) deleteOrganization(active.id);
    reload();
    setActive(null);
    setEditingMemberId(null);
    setEditingUserId("");
    setView("list");
  };

  const save = () => {
    if (!active) return;
    if (!active.businessName.trim()) {
      setSaveError("Razón social es obligatoria");
      return;
    }
    if (!active.rfc.trim()) {
      setSaveError("RFC es obligatorio");
      return;
    }
    setSaveError("");
    saveOrganization(active);
    isNewOrg.current = false;
    reload();
    setView("list");
    setActive(null);
  };

  // Render correct view based on state
  if (view === "list") {
    return (
      <ListView
        orgs={orgs}
        search={search}
        onSearch={setSearch}
        onNew={openNew}
        onEdit={openEdit}
        onMembers={openMembers}
        onDelete={(id) => {
          deleteOrganization(id);
          reload();
        }}
      />
    );
  }

  if (view === "form" && active) {
    return (
      <FormView
        active={active}
        saveError={saveError}
        onUpdate={(fields) => setActive({ ...active, ...fields })}
        onSave={save}
        onBack={goBack}
      />
    );
  }

  if (view === "members" && active) {
    return (
      <MembersView
        active={active}
        members={members}
        editingMemberId={editingMemberId}
        editingUserId={editingUserId}
        onEditMemberId={setEditingMemberId}
        onEditUserId={setEditingUserId}
        onSaveUser={handleSaveUser}
        onAddMember={() => {
          const newMember = createCompanyMember(active.id, "", "CONTACT");
          saveCompanyMember(newMember);
          setMembers([...members, newMember]);
          setEditingMemberId(newMember.id);
        }}
        onDeleteMember={(memberId) => {
          deleteCompanyMember(memberId);
          setMembers(members.filter((m) => m.id !== memberId));
        }}
        onSetPrimary={(memberId) => {
          setPrimaryRepresentative(active.id, memberId);
          setMembers(members.map((m) => ({
            ...m,
            isPrimary: m.id === memberId,
          })));
        }}
        onBack={goBack}
      />
    );
  }

  return null;
}
