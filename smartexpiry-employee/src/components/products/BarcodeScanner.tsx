"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from "react";
import { Camera, CameraOff, Check, ImageUp, Keyboard, LoaderCircle, RotateCcw, Search, X } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Detector = InstanceType<typeof import("barcode-detector/ponyfill").BarcodeDetector>;

/** Retail 1-D codes + GS1 DataMatrix/QR (which can carry expiry & batch). */
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "itf", "data_matrix", "qr_code"] as const;

/** Timings for the scan feedback (ms). */
const MIN_PHOTO_SCAN = 1100; // let the scan line sweep at least once
const FOUND_PAUSE = 700; // show the green "found" state before moving on

let detectorPromise: Promise<Detector> | null = null;

/** Loads the ZXing decoder once, from our own /public (no third-party CDN). */
function getDetector() {
  detectorPromise ??= (async () => {
    const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill");
    prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? "/vendor/zxing_reader.wasm" : prefix + path),
      },
    });
    return new BarcodeDetector({ formats: [...FORMATS] });
  })();
  return detectorPromise;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Renders the photo onto a canvas with a white background (transparent PNGs
 * otherwise decode as black), a usable size (tiny thumbnails are enlarged,
 * huge camera photos shrunk), optional contrast boost and rotation.
 */
function prepare(bitmap: ImageBitmap, { contrast = false, rotate = false } = {}) {
  const long = Math.max(bitmap.width, bitmap.height);
  const scale = long < 1000 ? Math.min(4, 1000 / long) : long > 2000 ? 2000 / long : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = rotate ? h : w;
  canvas.height = rotate ? w : h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (contrast) ctx.filter = "grayscale(1) contrast(1.8)";
  if (rotate) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);
  } else {
    ctx.drawImage(bitmap, 0, 0, w, h);
  }
  return canvas;
}

/** Tries several clean-ups of a photo until a barcode is found (fast path first). */
async function detectInPhoto(file: File): Promise<string | null> {
  const detector = await getDetector();
  const bitmap = await createImageBitmap(file);
  try {
    const attempts = [
      () => bitmap,
      () => prepare(bitmap),
      () => prepare(bitmap, { contrast: true }),
      () => prepare(bitmap, { rotate: true }),
    ];
    for (const source of attempts) {
      try {
        const [code] = await detector.detect(source());
        if (code?.rawValue) return code.rawValue;
      } catch {
        /* try the next variant */
      }
    }
    return null;
  } finally {
    bitmap.close();
  }
}
const noop = () => () => {};
/** Live camera needs a secure context (HTTPS or localhost) and getUserMedia. */
const useCameraAvailable = () =>
  useSyncExternalStore(noop, () => window.isSecureContext && !!navigator.mediaDevices?.getUserMedia, () => true);

type CameraState = "starting" | "scanning" | "denied" | "error";
/** Feedback shown over the viewport. */
type Scan = { phase: "scanning" | "found" | "failed"; code?: string };

type Props = {
  /** Called once with the raw barcode text (the scanner stops itself). */
  onDetected: (raw: string) => void;
  /** Shown under the viewport (e.g. a lookup error from the previous attempt). */
  error?: string | null;
};

/**
 * Barcode scanner with three ways in:
 *  1. live camera (HTTPS/localhost),
 *  2. a photo of the barcode (works everywhere, incl. phones on plain HTTP),
 *  3. typing the number printed under the barcode.
 * Photos are shown in the viewport with a sweeping scan line, then a green
 * "found" frame (or a red marker if nothing could be read).
 */
