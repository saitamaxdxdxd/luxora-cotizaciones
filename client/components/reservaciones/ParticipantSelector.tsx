/**
 * ParticipantSelector — Reusable component for selecting participants
 * Supports both individual users and organizations with representatives
 */
import { useState, useRef } from "react";
import { Plus, X, ChevronDown, Building2, User as UserIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ParticipantRole,
  getUsers, getUserById, getOrganizations, getCompanyMembersBy,
  type CaseParticipant,
} from "@/lib/store";

const PARTICIPANT_ROLE_CONFIG: Record<ParticipantRole, { label: string; color: string }> = {
  RESPONSABLE: { label: "Responsable", color: "text-blue-400 bg-blue-500/10 border-blue-500/25" },
  AVAL: { label: "Aval", color: "text-green-400 bg-green-500/10 border-green-500/25" },
  OPERADOR: { label: "Operador", color: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
};

interface ParticipantSelectorProps {
  participants: CaseParticipant[];
  onAddParticipant: (participant: CaseParticipant) => void;
  onRemoveParticipant: (userId?: string, organizationId?: string) => void;
}

export function ParticipantSelector({
  participants,
  onAddParticipant,
  onRemoveParticipant,
}: ParticipantSelectorProps) {
  const [showForm, setShowForm] = useState(false);
  const [participantType, setParticipantType] = useState<"USER" | "ORGANIZATION">("USER");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedRepId, setSelectedRepId] = useState("");
  const [selectedRole, setSelectedRole] = useState<ParticipantRole>("RESPONSABLE");
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const users = getUsers();
  const orgs = getOrganizations();

  const filteredUsers = users.filter((u) =>
    `${u.nombre} ${u.apellidoPaterno}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrgs = orgs.filter((o) =>
    o.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOrgMembers = selectedOrgId ? getCompanyMembersBy(selectedOrgId) : [];

  const handleAdd = () => {
    if (participantType === "USER") {
      if (!selectedUserId) return;
      const user = getUserById(selectedUserId);
      if (!user) return;

      const participant: CaseParticipant = {
        userId: selectedUserId,
        role: selectedRole,
        status: "PENDIENTE",
        progress: 0,
        kycComplete: false,
        riskScore: 0,
        riskLevel: "PENDING",
        inviteToken: "",
        inviteSentAt: "",
      };
      onAddParticipant(participant);
    } else {
      if (!selectedOrgId || !selectedRepId) return;
      const org = orgs.find((o) => o.id === selectedOrgId);
      const rep = getUserById(selectedRepId);
      if (!org || !rep) return;

      const participant: CaseParticipant = {
        organizationId: selectedOrgId,
        representativeUserId: selectedRepId,
        role: selectedRole,
        status: "PENDIENTE",
        progress: 0,
        kycComplete: false,
        riskScore: 0,
        riskLevel: "PENDING",
        inviteToken: "",
        inviteSentAt: "",
      };
      onAddParticipant(participant);
    }

    // Reset form
    setSelectedUserId("");
    setSelectedOrgId("");
    setSelectedRepId("");
    setSearchTerm("");
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Participants list */}
      {participants.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-amber-500/60 uppercase tracking-widest">Participantes ({participants.length})</p>
          {participants.map((p, idx) => {
            const user = p.userId ? getUserById(p.userId) : p.representativeUserId ? getUserById(p.representativeUserId) : null;
            const org = p.organizationId ? orgs.find((o) => o.id === p.organizationId) : null;
            const roleConfig = PARTICIPANT_ROLE_CONFIG[p.role];

            return (
              <div
                key={idx}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[hsl(217,25%,16%)] bg-[hsl(217,25%,8%)]"
              >
                <div className="flex items-center gap-2 flex-1">
                  {org ? (
                    <>
                      <Building2 className="w-4 h-4 text-purple-400" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[hsl(210,40%,92%)] truncate">{org.businessName}</p>
                        <p className="text-[10px] text-[hsl(215,20%,45%)]">
                          Rep: {user?.nombre} {user?.apellidoPaterno}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <UserIcon className="w-4 h-4 text-blue-400" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[hsl(210,40%,92%)] truncate">
                          {user?.nombre} {user?.apellidoPaterno}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", roleConfig.color)}>
                  {roleConfig.label}
                </span>
                <button
                  onClick={() => onRemoveParticipant(p.userId, p.organizationId)}
                  className="p-1 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add participant button/form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" /> Agregar Participante
        </button>
      ) : (
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-blue-500/25 bg-blue-500/5">
          {/* Type selector */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setParticipantType("USER");
                setSelectedOrgId("");
                setSelectedRepId("");
              }}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-bold transition-colors",
                participantType === "USER"
                  ? "bg-blue-500 text-white border border-blue-500"
                  : "bg-[hsl(217,25%,10%)] border border-[hsl(217,25%,18%)] text-[hsl(215,20%,50%)]"
              )}
            >
              <UserIcon className="w-3 h-3 inline mr-1" /> Persona
            </button>
            <button
              onClick={() => {
                setParticipantType("ORGANIZATION");
                setSelectedUserId("");
              }}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-bold transition-colors",
                participantType === "ORGANIZATION"
                  ? "bg-purple-500 text-white border border-purple-500"
                  : "bg-[hsl(217,25%,10%)] border border-[hsl(217,25%,18%)] text-[hsl(215,20%,50%)]"
              )}
            >
              <Building2 className="w-3 h-3 inline mr-1" /> Empresa
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(215,20%,40%)]" />
            <input
              type="text"
              placeholder={participantType === "USER" ? "Buscar persona..." : "Buscar empresa..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-lg border border-[hsl(217,25%,14%)] pl-8 pr-3 py-2 text-xs outline-none focus:border-blue-500/50 transition-all"
            />
          </div>

          {/* Selection dropdown */}
          {participantType === "USER" ? (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-lg border border-[hsl(217,25%,14%)] px-3 py-2 text-xs outline-none focus:border-blue-500/50 transition-all"
            >
              <option value="">— Seleccionar persona —</option>
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellidoPaterno} ({u.curp})
                </option>
              ))}
            </select>
          ) : (
            <>
              <select
                value={selectedOrgId}
                onChange={(e) => {
                  setSelectedOrgId(e.target.value);
                  setSelectedRepId("");
                }}
                className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-lg border border-[hsl(217,25%,14%)] px-3 py-2 text-xs outline-none focus:border-purple-500/50 transition-all"
              >
                <option value="">— Seleccionar empresa —</option>
                {filteredOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.businessName} ({o.rfc})
                  </option>
                ))}
              </select>

              {selectedOrgId && (
                <select
                  value={selectedRepId}
                  onChange={(e) => setSelectedRepId(e.target.value)}
                  className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-lg border border-[hsl(217,25%,14%)] px-3 py-2 text-xs outline-none focus:border-purple-500/50 transition-all"
                >
                  <option value="">— Seleccionar representante —</option>
                  {selectedOrgMembers.map((m) => {
                    const u = getUserById(m.userId);
                    return (
                      <option key={m.id} value={m.userId}>
                        {u?.nombre} {u?.apellidoPaterno} ({m.role})
                      </option>
                    );
                  })}
                </select>
              )}
            </>
          )}

          {/* Role selector */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as ParticipantRole)}
            className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-lg border border-[hsl(217,25%,14%)] px-3 py-2 text-xs outline-none focus:border-blue-500/50 transition-all"
          >
            {Object.entries(PARTICIPANT_ROLE_CONFIG).map(([role, config]) => (
              <option key={role} value={role}>
                {config.label}
              </option>
            ))}
          </select>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-lg text-xs font-bold bg-[hsl(217,25%,10%)] border border-[hsl(217,25%,18%)] text-[hsl(215,20%,50%)] hover:border-amber-500/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={
                (participantType === "USER" && !selectedUserId) ||
                (participantType === "ORGANIZATION" && (!selectedOrgId || !selectedRepId))
              }
              className="flex-1 py-2 rounded-lg text-xs font-bold bg-blue-500/15 border border-blue-500/25 text-blue-400 hover:bg-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
