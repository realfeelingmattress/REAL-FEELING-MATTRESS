import React, { useState, useRef, useEffect } from "react";
import { IndianRupee, Package, Minus, Plus, X } from "lucide-react";

const SIZES = [
  { id: "Single", label: "Single", dim: "36×72" },
  { id: "Double", label: "Double", dim: "48×72" },
  { id: "Queen", label: "Queen", dim: "60×72" },
  { id: "King", label: "King", dim: "72×72" },
];

const THICKNESSES = ["4", "6", "8"];

export function SizePriceGrid({ variants = [], onChange, disabled = false }) {
  const [activeCell, setActiveCell] = useState(null);
  const priceRef = useRef(null);

  const key = (s, t) => `${s}-${t}`;
  const getVariant = (size, thickness) =>
    variants.find((v) => v.size === size && v.thickness === thickness);

  const updateCell = (size, thickness, updates) => {
    const existing = getVariant(size, thickness);
    let next;
    if (existing) {
      const merged = { ...existing, ...updates };
      if (!merged.price || merged.price <= 0) {
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

  const adjustStock = (size, thickness, delta) => {
    const v = getVariant(size, thickness);
    const current = v?.stock ?? 0;
    const next = Math.max(0, current + delta);
    updateCell(size, thickness, { stock: next });
  };

  useEffect(() => {
    if (activeCell && priceRef.current) {
      priceRef.current.focus();
      priceRef.current.select();
    }
  }, [activeCell]);

  return (
    <div className="spg">
      <div className="spg-head">
        <Package size={18} />
        <div>
          <strong>Size & Pricing</strong>
          <span>Tap a box to set price & stock</span>
        </div>
      </div>

      <div className="spg-grid">
        <div className="spg-corner">
          <em>Thick ↓</em>
          <em>Size →</em>
        </div>

        {SIZES.map((s) => (
          <div key={s.id} className="spg-col-head">
            <strong>{s.label}</strong>
            <small>{s.dim}"</small>
          </div>
        ))}

        {THICKNESSES.map((t) => (
          <React.Fragment key={t}>
            <div className="spg-row-head">
              <strong>{t}"</strong>
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
                  className={`spg-cell${has ? " has-price" : ""}${isActive ? " active" : ""}${outOfStock ? " out" : ""}`}
                  onClick={() => !disabled && setActiveCell(isActive ? null : key(s.id, t))}
                >
                  {isActive ? (
                    <div className="spg-edit" onClick={(e) => e.stopPropagation()}>
                      {/* Price Input */}
                      <div className="spg-price-input">
                        <span className="spg-rupee">₹</span>
                        <input
                          ref={priceRef}
                          type="number"
                          min="1"
                          placeholder="0"
                          value={v?.price || ""}
                          disabled={disabled}
                          onChange={(e) =>
                            updateCell(s.id, t, {
                              price: e.target.value ? Number(e.target.value) : 0,
                            })
                          }
                        />
                      </div>

                      {/* Stock with +/- buttons */}
                      <div className="spg-stock-input">
                        <button
                          type="button"
                          className="spg-stock-btn"
                          onClick={() => adjustStock(s.id, t, -1)}
                          disabled={disabled}
                        >
                          <Minus size={14} />
                        </button>
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
                        <button
                          type="button"
                          className="spg-stock-btn"
                          onClick={() => adjustStock(s.id, t, 1)}
                          disabled={disabled}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {lowStock && (
                        <span className="spg-low-tag">Only {stockNum} left</span>
                      )}

                      <button
                        type="button"
                        className="spg-close"
                        onClick={() => has ? removeCell(s.id, t) : setActiveCell(null)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : has ? (
                    <div className="spg-filled">
                      <span className="spg-price">₹{Number(v.price).toLocaleString("en-IN")}</span>
                      {v.original_price && (
                        <span className="spg-mrp">₹{Number(v.original_price).toLocaleString("en-IN")}</span>
                      )}
                      {stockNum !== null && (
                        <span className={`spg-stock-badge ${lowStock ? "low" : outOfStock ? "out" : "ok"}`}>
                          {outOfStock ? "Out" : stockNum}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="spg-empty">+</div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <p className="spg-hint">
        💡 Green = live on store. Tap to edit price & stock.
      </p>
    </div>
  );
}
