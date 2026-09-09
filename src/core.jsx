import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { Link, useLocation } from "react-router-dom";
import {
  X,
  Check,
  ArrowRight,
  Minus,
  Plus,
  Star,
  Heart,
  ShoppingBag,
  LoaderCircle,
  AlertCircle,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
} from "lucide-react";
export const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
export const date = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
import { api } from "./api";
export { api };
function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage-restricted previews can still use the app in memory. */
  }
}
const Ctx = createContext(null);
const stored = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
export function Provider({ children }) {
  const [boot, setBoot] = useState(null),
    [products, setProducts] = useState([]),
    [error, setError] = useState(""),
    [cart, setCart] = useState(() => stored("nocte-cart", [])),
    [wishlist, setWishlist] = useState(() => stored("nocte-wishlist", [])),
    [compare, setCompare] = useState(() => stored("nocte-compare", [])),
    [theme, setTheme] = useState(() => stored("nocte-theme", "light")),
    [toast, setToast] = useState(null),
    [cartOpen, setCartOpen] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [authRequest, setAuthRequest] = useState(null);
  const timer = useRef();
  async function refresh() {
    try {
      const b = await api("/bootstrap");
      const p = await api("/products");
      setBoot(b);
      setProducts(p);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    refresh();
    const onExpired = () =>
      setBoot((old) => (old ? { ...old, user: null, permissions: [] } : old));
    window.addEventListener("nocte-session-expired", onExpired);
    return () => window.removeEventListener("nocte-session-expired", onExpired);
  }, []);
  useEffect(() => {
    saveLocal("nocte-cart", cart);
  }, [cart]);
  useEffect(() => {
    saveLocal("nocte-wishlist", wishlist);
  }, [wishlist]);
  useEffect(() => {
    saveLocal("nocte-compare", compare);
  }, [compare]);
  useEffect(() => {
    saveLocal("nocte-theme", theme);
    const m = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === "system" ? (m.matches ? "dark" : "light") : theme);
    apply();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    if (boot?.settings?.primaryColor)
      document.documentElement.style.setProperty(
        "--brand",
        boot.settings.primaryColor,
      );
  }, [boot?.settings?.primaryColor]);
  function notify(message, type = "success") {
    clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), 4500);
  }
  function requestCustomerLogin(next = "/account") {
    setSearchOpen(false);
    setCartOpen(false);
    setAuthRequest({ next });
  }
  function closeCustomerLogin() {
    setAuthRequest(null);
  }
  function finishCustomerLogin() {
    if (authRequest?.product)
      commitCart(
        authRequest.product,
        authRequest.variant,
        authRequest.quantity,
      );
    setAuthRequest(null);
  }
  function addCart(p, variant = {}, quantity = 1, next = null) {
    if (!p.stock)
      return notify("This product is currently out of stock.", "error");
    if (boot?.user?.role !== "customer") {
      setCartOpen(false);
      setSearchOpen(false);
      setAuthRequest({ product: p, variant, quantity, next });
      return;
    }
    commitCart(p, variant, quantity);
    return true;
  }
  function commitCart(p, variant = {}, quantity = 1) {
    const item = {
      productId: p.id,
      name: p.name,
      image: p.image,
      price: variant.price || p.price,
      size:
        variant.size ||
        (["Bedding", "Accessories"].includes(p.category)
          ? "Standard"
          : "Queen"),
      thickness: variant.thickness || p.thickness,
      firmness: variant.firmness || p.firmness,
      quantity,
    };
    if (!p.stock)
      return notify("This product is currently out of stock.", "error");
    const key = (i) => [i.productId, i.size, i.thickness, i.firmness].join("-");
    setCart((old) => {
      const exists = old.find((i) => key(i) === key(item));
      return exists
        ? old.map((i) =>
            key(i) === key(item)
              ? { ...i, quantity: Math.min(10, i.quantity + quantity) }
              : i,
          )
        : [...old, item];
    });
    notify(`${p.name} added to your bag`);
    setCartOpen(true);
  }
  function toggleWish(id) {
    const next = wishlist.includes(id)
      ? wishlist.filter((x) => x !== id)
      : [...wishlist, id];
    setWishlist(next);
    if (boot?.user)
      api("/wishlist", { method: "POST", body: { ids: next } }).catch((e) =>
        notify(e.message, "error"),
      );
    notify(
      next.includes(id) ? "Saved to your wishlist" : "Removed from wishlist",
    );
  }
  function toggleCompare(id) {
    if (compare.includes(id)) setCompare(compare.filter((x) => x !== id));
    else if (compare.length === 3)
      notify("Compare up to 3 mattresses. Remove one to add another.", "error");
    else {
      setCompare([...compare, id]);
      notify("Added to comparison");
    }
  }
  async function acceptAuth(b) {
    setBoot((old) => ({ ...old, ...b }));
    if (b.user.role === "customer") {
      try {
        const saved = await api("/wishlist");
        const merged = [...new Set([...wishlist, ...saved])];
        setWishlist(merged);
        await api("/wishlist", { method: "POST", body: { ids: merged } });
      } catch (e) {
        notify(
          "Signed in. Your saved favourites could not be synced yet.",
          "error",
        );
      }
    }
    return b.user;
  }
  async function login(data, register = false, owner = false) {
    const b = await api(
      register ? "/auth/register" : owner ? "/auth/owner/login" : "/auth/login",
      {
        method: "POST",
        body: data,
      },
    );
    return acceptAuth(b);
  }
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setWishlist([]);
    await refresh();
    notify("You’re safely signed out.");
  }
  const value = {
    boot,
    products,
    refresh,
    addCart,
    cart,
    setCart,
    wishlist,
    toggleWish,
    compare,
    setCompare,
    toggleCompare,
    theme,
    setTheme,
    notify,
    cartOpen,
    setCartOpen,
    searchOpen,
    setSearchOpen,
    login,
    acceptAuth,
    authRequest,
    requestCustomerLogin,
    closeCustomerLogin,
    finishCustomerLogin,
    logout,
  };
  if (error && !boot)
    return (
      <div className="full-state">
        <AlertCircle size={40} />
        <h2>A little interruption.</h2>
        <p>{error}</p>
        <button className="btn" onClick={refresh}>
          Try again
        </button>
      </div>
    );
  if (!boot)
    return (
      <div className="initial-load">
        <span className="logo">
          <Brand />
        </span>
        <div className="loading-line" />
        <p>Making room for rest.</p>
      </div>
    );
  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && (
        <div className={"toast " + toast.type} role="status">
          {toast.type === "error" ? (
            <AlertCircle size={18} />
          ) : (
            <Check size={18} />
          )}
          <span>{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </Ctx.Provider>
  );
}
export const useStore = () => useContext(Ctx);
export function useData(url) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  const reload = () => {
    setError("");
    return api(url)
      .then(setData)
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api(url)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [url]);
  return { data, error, reload, setData };
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  drawer = false,
}) {
  const ref = useRef(),
    previous = useRef(document.activeElement);
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = ref.current;
    (el?.querySelector("[data-autofocus]") || el)?.focus();
    const fn = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = el.querySelectorAll(
          'button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]',
        );
        if (!items.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", fn);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", fn);
      previous.current?.focus();
    };
  }, []);
  return (
    <div
      className={"modal-backdrop " + (drawer ? "drawer-backdrop" : "")}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={"modal " + (wide ? "wide " : "") + (drawer ? "drawer" : "")}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Button({ children, loading, className = "", ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={"btn " + className}
    >
      {loading ? <LoaderCircle size={18} className="spin" /> : null}
      {children}
    </button>
  );
}
export function Field({ label, error, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}{" "}
      {error && <small className="error">{error}</small>}
    </label>
  );
}
export function Stars({ rating = 5, count, small = false }) {
  return (
    <span className={"rating " + (small ? "small" : "")}>
      <span
        className="stars"
        role="img"
        aria-label={`${rating} out of 5 stars`}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={small ? 11 : 13}
            fill={i < Math.round(Number(rating) || 0) ? "currentColor" : "none"}
            strokeWidth={1}
          />
        ))}
      </span>
      <b>{rating}</b>
      {count !== undefined && <span>({Number(count).toLocaleString()})</span>}
    </span>
  );
}
export function Quantity({ value, onChange }) {
  return (
    <div className="quantity">
      <button
        aria-label="Decrease quantity"
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        <Minus size={15} />
      </button>
      <span>{value}</span>
      <button
        aria-label="Increase quantity"
        disabled={value >= 10}
        onClick={() => onChange(Math.min(10, value + 1))}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
export function Empty({
  icon: Icon = ShoppingBag,
  title = "Nothing here just yet.",
  text,
  action = "Explore mattresses",
  to = "/mattresses",
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={32} strokeWidth={1.2} />
      </span>
      <h2>{title}</h2>
      <p>{text || "A better kind of rest is waiting for you."}</p>
      {action && (
        <Link className="btn" to={to}>
          {action}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function Loading() {
  return (
    <div className="skeleton-grid">
      {[1, 2, 3, 4].map((i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
export function ErrorState({ error, retry }) {
  return (
    <div className="empty">
      <AlertCircle />
      <h3>Let’s try that again.</h3>
      <p>{error}</p>
      <button className="btn" onClick={retry}>
        Retry
      </button>
    </div>
  );
}
export function Accordion({ title, children, open = false }) {
  return (
    <details className="accordion" open={open || undefined}>
      <summary>
        {title}
        <Plus size={18} />
      </summary>
      <div>{children}</div>
    </details>
  );
}
export function ThemeSelect() {
  const { theme, setTheme } = useStore();
  return (
    <div className="theme-select">
      {[
        ["light", Sun],
        ["dark", Moon],
        ["system", Monitor],
      ].map(([t, Icon]) => (
        <button
          key={t}
          className={theme === t ? "selected" : ""}
          aria-label={`${t} theme`}
          title={`${t} theme`}
          aria-pressed={theme === t}
          onClick={() => setTheme(t)}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}
export function Breadcrumb({ items = [] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link to="/">Home</Link>
      {items.map((i, n) => (
        <React.Fragment key={n}>
          <span>/</span>
          {i.to ? (
            <Link to={i.to}>{i.label}</Link>
          ) : (
            <span>{i.label || i}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
export function ScrollTop() {
  const { pathname } = useLocation();
  const { boot } = useStore();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.title =
      pathname === "/"
        ? boot.settings.seoTitle
        : `${pathname.split("/").pop().replaceAll("-", " ")} · ${boot.settings.storeName}`;
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = location.origin + pathname;
  }, [pathname]);
  return null;
}
export class Boundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="full-state">
        <h2>Something didn’t go quite right.</h2>
        <p>Your saved bag is still here.</p>
        <button className="btn" onClick={() => location.reload()}>
          Reload page
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}

export function Brand() {
  const store = useContext(Ctx);
  const name = store?.boot?.settings?.storeName || "REAL FEELING MATTRESS";
  const mattress = /\s+mattress$/i.test(name);
  return (
    <>
      <svg
        className="brand-symbol"
        width="34"
        height="34"
        viewBox="0 0 36 36"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 15V9c0-2 2-4 4-4h18c2 0 4 2 4 4v6M5 21v10m26-10v10M5 26h26M3 15c8-4 22-4 30 0v6c-8 4-22 4-30 0z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M18 12v11" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <span className="brand-lockup">
        <strong>{mattress ? name.replace(/\s+mattress$/i, "") : name}</strong>
        {mattress && <small>MATTRESS</small>}
      </span>
    </>
  );
}
export function Avatar({ user, large = false }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [user?.avatar]);
  return (
    <span className={"customer-avatar " + (large ? "large" : "")}>
      {user?.avatar && !failed ? (
        <img
          src={user.avatar}
          alt={large ? `${user.name}'s profile photo` : ""}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">
          {(user?.name || "C")
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n[0])
            .join("")}
        </span>
      )}
    </span>
  );
}
