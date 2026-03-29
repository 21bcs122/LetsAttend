"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  onCapture: (dataUrlWebp: string) => void;
  onError?: (message: string) => void;
  /** Label for the button that opens the camera (ignored when hideControls). */
  openLabel?: string;
  /** Hide built-in buttons — parent drives start/capture via ref. */
  hideControls?: boolean;
  /** Called after the camera stream is playing (for enabling capture). */
  onStreamReady?: () => void;
};

const MAX_EDGE = 720;
const WEBP_QUALITY = 0.65;

async function canvasToWebpDataUrl(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<string> {
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", quality)
  );
  if (!blob) throw new Error("Could not encode WebP");
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(blob);
  });
}

export type CameraCaptureHandle = {
  start: () => Promise<void>;
  stop: () => void;
  /** Encode current frame and call onCapture (then stop stream). */
  capture: () => Promise<void>;
};

export const CameraCapture = React.forwardRef<CameraCaptureHandle, Props>(
  function CameraCapture(
    { onCapture, onError, openLabel = "Open camera", hideControls = false, onStreamReady },
    ref
  ) {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const streamRef = React.useRef<MediaStream | null>(null);
    const [active, setActive] = React.useState(false);

    const stop = React.useCallback(() => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setActive(false);
    }, []);

    React.useEffect(() => () => stop(), [stop]);

    const start = React.useCallback(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();
        setActive(true);
        onStreamReady?.();
      } catch {
        onError?.("Camera permission denied or unavailable.");
      }
    }, [onError, onStreamReady]);

    const capture = React.useCallback(async () => {
      const v = videoRef.current;
      if (!v || v.videoWidth === 0) {
        onError?.("Camera not ready yet — wait a moment.");
        return;
      }
      const scale = Math.min(1, MAX_EDGE / Math.max(v.videoWidth, v.videoHeight));
      const w = Math.round(v.videoWidth * scale);
      const h = Math.round(v.videoHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        onError?.("Canvas not supported");
        return;
      }
      ctx.drawImage(v, 0, 0, w, h);
      try {
        const dataUrl = await canvasToWebpDataUrl(canvas, WEBP_QUALITY);
        onCapture(dataUrl);
        stop();
      } catch (e) {
        onError?.(e instanceof Error ? e.message : "Capture failed");
      }
    }, [onCapture, onError, stop]);

    React.useImperativeHandle(ref, () => ({ start, stop, capture }), [start, stop, capture]);

    return (
      <div className="flex flex-col gap-3">
        <video
          ref={videoRef}
          className="aspect-video w-full max-w-md rounded-xl border border-white/10 bg-black object-cover"
          playsInline
          muted
        />
        {!hideControls ? (
          <div className="flex flex-wrap gap-2">
            {!active ? (
              <Button type="button" onClick={() => void start()}>
                {openLabel}
              </Button>
            ) : (
              <>
                <Button type="button" onClick={() => void capture()}>
                  Capture selfie
                </Button>
                <Button type="button" variant="secondary" onClick={stop}>
                  Stop
                </Button>
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  }
);
