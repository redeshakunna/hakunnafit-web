"use client";

// Ficha completa de un cliente — /panel/clientes/[id]. A diferencia del
// modal rápido que vivía antes en trainer-clients-manager.tsx, esta es una
// página propia con más espacio para mostrar la evolución real del cliente.
//
// Nota de honestidad de datos: el mockup de referencia incluía métricas que
// hoy no existen en el esquema (racha de entrenamientos, % de grasa
// corporal, "semana X de 12" con adherencia, "índice de transformación",
// alertas automáticas, último acceso). Ninguna de esas se simula acá — todo
// lo que se muestra sale de clients/measurements/evaluations/weekly_plans
// real. Cuando se construya el check-off de rutinas y el tracking de grasa
// corporal, esta pantalla es el lugar natural para sumarlas.

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  Pencil,
  CalendarClock,
  Dumbbell,
  Plus,
  Check,
  CheckCircle2,
  Camera,
  X,
  CalendarCheck2,
  KeyRound,
  Wallet,
} from "lucide-react";
import type { TrainerRow } from "@/lib/admin-actions";
import { calculateImc } from "@/lib/imc";
import { daysSinceLastTraining, weeklyTrainingStreak } from "@/lib/training-stats";
import { IMC_CATEGORY_CLASS, STATUS_META, STATUS_DOT, initials, avatarColor, HORARIOS_ENTRENO } from "@/lib/client-ui";
import { perfilShapeForBranch, type PerfilRunning } from "@/lib/client-profile-types";
import { branchTheme } from "@/lib/branch-theme";
import {
  updateOwnClient,
  getOwnClientMeasurements,
  addOwnClientMeasurement,
  uploadOwnClientMeasurementPhoto,
  getOwnClientEvaluations,
  type ClientRow,
  type MeasurementRow,
  type EvaluationRow,
} from "@/lib/trainer-clients-actions";
import { updateOwnAppointment } from "@/lib/trainer-agenda-actions";
import type { AppointmentModalidad } from "@/lib/agenda-constants";
import {
  proposeSessionPlan,
  getOwnSessionProposal,
  cancelSessionProposal,
  type SessionProposalRow,
} from "@/lib/session-proposals-actions";
import type { RoutineRow } from "@/lib/trainer-routines-actions";
import { registerOwnTrainingLog, getOwnClientTrainingLogs, type TrainingLogRow } from "@/lib/trainer-training-actions";
import {
  setClientBilling,
  markClientPaymentReceived,
  getOwnClientPayments,
  getOwnPendingPaymentReceipt,
  type ClientPaymentRow,
  type PendingPaymentReceipt,
} from "@/lib/client-billing-actions";
import { addOneMonth, buildClientPaymentWhatsappLink } from "@/lib/client-billing";
import { ClientHojaDeVida } from "@/components/trainer/client-hoja-de-vida";
import { ClientFormFields, clientToForm, type FormState } from "@/components/trainer/trainer-clients-manager";

type Tab = "resumen" | "progreso" | "evaluaciones" | "rutina";

