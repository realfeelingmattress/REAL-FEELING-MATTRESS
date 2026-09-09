import React, { useState, useEffect, useDeferredValue, useRef } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  User,
  Heart,
  ShoppingBag,
  Menu,
  X,
  ChevronDown,
  Truck,
  ShieldCheck,
  Moon,
  Leaf,
  SlidersHorizontal,
  Check,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  Home,
  Grid2X2,
  Sparkles,
  GitCompareArrows,
  Eye,
  Mail,
  Instagram,
  Lock,
  Package,
  Tag,
  Facebook,
  MapPin,
  Phone,
  Clock,
} from "lucide-react";
import {
  useStore,
  Brand,
  Avatar,
  Modal,
  Stars,
  money,
  Quantity,
  Empty,
  Button,
  api,
  ThemeSelect,
  Field,
} from "./core";
import { searchProducts } from "./search";
export function Header() {
  const {
      boot,
      cart,
      wishlist,
      setCartOpen,
      setSearchOpen,
      requestCustomerLogin,
    } = useStore(),
    [menu, setMenu] = useState(false),
    [mega, setMega] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setMenu(false);
    setMega(false);
  }, [loc.pathname, loc.search]);
  return (
    <>
      <div className="announcement">
        <span>
          {boot.settings.announcement}{" "}
          <Link to="/offers">
            Shop the offer <ArrowUpRight size={12} />
          </Link>
        </span>
        <Link to="/tracking" className="announcement-track">
          Track your order <ArrowRight size={12} />
        </Link>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link
            className="logo"
            to="/"
            aria-label={boot.settings.storeName + " home"}
          >
            <Brand />
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <div
              className="nav-dropdown"
              onMouseEnter={() => setMega(true)}
              onMouseLeave={() => setMega(false)}
            >
              <button onClick={() => setMega(!mega)} aria-expanded={mega}>
                Mattresses <ChevronDown size={12} />
              </button>
              {mega && (
                <div className="mega-menu">
                  <div>
                    <span className="eyebrow">FIND YOUR COMFORT</span>
                    <h3>A good night starts here.</h3>
                    <Link to="/mattresses" className="text-link">
                      Shop all mattresses <ArrowRight size={15} />
                    </Link>
                  </div>
                  <div className="mega-links">
                    {boot.categories
                      .filter(
                        (c) =>
                          ![
                            "Bedding",
                            "Accessories",
                            "King",
                            "Queen",
                            "Single",
                            "Custom",
                          ].includes(c.name),
                      )
                      .map((c) => (
                        <Link
                          key={c.id}
                          to={
                            "/mattresses?category=" + encodeURIComponent(c.name)
                          }
                        >
                          {c.name}
                          <ArrowUpRight size={14} />
                        </Link>
                      ))}
                  </div>
                  <Link to="/quiz" className="mega-feature">
                    <Moon />
                    <h3>Not sure where to start?</h3>
                    <span>
                      Find your mattress in 2 minutes <ArrowRight size={14} />
                    </span>
                  </Link>
                </div>
              )}
            </div>
            <NavLink to="/collections">Collections</NavLink>
            <NavLink to="/bedding">Beds & Bedding</NavLink>
            <NavLink to="/accessories">Accessories</NavLink>
            <NavLink to="/offers" className="offer-link">
              Offers <span />
            </NavLink>
            <NavLink to="/sleep-guide">Sleep Guide</NavLink>
          </nav>
          <div className="header-actions">
            <button
              className="icon-btn"
              aria-label="Search products"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={20} />
            </button>
            {boot.user?.role === "customer" ? (
              <Link
                className="icon-btn desktop-action"
                aria-label="Your account"
                to="/account"
              >
                <Avatar user={boot.user} />
              </Link>
            ) : (
              <button
                className="account-signin desktop-action"
                onClick={() => requestCustomerLogin()}
                aria-label="Sign in to your customer account"
              >
                <User size={20} />
                <span>Sign in</span>
              </button>
            )}
            <Link
              className="icon-btn desktop-action"
              aria-label={`Wishlist with ${wishlist.length} items`}
              to="/wishlist"
            >
              <Heart size={20} />
              {wishlist.length > 0 && <i>{wishlist.length}</i>}
            </Link>
            <button
              className="icon-btn"
              aria-label={`Shopping bag with ${cart.reduce((s, i) => s + i.quantity, 0)} items`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={20} />
              <span className="cart-count">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </button>
            <button
              className="icon-btn mobile-only"
              aria-label="Open menu"
              onClick={() => setMenu(true)}
            >
              <Menu size={23} />
            </button>
          </div>
        </div>
      </header>
      {menu && (
        <Modal
          title="Make room for rest."
          onClose={() => setMenu(false)}
          drawer
        >
          <nav className="mobile-menu">
            {[
              ["Mattresses", "/mattresses"],
              ["Collections", "/collections"],
              ["Beds & Bedding", "/bedding"],
              ["Accessories", "/accessories"],
              ["Offers", "/offers"],
              ["Sleep Guide", "/sleep-guide"],
              ["Find your mattress", "/quiz"],
              ["Compare mattresses", "/compare"],
              ["Your account", "/account"],
              ["Track your order", "/tracking"],
              ["Get in touch", "/support"],
            ].map(([n, to]) => (
              <Link key={n} to={to}>
                {n}
                <ArrowRight size={18} />
              </Link>
            ))}
          </nav>
          <ThemeSelect />
        </Modal>
      )}
    </>
  );
}
export function MobileNav() {
  const { boot, requestCustomerLogin } = useStore();
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <NavLink to="/" end>
        <Home size={20} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/mattresses">
        <Grid2X2 size={20} />
        <span>Shop</span>
      </NavLink>
      <NavLink to="/quiz">
        <Sparkles size={20} />
        <span>Sleep finder</span>
      </NavLink>
      <NavLink to="/wishlist">
        <Heart size={20} />
        <span>Saved</span>
      </NavLink>
      {boot.user?.role === "customer" ? (
        <NavLink to="/account">
          <Avatar user={boot.user} />
          <span>Account</span>
        </NavLink>
      ) : (
        <button
          aria-label="Open customer sign-in"
          onClick={() => requestCustomerLogin()}
        >
          <User size={20} />
          <span>Sign in</span>
        </button>
      )}
    </nav>
  );
}
export function TrustStrip() {
  return (
    <div className="trust-strip">
      {[
        [
          MapPin,
          "Visit our Ahmedabad shop",
          "Find your comfort with our team.",
          "/support",
        ],
        [
          Truck,
          "Delivery options",
          "Timing confirmed by the owner.",
          "/page/shipping",
        ],
        [
          ShieldCheck,
          "Warranty information",
          "Ask about your selected product.",
          "/page/warranty",
        ],
        [
          Leaf,
          "Thoughtfully made",
          "Better materials. Better rest.",
          "/page/about",
        ],
      ].map(([Icon, t, s, to]) => (
        <Link key={t} to={to}>
          <Icon size={27} strokeWidth={1.35} />
          <div>
            <strong>{t}</strong>
            <span>{s}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
export function ProductCard({ p, compact = false }) {
  const { wishlist, toggleWish, compare, toggleCompare, addCart } = useStore();
  const [quick, setQuick] = useState(false);
  return (
    <article className="product-card">
      <div className={"product-image " + p.id}>
        <Link to={"/product/" + p.slug} aria-label={`View ${p.name}`}>
          <img
            src={p.image}
            alt={`${p.name} ${p.material} mattress`}
            loading="lazy"
            width="780"
            height="585"
          />
        </Link>
        {p.badge && (
          <span
            className={"product-badge " + (p.id === "hybrid" ? "dark" : "")}
          >
            {p.badge}
          </span>
        )}
        <button
          className={"wish-btn " + (wishlist.includes(p.id) ? "saved" : "")}
          onClick={() => toggleWish(p.id)}
          aria-label={
            wishlist.includes(p.id)
              ? `Remove ${p.name} from wishlist`
              : `Save ${p.name}`
          }
        >
          <Heart
            size={18}
            fill={wishlist.includes(p.id) ? "currentColor" : "none"}
            strokeWidth={1.5}
          />
        </button>
        <div className="product-image-actions">
          <button onClick={() => setQuick(true)}>
            <Eye size={15} />
            Quick view
          </button>
          <button
            aria-pressed={compare.includes(p.id)}
            onClick={() => toggleCompare(p.id)}
          >
            <GitCompareArrows size={15} />
            {compare.includes(p.id) ? "Added" : "Compare"}
          </button>
        </div>
      </div>
      <div className="product-info">
        <div className="product-meta">
          <span>{p.category}</span>
          <Stars small rating={p.rating} count={p.reviews} />
        </div>
        <Link to={"/product/" + p.slug}>
          <h3>{p.name}</h3>
        </Link>
        <p>{p.subtitle}</p>
        <div className="product-spec-tags">
          <span>{p.firmness} comfort</span>
          <i />{" "}
          <span>
            {["Bedding", "Accessories"].includes(p.category)
              ? "Everyday essential"
              : p.thickness + "″ height"}
          </span>
        </div>
        <div className="product-bottom">
          <div>
            <span className="from">From </span>
            <strong>{money(p.price)}</strong>{" "}
            <del>{money(p.original_price)}</del>
            <small>Inclusive of all taxes</small>
          </div>
          <button
            className="card-add"
            onClick={() => addCart(p)}
            disabled={!p.stock}
            aria-label={`Add ${p.name} to bag`}
          >
            <Plus size={19} />
          </button>
        </div>
      </div>
      {quick && (
        <Modal title="A closer look" onClose={() => setQuick(false)} wide>
          <div className="quick-view">
            <img src={p.image} alt={p.name} />
            <div>
              <span className="eyebrow">{p.category}</span>
              <h2>{p.name}</h2>
              <Stars rating={p.rating} count={p.reviews} />
              <p>{p.description}</p>
              <h3>{money(p.price)}</h3>
              <p className="muted">
                {["Bedding", "Accessories"].includes(p.category)
                  ? "Standard"
                  : "Queen · " + p.thickness + " inches"}{" "}
                · {p.firmness}
              </p>
              <Button
                onClick={() => {
                  setQuick(false);
                  addCart(p);
                }}
              >
                Add to bag <ShoppingBag size={17} />
              </Button>
              <Link
                onClick={() => setQuick(false)}
                to={"/product/" + p.slug}
                className="text-link"
              >
                Explore all the details <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </article>
  );
}
export function SearchOverlay() {
  const { setSearchOpen, products, boot } = useStore();
  const [q, setQ] = useState(""),
    [active, setActive] = useState(-1),
    [recent, setRecent] = useState(() => {
      try {
        const saved = JSON.parse(localStorage.getItem("nocte-searches"));
        return Array.isArray(saved)
          ? saved.filter((s) => typeof s === "string").slice(0, 5)
          : [];
      } catch {
        return [];
      }
    });
  const deferred = useDeferredValue(q),
    input = useRef(),
    navigate = useNavigate();
  const all = searchProducts(products, deferred),
    results = all.slice(0, 5),
    isSearching = Boolean(q.trim());
  useEffect(() => setActive(-1), [q]);
  function remember(value) {
    if (!value.trim()) return;
    const next = [
      value.trim(),
      ...recent.filter((t) => t.toLowerCase() !== value.trim().toLowerCase()),
    ].slice(0, 5);
    setRecent(next);
    try {
      localStorage.setItem("nocte-searches", JSON.stringify(next));
    } catch {}
  }
  function go(value = q) {
    remember(value);
    setSearchOpen(false);
    navigate(
      value.trim()
        ? "/search?q=" + encodeURIComponent(value.trim())
        : "/mattresses",
    );
  }
  function openProduct(p) {
    remember(q);
    setSearchOpen(false);
    navigate("/product/" + p.slug);
  }
  return (
    <Modal
      title="Find your kind of comfort."
      onClose={() => setSearchOpen(false)}
      wide
    >
      <div className="search-experience">
        <form
          className="search-input large polished-search-input"
          onSubmit={(e) => {
            e.preventDefault();
            active >= 0 && results[active]
              ? openProduct(results[active])
              : go();
          }}
        >
          <Search size={21} />
          <input
            ref={input}
            data-autofocus
            autoFocus
            maxLength={100}
            placeholder="Try ‘queen hybrid’ or ‘pillow’"
            aria-label="Search products"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={results.length > 0}
            aria-controls="comfort-search-results"
            aria-activedescendant={
              active >= 0 ? `comfort-result-${active}` : undefined
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                if (results.length)
                  setActive((i) =>
                    e.key === "ArrowDown"
                      ? (i + 1) % results.length
                      : (i - 1 + results.length) % results.length,
                  );
              }
            }}
          />
          {q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQ("");
                input.current?.focus();
              }}
            >
              <X size={17} />
            </button>
          )}
          <button className="search-submit" aria-label="View search results">
            <ArrowRight size={20} />
          </button>
        </form>
        {!isSearching && (
          <div className="search-discovery">
            <span className="eyebrow">EXPLORE YOUR COMFORT</span>
            <div className="chips">
              {[
                ...new Set(
                  boot.categories
                    .filter((c) => products.some((p) => p.category === c.name))
                    .map((c) => c.name),
                ),
              ]
                .slice(0, 4)
                .map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setQ(t);
                      input.current?.focus();
                    }}
                  >
                    {t}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
            </div>
            {recent.length > 0 && (
              <div className="search-recent">
                <div>
                  <span>Recently explored</span>
                  <button
                    className="text-link"
                    onClick={() => {
                      try {
                        localStorage.removeItem("nocte-searches");
                      } catch {}
                      setRecent([]);
                    }}
                  >
                    Clear history
                  </button>
                </div>
                <div className="chips">
                  {recent.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setQ(t);
                        input.current?.focus();
                      }}
                    >
                      <Clock size={13} />
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="search-results-heading">
          <span className="eyebrow">
            {isSearching
              ? "MATCHED TO YOUR SEARCH"
              : "A FEW GOOD PLACES TO START"}
          </span>
          <span role="status" aria-live="polite">
            {isSearching
              ? `${all.length} ${all.length === 1 ? "match" : "matches"}`
              : "Explore the collection"}
          </span>
        </div>
        <div
          className="search-results polished-search-results"
          id="comfort-search-results"
          role="listbox"
          aria-label="Product suggestions"
        >
          {results.map((p, i) => (
            <button
              type="button"
              role="option"
              aria-selected={active === i}
              id={`comfort-result-${i}`}
              key={p.id}
              className={active === i ? "is-active" : ""}
              onClick={() => openProduct(p)}
            >
              <img src={p.image} alt="" width="64" height="56" />
              <div>
                <h4>{p.name}</h4>
                <span>
                  {p.category} · {p.firmness} comfort
                </span>
              </div>
              <b>
                {money(p.price)}
                <small>{p.stock ? "Available" : "Out of stock"}</small>
              </b>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
        {!results.length && (
          <div className="search-empty">
            <Search size={29} />
            <h3>No matches for “{q}”.</h3>
            <p>Try a shorter phrase, a material, or a comfort feel.</p>
            <div className="chips">
              {["Hybrid", "Latex", "Pillow"].map((t) => (
                <button key={t} onClick={() => setQ(t)}>
                  {t}
                  <ArrowUpRight size={13} />
                </button>
              ))}
            </div>
          </div>
        )}
        <button className="btn full search-all" onClick={() => go()}>
          {isSearching && all.length
            ? `Explore all ${all.length} ${all.length === 1 ? "match" : "matches"}`
            : isSearching
              ? "View search results"
              : "Shop all mattresses"}
          <ArrowRight size={17} />
        </button>
        <p className="search-keyboard-hint">
          <span>↑ ↓ to explore</span>
          <span>Enter to open</span>
          <span>Esc to close</span>
        </p>
      </div>
    </Modal>
  );
}
export function CartDrawer() {
  const { cart, setCart, cartOpen, setCartOpen, boot } = useStore();
  const navigate = useNavigate();
  if (!cartOpen) return null;
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  return (
    <Modal
      title={`Your bag (${cart.reduce((s, i) => s + i.quantity, 0)})`}
      onClose={() => setCartOpen(false)}
      drawer
    >
      {!cart.length ? (
        <div onClick={(e) => e.target.closest("a") && setCartOpen(false)}>
          <Empty
            title="Good sleep starts here."
            text="Your bag is taking a little rest. Let’s find your comfort."
          />
        </div>
      ) : (
        <>
          <div className="shipping-progress">
            <Truck size={17} />
            <span>
              {subtotal >= boot.settings.shippingThreshold
                ? "Your order qualifies for free delivery."
                : `You’re ${money(boot.settings.shippingThreshold - subtotal)} away from free delivery.`}
            </span>
            <div>
              <i
                style={{
                  width:
                    Math.min(
                      100,
                      (subtotal / boot.settings.shippingThreshold) * 100,
                    ) + "%",
                }}
              />
            </div>
          </div>
          <div className="cart-items">
            {cart.map((i, n) => (
              <div className="cart-item" key={n}>
                <img src={i.image} alt={i.name} />
                <div>
                  <Link
                    to={"/product/" + i.productId}
                    onClick={() => setCartOpen(false)}
                  >
                    <h4>{i.name}</h4>
                  </Link>
                  <p>
                    {i.size} · {i.thickness}″ · {i.firmness}
                  </p>
                  <div className="cart-item-controls">
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
                      aria-label={`Remove ${i.name}`}
                      onClick={() => setCart(cart.filter((_, j) => j !== n))}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <b>{money(i.price * i.quantity)}</b>
              </div>
            ))}
          </div>
          <div className="cart-drawer-summary">
            <div>
              <span>Estimated subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <p>Taxes included. Discounts calculated at checkout.</p>
            <button
              className="btn full"
              onClick={() => {
                setCartOpen(false);
                navigate("/checkout");
              }}
            >
              <Lock size={16} />
              Continue to checkout
              <ArrowRight size={17} />
            </button>
            <button
              className="text-link"
              onClick={() => {
                setCartOpen(false);
                navigate("/cart");
              }}
            >
              View your bag
            </button>
            <span className="fine-print">
              Demo store · No real payment will be taken
            </span>
          </div>
        </>
      )}
    </Modal>
  );
}
export function CompareBar() {
  const { compare, setCompare } = useStore();
  const loc = useLocation();
  if (!compare.length || loc.pathname === "/compare") return null;
  return (
    <div className="compare-bar">
      <GitCompareArrows size={18} />
      <span>
        {compare.length} mattress{compare.length > 1 ? "es" : ""} to compare
      </span>
      <Link to="/compare">
        Compare <ArrowRight size={15} />
      </Link>
      <button aria-label="Clear comparison" onClick={() => setCompare([])}>
        <X size={16} />
      </button>
    </div>
  );
}
export function Footer() {
  const { boot, notify } = useStore();
  const [email, setEmail] = useState(""),
    [loading, setLoading] = useState(false);
  return (
    <footer className="footer">
      <div className="newsletter">
        <div>
          <span className="eyebrow">A LITTLE MORE REST IN YOUR INBOX</span>
          <h2>Good nights. Great things.</h2>
          <p>
            Sleep stories, thoughtful tips, and first access to something good.
          </p>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              await api("/support", {
                method: "POST",
                body: {
                  name: "Newsletter subscriber",
                  email,
                  subject: "Newsletter subscription request",
                  category: "Newsletter",
                  message:
                    "I would like to receive sleep tips and offers. Please add me when email delivery is connected.",
                },
              });
              notify("You’re on the list. Thanks for making room for rest.");
              setEmail("");
            } catch (err) {
              notify(err.message, "error");
            }
            setLoading(false);
          }}
        >
          <div>
            <input
              type="email"
              required
              placeholder="Your email address"
              aria-label="Email for newsletter"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button disabled={loading} aria-label="Subscribe to newsletter">
              <ArrowRight size={22} />
            </button>
          </div>
          <small>
            Only the good stuff. Unsubscribe anytime through support.
          </small>
        </form>
      </div>
      <div className="footer-main">
        <div className="footer-brand">
          <Link to="/" className="logo">
            <Brand />
          </Link>
          <p>
            Thoughtfully made for
            <br />a better kind of rest.
          </p>
          <div className="footer-social">
            {boot.settings.instagramUrl && (
              <a
                href={boot.settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <Instagram size={19} />
              </a>
            )}
            {boot.settings.facebookUrl && (
              <a
                href={boot.settings.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <Facebook size={19} />
              </a>
            )}
            <a
              href={"tel:" + boot.settings.phone.replace(/[^+0-9]/g, "")}
              aria-label="Call our shop"
            >
              <Phone size={19} />
            </a>
            <Link to="/page/about" className="text-link">
              Get to know us <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        {[
          [
            "Find your comfort",
            [
              ["Mattresses", "/mattresses"],
              ["Beds & Bedding", "/bedding"],
              ["Accessories", "/accessories"],
              ["Find your mattress", "/quiz"],
              ["Compare mattresses", "/compare"],
            ],
          ],
          [
            "Here to help",
            [
              ["Contact us", "/support"],
              ["Track your order", "/tracking"],
              ["FAQs", "/faq"],
              ["Shipping & delivery", "/page/shipping"],
              ["Returns & support", "/page/returns"],
            ],
          ],
          [
            "A little about us",
            [
              ["Our story", "/page/about"],
              ["The Sleep Guide", "/sleep-guide"],
              ["Warranty", "/page/warranty"],
              ["Your account", "/account"],
            ],
          ],
        ].map(([title, links]) => (
          <div className="footer-links" key={title}>
            <h4>{title}</h4>
            {links.map(([t, l]) => (
              <Link to={l} key={t}>
                {t}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="footer-visit">
        <div>
          <MapPin size={22} />
          <div>
            <strong>Comfort, closer to home.</strong>
            <p>{boot.settings.address}</p>
          </div>
        </div>
        <div className="footer-visit-actions">
          <a href={"tel:" + boot.settings.phone.replace(/[^+0-9]/g, "")}>
            {boot.settings.phone}
          </a>
          {boot.settings.mapUrl && (
            <a
              className="text-link"
              href={boot.settings.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit the shop <ArrowUpRight size={16} />
            </a>
          )}
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {boot.settings.storeName}. Make room for
          rest.
        </span>
        <div>
          <Link to="/page/privacy">Privacy</Link>
          <Link to="/page/terms">Terms</Link>
          <Link to="/page/cookies">Cookies</Link>
        </div>
        <ThemeSelect />
        <span className="footer-country">India · INR ₹</span>
      </div>
      <p className="demo-footer">
        {boot.demo
          ? "Local preview. Products, reviews and orders include sample data. No real payments are processed."
          : boot.checkoutMode !== "cod"
            ? "Preview store. No real purchase or callback is scheduled."
            : "Orders require owner confirmation. No payment is collected online."}
      </p>
    </footer>
  );
}
