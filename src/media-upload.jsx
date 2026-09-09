import React, { useState } from "react";
import { Upload } from "lucide-react";
import { api, useStore } from "./core";
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
