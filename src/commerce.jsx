import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Trash2,
  Heart,
  Truck,
  Lock,
  Check,
  CheckCircle2,
  Package,
  MapPin,
  User,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  LogOut,
  Plus,
  Download,
  MessageCircle,
  Bell,
  Settings,
  KeyRound,
  ChevronRight,
  Clock,
  CreditCard,
  Moon,
  X,
} from "lucide-react";
import {
  api,
  Brand,
  Avatar,
  useStore,
  useData,
  money,
  date,
  Button,
  Field,
  Quantity,
  Empty,
  Modal,
  Breadcrumb,
  Loading,
  ErrorState,
  ThemeSelect,
} from "./core";
import { ProductCard } from "./components";
import { GoogleSignIn } from "./google";
import {
  OrderReceipt,
  OrderActions,
  callbackEnglish,
  callbackHindi,
  downloadInvoice,
} from "./order-documents";
export { downloadInvoice } from "./order-documents";
const readCoupon = () => {
  try {
    return sessionStorage.getItem("nocte-coupon") || "";
  } catch {
    return "";
  }
};
const saveCoupon = (value) => {
  try {
    value
      ? sessionStorage.setItem("nocte-coupon", value)
      : sessionStorage.removeItem("nocte-coupon");
  } catch {}
};
const cleanItems = (cart) =>
  cart.map(({ productId, size, thickness, firmness, quantity }) => ({
    productId,
    size,
    thickness,
    firmness,
    quantity,
  }));
