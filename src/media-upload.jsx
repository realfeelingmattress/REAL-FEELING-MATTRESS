import React, { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, ZoomIn, Image as ImageIcon, Clipboard } from "lucide-react";
import { api, useStore } from "./core";

/* ── Single image upload (original component, kept for other sections) ── */
export function MediaUpload({
  label,
  value,
  purpose,
  entityId,
  assetName,
  onChange,
  onBusy,
  disabled = false,
}) {
  const { notify } = useStore(),
    [busy, setBusy] = useState(false);
  return (
    <div className="media-upload">
      <div className="media-upload-preview">
        {value && <img src={value} alt={label} />}
      </div>
      <div>
        <strong>{label}</strong>
        <p>
          JPEG, PNG or WebP · up to 3 MB / 20 megapixels. Images are resized and
          stripped of metadata on the server.
        </p>
        <label className="btn outline">
          <Upload size={16} />
          {busy ? "Uploading…" : "Upload image"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || disabled}
            aria-label={"Upload " + label}
            onChange={async (e) => {
              const input = e.currentTarget,
                file = input.files?.[0];
              if (!file) return;
              if (file.size > 3 * 1024 * 1024) {
                notify(
                  "Choose an image smaller than 3 MB. Compress the photo first.",
                  "error",
                );
                input.value = "";
                return;
              }
              setBusy(true);
              onBusy?.(true);
              try {
                const body = new FormData();
                body.set("image", file);
                body.set("purpose", purpose);
                if (entityId) body.set("entityId", entityId);
                const currentName =
                  typeof assetName === "function"
                    ? assetName(input)
                    : assetName;
                if (currentName) body.set("assetName", currentName);
                const r = await api("/admin/upload", { method: "POST", body });
                onChange(r);
                notify("Image uploaded. Save your changes to publish it.");
              } catch (e) {
                notify(e.message, "error");
              } finally {
                setBusy(false);
                onBusy?.(false);
                input.value = "";
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}

/* ── Helpers ── */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

/* ── Multi-image upload with drag & drop, paste, thumbnails ── */
export function MultiImageUpload({
  images = [],
  mainImage,
  maxImages = 15,
  purpose,
  entityId,
  assetName,
  onChange,       // (newImages: string[], newMainImage: string) => void
  onBusy,
  disabled = false,
}) {
  const { notify } = useStore();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const canAddMore = images.length < maxImages;
  const busy = uploading || disabled;

  /* Upload one file, returns the resulting URL or null */
  const uploadOne = useCallback(
    async (file) => {
      if (file.size > 3 * 1024 * 1024) {
        notify(
          `"${file.name}" is ${formatBytes(file.size)} — too big. Max 3 MB.`,
          "error",
        );
        return null;
      }
      const body = new FormData();
      body.set("image", file);
      body.set("purpose", purpose);
      if (entityId) body.set("entityId", entityId);
      const name = typeof assetName === "function" ? assetName({}) : assetName;
      if (name) body.set("assetName", name);
      const r = await api("/admin/upload", { method: "POST", body });
      return r.url;
    },
    [purpose, entityId, assetName, notify],
  );

  /* Upload multiple files sequentially */
  const uploadFiles = useCallback(
    async (files) => {
      const validFiles = Array.from(files).filter((f) =>
        ["image/jpeg", "image/png", "image/webp"].includes(f.type),
      );
      if (!validFiles.length) {
        notify("Only JPEG, PNG or WebP images are accepted.", "error");
        return;
      }
      const slotsLeft = maxImages - images.length;
      const toUpload = validFiles.slice(0, slotsLeft);
      if (validFiles.length > slotsLeft) {
        notify(
          `Only ${slotsLeft} more image${slotsLeft === 1 ? "" : "s"} allowed. ${validFiles.length - slotsLeft} skipped.`,
          "error",
        );
      }
      if (!toUpload.length) return;

      setUploading(true);
      onBusy?.(true);
      const newUrls = [];
      try {
        for (const file of toUpload) {
          const url = await uploadOne(file);
          if (url) newUrls.push(url);
        }
      } catch (e) {
        notify(e.message, "error");
      }
      if (newUrls.length) {
        const updated = [...images, ...newUrls];
        const newMain = mainImage || newUrls[0];
        onChange(updated, newMain);
        notify(
          `${newUrls.length} image${newUrls.length > 1 ? "s" : ""} uploaded. Save to publish.`,
        );
      }
      setUploading(false);
      onBusy?.(false);
    },
    [images, mainImage, maxImages, uploadOne, onChange, onBusy, notify],
  );

  /* Handle file input change */
  const handleFileChange = (e) => {
    const files = e.currentTarget.files;
    if (files?.length) uploadFiles(files);
    e.currentTarget.value = "";
  };

  /* Drag & drop */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy && canAddMore) setDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (busy || !canAddMore) return;
    const files = e.dataTransfer?.files;
    if (files?.length) uploadFiles(files);
  };

  /* Paste from clipboard */
  useEffect(() => {
    const handler = (e) => {
      // Only capture paste when drop zone or its parent form is focused
      const active = document.activeElement;
      if (
        active?.tagName === "INPUT" ||
        active?.tagName === "TEXTAREA" ||
        active?.isContentEditable
      )
        return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length) {
        e.preventDefault();
        if (!busy && canAddMore) uploadFiles(imageFiles);
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [busy, canAddMore, uploadFiles]);

  /* Remove an image */
  const removeImage = (url) => {
    const updated = images.filter((u) => u !== url);
    const newMain = mainImage === url ? updated[0] || "" : mainImage;
    onChange(updated, newMain);
  };

  /* Set as main */
  const setMain = (url) => {
    const reordered = [url, ...images.filter((u) => u !== url)];
    onChange(reordered, url);
  };

  return (
    <div className="multi-image-upload">
      {/* Header */}
      <div className="multi-image-header">
        <strong>
          <ImageIcon size={16} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: 6 }} />
          Product Images
        </strong>
        <span className="multi-image-count">
          {images.length} / {maxImages}
        </span>
      </div>

      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div className="multi-image-grid">
          {images.map((url, i) => (
            <div
              key={url + i}
              className={`multi-image-thumb ${url === mainImage ? "is-main" : ""}`}
            >
              <img
                src={url}
                alt={`Product image ${i + 1}`}
                onClick={() => setLightbox(url)}
              />
              {url === mainImage && <span className="main-badge">Main</span>}
              <div className="thumb-actions">
                {url !== mainImage && (
                  <button
                    type="button"
                    title="Set as main image"
                    onClick={() => setMain(url)}
                  >
                    ★
                  </button>
                )}
                <button
                  type="button"
                  title="View full size"
                  onClick={() => setLightbox(url)}
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  title="Remove image"
                  className="remove-btn"
                  onClick={() => removeImage(url)}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / upload area */}
      {canAddMore && (
        <div
          ref={dropZoneRef}
          className={`multi-image-dropzone ${dragOver ? "drag-over" : ""}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="dropzone-content">
              <div className="upload-spinner" />
              <span>Uploading…</span>
            </div>
          ) : (
            <div className="dropzone-content">
              <Upload size={28} />
              <span className="dropzone-title">
                Click, drag & drop, or paste images here
              </span>
              <span className="dropzone-hint">
                JPEG, PNG or WebP · max 3 MB each · up to {maxImages} images
              </span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Tip */}
      <p className="multi-image-tip">
        <Clipboard size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
        Tip: Press <kbd>Ctrl</kbd>+<kbd>V</kbd> to paste an image from clipboard.
        Click any thumbnail to view full size. ★ marks the main (cover) image.
      </p>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox} alt="Full size preview" />
            <button
              className="lightbox-close"
              onClick={() => setLightbox(null)}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