export function TrainerClientDetail({
  trainer,
  client: initialClient,
  initialMeasurements,
  initialEvaluations,
  routines,
  initialTrainingLogs,
}: {
  trainer: TrainerRow;
  client: ClientRow;
  initialMeasurements: MeasurementRow[];
  initialEvaluations: EvaluationRow[];
  routines: RoutineRow[];
  initialTrainingLogs: TrainingLogRow[];
}) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab | null) ?? "resumen";

  const [client, setClient] = useState(initialClient);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>(initialMeasurements);
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>(initialEvaluations);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLogRow[]>(initialTrainingLogs);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(clientToForm(initialClient));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoggingTraining, startTrainingLog] = useTransition();

  const meta = STATUS_META[client.status];
  const imc = calculateImc(client.peso_actual, client.altura);
  const since = new Date(client.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  const rama = perfilShapeForBranch(trainer.especialidad);
  const theme = branchTheme(trainer.especialidad);
  const perfil = client.perfil_deportivo;
  const runningPerfil = perfil && "objetivoCarrera" in perfil ? (perfil as PerfilRunning) : null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";
  const ingresarUrl = trainer.subdominio ? `${siteUrl}/landing/${trainer.subdominio}/ingresar` : null;

  const pesoDelta = useMemo(() => {
    const withWeight = measurements.filter((m) => m.peso != null);
    if (withWeight.length < 2) return null;
    const oldest = withWeight[withWeight.length - 1].peso!;
    const newest = withWeight[0].peso!;
    return Math.round((newest - oldest) * 10) / 10;
  }, [measurements]);

  const evaluacionesCompletadas = evaluations.filter((e) => e.status === "completada").length;
  const nextEvaluation = evaluations
    .filter((e) => e.status === "pendiente" && new Date(e.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

  const trainingFechas = useMemo(() => trainingLogs.map((l) => l.fecha), [trainingLogs]);
  const daysSinceTraining = daysSinceLastTraining(trainingFechas);
  const streak = weeklyTrainingStreak(trainingFechas, client.dias_por_semana);
  const trainedToday = trainingFechas.includes(new Date().toISOString().slice(0, 10));

  function registerToday() {
    startTrainingLog(async () => {
      await registerOwnTrainingLog(client.id);
      const rows = await getOwnClientTrainingLogs(client.id);
      setTrainingLogs(rows);
    });
  }

  function openEdit() {
    setForm(clientToForm(client));
    setError(null);
    setEditing(true);
  }

  function submitEdit() {
    setError(null);
    startTransition(async () => {
      const diasPorSemana = form.diasPorSemana ? parseInt(form.diasPorSemana, 10) : null;
      const pesoActual = form.pesoActual ? parseFloat(form.pesoActual) : null;
      const altura = form.altura ? parseFloat(form.altura) : null;
      const perfilDeportivo = rama === "running" ? form.perfilRunning : rama === "crossfit" ? form.perfilCrossfit : null;
      const res = await updateOwnClient(client.id, {
        fullName: form.fullName,
        documento: form.documento,
        email: form.email,
        whatsapp: form.whatsapp,
        sexo: form.sexo,
        objetivo: form.objetivo,
        nivel: form.nivel,
        actividad: form.actividad,
        pesoActual,
        altura,
        planElegido: form.planElegido,
        diasPorSemana,
        horarioEntreno: form.horarioEntreno,
        status: form.status,
        pausadoMotivo: form.pausadoMotivo,
        perfilDeportivo,
      });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
      setClient({
        ...client,
        full_name: form.fullName.trim(),
        documento: form.documento.trim() || null,
        email: form.email || null,
        whatsapp: form.whatsapp || null,
        sexo: form.sexo || null,
        objetivo: form.objetivo || null,
        nivel: form.nivel || null,
        actividad: form.actividad || null,
        peso_actual: pesoActual,
        altura,
        plan_elegido: form.planElegido || null,
        dias_por_semana: diasPorSemana,
        horario_entreno: form.horarioEntreno || null,
        status: form.status,
        pausado_motivo: form.status === "pausado" ? form.pausadoMotivo || null : null,
        pausado_en: form.status === "pausado" ? new Date().toISOString().slice(0, 10) : null,
        perfil_deportivo: perfilDeportivo,
      });
      setEditing(false);
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/panel/clientes" className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white">
        <ArrowLeft size={14} /> Volver a clientes
      </Link>

      {/* Hero personalizado por rama del entrenador — foto de stock de la
          disciplina (running/crossfit/gym) con degradado de marca y efecto
          "parallax" vía bg-fixed (CSS puro, ver lib/branch-theme.ts). Antes
          esta cabecera era idéntica para cualquier entrenador; ahora
          refuerza visualmente en qué disciplina está el cliente. */}
      <div
        className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${theme.heroImage})` }}
      >
        <div className={`absolute inset-0 ${theme.overlayClassName}`} />
        <div className="relative flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold ${avatarColor(client.id)}`}>
                {initials(client.full_name)}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-hf-black ${STATUS_DOT[client.status]}`}
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-white">{client.full_name}</h1>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}>{meta.label}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${theme.accentBadgeClassName}`}>
                  {theme.label}
                </span>
              </div>
              <p className={`mt-1 text-sm font-medium ${theme.accentTextClassName}`}>{client.objetivo || "Sin objetivo definido"}</p>
              <p className="mt-1 text-xs text-white/50">Cliente desde {since}</p>
            </div>
          </div>

          {!editing && (
            <div className="flex flex-wrap items-center gap-2">
              {client.whatsapp && (
                <a
                  href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-3 py-2 text-xs font-semibold text-white/90 backdrop-blur hover:border-white/40 hover:text-white"
                >
                  <MessageCircle size={13} /> WhatsApp
                </a>
              )}
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-3 py-2 text-xs font-semibold text-white/90 backdrop-blur hover:border-white/40 hover:text-white"
              >
                <Pencil size={13} /> Editar
              </button>
              <Link
                href={`/panel/agenda?clientId=${client.id}&nuevo=1`}
                className="flex items-center gap-1.5 rounded-full bg-hf-blue px-3 py-2 text-xs font-bold text-black"
              >
                <CalendarClock size={13} /> Agendar evaluación
              </Link>
              <button
                onClick={registerToday}
                disabled={isLoggingTraining || trainedToday}
                className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-2 text-xs font-bold text-black disabled:opacity-50"
              >
                <CheckCircle2 size={13} /> {trainedToday ? "Entrenó hoy" : "Registrar entrenamiento"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Estado de cuenta del cliente final — el acceso real es un login
          (documento + contraseña) desde la landing del entrenador, ya no un
          link de portal (ver lib/client-auth.ts). Acá solo se muestra si el
          cliente ya activó su cuenta y, si no, cómo hacerlo. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hf-blue/10 text-hf-blue">
            <KeyRound size={14} />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">
              {client.user_id ? "Ya activó su cuenta" : !client.documento ? "Falta su documento" : "Aún no ha activado su cuenta"}
            </p>
            <p className="text-xs text-white/50">
              {client.user_id
                ? "Puede entrar con su documento y contraseña desde tu página."
                : !client.documento
                  ? "Agrégale un número de documento para que pueda crear su acceso."
                  : "Puede entrar desde tu página con su documento — ahí crea su contraseña con un código a su correo."}
            </p>
          </div>
        </div>
        {!client.user_id && client.documento && client.whatsapp && ingresarUrl && (
          <a
            href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
              `Hola ${client.full_name.split(" ")[0]}, ya puedes crear tu acceso a tu cuenta en HakunnaFit. Entra aquí con tu número de documento: ${ingresarUrl}`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-hf-blue px-3 py-1.5 text-xs font-bold text-black"
          >
            <MessageCircle size={13} /> Enviar link de acceso
          </a>
        )}
      </div>

      <FacturacionCard client={client} setClient={setClient} trainer={trainer} />

      {editing ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">Editar datos de {client.full_name}</p>
            <button onClick={() => setEditing(false)} className="text-white/40 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <ClientFormFields form={form} setForm={setForm} planesOfrecidos={trainer.planes_ofrecidos} rama={rama} />

          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:border-white/30"
            >
              Cancelar
            </button>
            <button
              onClick={submitEdit}
              disabled={isPending || !form.fullName.trim()}
              className="rounded-full bg-hf-blue px-4 py-2 text-xs font-bold text-black disabled:opacity-40"
            >
              {isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {client.status === "pausado" && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs">
              <p className="font-semibold text-white/70">
                En pausa{client.pausado_en ? ` desde ${new Date(client.pausado_en).toLocaleDateString("es-CO")}` : ""}
              </p>
              {client.pausado_motivo && <p className="mt-0.5 text-white/40">{client.pausado_motivo}</p>}
            </div>
          )}

          {nextEvaluation && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-hf-blue/30 bg-hf-blue/10 px-4 py-2.5 text-xs font-semibold text-hf-blue">
              <CalendarClock size={14} />
              Próxima evaluación:{" "}
              {new Date(nextEvaluation.scheduled_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          )}

          <ClientHojaDeVida client={client} />

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <MiniKpi
              label="Peso actual"
              value={client.peso_actual != null ? `${client.peso_actual} kg` : "—"}
              hint={pesoDelta != null ? `${pesoDelta > 0 ? "+" : ""}${pesoDelta} kg desde el inicio` : undefined}
            />
            {runningPerfil ? (
              <>
                <MiniKpi label="Ritmo objetivo" value={runningPerfil.ritmoObjetivo || "—"} />
                <MiniKpi label="Km/semana" value={runningPerfil.kilometrajeSemanal != null ? String(runningPerfil.kilometrajeSemanal) : "—"} />
              </>
            ) : (
              <div className={`rounded-2xl border border-white/10 p-4 ${imc ? IMC_CATEGORY_CLASS[imc.category] : "bg-white/[0.03]"}`}>
                <p className="text-[11px] uppercase tracking-wide text-white/50">IMC</p>
                <p className="mt-1.5 text-xl font-bold text-white">{imc ? imc.value : "—"}</p>
                {imc && <p className="mt-0.5 text-[11px] text-white/60">{imc.label}</p>}
              </div>
            )}
            <MiniKpi
              label="Último entreno"
              value={daysSinceTraining == null ? "—" : daysSinceTraining === 0 ? "Hoy" : daysSinceTraining === 1 ? "Ayer" : `Hace ${daysSinceTraining} días`}
            />
            <MiniKpi label="Racha" value={`${streak}`} hint={streak === 1 ? "semana cumplida" : "semanas cumplidas"} />
            <MiniKpi label="Mediciones" value={String(measurements.length)} hint="registradas" />
            <MiniKpi label="Evaluaciones" value={`${evaluacionesCompletadas} / ${evaluations.length}`} hint="completadas" />
            <MiniKpi label="Rutinas" value={String(routines.length)} hint="asignadas" />
          </div>

          <div className="mt-5 flex gap-2">
            <TabButton label="Resumen" active={tab === "resumen"} onClick={() => setTab("resumen")} />
            <TabButton label="Progreso" active={tab === "progreso"} onClick={() => setTab("progreso")} />
            <TabButton label="Evaluaciones" active={tab === "evaluaciones"} onClick={() => setTab("evaluaciones")} />
            <TabButton label="Rutina" active={tab === "rutina"} onClick={() => setTab("rutina")} />
          </div>

          {tab === "resumen" && (
            <ResumenTab
              client={client}
              measurements={measurements}
              evaluations={evaluations}
              routines={routines}
              trainingLogs={trainingLogs}
            />
          )}

          {tab === "progreso" && (
            <ProgresoTab clientId={client.id} measurements={measurements} setMeasurements={setMeasurements} />
          )}

          {tab === "evaluaciones" && (
            <EvaluacionesTab
              clientId={client.id}
              clientEmail={client.email}
              evaluations={evaluations}
              setEvaluations={setEvaluations}
            />
          )}

          {tab === "rutina" && <RutinaTab routines={routines} />}
        </>
      )}
    </div>
  );
}

function MiniKpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-white">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

/**
 * Bloque de facturación de la ficha — mensualidad del cliente final al
 * entrenador (transferencia directa, sin pasarela). Muestra plan+precio
 * (editable si el plan es "a cotizar"), fecha de inicio de facturación
 * (editable — el entrenador puede correrla si el cliente arrancó en otra
 * fecha), próximo cobro, avance contra el compromiso mínimo de 2 meses, un
 * botón para confirmar a mano que llegó la transferencia, uno para abrir
 * WhatsApp con el recordatorio ya armado (ver lib/client-billing.ts), y el
 * historial de pagos (carga perezosa, solo al abrirlo).
 */
function FacturacionCard({
  client,
  setClient,
  trainer,
}: {
  client: ClientRow;
  setClient: (c: ClientRow) => void;
  trainer: TrainerRow;
}) {
  const [payments, setPayments] = useState<ClientPaymentRow[]>([]);
  const [loadedPayments, setLoadedPayments] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingFecha, setEditingFecha] = useState(false);
  const [fechaInput, setFechaInput] = useState(client.fecha_inicio_facturacion ?? "");
  const [editingPrecio, setEditingPrecio] = useState(false);
  const [precioInput, setPrecioInput] = useState(client.plan_precio_cop != null ? String(client.plan_precio_cop) : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMarking, startMarking] = useTransition();
  // Comprobante que el cliente ya subió desde /mi-cuenta ("Ya pagué") y
  // sigue sin confirmar — se carga eager (no perezoso como el historial)
  // porque es lo primero que el entrenador debe ver al entrar a la ficha si
  // hay un pago esperando revisión.
  const [pendingReceipt, setPendingReceipt] = useState<PendingPaymentReceipt | null>(null);

  useEffect(() => {
    getOwnPendingPaymentReceipt(client.id).then(setPendingReceipt);
  }, [client.id]);

  useEffect(() => {
    if (!showHistory || loadedPayments) return;
    getOwnClientPayments(client.id).then((rows) => {
      setPayments(rows);
      setLoadedPayments(true);
    });
  }, [showHistory, loadedPayments, client.id]);

  function saveFecha() {
    setError(null);
    const nuevaFecha = fechaInput || null;
    startTransition(async () => {
      const res = await setClientBilling(client.id, { fechaInicioFacturacion: nuevaFecha });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
      setClient({
        ...client,
        fecha_inicio_facturacion: nuevaFecha,
        proximo_cobro_cliente: nuevaFecha ? addOneMonth(nuevaFecha) : client.proximo_cobro_cliente,
      });
      setEditingFecha(false);
    });
  }

  function savePrecio() {
    setError(null);
    const precio = precioInput ? parseInt(precioInput, 10) : null;
    startTransition(async () => {
      const res = await setClientBilling(client.id, { planPrecioCop: precio });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
      const nuevoProximo =
        client.proximo_cobro_cliente ?? (client.fecha_inicio_facturacion ? addOneMonth(client.fecha_inicio_facturacion) : null);
      setClient({ ...client, plan_precio_cop: precio, proximo_cobro_cliente: nuevoProximo });
      setEditingPrecio(false);
    });
  }

  function markPaid() {
    setError(null);
    startMarking(async () => {
      const res = await markClientPaymentReceived(client.id);
      if (!res.ok) {
        setError(res.error ?? "No se pudo marcar el pago.");
        return;
      }
      const periodo = client.proximo_cobro_cliente ?? client.fecha_inicio_facturacion ?? new Date().toISOString().slice(0, 10);
      setClient({ ...client, proximo_cobro_cliente: addOneMonth(periodo), meses_pagados: (client.meses_pagados ?? 0) + 1 });
      setPendingReceipt(null);
      setLoadedPayments(false);
      setShowHistory(true);
    });
  }

  const whatsappLink =
    client.whatsapp && client.plan_precio_cop && client.proximo_cobro_cliente
      ? buildClientPaymentWhatsappLink({
          clientFullName: client.full_name,
          clientWhatsapp: client.whatsapp,
          montoCop: client.plan_precio_cop,
          fechaCobro: client.proximo_cobro_cliente,
          datosCobro: trainer.datos_cobro,
        })
      : null;

  const compromiso = client.compromiso_meses_minimo ?? 2;
  const mesesPagados = client.meses_pagados ?? 0;
  const mesesFaltantes = Math.max(0, compromiso - mesesPagados);

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-white/50">
        <Wallet size={15} />
        <p className="text-xs font-bold uppercase tracking-wide">Facturación</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-[11px] text-white/40">Plan</p>
          <p className="mt-0.5 text-sm font-semibold text-white">{client.plan_elegido || "Sin definir"}</p>
        </div>

        <div>
          <p className="text-[11px] text-white/40">Precio mensual</p>
          {editingPrecio ? (
            <div className="mt-0.5 flex items-center gap-1">
              <input
                type="number"
                value={precioInput}
                onChange={(e) => setPrecioInput(e.target.value)}
                placeholder="COP"
                className="w-24 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-white outline-none"
              />
              <button onClick={savePrecio} disabled={isPending} className="text-emerald-400 disabled:opacity-40">
                <Check size={14} />
              </button>
              <button onClick={() => setEditingPrecio(false)} className="text-white/40 hover:text-white">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setPrecioInput(client.plan_precio_cop != null ? String(client.plan_precio_cop) : "");
                setEditingPrecio(true);
              }}
              className="mt-0.5 text-sm font-semibold text-white hover:text-hf-blue"
            >
              {client.plan_precio_cop != null ? `$${new Intl.NumberFormat("es-CO").format(client.plan_precio_cop)}` : "A definir"}
            </button>
          )}
        </div>

        <div>
          <p className="text-[11px] text-white/40">Inicio de facturación</p>
          {editingFecha ? (
            <div className="mt-0.5 flex items-center gap-1">
              <input
                type="date"
                value={fechaInput}
                onChange={(e) => setFechaInput(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-white outline-none"
              />
              <button onClick={saveFecha} disabled={isPending} className="text-emerald-400 disabled:opacity-40">
                <Check size={14} />
              </button>
              <button onClick={() => setEditingFecha(false)} className="text-white/40 hover:text-white">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setFechaInput(client.fecha_inicio_facturacion ?? "");
                setEditingFecha(true);
              }}
              className="mt-0.5 text-sm font-semibold text-white hover:text-hf-blue"
            >
              {client.fecha_inicio_facturacion ? new Date(client.fecha_inicio_facturacion).toLocaleDateString("es-CO") : "Sin definir"}
            </button>
          )}
        </div>

        <div>
          <p className="text-[11px] text-white/40">Próximo cobro</p>
          <p className="mt-0.5 text-sm font-semibold text-white">
            {client.proximo_cobro_cliente ? new Date(client.proximo_cobro_cliente).toLocaleDateString("es-CO") : "—"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-hf-blue"
            style={{ width: `${Math.min(100, (mesesPagados / compromiso) * 100)}%` }}
          />
        </div>
        <p className="shrink-0 text-[11px] text-white/40">
          {mesesPagados}/{compromiso} meses del compromiso mínimo{mesesFaltantes > 0 ? ` · faltan ${mesesFaltantes}` : " · cumplido"}
        </p>
      </div>

      {pendingReceipt && (
        <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/[0.06] p-3">
          <div className="flex items-center gap-2 text-amber-300">
            <CheckCircle2 size={14} />
            <p className="text-xs font-semibold">El cliente subió un comprobante — pendiente de confirmar</p>
          </div>
          <p className="mt-1 text-[11px] text-white/50">
            Enviado el {new Date(pendingReceipt.createdAt).toLocaleDateString("es-CO")} · $
            {new Intl.NumberFormat("es-CO").format(pendingReceipt.montoCop)} · periodo{" "}
            {new Date(pendingReceipt.periodoCubierto).toLocaleDateString("es-CO")}
          </p>
          {pendingReceipt.comprobanteUrl && (
            <a
              href={pendingReceipt.comprobanteUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-block text-[11px] font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-200"
            >
              Ver comprobante →
            </a>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={markPaid}
          disabled={isMarking || !client.plan_precio_cop}
          title={!client.plan_precio_cop ? "Define el precio del plan primero" : undefined}
          className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black disabled:opacity-40"
        >
          <Check size={13} /> {isMarking ? "Guardando..." : pendingReceipt ? "Confirmar pago recibido" : "Marcar como pagado"}
        </button>

        {whatsappLink ? (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white/90 hover:border-white/40 hover:text-white"
          >
            <MessageCircle size={13} /> Enviar recordatorio
          </a>
        ) : (
          <span className="text-[11px] text-white/30">
            {!client.whatsapp ? "Falta WhatsApp del cliente" : !client.plan_precio_cop ? "Falta definir el precio" : "Falta fecha de próximo cobro"}
          </span>
        )}

        <button onClick={() => setShowHistory((v) => !v)} className="ml-auto text-[11px] font-semibold text-white/50 hover:text-white">
          {showHistory ? "Ocultar historial" : "Ver historial de pagos"}
        </button>
      </div>

      {showHistory && (
        <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
          {!loadedPayments && <p className="text-xs text-white/35">Cargando...</p>}
          {loadedPayments && payments.length === 0 && <p className="text-xs text-white/35">Sin pagos registrados.</p>}
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
              <span className="text-xs text-white/70">Periodo {new Date(p.periodo_cubierto).toLocaleDateString("es-CO")}</span>
              <span className="text-xs font-semibold text-white">${new Intl.NumberFormat("es-CO").format(p.monto_cop)}</span>
              {p.comprobante_url && (
                <a
                  href={p.comprobante_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-hf-blue underline underline-offset-2 hover:text-white"
                >
                  Comprobante
                </a>
              )}
              <span className="text-[11px] text-white/40">Pagado {new Date(p.pagado_en).toLocaleDateString("es-CO")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-hf-blue text-black" : "border border-white/15 text-white/60 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

/** Gráfico de línea liviano en SVG puro — sin librería nueva, coherente con
 * "Simplicidad" del proyecto. Se dibuja solo con >= 2 mediciones de peso. */
function WeightChart({ measurements }: { measurements: MeasurementRow[] }) {
  const points = measurements
    .filter((m) => m.peso != null)
    .slice()
    .reverse(); // measurements viene desc por fecha; el chart necesita orden cronológico

  if (points.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-white/15 text-center text-xs text-white/35">
        Registra al menos 2 mediciones de peso para ver la evolución.
      </div>
    );
  }

  const weights = points.map((p) => p.peso!);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const w = 640;
  const h = 160;
  const pad = 20;
  const stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (p.peso! - min) / range) * (h - pad * 2);
    return { x, y, peso: p.peso!, fecha: p.fecha };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPath = `M${coords[0].x},${h - pad} L${coords.map((c) => `${c.x},${c.y}`).join(" L")} L${coords[coords.length - 1].x},${h - pad} Z`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-white/40">Evolución del peso</p>
        <p className="text-[11px] text-white/40">
          {new Date(points[0].fecha).toLocaleDateString("es-CO")} — {new Date(points[points.length - 1].fecha).toLocaleDateString("es-CO")}
        </p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-40 w-full">
        <path d={areaPath} fill="rgba(0,200,255,0.08)" />
        <polyline points={polyline} fill="none" stroke="#00C8FF" strokeWidth="2" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="3" fill="#00C8FF" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-white/40">
        <span>{min} kg</span>
        <span>{max} kg</span>
      </div>
    </div>
  );
}

type ActivityItem = { date: string; label: string; detail?: string };

function ResumenTab({
  client,
  measurements,
  evaluations,
  routines,
  trainingLogs,
}: {
  client: ClientRow;
  measurements: MeasurementRow[];
  evaluations: EvaluationRow[];
  routines: RoutineRow[];
  trainingLogs: TrainingLogRow[];
}) {
  const activity: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];
    for (const m of measurements) {
      items.push({
        date: m.created_at,
        label: m.peso != null ? `Registró peso: ${m.peso} kg` : "Registró una medición",
        detail: m.notas ?? undefined,
      });
    }
    for (const e of evaluations) {
      items.push({
        date: e.created_at,
        label:
          e.status === "completada"
            ? `Evaluación completada — ${new Date(e.scheduled_at).toLocaleDateString("es-CO")}`
            : `Evaluación agendada para ${new Date(e.scheduled_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}`,
      });
    }
    for (const r of routines) {
      items.push({ date: r.created_at, label: `Rutina creada — ${r.dias_por_semana}x/semana` });
    }
    for (const t of trainingLogs) {
      items.push({
        date: t.created_at,
        label: `Entrenó — ${new Date(t.fecha).toLocaleDateString("es-CO")}`,
        detail: t.notas ?? undefined,
      });
    }
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [measurements, evaluations, routines, trainingLogs]);

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <WeightChart measurements={measurements} />

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-white/40">Actividad reciente</p>
        <div className="mt-3 space-y-3">
          {activity.length === 0 && <p className="text-xs text-white/35">Todavía no hay actividad registrada.</p>}
          {activity.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hf-blue" />
              <div>
                <p className="text-xs text-white/80">{item.label}</p>
                <p className="mt-0.5 text-[11px] text-white/35">
                  {new Date(item.date).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                  {item.detail ? ` · ${item.detail}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!client.rutina_actual && routines.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-xs text-white/35 lg:col-span-2">
          Este cliente todavía no tiene rutina asignada.{" "}
          <Link href="/panel/entrenamientos" className="font-semibold text-hf-blue hover:underline">
            Crear una en Entrenamientos →
          </Link>
        </div>
      )}
    </div>
  );
}

function ProgresoTab({
  clientId,
  measurements,
  setMeasurements,
}: {
  clientId: string;
  measurements: MeasurementRow[];
  setMeasurements: (m: MeasurementRow[]) => void;
}) {
  const [newWeight, setNewWeight] = useState("");
  const [newFat, setNewFat] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadingPhoto, startPhotoUpload] = useTransition();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photos = measurements.filter((m) => m.foto_url);

  function pickPhoto(file: File) {
    setPhotoError(null);
    setPhotoPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.set("foto", file);
    startPhotoUpload(async () => {
      const res = await uploadOwnClientMeasurementPhoto(clientId, formData);
      if (!res.ok || !res.url) {
        setPhotoError(res.error || "No se pudo subir la foto.");
        setPhotoPreview(null);
        return;
      }
      setPhotoUrl(res.url);
    });
  }

  function removePhoto() {
    setPhotoUrl(null);
    setPhotoPreview(null);
    setPhotoError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addMeasurement() {
    const peso = newWeight ? parseFloat(newWeight) : null;
    const grasaCorporal = newFat ? parseFloat(newFat) : null;
    startTransition(async () => {
      await addOwnClientMeasurement(clientId, {
        peso,
        notas: newNotes || null,
        fotoUrl: photoUrl,
        medidas: grasaCorporal != null ? { grasa_corporal: grasaCorporal } : null,
      });
      setNewWeight("");
      setNewFat("");
      setNewNotes("");
      removePhoto();
      const rows = await getOwnClientMeasurements(clientId);
      setMeasurements(rows);
    });
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-white/40">Nueva medición</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <label
            className={`flex h-28 w-full shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-center transition-colors sm:w-28 ${
              photoError ? "border-red-500/40 bg-red-500/5" : "border-white/15 bg-white/[0.02] hover:border-hf-blue/50"
            }`}
          >
            {photoPreview ? (
              <div className="relative h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Vista previa" className="h-full w-full rounded-xl object-cover" />
                {uploadingPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 text-[10px] font-semibold text-white">
                    Subiendo...
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    removePhoto();
                  }}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white/70 hover:text-white"
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <>
                <Camera size={18} className="text-white/30" />
                <span className="text-[10px] font-medium text-white/40">Foto de progreso</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) pickPhoto(file);
              }}
            />
          </label>

          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="Peso (kg)"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="w-28 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Grasa (%)"
                value={newFat}
                onChange={(e) => setNewFat(e.target.value)}
                className="w-28 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none"
              />
              <input
                placeholder="Nota (opcional)"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            {photoError && <p className="text-[11px] text-red-400">{photoError}</p>}
            <button
              onClick={addMeasurement}
              disabled={isPending || uploadingPhoto || !newWeight}
              className="flex items-center justify-center gap-1 self-start rounded-xl bg-hf-blue px-4 py-2 text-xs font-bold text-black disabled:opacity-40"
            >
              <Plus size={13} /> Agregar medición
            </button>
          </div>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-white/40">Fotos de progreso</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {photos.map((m) => (
              <div key={m.id} className="shrink-0 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.foto_url!} alt={`Progreso ${m.fecha}`} className="h-24 w-24 rounded-xl object-cover" />
                <p className="mt-1 text-[10px] text-white/35">{new Date(m.fecha).toLocaleDateString("es-CO")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-white/40">Historial</p>
        <div className="mt-3 space-y-2">
          {measurements.length === 0 && <p className="text-xs text-white/40">Sin mediciones registradas.</p>}
          {measurements.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
              {m.foto_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.foto_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
              )}
              <span className="text-xs text-white/70">{new Date(m.fecha).toLocaleDateString("es-CO")}</span>
              <span className="text-xs font-semibold text-white">{m.peso != null ? `${m.peso} kg` : "—"}</span>
              {m.medidas?.grasa_corporal != null && (
                <span className="text-xs font-semibold text-amber-400">{m.medidas.grasa_corporal}% grasa</span>
              )}
              {m.notas && <span className="text-[11px] text-white/40">{m.notas}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EvaluacionesTab({
  clientId,
  clientEmail,
  evaluations,
  setEvaluations,
}: {
  clientId: string;
  clientEmail: string | null;
  evaluations: EvaluationRow[];
  setEvaluations: (e: EvaluationRow[]) => void;
}) {
  const [isPending, startTransition] = useTransition();

  // Agendar una evaluación nueva vive solo en la Agenda real (/panel/agenda)
  // — antes había un formulario aparte aquí que creaba filas "evaluations"
  // sin modalidad, sin sincronizar con Google Calendar ni numerar sesión,
  // duplicando (y desalineando) la lógica de agendamiento real.
  function markDone(id: string) {
    startTransition(async () => {
      await updateOwnAppointment(id, { status: "completada" });
      const rows = await getOwnClientEvaluations(clientId);
      setEvaluations(rows);
    });
  }

  return (
    <div className="mt-4 space-y-4">
      <SessionProposalPanel clientId={clientId} clientEmail={clientEmail} />

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-white/50">Todas las citas se agendan desde la Agenda.</p>
          <Link
            href={`/panel/agenda?clientId=${clientId}&nuevo=1`}
            className="flex items-center gap-1 rounded-xl bg-hf-blue px-3 py-2 text-xs font-bold text-black"
          >
            <CalendarClock size={13} /> Agendar en la Agenda
          </Link>
        </div>

        <div className="mt-4 space-y-2">
          {evaluations.length === 0 && <p className="text-xs text-white/40">Sin evaluaciones agendadas.</p>}
          {evaluations.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
              <span className="text-xs text-white/70">
                {new Date(ev.scheduled_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    ev.status === "completada" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {ev.status === "completada" ? "Completada" : "Pendiente"}
                </span>
                {ev.status !== "completada" && (
                  <button onClick={() => markDone(ev.id)} className="flex items-center gap-1 text-[11px] font-semibold text-white/50 hover:text-white">
                    <Check size={12} /> Marcar hecha
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

/**
 * Panel "Plan de sesiones" — el entrenador arma una lista de fechas
 * semanales (días + horario + duración + modalidad + cantidad) y se la
 * manda al cliente para que la apruebe sesión por sesión desde
 * /agenda/aprobar/[token] (ver lib/session-proposals-actions.ts). Solo
 * puede haber una propuesta 'pendiente' a la vez por cliente — mientras
 * exista, este panel muestra su progreso en vez del formulario.
 */
function SessionProposalPanel({ clientId, clientEmail }: { clientId: string; clientEmail: string | null }) {
  const [proposal, setProposal] = useState<SessionProposalRow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [horario, setHorario] = useState(HORARIOS_ENTRENO[0]);
  const [durationMin, setDurationMin] = useState(60);
  const [modalidad, setModalidad] = useState<AppointmentModalidad>("presencial");
  const [count, setCount] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCanceling, startCancel] = useTransition();

  useEffect(() => {
    let active = true;
    getOwnSessionProposal(clientId).then((p) => {
      if (active) {
        setProposal(p);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [clientId]);

  function toggleWeekday(d: number) {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await proposeSessionPlan({ clientId, weekdays, horario, durationMin, modalidad, count });
      if (!res.ok) {
        setError(res.error ?? "No se pudo enviar la propuesta.");
        return;
      }
      const p = await getOwnSessionProposal(clientId);
      setProposal(p);
      setShowForm(false);
      setWeekdays([]);
    });
  }

  function cancel() {
    if (!proposal) return;
    startCancel(async () => {
      await cancelSessionProposal(proposal.id);
      setProposal(null);
    });
  }

  if (!loaded) return null;

  const aprobadas = proposal?.items.filter((i) => i.status === "aprobada").length ?? 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CalendarCheck2 size={14} className="text-hf-blue" />
          <p className="text-xs font-bold uppercase tracking-wide text-white/40">Plan de sesiones</p>
        </div>
        {!proposal && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-xl bg-hf-blue px-3 py-2 text-xs font-bold text-black"
          >
            <Plus size={13} /> Proponer plan de sesiones
          </button>
        )}
      </div>

      {proposal && (
        <div className="mt-3">
          <p className="text-xs text-white/60">
            Propuesta enviada — {aprobadas}/{proposal.items.length} sesiones aprobadas por el cliente.
          </p>
          <div className="mt-2 space-y-1.5">
            {proposal.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                <span className="text-xs text-white/70">
                  {new Date(it.scheduledAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    it.status === "aprobada"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : it.status === "rechazada"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {it.status === "aprobada" ? "Aprobada" : it.status === "rechazada" ? "Rechazada" : "Por aprobar"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <a href={proposal.url} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-hf-blue hover:underline">
              Ver link de aprobación →
            </a>
            <button
              onClick={cancel}
              disabled={isCanceling}
              className="text-[11px] font-semibold text-white/40 hover:text-red-400 disabled:opacity-50"
            >
              {isCanceling ? "Cancelando..." : "Cancelar propuesta"}
            </button>
          </div>
        </div>
      )}

      {!proposal && showForm && (
        <div className="mt-3 space-y-3">
          {!clientEmail && (
            <p className="text-[11px] text-amber-400">Este cliente no tiene correo registrado — no podrás avisarle de la propuesta.</p>
          )}
          <div>
            <p className="text-[11px] font-semibold text-white/50">Días de la semana</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {WEEKDAY_OPTIONS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => toggleWeekday(w.value)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                    weekdays.includes(w.value) ? "bg-hf-blue text-black" : "border border-white/15 text-white/60 hover:text-white"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none"
            >
              {HORARIOS_ENTRENO.map((h) => (
                <option key={h} value={h} className="bg-hf-black">
                  {h}
                </option>
              ))}
            </select>
            <select
              value={durationMin}
              onChange={(e) => setDurationMin(parseInt(e.target.value, 10))}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none"
            >
              {[30, 45, 60, 75, 90].map((d) => (
                <option key={d} value={d} className="bg-hf-black">
                  {d} min
                </option>
              ))}
            </select>
            <select
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value as AppointmentModalidad)}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none"
            >
              <option value="presencial" className="bg-hf-black">
                Presencial
              </option>
              <option value="virtual" className="bg-hf-black">
                Virtual
              </option>
            </select>
            <input
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
              placeholder="# sesiones"
              className="w-24 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none"
            />
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:border-white/30"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={isPending || !clientEmail || weekdays.length === 0}
              className="rounded-xl bg-hf-blue px-4 py-2 text-xs font-bold text-black disabled:opacity-40"
            >
              {isPending ? "Enviando..." : "Enviar propuesta"}
            </button>
          </div>
        </div>
      )}

      {!proposal && !showForm && (
        <p className="mt-2 text-xs text-white/35">
          Genera una lista de sesiones semanales para que el cliente las apruebe una por una desde su link.
        </p>
      )}
    </div>
  );
}

function RutinaTab({ routines }: { routines: RoutineRow[] }) {
  return (
    <div className="mt-4 space-y-3">
      {routines.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-xs text-white/35">
          Este cliente todavía no tiene rutina.{" "}
          <Link href="/panel/entrenamientos" className="font-semibold text-hf-blue hover:underline">
            Crear una en Entrenamientos →
          </Link>
        </div>
      )}
      {routines.map((r) => (
        <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Dumbbell size={15} className="text-emerald-400" />
              {r.dias_por_semana}x/semana
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                r.status === "aprobado"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : r.status === "revisando"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-white/10 text-white/60"
              }`}
            >
              {r.status === "aprobado" ? "Aprobada" : r.status === "revisando" ? "En revisión" : "Pendiente"}
            </span>
          </div>
          {r.horario && <p className="mt-1.5 text-xs text-white/50">Horario: {r.horario}</p>}
          {r.resumen_frecuencia && <p className="mt-1 text-xs text-white/50">{r.resumen_frecuencia}</p>}
          <p className="mt-2 text-[11px] text-white/35">
            {r.dias.filter((d) => !d.descanso).length} día(s) de entreno · {r.dias.filter((d) => d.descanso).length} de descanso
          </p>
          <Link href="/panel/entrenamientos" className="mt-3 inline-block text-[11px] font-semibold text-hf-blue hover:underline">
            Ver / editar en Entrenamientos →
          </Link>
        </div>
      ))}
    </div>
  );
}
