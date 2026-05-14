/**
 * LUXORA — Contrato de Arrendamiento (versión imprimible / PDF)
 * Replica la plantilla oficial y auto-rellena con datos del caso.
 */
import type { RentalCase, LuxUser } from "@/lib/store";
import type { Vehicle } from "@/lib/stores/vehicles";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysDiff(a: string, b: string): number {
  if (!a || !b) return 0;
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

function fmtDate(d: string): string {
  if (!d) return "_______________";
  const dt = new Date(d + "T12:00:00");
  return dt.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDay(d: string): string {
  if (!d) return "___";
  return new Date(d + "T12:00:00").getDate().toString().padStart(2, "0");
}

function fmtMonth(d: string): string {
  if (!d) return "_______________";
  return new Date(d + "T12:00:00").toLocaleDateString("es-MX", { month: "long" });
}

function fmtYear(d: string): string {
  if (!d) return "__";
  return new Date(d + "T12:00:00").getFullYear().toString().slice(2);
}

function fmtMXN(n: number): string {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toSpanishWords(n: number): string {
  if (!n || n <= 0) return "_______________";
  const ones = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
    "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const tens = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const hunds = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
    "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
  let rest = Math.floor(n);
  let out = "";
  if (rest >= 1_000_000) {
    const m = Math.floor(rest / 1_000_000);
    out += (m === 1 ? "UN MILLÓN " : toSpanishWords(m) + " MILLONES ");
    rest %= 1_000_000;
  }
  if (rest >= 1_000) {
    const th = Math.floor(rest / 1_000);
    out += (th === 1 ? "MIL " : toSpanishWords(th) + " MIL ");
    rest %= 1_000;
  }
  if (rest >= 100) {
    out += (rest === 100 ? "CIEN " : hunds[Math.floor(rest / 100)] + " ");
    rest %= 100;
  }
  if (rest >= 20) {
    out += tens[Math.floor(rest / 10)] + (rest % 10 ? " Y " + ones[rest % 10] : "") + " ";
  } else if (rest > 0) {
    out += ones[rest] + " ";
  }
  return out.trim();
}

function amountWords(n: number): string {
  return `${toSpanishWords(n)} PESOS 00/100 M.N.`;
}

function blank(v: string | undefined | null, fallback = "_______________"): string {
  return (v && v.trim()) ? v.trim() : fallback;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const S = {
  root: {
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "12px",
    lineHeight: "1.6",
    color: "#000",
    background: "#fff",
    padding: "40px 48px",
    width: "794px",
    minHeight: "1123px",
    boxSizing: "border-box" as const,
  },
  title: {
    textAlign: "center" as const,
    fontWeight: "bold" as const,
    fontSize: "14px",
    marginBottom: "6px",
  },
  folio: {
    textAlign: "right" as const,
    fontWeight: "bold" as const,
    fontSize: "12px",
    marginBottom: "16px",
  },
  sectionTitle: {
    fontWeight: "bold" as const,
    fontSize: "12px",
    marginTop: "16px",
    marginBottom: "8px",
    borderBottom: "1px solid #000",
    paddingBottom: "3px",
  },
  subTitle: {
    fontWeight: "bold" as const,
    marginBottom: "4px",
  },
  ul: {
    listStyle: "disc" as const,
    paddingLeft: "24px",
    margin: "4px 0",
  },
  li: {
    marginBottom: "3px",
  },
  clauseTitle: {
    fontWeight: "bold" as const,
    display: "inline" as const,
  },
  line: {
    borderBottom: "1px solid #000",
    display: "inline-block" as const,
    minWidth: "160px",
    verticalAlign: "bottom" as const,
    marginLeft: "4px",
    marginRight: "4px",
  },
  signatureBlock: {
    display: "grid" as const,
    gridTemplateColumns: "1fr 1fr" as const,
    gap: "32px",
    marginTop: "32px",
  },
  sigBox: {
    textAlign: "center" as const,
  },
  sigLine: {
    borderBottom: "1px solid #000",
    marginBottom: "6px",
    height: "50px",
  },
  footer: {
    textAlign: "right" as const,
    fontSize: "10px",
    marginTop: "32px",
    color: "#444",
  },
  pageBreak: {
    pageBreakBefore: "always" as const,
    borderTop: "2px dashed #ccc",
    marginTop: "32px",
    paddingTop: "32px",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  rentalCase: RentalCase;
  responsable: LuxUser | undefined;
  aval: LuxUser | undefined;
  operador: LuxUser | undefined;
  vehicle: Vehicle | undefined;
  signDate?: string; // defaults to today
}

export function PrintableContract({ rentalCase, responsable, aval, operador, vehicle, signDate }: Props) {
  const sd = signDate || new Date().toISOString().slice(0, 10);
  const dias = daysDiff(rentalCase.fechaInicio, rentalCase.fechaFin);

  const vehicleName = vehicle
    ? `${vehicle.marca} ${vehicle.modelo} ${vehicle.anio}`.toUpperCase()
    : "TOYOTA HIACE 2025";

  const responsableFullName = responsable
    ? `${responsable.nombre} ${responsable.apellidoPaterno} ${responsable.apellidoMaterno}`.trim()
    : "";

  const responsableAddress = responsable?.address
    ? [responsable.address.calle, responsable.address.numero, responsable.address.colonia,
       responsable.address.ciudad, responsable.address.estado, responsable.address.cp]
        .filter(Boolean).join(", ")
    : "";

  const ineFront = responsable?.documents.find((d) => d.type === "INE_FRONT");
  const ineNo = ineFront ? "VER INE ADJUNTA" : "_______________";

  const curpRfc = responsable
    ? [responsable.curp, responsable.rfc].filter(Boolean).join(" / ")
    : "";

  const operadorName = operador
    ? `${operador.nombre} ${operador.apellidoPaterno}`.trim()
    : blank(null);

  return (
    <div style={S.root}>
      {/* ── PAGE 1 ── */}
      <div style={S.title}>CONTRATO DE ARRENDAMIENTO {vehicleName}</div>
      <div style={S.folio}>FOLIO: {blank(rentalCase.contratoNumero || rentalCase.caseNumber)}</div>

      {/* Section I */}
      <div style={S.sectionTitle}>I. DECLARACIONES Y DATOS DE LAS PARTES</div>

      {/* 1.1 Arrendadora */}
      <div style={S.subTitle}>1.1 LA ARRENDADORA: Soluciones en Domótica e Informática Administrativa, SA de CV,
        representada por Israel Vicente Piña Camarena.</div>
      <ul style={S.ul}>
        <li style={S.li}><strong>RFC:</strong> SDE091117K91&nbsp;&nbsp;<strong>Domicilio:</strong> Hda. Las Garzas Coacalco, Edo. Mx.</li>
      </ul>

      {/* 1.2 Arrendatario */}
      <div style={{ ...S.subTitle, marginTop: "10px" }}>1.2 EL ARRENDATARIO (CLIENTE):</div>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong>Nombre/Razón Social:&nbsp;</strong>
          <span style={{ ...S.line, minWidth: "300px" }}>{responsableFullName}</span>
        </li>
        <li style={S.li}>
          <strong>INE/Pasaporte No.:&nbsp;</strong>
          <span style={S.line}>{ineNo}</span>
          &nbsp;&nbsp;<strong>RFC/CURP:&nbsp;</strong>
          <span style={{ ...S.line, minWidth: "200px" }}>{curpRfc}</span>
        </li>
        <li style={S.li}>
          <strong>Domicilio:&nbsp;</strong>
          <span style={{ ...S.line, minWidth: "350px" }}>{responsableAddress.slice(0, 60)}</span>
        </li>
        {responsableAddress.length > 60 && (
          <li style={{ ...S.li, listStyle: "none" }}>
            <span style={{ ...S.line, minWidth: "400px" }}>{responsableAddress.slice(60)}</span>
          </li>
        )}
        <li style={S.li}>
          <strong>Nombre del operador:&nbsp;</strong>
          <span style={{ ...S.line, minWidth: "300px" }}>{operadorName}</span>
        </li>
        <li style={S.li}>
          <strong>No. Licencia:&nbsp;</strong>
          <span style={S.line}>{operador ? "VER LICENCIA ADJUNTA" : "N/A"}</span>
          &nbsp;&nbsp;<strong>Domicilio:&nbsp;</strong>
          <span style={{ ...S.line, minWidth: "160px" }}>{operador
            ? [operador.address?.ciudad, operador.address?.estado].filter(Boolean).join(", ")
            : "N/A"}</span>
        </li>
        <li style={S.li}>
          <strong>Uso y Destino:&nbsp;</strong>
          <span style={{ ...S.line, minWidth: "280px" }}>
            {rentalCase.origenViaje && rentalCase.destinoViaje
              ? `${rentalCase.origenViaje} → ${rentalCase.destinoViaje}`
              : blank(null)}
          </span>
        </li>
      </ul>

      {/* 1.3 Vehículo */}
      <div style={{ ...S.subTitle, marginTop: "10px" }}>1.3 EL VEHÍCULO:</div>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong>Marca:</strong> {vehicle?.marca ?? "TOYOTA"}&nbsp;&nbsp;
          <strong>Modelo:</strong> {vehicle?.modelo ?? "HIACE 15 PASAJEROS"}&nbsp;&nbsp;
          <strong>Año:</strong> {vehicle?.anio ?? "2025"}&nbsp;&nbsp;
          <strong>Color:</strong> {vehicle?.color ?? "BLANCO"}
        </li>
        <li style={S.li}>
          <strong>Placas:</strong> {vehicle?.placas ?? "HHU356E"}&nbsp;&nbsp;
          <strong>Serie (VIN):</strong> {vehicle?.vin ?? "JTFJM9CPXS6010029"}&nbsp;&nbsp;
          <strong>Kilometraje:</strong> <span style={S.line}>{vehicle?.kilometraje ? vehicle.kilometraje.toLocaleString() + " km" : "_____________"}</span>
        </li>
        <li style={S.li}>
          <strong>Seguro Póliza No.:</strong> 2770390260 vigencia 1/sep/2025
        </li>
      </ul>

      {/* Section II */}
      <div style={S.sectionTitle}>II. TÉRMINOS Y CONDICIONES (CLÁUSULAS)</div>

      <p style={{ marginBottom: "6px" }}>
        <span style={S.clauseTitle}>PRIMERA. OBJETO Y VIGENCIA:&nbsp;</span>
        LA ARRENDADORA entrega en arrendamiento el vehículo descrito por un periodo de{" "}
        <span style={S.line}>{dias > 0 ? dias : "___"}</span> días, iniciando el día{" "}
        <span style={S.line}>{fmtDate(rentalCase.fechaInicio)}</span> a las:{" "}
        <span style={{ ...S.line, minWidth: "50px" }}>_____</span> horas y finalizando el día{" "}
        <span style={S.line}>{fmtDate(rentalCase.fechaFin)}</span> a las:{" "}
        <span style={{ ...S.line, minWidth: "50px" }}>_____</span> horas.
      </p>

      <p style={{ marginBottom: "6px" }}>
        <span style={S.clauseTitle}>SEGUNDA. RENTA Y DEPÓSITO:&nbsp;</span>
        EL ARRENDATARIO pagará la cantidad de $<span style={{ ...S.line, minWidth: "100px" }}>
          {rentalCase.montoRenta > 0 ? fmtMXN(rentalCase.montoRenta) : "_____________"}
        </span> MXN (
        <span style={{ ...S.line, minWidth: "280px" }}>
          {rentalCase.montoRenta > 0 ? amountWords(rentalCase.montoRenta) : "_____________________________________________"}
        </span>) por concepto de renta total.
        Adicionalmente, entrega $<span style={{ ...S.line, minWidth: "100px" }}>
          {rentalCase.deposito > 0 ? fmtMXN(rentalCase.deposito) : "_____________"}
        </span> MXN como depósito en garantía para cubrir multas, faltantes de combustible o daños menores.
        Se adjunta pagaré firmado como respaldo del pago del deducible del seguro del vehículo que
        corresponde al 10% del valor del vehículo.
      </p>

      <p style={{ marginBottom: "6px" }}>
        <span style={S.clauseTitle}>TERCERA. USO Y DESTINO:&nbsp;</span>
        El vehículo se destinará exclusivamente a transporte privado de personas. Queda estrictamente
        prohibido el subarrendamiento, el uso de carga pesada, o el uso para fines ilícitos.
      </p>

      <p style={{ marginBottom: "6px" }}>
        <span style={S.clauseTitle}>CUARTA. EXTINCIÓN DE DOMINIO Y DESLINDE:&nbsp;</span>
        EL ARRENDATARIO declara que los recursos para el pago de este contrato son de procedencia lícita.
        Deslinda a LA ARRENDADORA de cualquier responsabilidad penal o administrativa derivada del uso del
        vehículo. En caso de que el vehículo sea asegurado por autoridades debido a actos ilícitos del
        ARRENDATARIO, este se obliga a pagar a LA ARRENDADORA el valor comercial total del vehículo más
        daños y perjuicios.
      </p>

      <p style={{ marginBottom: "6px" }}>
        <span style={S.clauseTitle}>QUINTA. SINIESTROS Y ROBO:&nbsp;</span>
        En caso de accidente o robo, EL ARRENDATARIO deberá avisar a LA ARRENDADORA y a las autoridades
        en un plazo no mayor a <strong>5 horas</strong>. EL ARRENDATARIO es responsable del pago del
        deducible y de cualquier daño no cubierto por el seguro debido a negligencia o conducción bajo
        influjo de sustancias.
      </p>

      <p style={{ marginBottom: "6px" }}>
        <span style={S.clauseTitle}>SEXTA. DEVOLUCIÓN TARDÍA:&nbsp;</span>
        Si el vehículo no es devuelto en la fecha y hora pactadas, EL ARRENDATARIO pagará una pena
        convencional de <strong>$2,700.00 MXN por cada día</strong> de retraso.
      </p>

      <div style={S.footer}>Página 1 de 2</div>

      {/* ── PAGE 2 ── */}
      <div style={S.pageBreak} />

      <p style={{ marginBottom: "6px" }}>
        <span style={S.clauseTitle}>SÉPTIMA. ESTADO DE ENTREGA:&nbsp;</span>
        Se recibe el vehículo en óptimas condiciones mecánicas y estéticas. Con tarjeta de circulación,
        verificación y póliza seguro del vehículo vigentes. Se anexan observaciones visuales. El vehículo
        debe devolverse con el mismo nivel de combustible:{" "}
        <span style={{ ...S.line, minWidth: "80px" }}>_______</span>. Y en el domicilio de LA ARRENDADORA.
      </p>

      <p style={{ marginBottom: "16px" }}>
        <span style={S.clauseTitle}>OCTAVA. RESPONSABILIDADES:&nbsp;</span>
        La arrendataria y/o usuario es responsable de respetar las normas de tránsito, reportar y atender
        cualquier falla que presente la camioneta y comprometa la seguridad de los pasajeros y/o empeore
        las condiciones de la camioneta.
      </p>

      {/* Section III */}
      <div style={S.sectionTitle}>III. FIRMAS</div>

      <p style={{ marginBottom: "16px" }}>
        Leído lo anterior, las partes se someten a los tribunales de Coacalco/Tlalnepantla, Estado de México.
        y declaran tener la capacidad legal, técnica y financiera para celebrar el presente contrato,
        manifestando que no existe coacción, dolo o vicio alguno en su consentimiento, y que el objeto del
        presente acuerdo es totalmente lícito y conforme a la legislación aplicable.
      </p>

      <p style={{ marginBottom: "24px" }}>
        <strong>FECHA DE FIRMA:</strong>{" "}
        <span style={S.line}>{fmtDay(sd)}</span> de{" "}
        <span style={{ ...S.line, minWidth: "120px" }}>{fmtMonth(sd)}</span> del 20
        <span style={{ ...S.line, minWidth: "30px" }}>{fmtYear(sd)}</span>{" "}
        &nbsp;&nbsp;<strong>Hora de entrega:</strong>{" "}
        <span style={{ ...S.line, minWidth: "80px" }}>__________</span>
      </p>

      <p style={{ marginBottom: "32px", fontStyle: "italic" }}>Israel Vicente Piña Camarena</p>

      <div style={S.signatureBlock}>
        <div style={S.sigBox}>
          <div style={S.sigLine} />
          <div><strong>LA ARRENDADORA</strong></div>
        </div>
        <div style={S.sigBox}>
          <div style={S.sigLine} />
          <div><strong>LA ARRENDATARIA</strong></div>
          {responsableFullName && (
            <div style={{ fontSize: "10px", marginTop: "4px", color: "#444" }}>{responsableFullName}</div>
          )}
        </div>
        <div style={S.sigBox}>
          <div style={S.sigLine} />
          <div><strong>TESTIGO</strong></div>
        </div>
        <div style={S.sigBox}>
          <div style={S.sigLine} />
          <div><strong>AVAL</strong></div>
          {aval && (
            <div style={{ fontSize: "10px", marginTop: "4px", color: "#444" }}>
              {`${aval.nombre} ${aval.apellidoPaterno}`.trim()}
            </div>
          )}
        </div>
      </div>

      {/* Annex */}
      <div style={{ marginTop: "40px", borderTop: "2px solid #000", paddingTop: "16px" }}>
        <div style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "12px" }}>ANEXO OBSERVACIONES VISUALES</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "8px" }}>
          {[
            "Vista lateral izquierda",
            "Vista frontal / trasera",
            "Vista lateral derecha / techo",
            "Interior / distribución de asientos",
          ].map((label) => (
            <div key={label} style={{
              border: "1px dashed #999",
              borderRadius: "8px",
              height: "100px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
              fontSize: "10px",
              textAlign: "center",
              padding: "8px",
            }}>
              {label}
              <br />(marcar daños / observaciones)
            </div>
          ))}
        </div>
      </div>

      {/* Case metadata footer */}
      <div style={{ marginTop: "24px", fontSize: "9px", color: "#999", borderTop: "1px solid #eee", paddingTop: "8px" }}>
        Generado por LUXORA · {rentalCase.caseNumber} · {new Date().toLocaleString("es-MX")}
      </div>

      <div style={S.footer}>Página 2 de 2</div>
    </div>
  );
}
