"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Accessibility,
  ArrowRight,
  Camera,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Eye,
  Focus,
  Footprints,
  ImagePlus,
  Info,
  Layers,
  LoaderCircle,
  PersonStanding,
  RotateCcw,
  ShieldCheck,
  Square,
  Upload,
  X,
} from "lucide-react";
import { CameraDialog } from "./camera-dialog";
import { AnalysisError } from "@/lib/analysis/errors";
import {
  parseAnalysisResult,
  type AnalysisResult,
  type AnalysisStage,
  type MobilityProfile,
} from "@/lib/analysis/contract";
import { prepareUpload } from "@/lib/capture/prepare-upload";
import { readAnalysis } from "@/lib/capture/read-analysis";

type Capture = {
  file: File;
  width: number;
  height: number;
  url: string;
  name: string;
};
type Review = {
  label: string;
  movability: "unknown" | "movable" | "fixed";
  rejected: boolean;
};
type Phase = "idle" | "preparing" | "uploading" | AnalysisStage;
const profiles = [
  { kind: "wheelchair", label: "Wheelchair", icon: Accessibility },
  { kind: "walker", label: "Walker", icon: PersonStanding },
  { kind: "crutches", label: "Crutches", icon: Footprints },
  { kind: "general", label: "General", icon: Eye },
] as const;
const phaseLabels: Record<Phase, string> = {
  idle: "Ready",
  preparing: "Preparing photo on your device",
  uploading: "Sending your prepared photo",
  validating: "Validating and preparing image",
  observing: "Muse Spark is observing the scene",
  segmenting: "SAM is outlining visible objects",
};