export function BarcodeScanner({ onDetected, error }: Props) {
  const cameraAvailable = useCameraAvailable();
  const videoRef = useRef<HTMLVideoElement>(null);
  const typedRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onDetectedRef = useRef(onDetected);
  const doneRef = useRef(false);
  const pausedRef = useRef(false); // live loop pauses while a photo is shown
  const [camera, setCamera] = useState<CameraState>("starting");
  const [photo, setPhoto] = useState<string | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  // Free the previous photo's object URL.
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo);
  }, [photo]);

  /** Show the green confirmation briefly, then hand the code to the parent. */
  const finish = async (raw: string) => {
    if (doneRef.current) return;
    doneRef.current = true;
    navigator.vibrate?.(80);
    setScan({ phase: "found", code: raw });
    await wait(FOUND_PAUSE);
    onDetectedRef.current(raw);
  };

  // Live camera loop
  useEffect(() => {
    if (!cameraAvailable) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCamera("scanning");
        const detector = await getDetector();

        const tick = async () => {
          if (cancelled || doneRef.current) return;
          const video = videoRef.current;
          if (!pausedRef.current && video && video.readyState >= 2) {
            try {
              const [code] = await detector.detect(video);
              if (code?.rawValue && !cancelled && !pausedRef.current) return void finish(code.rawValue);
            } catch {
              /* frame not ready — try the next one */
            }
          }
          timer = setTimeout(tick, 250);
        };
        void tick();
      } catch (e) {
        if (!cancelled) setCamera((e as DOMException)?.name === "NotAllowedError" ? "denied" : "error");
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraAvailable]);

  async function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || doneRef.current) return;

    pausedRef.current = true;
    setPhoto(URL.createObjectURL(file));
    setScan({ phase: "scanning" });

    const detect = detectInPhoto(file).catch(() => null);
    const [raw] = await Promise.all([detect, wait(MIN_PHOTO_SCAN)]);

    if (raw) {
      void finish(raw);
    } else {
      setScan({ phase: "failed" });
      typedRef.current?.focus();
    }
  }

  function backToCamera() {
    setPhoto(null);
    setScan(null);
    pausedRef.current = false;
  }

  function onTyped(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = typed.trim();
    if (value) void finish(value);
  }

  const cameraMessage = !cameraAvailable
    ? "Live camera needs a secure connection (HTTPS) or localhost. On this address, take a photo of the barcode or type its number."
    : camera === "denied"
      ? "Camera access is blocked. Allow it in your browser's site settings, or use a photo / type the number."
      : camera === "error"
        ? "No camera could be started on this device. Use a photo or type the number instead."
        : null;

  const showVideo = cameraAvailable && camera !== "denied" && camera !== "error";
  const busy = scan?.phase === "scanning" || scan?.phase === "found";

  return (
    <div className="space-y-4">
      {/* Viewport */}
      <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-slate-950 sm:aspect-video">
        {showVideo && (
          <video
            ref={videoRef}
            muted
            playsInline
            className={cn("absolute inset-0 size-full object-cover", photo && "invisible")}
            aria-label="Camera preview"
          />
        )}

        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- local preview (blob URL)
          <img src={photo} alt="Uploaded barcode photo" className="absolute inset-0 size-full bg-white object-contain" />
        )}

        {!photo && cameraMessage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white/80">
            <CameraOff className="size-8" aria-hidden />
            <p className="max-w-sm text-sm">{cameraMessage}</p>
          </div>
        ) : (
          <ScanOverlay
            scanning={(photo ? scan?.phase === "scanning" : camera === "scanning") && scan?.phase !== "found"}
            phase={scan?.phase}
            dim={!photo}
          />
        )}

        {/* Status strip */}
        {(photo || !cameraMessage || scan) && (
          <div
            role="status"
            className={cn(
              "absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 px-4 pb-3 pt-8 text-xs font-medium text-white",
              "bg-linear-to-t from-black/75 to-transparent",
            )}
          >
            {scan?.phase === "found" ? (
              <>
                <Check className="size-3.5 text-emerald-300" aria-hidden /> Barcode found ·{" "}
                <span className="font-mono">{scan.code}</span>
              </>
            ) : scan?.phase === "scanning" ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Scanning photo…
              </>
            ) : scan?.phase === "failed" ? (
              <>
                <X className="size-3.5 text-red-300" aria-hidden /> No readable barcode in this photo
              </>
            ) : camera === "starting" ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Starting camera…
              </>
            ) : (
              <>
                <Camera className="size-3.5" aria-hidden /> Point at the barcode — it scans automatically
              </>
            )}
          </div>
        )}

        {photo && scan?.phase === "failed" && (
          <button
            type="button"
            onClick={backToCamera}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/75"
          >
            <RotateCcw className="size-3.5" aria-hidden /> {cameraMessage ? "Clear photo" : "Back to camera"}
          </button>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {scan?.phase === "failed" && (
        <Alert variant="warning" title="We couldn't read a barcode in that photo">
          Type the number printed under the barcode below, or{" "}
          <button type="button" onClick={() => fileRef.current?.click()} className="font-medium text-foreground underline underline-offset-4">
            try another photo
          </button>{" "}
          — fill the frame with the barcode, keep it sharp, flat and well lit.
        </Alert>
      )}

      {/* Fallbacks */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={cn(buttonVariants({ variant: "outline", size: "lg", fullWidth: true }), busy && "pointer-events-none opacity-60")}>
          {scan?.phase === "scanning" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ImageUp className="size-4" aria-hidden />}
          {scan?.phase === "scanning" ? "Scanning photo…" : photo ? "Scan another photo" : "Scan from a photo"}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} className="sr-only" disabled={busy} />
        </label>

        <form onSubmit={onTyped} className="flex gap-2">
          <div className="relative flex-1">
            <Keyboard className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              ref={typedRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              inputMode="numeric"
              placeholder="Type barcode number"
              aria-label="Barcode number"
              disabled={scan?.phase === "found"}
              className={cn(
                "h-12 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground shadow-xs placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/20",
                scan?.phase === "failed" && "border-warning ring-3 ring-warning/20",
              )}
            />
          </div>
          <Button type="submit" size="lg" variant="secondary" aria-label="Look up barcode" disabled={!typed.trim() || scan?.phase === "found"}>
            <Search className="size-4" aria-hidden />
          </Button>
        </form>
      </div>
    </div>
  );
}

/** Framing guide, sweeping scan line, and found/failed states. */
function ScanOverlay({ scanning, phase, dim }: { scanning: boolean; phase?: Scan["phase"]; dim: boolean }) {
  const found = phase === "found";
  const failed = phase === "failed";
  const corner = found ? "border-emerald-400" : failed ? "border-red-400" : "border-emerald-400";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div
        className={cn(
          "relative h-[55%] w-[78%] rounded-2xl transition-[box-shadow,background-color] duration-300",
          dim ? "shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]" : "shadow-[0_0_0_9999px_rgba(2,6,23,0.25)]",
          found && "bg-emerald-400/15 ring-4 ring-emerald-400",
          failed && "ring-2 ring-red-400/70",
        )}
      >
        {(
          [
            "left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl",
            "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl",
            "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl",
            "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl",
          ] as const
        ).map((c) => (
          <span key={c} className={cn("absolute size-7 transition-colors", corner, c)} />
        ))}

        {scanning && (
          <span className="absolute inset-x-3 h-0.5 animate-scan-line rounded-full bg-emerald-400 shadow-[0_0_14px_3px_rgba(52,211,153,0.75)]" />
        )}

        {found && (
          <span className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 animate-pop-in items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
            <Check className="size-8" strokeWidth={3} />
          </span>
        )}
        {failed && (
          <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 animate-pop-in items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
            <X className="size-7" strokeWidth={3} />
          </span>
        )}
      </div>
    </div>
  );
}
