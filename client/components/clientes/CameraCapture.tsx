/**
 * CameraCapture — Captura biométrica por WebRTC.
 * Incluye aviso de privacidad y consentimiento antes de activar la cámara.
 * En producción: enviar el frame a DeepFace para liveness + face match.
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { compressImage } from "@/lib/imageUtils";
import { Camera, RefreshCw, CheckCircle2, X, ShieldCheck, Lock, EyeOff, Server } from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  label?: string;
  /** If a selfie was already captured, show it directly in preview mode */
  initialPhoto?: string;
}

export function CameraCapture({ onCapture, label = "Selfie de verificación", initialPhoto }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // If a photo was already captured (e.g. user returns to this step), skip consent and show preview
  const [phase, setPhase] = useState<"consent" | "idle" | "camera" | "preview">(initialPhoto ? "preview" : "consent");
  const [consentChecked, setConsentChecked] = useState(false);
  const [preview, setPreview] = useState<string>(initialPhoto ?? "");
  const [error, setError] = useState<string>("");

  // ── Stop stream on unmount (prevents camera LED staying on after navigation) ─
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // ── Assign srcObject AFTER the video element is rendered ────────────────────
  useEffect(() => {
    if (phase === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        setError("No se pudo reproducir la cámara. Intenta de nuevo.");
      });
    }
  }, [phase]);

  const startCamera = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setPhase("camera"); // render video element first, then useEffect assigns srcObject
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setError("Permiso denegado. Habilita el acceso a la cámara en tu navegador.");
      } else {
        setError("No se pudo acceder a la cámara. Verifica los permisos del navegador.");
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    // Cap capture to 640×480 to limit base64 size before compression
    const srcW = video.videoWidth  || 640;
    const srcH = video.videoHeight || 480;
    canvas.width  = srcW;
    canvas.height = srcH;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const raw = canvas.toDataURL("image/jpeg", 0.85);
    setPreview(raw);   // show preview immediately
    stopCamera();
    setPhase("preview");
    // Compress asynchronously then notify parent
    compressImage(raw, "selfie").then((compressed) => {
      onCapture(compressed);
    });
  }, [onCapture, stopCamera]);

  const retake = useCallback(() => {
    setPreview("");
    setPhase("idle");
    startCamera();
  }, [startCamera]);

  const cancel = useCallback(() => {
    stopCamera();
    setPhase("idle");
    setPreview("");
  }, [stopCamera]);

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">
        {label}
      </span>

      {/* ── Aviso de privacidad y consentimiento ────────────────────────────── */}
      {phase === "consent" && (
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/15 bg-[hsl(217,25%,7%)] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-sm font-bold text-[hsl(210,40%,92%)]">Aviso de privacidad biométrica</p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { icon: Lock,     text: "Tu selfie se usa únicamente para verificar tu identidad en este proceso de registro. Es cifrada con AES-256 y se almacena de forma segura." },
              { icon: EyeOff,   text: "Tus datos biométricos NO serán compartidos con terceros, publicados en internet ni utilizados con fines publicitarios." },
              { icon: Server,   text: "Tu información NO es utilizada para entrenar modelos de inteligencia artificial. No forma parte de ningún dataset de entrenamiento." },
              { icon: ShieldCheck, text: "El procesamiento de comparación facial se realiza en servidores privados y seguros, bajo estrictos protocolos de confidencialidad." },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-2.5 text-xs text-[hsl(215,20%,55%)]">
                <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-400/70" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Consentimiento explícito */}
          <label className="flex items-start gap-3 cursor-pointer group mt-1">
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                className="sr-only"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
              />
              <div className={cn(
                "w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all",
                consentChecked
                  ? "bg-amber-500 border-amber-500"
                  : "bg-transparent border-[hsl(217,25%,25%)] group-hover:border-amber-500/40"
              )} style={{ width: 18, height: 18 }}>
                {consentChecked && <CheckCircle2 className="w-3 h-3 text-[hsl(222,47%,4%)]" />}
              </div>
            </div>
            <span className="text-xs text-[hsl(215,20%,60%)] leading-relaxed">
              He leído el aviso de privacidad y <strong className="text-[hsl(210,40%,80%)]">doy mi consentimiento</strong> para que mi selfie sea capturada y utilizada exclusivamente para la verificación de identidad en este proceso KYC.
            </span>
          </label>

          <button
            type="button"
            disabled={!consentChecked}
            onClick={() => setPhase("idle")}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all",
              consentChecked
                ? "bg-amber-500 text-[hsl(222,47%,4%)] hover:brightness-105"
                : "bg-[hsl(217,25%,12%)] text-[hsl(215,20%,35%)] cursor-not-allowed border border-[hsl(217,25%,18%)]"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            Acepto · Continuar con captura
          </button>
        </div>
      )}

      {/* ── Cámara / Captura ────────────────────────────────────────────────── */}
      {phase !== "consent" && (
        <div className="relative rounded-2xl overflow-hidden bg-[hsl(217,25%,8%)] border border-[hsl(217,25%,14%)] aspect-video">

          {/* Idle: listo para activar */}
          {phase === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Camera className="w-7 h-7 text-amber-400/70" />
              </div>
              <p className="text-xs text-[hsl(215,20%,45%)] text-center px-4">
                Posiciona tu rostro frente a la cámara en un lugar bien iluminado
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-[hsl(222,47%,4%)] hover:brightness-110 transition-all"
              >
                Activar cámara
              </button>
              {error && <p className="text-xs text-red-400 text-center px-4">{error}</p>}
            </div>
          )}

          {/* Camera live — video siempre renderizado para que el ref esté disponible */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover scale-x-[-1] transition-opacity",
              phase === "camera" ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
            )}
          />

          {/* Overlay + controls (solo en fase camera) */}
          {phase === "camera" && (
            <>
              {/* Guía oval de rostro */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-52 rounded-full border-2 border-amber-400/50 border-dashed opacity-70" />
              </div>
              {/* Controles */}
              <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={cancel}
                  className="p-2.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={capture}
                  className="w-14 h-14 rounded-full bg-amber-500 border-4 border-amber-300/30 hover:brightness-110 transition-all shadow-lg"
                />
              </div>
            </>
          )}

          {/* Preview capturado */}
          {phase === "preview" && preview && (
            <>
              <img
                src={preview}
                alt="Selfie capturada"
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Capturada
              </div>
              <button
              type="button"
              onClick={retake}
              className="absolute bottom-3 inset-x-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[hsl(217,25%,14%)] border border-amber-500/25 text-amber-400 hover:bg-amber-500/15 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Repetir / Cambiar foto
            </button>
            </>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {phase === "camera" && (
        <p className="text-[10px] text-[hsl(215,20%,40%)] text-center flex items-center justify-center gap-1">
          <Lock className="w-2.5 h-2.5" />
          Datos cifrados · No compartidos · No usados para entrenar IA
        </p>
      )}
    </div>
  );
}