function OrderSummary({ quote, cart, coupon, setCoupon, onCoupon, busy }) {
  return (
    <div className="order-summary">
      <h3>A little closer to better nights.</h3>
      {cart.map((i, n) => (
        <div className="summary-item" key={n}>
          <div>
            <img src={i.image} alt={i.name} />
            <span>{i.quantity}</span>
          </div>
          <div>
            <h4>{i.name}</h4>
            <p>
              {i.size} · {i.thickness}″ · {i.firmness}
            </p>
          </div>
          <b>{money((quote?.items?.[n]?.price || i.price) * i.quantity)}</b>
        </div>
      ))}
      {onCoupon && (
        <form
          className="coupon-form"
          onSubmit={(e) => {
            e.preventDefault();
            onCoupon();
          }}
        >
          <input
            aria-label="Coupon code"
            placeholder="Have a little something? Coupon code"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          />
          <button disabled={busy}>Apply</button>
        </form>
      )}
      <div className="summary-lines">
        <div>
          <span>Subtotal</span>
          <b>{money(quote?.subtotal)}</b>
        </div>
        {quote?.discount > 0 && (
          <div className="discount-line">
            <span>Discount · {quote.coupon}</span>
            <b>−{money(quote.discount)}</b>
          </div>
        )}
        <div>
          <span>Delivery</span>
          <b>{quote?.shipping ? money(quote.shipping) : "On us"}</b>
        </div>
        <div>
          <span>Included tax ({quote?.taxRate ?? 0}%)</span>
          <span>{money(quote?.tax)}</span>
        </div>
        <div className="summary-total">
          <strong>Total</strong>
          <strong>{money(quote?.total)}</strong>
        </div>
      </div>
      <p className="fine-print">
        <Lock size={12} />
        Server-calculated totals. No card details collected.
      </p>
    </div>
  );
}
export function CartPage() {
  const { cart, setCart, products, wishlist, toggleWish, notify } = useStore();
  const [quote, setQuote] = useState(null),
    [coupon, setCoupon] = useState(""),
    [applied, setApplied] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const nav = useNavigate();
  async function getQuote(code = applied) {
    if (!cart.length) return;
    setBusy(true);
    try {
      const q = await api("/checkout/quote", {
        method: "POST",
        body: { items: cleanItems(cart), coupon: code },
      });
      setQuote(q);
      setError("");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    getQuote();
  }, [JSON.stringify(cart)]);
  return (
    <main className="section cart-page">
      <Breadcrumb items={["Your bag"]} />
      <div className="section-heading">
        <div>
          <span className="eyebrow">MAKE A LITTLE ROOM FOR BETTER NIGHTS</span>
          <h1>Your kind of comfort.</h1>
        </div>
        <Link to="/mattresses" className="text-link">
          Keep exploring <ArrowRight size={16} />
        </Link>
      </div>
      {!cart.length ? (
        <Empty
          title="Your bag is resting."
          text="A few thoughtfully made things can make a world of difference."
        />
      ) : (
        <div className="cart-layout">
          <div>
            <div className="cart-delivery-note">
              <Truck size={22} />
              <div>
                <strong>Good sleep. Delivered to your doorstep.</strong>
                <p>Complimentary shipping on orders of ₹10,000 or more.</p>
              </div>
            </div>
            {cart.map((i, n) => (
              <div className="full-cart-item" key={n}>
                <Link to={"/product/" + i.productId}>
                  <img src={i.image} alt={i.name} />
                </Link>
                <div>
                  <Link to={"/product/" + i.productId}>
                    <h3>{i.name}</h3>
                  </Link>
                  <p>
                    {i.size} · {i.thickness} inches · {i.firmness}
                  </p>
                  <div className="full-cart-actions">
                    <Quantity
                      value={i.quantity}
                      onChange={(quantity) =>
                        setCart(
                          cart.map((x, j) =>
                            j === n ? { ...x, quantity } : x,
                          ),
                        )
                      }
                    />
                    <button
                      onClick={() => {
                        if (!wishlist.includes(i.productId))
                          toggleWish(i.productId);
                        setCart(cart.filter((_, j) => j !== n));
                      }}
                    >
                      <Heart size={14} />
                      Save for later
                    </button>
                    <button
                      aria-label={`Remove ${i.name}`}
                      onClick={() => setCart(cart.filter((_, j) => j !== n))}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <b>{money((quote?.items[n]?.price || i.price) * i.quantity)}</b>
              </div>
            ))}
            <div className="cart-reassurance">
              <span>
                <Moon size={17} />
                Help choosing your comfort
              </span>
              <span>
                <ShieldCheck size={17} />
                10-year warranty*
              </span>
            </div>
          </div>
          <div>
            <OrderSummary
              quote={quote}
              cart={cart}
              coupon={coupon}
              setCoupon={setCoupon}
              busy={busy}
              onCoupon={async () => {
                if (await getQuote(coupon)) {
                  setApplied(coupon);
                  saveCoupon(coupon);
                  notify(
                    coupon
                      ? "A little extra comfort, for less."
                      : "Coupon removed.",
                  );
                }
              }}
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button
              className="full"
              loading={busy}
              disabled={!!error || !quote}
              onClick={() => nav("/checkout")}
            >
              Continue to checkout <ArrowRight size={17} />
            </Button>
            <p className="fine-print center">
              Demo checkout · No payment is taken
            </p>
          </div>
        </div>
      )}
      <div className="cart-recommendations">
        <span className="eyebrow">THE PERFECT FINISHING TOUCH</span>
        <h2>A little extra comfort.</h2>
        <div className="product-grid accessories-grid">
          {products
            .filter((p) => ["Bedding", "Accessories"].includes(p.category))
            .map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
        </div>
      </div>
    </main>
  );
}
export function CheckoutPage() {
  const { boot } = useStore();
  if (boot.user?.role !== "customer")
    return (
      <main className="checkout-signin section">
        <Link className="logo" to="/">
          <Brand />
        </Link>
        <p className="checkout-signin-note">
          Sign in to your customer account to continue to checkout. Your bag is
          saved.
        </p>
        <LoginForm onSuccess={() => {}} />
      </main>
    );
  return <CustomerCheckout />;
}
function CustomerCheckout() {
  const { cart, setCart, boot, setCartOpen } = useStore();
  const [step, setStep] = useState(0),
    [checkoutKey] = useState(() => crypto.randomUUID()),
    [quote, setQuote] = useState(null),
    [coupon, setCoupon] = useState(readCoupon),
    [applied, setApplied] = useState(readCoupon),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [order, setOrder] = useState(null);
  const [form, setForm] = useState({
    name: boot.user.name || "",
    email: boot.user.email || "",
    phone: boot.user.phone || "",
    line1: "",
    city: "",
    state: "",
    pincode: "",
    deliveryNotes: "",
  });
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  useEffect(() => {
    setCartOpen(false);
  }, []);
  useEffect(() => {
    document
      .querySelector("[data-checkout-heading]")
      ?.focus({ preventScroll: true });
  }, [step, order]);
  async function quoteCart(code = applied) {
    if (!cart.length || order) return false;
    setBusy(true);
    try {
      const q = await api("/checkout/quote", {
        method: "POST",
        body: { items: cleanItems(cart), coupon: code },
      });
      setQuote(q);
      setApplied(code);
      saveCoupon(code);
      setError("");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    quoteCart();
  }, [JSON.stringify(cart)]);
  async function submit(e) {
    e.preventDefault();
    if (step < 2) {
      if (step === 1 && !(await quoteCart())) return;
      setError("");
      setStep(step + 1);
      return;
    }
    if (!quote) return;
    setBusy(true);
    setError("");
    try {
      const r = await api("/checkout", {
        method: "POST",
        body: {
          checkoutKey,
          quoteHash: quote.quoteHash,
          items: cleanItems(cart),
          coupon: applied,
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: {
            line1: form.line1,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
          },
          deliveryNotes: form.deliveryNotes,
          payment: "cod",
        },
      });
      setOrder(r.order);
      setCart([]);
      saveCoupon("");
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (e) {
      setError(
        e.message +
          " If the connection was interrupted, retry without changing details, or check your account before starting another order.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (order)
    return (
      <main className="section receipt-page">
        <div className="simple-checkout-brand">
          <Link to="/" aria-label="Return to the shop">
            <Brand />
          </Link>
          <span>Private order summary</span>
        </div>
        <div className="receipt-intro">
          <div className="confirmation-icon">
            <CheckCircle2 size={32} />
          </div>
          <span className="eyebrow">SAVED. READY FOR A REAL CONVERSATION.</span>
          <h1 data-checkout-heading tabIndex={-1}>
            Your order is received.
          </h1>
          <p>
            Thank you, {order.customer.split(" ")[0]}. Keep your order number
            below.
          </p>
        </div>
        <OrderReceipt order={order} />
        <div className="button-row receipt-next">
          <Link className="btn outline" to="/account">
            View my account
            <ArrowRight size={16} />
          </Link>
          <Link className="text-link" to="/mattresses">
            Continue browsing
          </Link>
        </div>
      </main>
    );
  if (!cart.length)
    return (
      <main className="section">
        <Empty
          title="Your bag is waiting for a little comfort."
          text="Add something you love, then come back to checkout."
          action="Explore mattresses"
        />
      </main>
    );
  const steps = ["Contact", "Shipping", "Review"];
  return (
    <main className="section checkout-page">
      <div className="simple-checkout-brand">
        <Link to="/" aria-label="Return to the shop">
          <Brand />
        </Link>
        <span>Owner-confirmed orders</span>
      </div>
      <Breadcrumb items={["Checkout"]} />
      <div className="checkout-heading">
        <span className="eyebrow">A FEW DETAILS. A BETTER NIGHT AHEAD.</span>
        <h1>Make yourself comfortable.</h1>
        <p>No online payment. The owner will call to confirm your order.</p>
      </div>
      <ol className="simple-checkout-steps" aria-label="Checkout progress">
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={step === i ? "step" : undefined}
            className={i <= step ? "active" : ""}
          >
            <span>{i < step ? <Check size={16} /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submit}>
          <fieldset disabled={busy} className="checkout-fieldset">
            <h2 data-checkout-heading tabIndex={-1}>
              {
                [
                  "First, how can we reach you?",
                  "Where should your comfort go?",
                  "One last look before you submit.",
                ][step]
              }
            </h2>
            {step === 0 && (
              <div className="form-stack">
                <Field
                  label="Full name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
                <Field
                  label="Email address"
                  type="email"
                  required
                  maxLength={200}
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
                <Field
                  label="Mobile number"
                  type="tel"
                  inputMode="numeric"
                  required
                  pattern="[6-9][0-9]{9}"
                  title="A 10-digit Indian mobile number starting with 6, 7, 8 or 9"
                  maxLength={10}
                  autoComplete="tel-national"
                  value={form.phone}
                  onChange={(e) =>
                    update("phone", e.target.value.replace(/\D/g, ""))
                  }
                />
                <p className="fine-print">
                  The owner will use this number to confirm availability,
                  delivery and payment arrangements.
                </p>
              </div>
            )}
            {step === 1 && (
              <div className="form-stack">
                <Field
                  label="Street address, building & apartment"
                  required
                  minLength={5}
                  maxLength={200}
                  autoComplete="street-address"
                  value={form.line1}
                  onChange={(e) => update("line1", e.target.value)}
                />
                <div className="form-grid">
                  <Field
                    label="City"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="address-level2"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                  />
                  <Field
                    label="State"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="address-level1"
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                  />
                </div>
                <Field
                  label="PIN code"
                  required
                  inputMode="numeric"
                  autoComplete="postal-code"
                  pattern="[1-9][0-9]{5}"
                  title="A 6-digit Indian PIN code"
                  maxLength={6}
                  value={form.pincode}
                  onChange={(e) =>
                    update("pincode", e.target.value.replace(/\D/g, ""))
                  }
                />
                <Field label="Delivery notes (optional)">
                  <textarea
                    rows={3}
                    maxLength={1000}
                    placeholder="A landmark or anything the owner should know"
                    value={form.deliveryNotes}
                    onChange={(e) => update("deliveryNotes", e.target.value)}
                  />
                </Field>
                <div className="delivery-confirmation-note">
                  <Truck size={23} />
                  <div>
                    <strong>Standard delivery · India</strong>
                    <p>
                      {quote?.shipping
                        ? money(quote.shipping)
                        : "Free shipping"}{" "}
                      for this order. Delivery coverage and timing will be
                      confirmed by the owner.
                    </p>
                    {boot.settings.deliveryZones && (
                      <small>{boot.settings.deliveryZones}</small>
                    )}
                  </div>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="review-order">
                <div className="review-mobile-summary">
                  <OrderSummary quote={quote} cart={cart} />
                </div>
                <div className="review-block">
                  <div>
                    <h3>Contact</h3>
                    <p>
                      {form.name}
                      <br />
                      {form.email}
                      <br />
                      +91 {form.phone}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setStep(0)}
                  >
                    Edit contact
                  </button>
                </div>
                <div className="review-block">
                  <div>
                    <h3>Shipping</h3>
                    <p>
                      {form.line1}
                      <br />
                      {form.city}, {form.state} {form.pincode}
                    </p>
                    {form.deliveryNotes && <p>{form.deliveryNotes}</p>}
                  </div>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setStep(1)}
                  >
                    Edit shipping
                  </button>
                </div>
                <div className="callback-notice">
                  <h3>Submit now. Confirm on a call.</h3>
                  <p>{callbackEnglish}</p>
                  <p lang="hi">{callbackHindi}</p>
                  <p>
                    Your order will be saved as{" "}
                    <strong>awaiting owner confirmation</strong> and{" "}
                    <strong>unpaid</strong>.
                  </p>
                </div>
                <label className="check-row checkout-consent">
                  <input type="checkbox" required />
                  <span>
                    I have checked these details and agree to be contacted about
                    this order. I have read the{" "}
                    <Link to="/page/terms" target="_blank">
                      terms
                    </Link>{" "}
                    and{" "}
                    <Link to="/page/privacy" target="_blank">
                      privacy policy
                    </Link>
                    .
                  </span>
                </label>
                {boot.checkoutMode === "preview" && (
                  <p className="demo-notice">
                    Preview mode: this tests the order flow. No real purchase,
                    call, WhatsApp or email will be triggered.
                  </p>
                )}
              </div>
            )}
          </fieldset>
          {error && (
            <div className="form-error" role="alert">
              {error}
              <button
                type="button"
                className="text-link"
                onClick={() => quoteCart()}
                disabled={busy}
              >
                Refresh prices
              </button>
            </div>
          )}
          <div className="checkout-controls">
            {step > 0 ? (
              <button
                type="button"
                disabled={busy}
                className="text-link"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <Link className="text-link" to="/mattresses">
                <ArrowLeft size={16} />
                Keep browsing
              </Link>
            )}
            <Button loading={busy} disabled={!quote || busy}>
              {step === 0
                ? "Continue to shipping"
                : step === 1
                  ? "Review order"
                  : "Submit order"}
              <ArrowRight size={17} />
            </Button>
          </div>
          <p className="fine-print checkout-unpaid">
            No card details required. No payment collected online.
          </p>
        </form>
        <aside>
          <OrderSummary
            quote={quote}
            cart={cart}
            coupon={coupon}
            setCoupon={setCoupon}
            onCoupon={() => quoteCart(coupon)}
            busy={busy}
          />
        </aside>
      </div>
    </main>
  );
}

export function LoginForm({ owner = false, onSuccess }) {
  const { login, notify, boot } = useStore();
  const [mode, setMode] = useState("login"),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [data, setData] = useState({ name: "", email: "", password: "" });
  const nav = useNavigate();
  const [params] = useSearchParams();
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "reset") {
        const r = await api("/auth/reset", {
          method: "POST",
          body: { email: data.email },
        });
        notify(r.message);
        setMode("login");
      } else {
        const user = await login(data, mode === "register", owner);
        if (owner && user.role === "customer") {
          setError("This account does not have owner workspace access.");
          return;
        }
        notify("Welcome back. Make yourself at home.");
        onSuccess
          ? onSuccess(user)
          : nav(
              /^\/(?!\/)/.test(params.get("next") || "") &&
                !/^\/owner(?:\/|$)/.test(params.get("next") || "")
                ? params.get("next")
                : "/account",
            );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-form">
      <span className="eyebrow">
        {owner
          ? `${boot.settings.storeName} · OWNER WORKSPACE`
          : "YOUR OWN LITTLE CORNER OF COMFORT"}
      </span>
      <h1>
        {mode === "register"
          ? "Make yourself at home."
          : mode === "reset"
            ? "Let’s get you back in."
            : owner
              ? "Good morning, owner."
              : "A familiar kind of comfort."}
      </h1>
      <p>
        {owner
          ? "A considered space to run a thoughtful business."
          : mode === "register"
            ? "Join us for beautifully better nights."
            : "Sign in to your orders, saved favourites, and a little more rest."}
      </p>
      {!owner && mode !== "reset" && (
        <>
          <GoogleSignIn
            onSuccess={(user) => {
              notify("Welcome. Make yourself at home.");
              onSuccess ? onSuccess(user) : nav("/account");
            }}
          />
          <div className="auth-divider">
            <span>or continue with email</span>
          </div>
        </>
      )}
      <form className="form-stack" onSubmit={submit}>
        {mode === "register" && (
          <Field
            label="Your name"
            required
            minLength={2}
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
          />
        )}
        <Field
          label="Email address"
          type="email"
          autoComplete="username"
          required
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
        />
        {mode !== "reset" && (
          <Field label="Password">
            <div className="password-input">
              <input
                type={show ? "text" : "password"}
                required
                minLength={mode === "register" ? 10 : 1}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
        )}
        {mode === "register" && (
          <p className="fine-print">
            At least 10 characters, including uppercase, lowercase and a number.
          </p>
        )}
        {mode === "login" && (
          <button
            type="button"
            className="text-link forgot-link"
            onClick={() => {
              setMode("reset");
              setError("");
            }}
          >
            Forgot your password?
          </button>
        )}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <Button loading={busy} className="full">
          {mode === "register"
            ? "Create your account"
            : mode === "reset"
              ? "Request reset"
              : "Sign in"}
          <ArrowRight size={17} />
        </Button>
      </form>
      {!owner && (
        <p className="auth-switch">
          {mode === "login" ? "New here?" : "Already feeling at home?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      )}
      {owner && mode === "reset" && (
        <button className="text-link" onClick={() => setMode("login")}>
          Back to sign in
        </button>
      )}
      {owner && boot.demo && (
        <div className="demo-login">
          <ShieldCheck size={19} />
          <div>
            <strong>Explore the demo workspace</strong>
            <p>Temporary data. No live payments.</p>
            <button
              onClick={() => {
                setData({
                  ...data,
                  email: "owner@nocte.demo",
                  password: "NocteDemo!2026",
                });
                setMode("login");
              }}
            >
              Use demo owner credentials <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
      <span className="auth-security">
        <Lock size={13} />
        Your identity and permissions are verified by the server.
      </span>
    </div>
  );
}
export function AccountPage() {
  const { boot, logout } = useStore();
  if (boot.user?.role !== "customer")
    return (
      <main className="auth-page">
        <div className="auth-photo">
          <img src="/images/detail.webp" alt="A little space to rest" />
          <div>
            <span className="eyebrow">YOUR GOOD-NIGHT COMPANION</span>
            <h2>
              Welcome to
              <br />
              your softer side.
            </h2>
          </div>
        </div>
        <LoginForm />
      </main>
    );
  return <AccountDashboard />;
}
function AccountDashboard() {
  const { boot, logout, notify, refresh, wishlist } = useStore(),
    { data, error, reload } = useData("/account"),
    [tab, setTab] = useState("Overview"),
    [modal, setModal] = useState(null),
    [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const tabs = [
    ["Overview", User],
    ["Orders", Package],
    ["Wishlist", Heart],
    ["Addresses", MapPin],
    ["Notifications", Bell],
    ["Support", MessageCircle],
    ["Profile & security", ShieldCheck],
  ];
  async function save(e, url, method = "POST") {
    e.preventDefault();
    setBusy(true);
    try {
      await api(url, {
        method,
        body: Object.fromEntries(new FormData(e.currentTarget)),
      });
      notify("All saved. A little more peace of mind.");
      setModal(null);
      reload();
      refresh();
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="section account-page">
      <Breadcrumb items={["Your account"]} />
      <span className="eyebrow">YOUR LITTLE CORNER OF COMFORT</span>
      <div className="customer-greeting">
        <Avatar user={boot.user} large />
        <div>
          <h1>Hello, {boot.user.name.split(" ")[0]}.</h1>
          <span>{boot.user.email}</span>
        </div>
      </div>
      <p className="lead">Your orders, your favourites, your better nights.</p>
      <div className="account-layout">
        <aside className="account-nav">
          {tabs.map(([t, I]) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => (t === "Wishlist" ? nav("/wishlist") : setTab(t))}
            >
              <I size={17} />
              {t}
              {t === "Wishlist" && <span>{wishlist.length}</span>}
            </button>
          ))}
          <button
            onClick={async () => {
              await logout();
              nav("/");
            }}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </aside>
        <div className="account-content">
          {error ? (
            <ErrorState error={error} retry={reload} />
          ) : !data ? (
            <Loading />
          ) : (
            <>
              {tab === "Overview" && (
                <>
                  <div className="account-welcome">
                    <Moon size={35} strokeWidth={1} />
                    <div>
                      <h2>Good to have you here.</h2>
                      <p>Let’s make every night a little better.</p>
                    </div>
                    <Link to="/quiz" className="text-link">
                      Find your comfort <ArrowRight size={15} />
                    </Link>
                  </div>
                  <div className="account-stats">
                    <button onClick={() => setTab("Orders")}>
                      <Package />
                      <strong>{data.orders.length}</strong>
                      <span>Your orders</span>
                    </button>
                    <Link to="/wishlist">
                      <Heart />
                      <strong>{wishlist.length}</strong>
                      <span>Saved favourites</span>
                    </Link>
                    <button onClick={() => setTab("Support")}>
                      <MessageCircle />
                      <strong>{data.tickets.length}</strong>
                      <span>Support requests</span>
                    </button>
                  </div>
                  <div className="section-heading">
                    <h2>Your latest nights in the making.</h2>
                    <button
                      className="text-link"
                      onClick={() => setTab("Orders")}
                    >
                      View all <ArrowRight size={15} />
                    </button>
                  </div>
                  {data.orders.length ? (
                    <OrderCards
                      orders={data.orders.slice(0, 2)}
                      email={boot.user.email}
                    />
                  ) : (
                    <Empty
                      title="Your first good night is waiting."
                      text="No orders yet. Find a comfort that feels like you."
                    />
                  )}
                  <div className="account-offer">
                    <span className="eyebrow">A LITTLE WELCOME GIFT</span>
                    <h3>10% towards better nights.</h3>
                    <p>
                      Use REST10 on orders over ₹10,000. Maximum saving ₹5,000.
                    </p>
                    <Link to="/offers" className="text-link">
                      Explore the offer <ArrowRight size={14} />
                    </Link>
                  </div>
                </>
              )}
              {tab === "Orders" && (
                <>
                  <h2>Your orders</h2>
                  {data.orders.length ? (
                    <OrderCards orders={data.orders} email={boot.user.email} />
                  ) : (
                    <Empty title="Nothing on its way just yet." />
                  )}
                  <Link className="text-link" to="/tracking">
                    Track an order <ArrowRight size={15} />
                  </Link>
                </>
              )}
              {tab === "Addresses" && (
                <>
                  <div className="section-heading">
                    <h2>Your places of rest.</h2>
                    <button
                      className="btn outline"
                      onClick={() => setModal("address")}
                    >
                      <Plus size={16} />
                      Add address
                    </button>
                  </div>
                  <div className="address-grid">
                    {data.addresses.map((a) => (
                      <div className="address-card" key={a.id}>
                        <MapPin size={22} />
                        <h3>{a.label}</h3>
                        <p>
                          {a.address}
                          <br />
                          {a.pincode}
                        </p>
                        <button
                          className="text-link"
                          onClick={async () => {
                            await api("/account/addresses/" + a.id, {
                              method: "DELETE",
                            });
                            reload();
                            notify("Address removed.");
                          }}
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  {!data.addresses.length && (
                    <p className="muted">
                      No saved addresses yet. Add home, work, or somewhere you
                      love.
                    </p>
                  )}
                </>
              )}
              {tab === "Notifications" && (
                <>
                  <h2>A little update.</h2>
                  {!data.notifications.length ? (
                    <Empty
                      icon={Bell}
                      title="All quiet, just how we like it."
                      text="Order and delivery updates will appear here."
                      action=""
                    />
                  ) : (
                    data.notifications.map((n) => (
                      <div className="notification-card" key={n.id}>
                        <Bell size={19} />
                        <div>
                          <h4>{n.title}</h4>
                          <p>{n.body}</p>
                          <small>{date(n.created)}</small>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
              {tab === "Support" && (
                <>
                  <div className="section-heading">
                    <h2>Always here to help.</h2>
                    <Link to="/support" className="btn outline">
                      <Plus size={16} />
                      New request
                    </Link>
                  </div>
                  {data.tickets.map((t) => (
                    <button
                      className="ticket-card"
                      key={t.id}
                      onClick={() => setModal(t)}
                    >
                      <MessageCircle size={21} />
                      <div>
                        <h4>{t.subject}</h4>
                        <span>
                          {t.id} · {date(t.created)}
                        </span>
                      </div>
                      <span className="status">{t.status}</span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                  {!data.tickets.length && (
                    <Empty
                      icon={MessageCircle}
                      title="Nothing to worry about."
                      text="Your support conversations will live here."
                      action="Talk to us"
                      to="/support"
                    />
                  )}
                  <Link className="text-link" to="/support?category=Returns">
                    Request a return or refund <ArrowRight size={15} />
                  </Link>
                </>
              )}
              {tab === "Profile & security" && (
                <>
                  <h2>A little about you.</h2>
                  <form
                    className="form-stack profile-form"
                    onSubmit={(e) => save(e, "/account", "PATCH")}
                  >
                    <Field
                      label="Full name"
                      name="name"
                      defaultValue={boot.user.name}
                      required
                      minLength={2}
                    />
                    <Field
                      label="Phone number"
                      name="phone"
                      defaultValue={boot.user.phone}
                    />
                    <Field
                      label="Email address"
                      value={boot.user.email}
                      readOnly
                    />
                    <Button loading={busy}>
                      Save profile <Check size={16} />
                    </Button>
                  </form>
                  <section className="google-account-card">
                    <h3>Your Google connection.</h3>
                    {boot.user.googleLinked ? (
                      <p>
                        <CheckCircle2 size={17} /> Google connected. Your name
                        and profile photo refresh when you sign in with Google.
                      </p>
                    ) : (
                      <>
                        <p>
                          Use the same Google email as your customer account.
                          Confirm your password to connect it securely.
                        </p>
                        <GoogleSignIn
                          link
                          onSuccess={() => {
                            notify(
                              "Google is connected to your customer account.",
                            );
                            refresh();
                            reload();
                          }}
                        />
                      </>
                    )}
                  </section>
                  <div className="security-actions">
                    <h3>Your peace of mind.</h3>
                    {!boot.user.google_only && (
                      <button onClick={() => setModal("password")}>
                        <KeyRound size={19} />
                        <div>
                          <strong>Change password</strong>
                          <span>
                            A fresh password, a little more peace of mind.
                          </span>
                        </div>
                        <ChevronRight size={17} />
                      </button>
                    )}
                    {boot.user.google_only && (
                      <p className="muted">
                        You use Google to sign in. Manage your Google password
                        in your Google account.
                      </p>
                    )}
                    <button
                      onClick={async () => {
                        await api("/account/revoke", { method: "POST" });
                        notify("Other sessions have been signed out.");
                        reload();
                      }}
                    >
                      <ShieldCheck size={19} />
                      <div>
                        <strong>Sign out other devices</strong>
                        <span>
                          {data.sessions.length} active session(s). This device
                          will stay signed in.
                        </span>
                      </div>
                      <ChevronRight size={17} />
                    </button>
                    <Link to="/support?category=Account%20deletion">
                      <Trash2 size={19} />
                      <div>
                        <strong>Request account deletion</strong>
                        <span>
                          Our support team can assist with your data request.
                        </span>
                      </div>
                      <ChevronRight size={17} />
                    </Link>
                  </div>
                  <div className="appearance-row">
                    <div>
                      <h4>Make it feel like you.</h4>
                      <p>Choose your preferred appearance.</p>
                    </div>
                    <ThemeSelect />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {modal && (
        <Modal
          title={
            modal === "address"
              ? "A new place to rest."
              : modal === "password"
                ? "A fresh start for your password."
                : modal.subject
          }
          onClose={() => setModal(null)}
        >
          {modal === "address" ? (
            <form
              className="form-stack"
              onSubmit={(e) => save(e, "/account/addresses")}
            >
              <Field
                label="Name this address"
                name="label"
                placeholder="Home"
                required
              />
              <Field label="Full address">
                <textarea name="address" required minLength={5} rows={3} />
              </Field>
              <Field
                label="PIN code"
                name="pincode"
                pattern="[0-9]{6}"
                required
                maxLength={6}
              />
              <Button loading={busy}>Save address</Button>
            </form>
          ) : modal === "password" ? (
            <form
              className="form-stack"
              onSubmit={(e) => save(e, "/account/password")}
            >
              <Field
                label="Current password"
                name="current"
                type="password"
                required
              />
              <Field
                label="New password"
                name="password"
                type="password"
                required
                minLength={10}
              />
              <p className="fine-print">
                At least 10 characters with uppercase, lowercase and a number.
              </p>
              <Button loading={busy}>Update password</Button>
            </form>
          ) : (
            <>
              <div className="ticket-messages">
                {modal.messages.map((m, i) => (
                  <div key={i}>
                    <strong>{m.from}</strong>
                    <p>{m.text}</p>
                    <small>{date(m.at)}</small>
                  </div>
                ))}
              </div>
              <form
                className="form-stack"
                onSubmit={(e) => save(e, "/support/" + modal.id + "/reply")}
              >
                <Field label="Your reply">
                  <textarea name="message" required rows={3} />
                </Field>
                <Button loading={busy}>
                  Send reply <ArrowRight size={16} />
                </Button>
              </form>
            </>
          )}
        </Modal>
      )}
    </main>
  );
}
function OrderCards({ orders }) {
  const { notify } = useStore();
  const [selected, setSelected] = useState(null),
    [loading, setLoading] = useState("");
  async function open(id) {
    setLoading(id);
    try {
      setSelected(await api("/account/orders/" + encodeURIComponent(id)));
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setLoading("");
    }
  }
  return (
    <div className="account-orders">
      {orders.map((o) => (
        <div key={o.id} className="account-order">
          <div>
            <Package size={21} />
            <div>
              <strong>{o.id}</strong>
              <span>{date(o.created)}</span>
            </div>
            <span className="status">{o.status}</span>
          </div>
          <div>
            <span>
              Total <b>{money(o.total)}</b>
            </span>
            <button
              className="text-link"
              disabled={Boolean(loading)}
              onClick={() => open(o.id)}
            >
              {loading === o.id ? "Opening…" : "Details, PDF & sharing"}
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      ))}
      {selected && (
        <Modal
          title="Your order details"
          wide
          onClose={() => setSelected(null)}
        >
          <OrderReceipt order={selected} />
        </Modal>
      )}
    </div>
  );
}
export function TrackingPage() {
  const [params] = useSearchParams(),
    { notify, boot } = useStore();
  const [id, setId] = useState(params.get("id") || ""),
    [email, setEmail] = useState(params.get("email") || ""),
    [order, setOrder] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function track(e) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      setOrder(await api("/tracking", { method: "POST", body: { id, email } }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (id && email) track();
  }, []);
  const steps = [
    "Awaiting confirmation",
    "Placed",
    "Confirmed",
    "Packed",
    "Shipped",
    "Out for delivery",
    "Delivered",
  ];
  return (
    <main className="section tracking-page">
      <Breadcrumb items={["Track your order"]} />
      <span className="eyebrow">FOLLOW YOUR COMFORT HOME</span>
      <h1>Good nights, on their way.</h1>
      <p className="lead">A little update on your next chapter of rest.</p>
      <form className="tracking-form" onSubmit={track}>
        <Field
          label="Order number"
          required
          placeholder="RFM-…"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <Field
          label="Email used at checkout"
          required
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button loading={busy}>
          Track order <ArrowRight size={17} />
        </Button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {order && (
        <div className="tracking-result">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ORDER {order.id}</span>
              <h2>
                {order.status === "Delivered"
                  ? "Welcome to better nights."
                  : "A little closer to your doorstep."}
              </h2>
              <p>
                Placed {date(order.created)} · {order.payment_status}
              </p>
            </div>
            <span className="status">{order.status}</span>
          </div>
          <div className="order-timeline">
            {steps.map((s, i) => (
              <div
                key={s}
                className={i <= steps.indexOf(order.status) ? "complete" : ""}
              >
                <span>
                  {i <= steps.indexOf(order.status) ? (
                    <Check size={19} />
                  ) : (
                    <Package size={18} />
                  )}
                </span>
                <strong>{s}</strong>
                {i === steps.indexOf(order.status) && (
                  <small>You’re here</small>
                )}
              </div>
            ))}
          </div>
          {["Cancelled", "Refunded", "Return requested"].includes(
            order.status,
          ) && (
            <p className="demo-notice">
              This order is {order.status.toLowerCase()}. Contact support for
              details.
            </p>
          )}
          <div className="tracking-details">
            <div>
              <h3>Coming home to</h3>
              {order.redacted ? (
                <p>
                  Sign in to the customer account that placed this order to see
                  its private delivery details and PDF.
                </p>
              ) : (
                <p>
                  {order.customer}
                  <br />
                  {order.address.line1}
                  <br />
                  {order.address.city}, {order.address.state}
                  <br />
                  {order.address.pincode}
                </p>
              )}
            </div>
            <div>
              <h3>Delivery details</h3>
              <p>
                Delivery timing: to be confirmed by the owner
                <br />
                Carrier:{" "}
                {order.tracking ? "Assigned by store" : "Awaiting assignment"}
                <br />
                Tracking: {order.tracking || "Available when shipped"}
              </p>
            </div>
            <div>
              <h3>Your order</h3>
              {order.items.map((i) => (
                <p key={i.id}>
                  {i.name} × {i.quantity}
                  <br />
                  {i.size} · {i.thickness}″
                </p>
              ))}
              {!order.redacted && <b>{money(order.total)}</b>}
            </div>
          </div>
          <div className="button-row">
            {!order.redacted && (
              <button
                className="btn outline"
                onClick={async () => {
                  try {
                    await downloadInvoice(order);
                  } catch (e) {
                    notify(e.message, "error");
                  }
                }}
              >
                <Download size={16} />
                Download PDF summary
              </button>
            )}
            <Link to={"/support?order=" + order.id} className="text-link">
              A little help with this order <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
export function SupportPage() {
  const { boot, notify } = useStore();
  const [params] = useSearchParams(),
    [busy, setBusy] = useState(false),
    [ticket, setTicket] = useState("");
  return (
    <main className="section support-page">
      <Breadcrumb items={["Here to help"]} />
      <div className="support-layout">
        <div>
          <span className="eyebrow">
            A REAL CONVERSATION. A LITTLE CLARITY.
          </span>
          <h1>
            Let’s make
            <br />
            you comfortable.
          </h1>
          <p className="lead">
            From finding your first mattress to a question about your order.
            We’re here for all of it.
          </p>
          <div className="support-contact">
            <MessageCircle size={23} />
            <div>
              <h4>Let’s talk comfort.</h4>
              <a href={"tel:" + boot.settings.phone.replace(/[^+0-9]/g, "")}>
                {boot.settings.phone}
              </a>
              <p>
                <a
                  className="text-link"
                  href={
                    "https://wa.me/" + boot.settings.phone.replace(/\D/g, "")
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Message on WhatsApp <ArrowRight size={14} />
                </a>
              </p>
            </div>
          </div>
          {boot.settings.email && (
            <div className="support-contact">
              <Mail size={23} />
              <div>
                <h4>Drop us a little note.</h4>
                <a href={"mailto:" + boot.settings.email}>
                  {boot.settings.email}
                </a>
              </div>
            </div>
          )}
          <div className="support-contact">
            <Clock size={23} />
            <div>
              <h4>Here when you need us.</h4>
              <p>{boot.settings.businessHours}</p>
            </div>
          </div>
          <div className="support-contact">
            <MapPin size={23} />
            <div>
              <h4>Visit our Ahmedabad shop.</h4>
              <p>{boot.settings.address}</p>
              {boot.settings.mapUrl && (
                <a
                  className="text-link"
                  href={boot.settings.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions <ArrowRight size={14} />
                </a>
              )}
            </div>
          </div>
          <Link className="text-link" to="/faq">
            You might find your answer here <ArrowRight size={16} />
          </Link>
        </div>
        <div className="support-form-card">
          {ticket ? (
            <div className="empty">
              <CheckCircle2 size={42} />
              <h2>A little help is on its way.</h2>
              <p>
                Your request <b>{ticket}</b> is with our team.{" "}
                {boot.user
                  ? "Follow the conversation in your account."
                  : "Keep this reference. Sign in before sending future requests to follow them in your account."}
              </p>
              <Link className="btn" to="/account">
                Go to your account <ArrowRight size={16} />
              </Link>
              <button className="text-link" onClick={() => setTicket("")}>
                Send another message
              </button>
            </div>
          ) : (
            <form
              className="form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const b = Object.fromEntries(new FormData(e.currentTarget));
                try {
                  const r = await api("/support", { method: "POST", body: b });
                  setTicket(r.id);
                } catch (e) {
                  notify(e.message, "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>What’s on your mind?</h2>
              <div className="form-grid">
                <Field
                  label="Your name"
                  name="name"
                  required
                  minLength={2}
                  defaultValue={boot.user?.name || ""}
                />
                <Field
                  label="Email address"
                  name="email"
                  required
                  type="email"
                  defaultValue={boot.user?.email || ""}
                />
              </div>
              <Field label="A little context">
                <select
                  name="category"
                  defaultValue={params.get("category") || "Product advice"}
                >
                  {[
                    "Product advice",
                    "Order help",
                    "Delivery",
                    "Returns",
                    "Warranty",
                    "Account deletion",
                    "Other",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Subject"
                name="subject"
                required
                minLength={3}
                defaultValue={
                  params.get("order")
                    ? "Help with order " + params.get("order")
                    : ""
                }
              />
              <Field label="Tell us a little more">
                <textarea
                  name="message"
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={5}
                  placeholder="We’re listening…"
                />
              </Field>
              <p className="fine-print">
                Please don’t include passwords or payment information.
              </p>
              <Button loading={busy}>
                Send your message <ArrowRight size={17} />
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

export function CustomerAuthDialog() {
  const { authRequest, closeCustomerLogin, finishCustomerLogin } = useStore();
  const nav = useNavigate();
  if (!authRequest) return null;
  return (
    <Modal title="Sign in to continue" onClose={closeCustomerLogin}>
      {authRequest.product && (
        <div className="auth-bag-intent">
          <img src={authRequest.product.image} alt="" />
          <div>
            <strong>A little closer to your comfort.</strong>
            <p>
              Sign in and we’ll add {authRequest.product.name} to your bag, with
              your selected options.
            </p>
          </div>
          <ShoppingBag size={20} />
        </div>
      )}
      <LoginForm
        onSuccess={() => {
          const next = authRequest.next;
          finishCustomerLogin();
          if (next) nav(next);
        }}
      />
    </Modal>
  );
}
