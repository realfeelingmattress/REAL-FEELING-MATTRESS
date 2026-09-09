import React, { useState, useRef, useEffect } from "react";
import { IndianRupee, Package, AlertTriangle, Trash2 } from "lucide-react";

const SIZES = [
  { id: "Single", label: "Single", dim: "36×72 in · 3×6 ft" },
  { id: "Double", label: "Double", dim: "48×72 in · 4×6 ft" },
  { id: "Queen", label: "Queen", dim: "60×72 in · 5×6 ft" },
  { id: "King", label: "King", dim: "72×72 in · 6×6 ft" },
];

const THICKNESSES = ["4", "6", "8"];

export function SizePriceGrid({ variants = [], onChange, disabled = false }) {
  const [activeCell, setActiveCell] = useState(null);
  const inputRef = useRef(null);

  const key = (s, t) => `${s}-${t}`;

  const getVariant = (size, thickness) =>
    variants.find((v) => v.size === size && v.thickness === thickness);

  const updateCell = (size, thickness, updates) => {
    const existing = getVariant(size, thickness);
    let next;
    if (existing) {
      const merged = { ...existing, ...updates };
      if (!merged.price || merged.price <= 0) {
        // Remove if price cleared
        next = variants.filter((v) => !(v.size === size && v.thickness === thickness));
      } else {
        next = variants.map((v) =>
          v.size === size && v.thickness === thickness ? merged : v,
        );
      }
    } else {
      if (!updates.price || updates.price <= 0) return;
      next = [...variants, { size, thickness, ...updates }];
    }
    onChange(next);
  };

  const removeCell = (size, thickness) => {
    onChange(variants.filter((v) => !(v.size === size && v.thickness === thickness)));
    setActiveCell(null);
  };

  // Auto-focus input when cell opens
  useEffect(() => {
    if (activeCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [activeCell]);

  const activeVariant = activeCell ? getVariant(...activeCell.split("-")) : null;
  const activeSize = activeCell ? SIZES.find((s) => s.id === activeCell.split("-")[0]) : null;
  const activeThick = activeCell ? activeCell.split("-")[1] : null;

  return (
    <div className="spg">
      <div className="spg-head">
        <Package size={18} />
        <div>
          <strong>Size & Pricing</strong>
          <span>Click any box to set price & stock</span>
        </div>
      </div>

      <div className="spg-grid">
        {/* Corner */}
        <div className="spg-corner">
          <em>Thickness</em>
          <em>Size →</em>
        </div>

        {/* Column headers */}
        {SIZES.map((s) => (
          <div key={s.id} className="spg-col-head">
            <strong>{s.label}</strong>
            <small>{s.dim}</small>
          </div>
        ))}

        {/* Rows */}
        {THICKNESSES.map((t) => (
          <React.Fragment key={t}>
            <div className="spg-row-head">
              <strong>{t}"</strong>
              <small>inch</small>
            </div>

            {SIZES.map((s) => {
              const v = getVariant(s.id, t);
              const has = v && v.price > 0;
              const isActive = activeCell === key(s.id, t);
              const stockNum = v?.stock != null ? Number(v.stock) : null;
              const lowStock = stockNum !== null && stockNum > 0 && stockNum <= 5;
              const outOfStock = stockNum !== null && stockNum === 0;

              return (
                <div
                  key={key(s.id, t)}
                  className={[
                    "spg-cell",
                    has ? "has-price" : "",
                    isActive ? "active" : "",
                    outOfStock ? "out" : "",
                  ].join(" ")}
                  onClick={() => !disabled && setActiveCell(isActive ? null : key(s.id, t))}
                >
                  {isActive ? (
                    /* ── Inline editor ── */
                    <div className="spg-editor" onClick={(e) => e.stopPropagation()}>
                      <div className="spg-editor-price">
                        <IndianRupee size={13} />
                        <input
                          ref={inputRef}
                          type="number"
                          min="1"
                          placeholder="Price"
                          value={v?.price || ""}
                          disabled={disabled}
                          onChange={(e) =>
                            updateCell(s.id, t, {
                              price: e.target.value ? Number(e.target.value) : 0,
                            })
                          }
                        />
                      </div>
                      <div className="spg-editor-row">
                        <div className="spg-editor-mrp">
                          <small>MRP</small>
                          <input
                            type="number"
                            min="1"
                            placeholder="Optional"
                            value={v?.original_price || ""}
                            disabled={disabled}
                            onChange={(e) =>
                              updateCell(s.id, t, {
                                original_price: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          />
                        </div>
                        <div className="spg-editor-stock">
                          <small>Stock</small>
                          <input
                            type="number"
                            min="0"
                            placeholder="∞"
                            value={v?.stock ?? ""}
                            disabled={disabled}
                            onChange={(e) =>
                              updateCell(s.id, t, {
                                stock: e.target.value !== "" ? Number(e.target.value) : null,
                              })
                            }
                          />
                        </div>
                      </div>
                      {lowStock && (
                        <div className="spg-low">
                          <AlertTriangle size={11} /> Only {stockNum} left!
                        </div>
                      )}
                      {has && (
                        <button
                          type="button"
                          className="spg-remove"
                          onClick={() => removeCell(s.id, t)}
                          title="Remove this size"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ) : has ? (
                    /* ── Filled cell ── */
                    <div className="spg-filled">
                      <span className="spg-price">₹{Number(v.price).toLocaleString("en-IN")}</span>
                      {v.original_price && (
                        <span className="spg-mrp">₹{Number(v.original_price).toLocaleString("en-IN")}</span>
                      )}
                      {stockNum !== null && (
                        <span className={`spg-stock ${lowStock ? "low" : outOfStock ? "out" : "ok"}`}>
                          {outOfStock ? "Out" : lowStock ? `${stockNum} left` : `${stockNum} stock`}
                        </span>
                      )}
                    </div>
                  ) : (
                    /* ── Empty cell ── */
                    <div className="spg-empty">
                      <span>+</span>
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <p className="spg-hint">
        💡 Click any cell to edit. Green cells are live on your store. Leave stock empty for unlimited.
      </p>
    </div>
  );
}
