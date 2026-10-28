"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

export function CameraDialog({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const alive = useRef(true);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    alive.current = true;
    dialog.current?.showModal();
    let active = true;
    let stream: MediaStream | undefined;
    const timer = window.setTimeout(() => {
      if (active && !stream) {
        active = false;
        setError(
          "Camera permission is still pending. Close this window and upload a photo instead.",
        );
      }
    }, 15_000);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      window.clearTimeout(timer);
      queueMicrotask(() =>
        setError(
          "Camera access needs a secure connection and a supported browser. Upload a photo instead.",
        ),
      );
    } else {
      void navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
        })
        .then((media) => {
          if (!active) {
            media.getTracks().forEach((track) => track.stop());
            return;
          }
          stream = media;
          if (video.current) video.current.srcObject = media;
          window.clearTimeout(timer);
        })
        .catch(() => {
          if (active)
            setError(
              "Camera access was denied or no camera is available. You can still upload a photo.",
            );
          window.clearTimeout(timer);
        });
    }
    return () => {
      active = false;
      alive.current = false;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function capture() {
    const source = video.current;
    if (
      !source ||
      source.readyState < 2 ||
      source.videoWidth < 64 ||
      source.videoHeight < 64
    ) {
      setError(
        "The camera image is not ready. Close this window and try again, or upload a photo.",
      );
      return;
    }
    setReady(false);
    const canvas = document.createElement("canvas");
    const ratio = Math.min(
      1,
      1600 / Math.max(source.videoWidth, source.videoHeight),
    );
    canvas.width = Math.round(source.videoWidth * ratio);
    canvas.height = Math.round(source.videoHeight * ratio);
    canvas
      .getContext("2d")
      ?.drawImage(source, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!alive.current) return;
        if (blob)
          onCapture(
            new File([blob], "camera-photo.jpg", { type: "image/jpeg" }),
          );
        else
          setError(
            "The photo could not be captured. Please try uploading instead.",
          );
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <dialog
      ref={dialog}
      className="camera-dialog"
      aria-labelledby="camera-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id="camera-title">Capture your space</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Close camera"
        >
          <X size={20} />
        </button>
      </div>
      <p>
        The camera stays on your device. Nothing is sent until you review the
        photo and choose Analyze.
      </p>
      {error ? (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      ) : (
        <div className="camera-video">
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            onLoadedData={() => setReady(true)}
            aria-label="Live camera preview"
          />
          {!ready && <span>Waiting for camera permission…</span>}
        </div>
      )}
      <div className="dialog-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={capture}
          disabled={!ready || Boolean(error)}
        >
          <Camera size={18} /> Take photo
        </button>
      </div>
    </dialog>
  );
}