export function Workspace({ liveEnabled }: { liveEnabled: boolean }) {
  const [capture, setCapture] = useState<Capture | null>(null);
  const [profile, setProfile] = useState<MobilityProfile["kind"]>("wheelchair");
  const [width, setWidth] = useState("");
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [recordedAt, setRecordedAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedMask, setSelectedMask] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [maskLinks, setMaskLinks] = useState<Record<string, string>>({});
  const [showBoxes, setShowBoxes] = useState(true);
  const [showMasks, setShowMasks] = useState(true);
  const [tab, setTab] = useState<"objects" | "unknowns">("objects");
  const [camera, setCamera] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const cameraButton = useRef<HTMLButtonElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const revision = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const currentCapture = useRef<Capture | null>(null);
  const busy = phase !== "idle";
  const running = busy && phase !== "preparing";
  const widthInvalid =
    width !== "" &&
    (!Number.isFinite(Number(width)) ||
      Number(width) < 1 ||
      Number(width) > 300);

  useEffect(
    () => () => {
      revision.current++;
      abort.current?.abort();
      if (currentCapture.current)
        URL.revokeObjectURL(currentCapture.current.url);
    },
    [],
  );

  function beginRevision() {
    const next = ++revision.current;
    abort.current?.abort();
    abort.current = null;
    if (currentCapture.current) URL.revokeObjectURL(currentCapture.current.url);
    currentCapture.current = null;
    setCapture(null);
    setResult(null);
    setRecordedAt(null);
    setReviews({});
    setMaskLinks({});
    setSelected(null);
    setSelectedMask(null);
    setConsent(false);
    setError("");
    setNotice("");
    setPhase("idle");
    setTab("objects");
    return next;
  }

  async function chooseFile(file: File) {
    const next = beginRevision();
    setPhase("preparing");
    try {
      const prepared = await prepareUpload(file);
      if (revision.current !== next) return;
      const value = {
        ...prepared,
        url: URL.createObjectURL(prepared.file),
        name: file.name,
      };
      currentCapture.current = value;
      setCapture(value);
      setNotice(
        "Photo prepared locally. Review it and give consent before analysis.",
      );
    } catch (failure) {
      if (revision.current === next)
        setError(
          failure instanceof Error
            ? failure.message
            : "This photo could not be prepared.",
        );
    } finally {
      if (revision.current === next) setPhase("idle");
    }
  }

  async function loadExample() {
    const next = beginRevision();
    setPhase("preparing");
    try {
      const [recordResponse, imageResponse] = await Promise.all([
        fetch("/examples/contract-evidence.json", { cache: "no-store" }),
        fetch("/examples/contract-scene.jpg"),
      ]);
      if (!recordResponse.ok || !imageResponse.ok) throw new Error();
      const record = await recordResponse.json();
      const evidence = parseAnalysisResult(record.result);
      if (
        typeof record.recordedAt !== "string" ||
        !Number.isFinite(Date.parse(record.recordedAt))
      )
        throw new Error();
      const blob = await imageResponse.blob();
      if (blob.size > 4 * 1024 * 1024) throw new Error();
      if (crypto.subtle) {
        const hash = await crypto.subtle.digest(
          "SHA-256",
          await blob.arrayBuffer(),
        );
        if (
          [...new Uint8Array(hash)]
            .map((value) => value.toString(16).padStart(2, "0"))
            .join("") !== evidence.image.sha256
        )
          throw new Error();
      }
      if (revision.current !== next) return;
      const value = {
        file: new File([blob], "contract-scene.jpg", { type: "image/jpeg" }),
        url: URL.createObjectURL(blob),
        width: evidence.image.width,
        height: evidence.image.height,
        name: "Original synthetic example",
      };
      currentCapture.current = value;
      setCapture(value);
      setResult(evidence);
      setRecordedAt(record.recordedAt);
      setSelected(evidence.scene.objects[0]?.id ?? null);
      setSelectedMask(evidence.segmentation?.objects[0]?.objectId ?? null);
      setNotice(
        "Recorded Meta example loaded. No API call was made. This diagram is not a real-room evaluation.",
      );
      window.setTimeout(() => resultHeading.current?.focus(), 0);
    } catch {
      if (revision.current === next)
        setError(
          "The recorded example could not be loaded. You can upload a photo instead.",
        );
    } finally {
      if (revision.current === next) setPhase("idle");
    }
  }

  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!capture || !consent || busy || widthInvalid || !liveEnabled) return;
    const next = ++revision.current;
    const controller = new AbortController();
    abort.current = controller;
    setResult(null);
    setRecordedAt(null);
    setReviews({});
    setMaskLinks({});
    setError("");
    setNotice("");
    setPhase("uploading");
    const form = new FormData();
    form.append("image", capture.file);
    form.append("consent", "true");
    form.append(
      "profile",
      JSON.stringify({
        kind: profile,
        measuredWidthCm: width === "" ? null : Number(width),
      }),
    );
    const deadline = window.setTimeout(
      () => controller.abort(new DOMException("Deadline", "TimeoutError")),
      110_000,
    );
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { Accept: "application/x-ndjson" },
        body: form,
        signal: controller.signal,
      });
      const evidence = await readAnalysis(response, (stage) => {
        if (revision.current === next) setPhase(stage);
      });
      if (revision.current !== next) return;
      if (
        evidence.image.width !== capture.width ||
        evidence.image.height !== capture.height
      )
        throw new AnalysisError("INVALID_OUTPUT");
      setResult(evidence);
      setSelected(evidence.scene.objects[0]?.id ?? null);
      setSelectedMask(evidence.segmentation?.objects[0]?.objectId ?? null);
      setTab("objects");
      setNotice(
        "Analysis complete. Review observations and masks before creating a floor plan.",
      );
      window.setTimeout(() => resultHeading.current?.focus(), 0);
    } catch (failure) {
      if (revision.current !== next) return;
      if (controller.signal.aborted)
        setError(
          controller.signal.reason?.name === "TimeoutError"
            ? "Analysis timed out. Your photo is still here; you can retry."
            : "Analysis was cancelled. Your photo is still here.",
        );
      else
        setError(
          failure instanceof AnalysisError
            ? failure.message
            : "The analysis connection was interrupted. Your photo is still here; please retry.",
        );
    } finally {
      window.clearTimeout(deadline);
      if (revision.current === next) {
        setPhase("idle");
        abort.current = null;
      }
    }
  }

  function cancel() {
    revision.current++;
    abort.current?.abort();
    abort.current = null;
    setPhase("idle");
    setNotice("Analysis cancelled. Your photo is still here; you can retry.");
  }
  function closeCamera() {
    setCamera(false);
    window.setTimeout(() => cameraButton.current?.focus(), 0);
  }
  const activeObject = result?.scene.objects.find(
    (object) => object.id === selected,
  );
  const masks = result?.segmentation?.objects ?? [];
  const selectedMaskObject = masks.find(
    (object) => object.objectId === selectedMask,
  );

  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <header className="app-header">
        <a href="#" className="brand" aria-label="AccessLens home">
          <span className="brand-symbol">
            <Focus size={23} />
          </span>
          Access<span>Lens</span>
          <span className="brand-beta">LAB</span>
        </a>
        <nav aria-label="Main navigation">
          <a className="nav-active" href="#workspace">
            Workspace
          </a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <span className="environment-badge">
          <span />
          {liveEnabled ? "Local development" : "Recorded demo"}
        </span>
      </header>
      <main>
        <section className="hero" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">
              <span />A different perspective on everyday spaces
            </p>
            <h1 id="page-title">
              A clearer view.
              <br />
              <span>More room to move.</span>
            </h1>
            <p className="hero-description">
              Look at your space, understand what’s visible, and review the
              evidence. A thoughtful first step toward a more navigable room.
            </p>
          </div>
          <div className="hero-note">
            <span className="note-icon">
              <ScanGlyph />
            </span>
            <p>
              From a single photo
              <br />
              <strong>to evidence you can inspect.</strong>
            </p>
            <span className="meta-credit">
              Powered by Meta models <ArrowRight size={14} />
            </span>
          </div>
        </section>
        <section
          id="workspace"
          className="workspace-section"
          aria-label="Photo analysis workspace"
        >
          <div className="workflow">
            <div className="workflow-step active">
              <span>01</span>
              <strong>Capture your space</strong>
            </div>
            <ChevronRight size={15} />
            <div className={`workflow-step ${result ? "active" : ""}`}>
              <span>02</span>
              <strong>Review the evidence</strong>
            </div>
            <ChevronRight size={15} />
            <div className="workflow-step upcoming">
              <span>03</span>
              <span>
                Build a floor plan <small>Next</small>
              </span>
            </div>
          </div>
          <div className="workbench">
            <form
              className="setup-panel"
              aria-label="Photo and mobility preferences"
              onSubmit={analyze}
            >
              <div className="panel-heading">
                <span className="section-number">01</span>
                <h2>Your space, your needs</h2>
              </div>
              <fieldset disabled={running} className="photo-actions">
                <legend>Choose a photo</legend>
                <p>A clear view of the floor and nearby objects works best.</p>
                <input
                  ref={input}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="visually-hidden"
                  tabIndex={-1}
                  aria-label="Upload a room photo"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void chooseFile(file);
                  }}
                />
                <button
                  type="button"
                  className="button button-secondary upload-button"
                  onClick={() => input.current?.click()}
                >
                  <Upload size={17} />
                  {capture ? "Change photo" : "Upload photo"}
                </button>
                <button
                  ref={cameraButton}
                  type="button"
                  className="button button-quiet"
                  onClick={() => setCamera(true)}
                >
                  <Camera size={17} />
                  Use camera
                </button>
                <span className="field-hint">
                  JPEG, PNG, WebP · up to 20 MB
                </span>
              </fieldset>
              <fieldset disabled={running} className="profile-fieldset">
                <legend>What do you move with?</legend>
                <p>Your preference stays separate from visual observations.</p>
                <div className="profile-options">
                  {profiles.map(({ kind, label, icon: Icon }) => (
                    <label
                      key={kind}
                      className={`profile-option ${profile === kind ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="mobility"
                        value={kind}
                        checked={profile === kind}
                        onChange={() => setProfile(kind)}
                      />
                      <Icon size={20} />
                      <span>{label}</span>
                      {profile === kind && (
                        <Check size={12} className="profile-check" />
                      )}
                    </label>
                  ))}
                </div>
                <label className="width-label" htmlFor="device-width">
                  Measured device width <span>optional</span>
                </label>
                <div className="width-field">
                  <input
                    id="device-width"
                    type="number"
                    min="1"
                    max="300"
                    step="any"
                    placeholder="Your measurement"
                    value={width}
                    onChange={(event) => setWidth(event.target.value)}
                    aria-describedby="width-help width-error"
                    aria-invalid={widthInvalid}
                  />
                  <span>cm</span>
                </div>
                {widthInvalid && (
                  <p id="width-error" className="field-error" role="alert">
                    Enter a width from 1 to 300 cm, or leave this optional field
                    blank.
                  </p>
                )}
                <p id="width-help" className="field-hint">
                  For a future floor plan. Never estimated from your photo.
                </p>
              </fieldset>
              <div className="consent-area">
                <ShieldCheck size={18} />
                <div>
                  <strong>You control your photo</strong>
                  <p>
                    Prepared on your device. Sent to Meta only when you choose
                    Analyze. This app does not save your photo.
                  </p>
                </div>
              </div>
              <label className="consent-checkbox">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  disabled={running}
                />
                <span>
                  I have permission to use this image and agree to send it to
                  Meta for analysis.
                </span>
              </label>
              <button
                type="submit"
                className="button button-primary analyze-button"
                disabled={
                  !capture || !consent || busy || widthInvalid || !liveEnabled
                }
              >
                {running ? (
                  <LoaderCircle size={18} className="spin" />
                ) : (
                  <Focus size={18} />
                )}{" "}
                {running
                  ? "Analyzing your space…"
                  : result
                    ? "Analyze again"
                    : "Analyze photo"}
                {!running && <ArrowRight size={17} />}
              </button>
              {running && (
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={cancel}
                >
                  Cancel analysis
                </button>
              )}
              {!liveEnabled && (
                <p className="field-hint">
                  Live analysis is enabled in local development. You can explore
                  the recorded example here.
                </p>
              )}
              <div className="example-link">
                <span>Just exploring?</span>
                <button
                  type="button"
                  onClick={() => void loadExample()}
                  disabled={busy}
                >
                  Try the recorded example <ArrowRight size={13} />
                </button>
                <small>Original diagram · no API call</small>
              </div>
            </form>
            <div className="evidence-panel">
              <div className="evidence-heading">
                <div>
                  <p className="eyebrow">YOUR VISUAL WORKSPACE</p>
                  <h2 ref={resultHeading} tabIndex={-1}>
                    {result
                      ? "Let’s look a little closer."
                      : capture
                        ? "Ready for a closer look."
                        : "Start with a new perspective."}
                  </h2>
                </div>
                {capture && (
                  <button
                    type="button"
                    className="icon-button reset-button"
                    onClick={() => beginRevision()}
                    aria-label="Reset workspace"
                  >
                    <RotateCcw size={17} />
                  </button>
                )}
              </div>
              {error && (
                <div role="alert" className="notice notice-error">
                  <CircleHelp size={18} />
                  <span>{error}</span>
                  <button
                    type="button"
                    aria-label="Dismiss error"
                    onClick={() => setError("")}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className="visually-hidden" role="status" aria-live="polite">
                {busy ? phaseLabels[phase] : notice}
              </div>
              {notice && !busy && <p className="session-note">{notice}</p>}
              {busy && (
                <div className="analysis-progress" role="status">
                  <LoaderCircle size={17} className="spin" />
                  <span>{phaseLabels[phase]}</span>
                  <small>
                    {phase === "preparing"
                      ? "Local processing"
                      : "Live Meta analysis"}
                  </small>
                </div>
              )}
              {recordedAt && (
                <div className="recorded-banner">
                  <Eye size={16} />
                  <div>
                    <strong>Recorded Meta example · no live API call</strong>
                    <span>
                      Original synthetic diagram. Captured{" "}
                      {new Date(recordedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      . Not a real-room evaluation.
                    </span>
                  </div>
                </div>
              )}
              {!capture ? (
                <div
                  className={`empty-stage ${dragging ? "dragging" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    const file = event.dataTransfer.files[0];
                    if (file) void chooseFile(file);
                  }}
                >
                  <div className="scene-illustration" aria-hidden="true">
                    <div className="illustration-grid" />
                    <span className="corner corner-tl" />
                    <span className="corner corner-tr" />
                    <span className="corner corner-bl" />
                    <span className="corner corner-br" />
                    <div className="illustration-lens">
                      <ImagePlus size={38} strokeWidth={1.3} />
                    </div>
                    <span className="floating-label">
                      <span />
                      Your space goes here
                    </span>
                  </div>
                  <h3>A photo is a good place to start.</h3>
                  <p>
                    Upload a room, hallway, or everyday space.
                    <br />
                    We’ll help you inspect what’s visible.
                  </p>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => input.current?.click()}
                  >
                    <Upload size={16} />
                    Choose a photo
                  </button>
                  <span className="drop-hint">or drop an image here</span>
                </div>
              ) : (
                <>
                  <div className="image-toolbar">
                    <div className="image-name">
                      <span className="file-indicator" />
                      {capture.name}
                      <span>
                        {capture.width} × {capture.height}
                      </span>
                    </div>
                    <div
                      className="overlay-toggles"
                      aria-label="Visual evidence layers"
                    >
                      <button
                        type="button"
                        aria-pressed={showBoxes}
                        onClick={() => setShowBoxes(!showBoxes)}
                        disabled={!result}
                      >
                        <Square size={14} />
                        Boxes
                      </button>
                      <button
                        type="button"
                        aria-pressed={showMasks}
                        onClick={() => setShowMasks(!showMasks)}
                        disabled={!masks.length}
                      >
                        <Layers size={14} />
                        Masks
                      </button>
                    </div>
                  </div>
                  <div className="image-stage">
                    <div
                      className="image-surface"
                      style={{
                        aspectRatio: `${capture.width}/${capture.height}`,
                      }}
                    >
                      <Image
                        src={capture.url}
                        alt={
                          result
                            ? "Analyzed scene. Use the observation list and mask controls below to inspect the same evidence."
                            : "Your locally prepared photo, ready for review before sending."
                        }
                        width={capture.width}
                        height={capture.height}
                        unoptimized
                        draggable={false}
                      />
                      {result && (
                        <svg
                          className="evidence-overlay"
                          viewBox={`0 0 ${capture.width} ${capture.height}`}
                          aria-hidden="true"
                        >
                          {showMasks &&
                            masks.map((mask) => (
                              <path
                                key={mask.objectId}
                                d={mask.svgPath}
                                transform={`translate(${mask.bounds.left + 0.5} ${mask.bounds.top + 0.5})`}
                                className={
                                  selectedMask === mask.objectId
                                    ? "mask-shape mask-selected"
                                    : "mask-shape"
                                }
                                vectorEffect="non-scaling-stroke"
                                fillRule="evenodd"
                              />
                            ))}
                          {showBoxes &&
                            result.scene.objects.map((object, index) =>
                              object.box && !reviews[object.id]?.rejected ? (
                                <g
                                  key={object.id}
                                  className={
                                    selected === object.id
                                      ? "observation-shape selected"
                                      : "observation-shape"
                                  }
                                >
                                  <rect
                                    x={object.box.xMin * capture.width}
                                    y={object.box.yMin * capture.height}
                                    width={
                                      (object.box.xMax - object.box.xMin) *
                                      capture.width
                                    }
                                    height={
                                      (object.box.yMax - object.box.yMin) *
                                      capture.height
                                    }
                                    vectorEffect="non-scaling-stroke"
                                  />
                                  <text
                                    x={object.box.xMin * capture.width + 7}
                                    y={object.box.yMin * capture.height + 21}
                                    fontSize={Math.max(15, capture.width / 45)}
                                  >
                                    {String(index + 1).padStart(2, "0")}
                                  </text>
                                </g>
                              ) : null,
                            )}
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="image-caption">
                    <span>
                      <span
                        className={`status-dot ${result ? "complete" : ""}`}
                      />
                      {result
                        ? `${result.scene.objects.length} observations · ${masks.length} pixel ${masks.length === 1 ? "mask" : "masks"}`
                        : "Prepared locally · not sent yet"}
                    </span>
                    <span>
                      {result
                        ? recordedAt
                          ? "Recorded evidence"
                          : "Live Meta evidence"
                        : "Only you can see this preview"}
                    </span>
                  </div>
                </>
              )}
              {result ? (
                <div className="review-area">
                  <div className="review-summary">
                    <div className="summary-mark">
                      <Focus size={19} />
                    </div>
                    <div>
                      <p className="eyebrow">WHAT IS VISIBLE</p>
                      <p>{result.scene.summary}</p>
                    </div>
                  </div>
                  <div className="review-columns">
                    <section
                      className="observation-review"
                      aria-label="Review observations"
                    >
                      <div className="review-tabs">
                        <button
                          type="button"
                          aria-pressed={tab === "objects"}
                          onClick={() => setTab("objects")}
                        >
                          Observations{" "}
                          <span>{result.scene.objects.length}</span>
                        </button>
                        <button
                          type="button"
                          aria-pressed={tab === "unknowns"}
                          onClick={() => setTab("unknowns")}
                        >
                          Unknowns <span>{result.scene.unknowns.length}</span>
                        </button>
                      </div>
                      {tab === "unknowns" ? (
                        <ul className="unknown-list">
                          {result.scene.unknowns.map((unknown, index) => (
                            <li key={index}>
                              <CircleHelp size={16} />
                              {unknown}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <>
                          <div className="object-list">
                            {result.scene.objects.map((object, index) => (
                              <button
                                type="button"
                                key={object.id}
                                aria-pressed={selected === object.id}
                                className={`object-button ${selected === object.id ? "selected" : ""} ${reviews[object.id]?.rejected ? "rejected" : ""}`}
                                onClick={() => setSelected(object.id)}
                              >
                                <span className="object-number">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <span>
                                  {reviews[object.id]?.label ?? object.label}
                                  <small>
                                    {reviews[object.id]
                                      ? reviews[object.id].rejected
                                        ? "Marked not present"
                                        : "Reviewed by you"
                                      : object.box
                                        ? "Approximate visual observation"
                                        : "No image box available"}
                                  </small>
                                </span>
                                {reviews[object.id] ? (
                                  <Check size={16} />
                                ) : (
                                  <ChevronRight size={16} />
                                )}
                              </button>
                            ))}
                          </div>
                          {!result.scene.objects.length && (
                            <p className="empty-note">
                              No objects were identified. That does not
                              establish clear floor.
                            </p>
                          )}
                          {activeObject && (
                            <ObjectReview
                              key={`${result.provenance.responseId}-${activeObject.id}-${JSON.stringify(reviews[activeObject.id])}`}
                              object={activeObject}
                              review={reviews[activeObject.id]}
                              onSave={(review) => {
                                setReviews((previous) => ({
                                  ...previous,
                                  [activeObject.id]: review,
                                }));
                                if (review.rejected)
                                  setMaskLinks((previous) =>
                                    Object.fromEntries(
                                      Object.entries(previous).filter(
                                        ([, id]) => id !== activeObject.id,
                                      ),
                                    ),
                                  );
                                setNotice(
                                  "Your review was saved locally for this session.",
                                );
                              }}
                              onUndo={() =>
                                setReviews((previous) => {
                                  const next = { ...previous };
                                  delete next[activeObject.id];
                                  return next;
                                })
                              }
                            />
                          )}
                        </>
                      )}
                      <div className="review-count">
                        <CheckCheck size={15} />
                        {Object.keys(reviews).length} of{" "}
                        {result.scene.objects.length} observations reviewed
                      </div>
                    </section>
                    <section
                      className="mask-review"
                      aria-labelledby="mask-heading"
                    >
                      <h3 id="mask-heading">
                        <Layers size={17} />
                        Pixel-level evidence
                      </h3>
                      {result.segmentation ? (
                        <>
                          <p>
                            SAM query:{" "}
                            <strong>“{result.segmentation.concept}”</strong>
                          </p>
                          <p className="field-hint">
                            A concept can match several objects. A mask is a
                            visible silhouette, not a floor footprint.
                          </p>
                          <div className="mask-list">
                            {masks.map((mask, index) => (
                              <button
                                type="button"
                                key={mask.objectId}
                                aria-pressed={selectedMask === mask.objectId}
                                className={
                                  selectedMask === mask.objectId
                                    ? "selected"
                                    : ""
                                }
                                onClick={() => setSelectedMask(mask.objectId)}
                              >
                                <span className="mask-swatch" />
                                Mask {index + 1}
                                {maskLinks[mask.objectId] && (
                                  <Check size={13} />
                                )}
                              </button>
                            ))}
                          </div>
                          {!masks.length && (
                            <div className="empty-note">
                              No matches for this query. Unseen or missing
                              objects remain unknown.
                            </div>
                          )}
                          {selectedMaskObject && (
                            <>
                              <label
                                htmlFor="mask-link"
                                className="field-label"
                              >
                                Which observation does this mask match?
                              </label>
                              <select
                                id="mask-link"
                                value={
                                  maskLinks[selectedMaskObject.objectId] ?? ""
                                }
                                onChange={(event) =>
                                  setMaskLinks((previous) => ({
                                    ...previous,
                                    [selectedMaskObject.objectId]:
                                      event.target.value,
                                  }))
                                }
                              >
                                <option value="">Unconfirmed match</option>
                                {result.scene.objects
                                  .filter(
                                    (object) => !reviews[object.id]?.rejected,
                                  )
                                  .map((object) => (
                                    <option key={object.id} value={object.id}>
                                      {reviews[object.id]?.label ??
                                        object.label}
                                    </option>
                                  ))}
                              </select>
                              <p className="field-hint">
                                This association is your input. Original model
                                evidence stays unchanged.
                              </p>
                            </>
                          )}
                        </>
                      ) : (
                        <p className="empty-note">
                          There was no observation to query. Missing
                          segmentation does not establish clear floor.
                        </p>
                      )}
                      <details className="provenance">
                        <summary>Model and run details</summary>
                        <dl>
                          <dt>Scene observations</dt>
                          <dd>
                            {result.provenance.resolvedModel ??
                              result.provenance.requestedModel}
                          </dd>
                          <dt>Pixel segmentation</dt>
                          <dd>
                            {result.segmentation?.provenance.resolvedModel ??
                              "Not run"}
                          </dd>
                          <dt>Stage time</dt>
                          <dd>
                            {(result.provenance.elapsedMs / 1000).toFixed(1)}s
                            observations ·{" "}
                            {result.segmentation
                              ? `${(result.segmentation.provenance.elapsedMs / 1000).toFixed(1)}s masks`
                              : "no masks"}
                          </dd>
                          <dt>Measurements</dt>
                          <dd>Not inferred from image</dd>
                          <dt>Your inputs for this run</dt>
                          <dd>
                            {
                              profiles.find(
                                (option) =>
                                  option.kind === result.mobilityProfile.kind,
                              )?.label
                            }
                            ;{" "}
                            {result.mobilityProfile.measuredWidthCm === null
                              ? "no device measurement supplied"
                              : `${result.mobilityProfile.measuredWidthCm} cm supplied by you`}
                          </dd>
                        </dl>
                      </details>
                    </section>
                  </div>
                </div>
              ) : (
                <div className="evidence-explainer">
                  <span>
                    <Square size={16} />
                    Locate visible objects
                  </span>
                  <span>
                    <Layers size={16} />
                    Inspect pixel masks
                  </span>
                  <span>
                    <CheckCheck size={16} />
                    Correct the evidence
                  </span>
                </div>
              )}
              <div className="limits-note">
                <Info size={17} />
                <p>
                  {result
                    ? "Visual evidence is a starting point. Depth, hidden floor, physical clearance, and safe passage are not established by this image. A reviewed floor plan is still needed."
                    : "A photo can show visible objects. Measurements and a reviewed floor plan are needed to explore physical navigation."}
                </p>
              </div>
            </div>
          </div>
        </section>
        <section id="how-it-works" className="how-section">
          <div>
            <p className="eyebrow">EVIDENCE BEFORE ASSUMPTIONS</p>
            <h2>
              A little context.
              <br />A more useful perspective.
            </h2>
          </div>
          <div className="how-items">
            <article>
              <span>01</span>
              <h3>See what’s visible</h3>
              <p>
                Muse Spark identifies observations. SAM provides pixel masks for
                one observed concept.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>Keep yourself in the loop</h3>
              <p>
                Correct an observation, confirm a mask match, and keep unknowns
                in view.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>Make room for better questions</h3>
              <p>
                Ask what needs measuring before a proposed change can be
                modeled. Planning and simulation are next.
              </p>
            </article>
          </div>
        </section>
      </main>
      <footer className="app-footer">
        <span className="footer-brand">
          <Focus size={17} />
          AccessLens
        </span>
        <span>Built with Muse Spark + SAM 3.1</span>
        <span>Spatial evidence. Human judgment.</span>
      </footer>
      {camera && (
        <CameraDialog
          onClose={closeCamera}
          onCapture={(file) => {
            closeCamera();
            void chooseFile(file);
          }}
        />
      )}
    </>
  );
}

function ObjectReview({
  object,
  review,
  onSave,
  onUndo,
}: {
  object: AnalysisResult["scene"]["objects"][number];
  review?: Review;
  onSave: (review: Review) => void;
  onUndo: () => void;
}) {
  const [label, setLabel] = useState(review?.label ?? object.label);
  const [movability, setMovability] = useState<Review["movability"]>(
    review?.movability ?? "unknown",
  );
  return (
    <div className="object-editor">
      <p className="evidence-quote">
        <Eye size={15} />
        {object.visibleEvidence}
      </p>
      <label className="field-label" htmlFor={`label-${object.id}`}>
        Your label
      </label>
      <input
        id={`label-${object.id}`}
        value={label}
        maxLength={80}
        onChange={(event) => setLabel(event.target.value)}
      />
      <label className="field-label" htmlFor={`movable-${object.id}`}>
        Can this object be moved?
      </label>
      <select
        id={`movable-${object.id}`}
        value={movability}
        onChange={(event) =>
          setMovability(event.target.value as Review["movability"])
        }
      >
        <option value="unknown">Not sure / not reviewed</option>
        <option value="movable">Yes, movable</option>
        <option value="fixed">No, fixed</option>
      </select>
      <p className="field-hint">
        Your confirmation replaces the model’s suggestion for review. It does
        not reveal hidden floor.
      </p>
      <div className="object-editor-actions">
        <button
          type="button"
          className="button button-small"
          disabled={!label.trim()}
          onClick={() =>
            onSave({ label: label.trim(), movability, rejected: false })
          }
        >
          <Check size={14} />
          Confirm observation
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            onSave({
              label: label.trim() || object.label,
              movability: "unknown",
              rejected: true,
            })
          }
        >
          Not present
        </button>
        {review && (
          <button type="button" className="text-button" onClick={onUndo}>
            Undo review
          </button>
        )}
      </div>
    </div>
  );
}

function ScanGlyph() {
  return (
    <svg
      viewBox="0 0 64 64"
      width="64"
      height="64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 22V7h15M42 7h15v15M57 42v15H42M22 57H7V42"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m19 38 13 7 13-7V23l-13-7-13 7v15Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="m19 23 13 8 13-8M32 31v14"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="32" cy="31" r="3" fill="currentColor" />
    </svg>
  );
}
