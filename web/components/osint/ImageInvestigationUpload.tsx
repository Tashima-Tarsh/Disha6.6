"use client";
import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import styles from "@/app/investigate/investigate.module.css";
export function ImageInvestigationUpload({ busy, onUpload }: { busy: boolean; onUpload: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  return <div className={styles.upload}><input ref={input} type="file" accept="image/jpeg,image/png" hidden disabled={busy} aria-label="Upload investigation image" onChange={event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) { setError("Choose a JPG or PNG up to 5 MB."); return; }
    setError(""); onUpload(file);
  }} /><button type="button" onClick={() => input.current?.click()} disabled={busy}><ImagePlus size={17} /> Investigate an image</button><span>JPG / PNG · 5 MB · temporary upload</span><small>Configured image search may send the image to Google Cloud Vision for public web matches.</small>{error && <p role="alert">{error}</p>}</div>;
}
