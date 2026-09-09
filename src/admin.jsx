import React, { useState, useEffect, useMemo } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingBag,
  Users,
  Star,
  Tag,
  FileText,
  ChartNoAxesCombined,
  MessageSquare,
  UserCog,
  ShieldCheck,
  ScrollText,
  Settings,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Plus,
  Download,
  MoreHorizontal,
  Menu,
  X,
  LogOut,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Clock,
  AlertTriangle,
  Check,
  CheckCircle2,
  Eye,
  PenLine,
  Copy,
  Archive,
  Upload,
  RotateCcw,
  Filter,
  Mail,
  Trash2,
  Lock,
  Monitor,
  Layers,
  Image,
  Globe,
  Truck,
  CreditCard,
  Palette,
  KeyRound,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  api,
  useStore,
  Brand,
  useData,
  Button,
  Field,
  Modal,
  Loading,
  ErrorState,
  Empty,
  money,
  date,
  ThemeSelect,
} from "./core";
import { LoginForm, downloadInvoice } from "./commerce";
import { MediaUpload, MultiImageUpload } from "./media-upload";
import { SizePriceGrid } from "./size-price-grid";
import { OrderReceipt } from "./order-documents";
const sections = [
  ["dashboard", "Overview", LayoutDashboard],
  ["products", "Products", Package],
  ["inventory", "Inventory", Boxes],
  ["orders", "Orders", ShoppingBag],
  ["customers", "Customers", Users],
  ["reviews", "Reviews", Star],
  ["coupons", "Coupons", Tag],
  ["content", "Content", FileText],
  ["categories", "Categories", Layers],
  ["analytics", "Analytics", ChartNoAxesCombined],
  ["support", "Support", MessageSquare],
  ["staff", "Team", UserCog],
  ["security", "Security", ShieldCheck],
  ["audit", "Audit Log", ScrollText],
  ["settings", "Settings", Settings],
];
function allowed(boot, s) {
  return boot.permissions.includes("*") || boot.permissions.includes(s);
}
export default function Admin() {
  const { boot, logout } = useStore();
  const { section = "dashboard" } = useParams();
  const [mobile, setMobile] = useState(false),
    [notifications, setNotifications] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    setMobile(false);
  }, [section]);
  if (!boot.user || boot.user.role === "customer")
    return (
      <main className="owner-login">
        <div className="owner-login-brand">
          <Link className="logo" to="/">
            <Brand />
          </Link>
          <span>THE BUSINESS OF BETTER SLEEP.</span>
          <div>
            <div className="owner-orbit">
              <MoonMark />
            </div>
            <h2>
              A thoughtful business.
              <br />A considered workspace.
            </h2>
            <p>Everything you need to make better nights happen.</p>
          </div>
          <Link to="/" className="text-link">
            Back to the storefront <ArrowRight size={16} />
          </Link>
        </div>
        <LoginForm
          owner
          onSuccess={(user) =>
            nav(
              "/owner/" +
                ({
                  owner: "dashboard",
                  manager: "dashboard",
                  content: "content",
                  support: "support",
                  finance: "analytics",
                }[user?.role] || "dashboard"),
            )
          }
        />
      </main>
    );
  if (!allowed(boot, section))
    return (
      <div className="section">
        <Empty
          icon={Lock}
          title="This space needs a little more access."
          text="Your role doesn’t have permission for this section. Contact the owner."
          action="Go to your workspace"
          to={"/owner/" + (boot.permissions[0] || "dashboard")}
        />
      </div>
    );
  return (
    <div className="admin-app">
      <aside className={"admin-sidebar " + (mobile ? "open" : "")}>
        <div className="admin-brand">
          <Link to="/owner/dashboard" className="logo">
            <Brand />
          </Link>
          <span>WORKSPACE</span>
          <button
            className="mobile-only icon-btn"
            onClick={() => setMobile(false)}
            aria-label="Close admin navigation"
          >
            <X size={20} />
          </button>
        </div>
        <div className="store-switch">
          <span>RF</span>
          <div>
            <strong>{boot.settings.storeName}</strong>
            <small>India · Demo store</small>
          </div>
          <span className="live-dot" />
        </div>
        <nav aria-label="Owner navigation">
          <span className="admin-nav-label">OVERVIEW</span>
          {sections
            .filter(([s]) => allowed(boot, s))
            .map(([s, label, Icon], i) => (
              <React.Fragment key={s}>
                {s === "products" && (
                  <span className="admin-nav-label">CATALOG</span>
                )}
                {s === "content" && (
                  <span className="admin-nav-label">MARKETING</span>
                )}
                {s === "support" && (
                  <span className="admin-nav-label">CUSTOMER CARE</span>
                )}
                {s === "staff" && (
                  <span className="admin-nav-label">ADMIN</span>
                )}
                <NavLink
                  to={"/owner/" + s}
                  className={section === s ? "active" : ""}
                >
                  <Icon size={18} strokeWidth={1.6} />
                  <span>{label}</span>
                </NavLink>
              </React.Fragment>
            ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link to="/" target="_blank">
            <ExternalLink size={17} />
            View storefront
            <ArrowUpRight size={14} />
          </Link>
          <div className="admin-user">
            <span>{boot.user.name[0]}</span>
            <div>
              <strong>{boot.user.name}</strong>
              <small>
                {boot.user.role === "owner" ? "Store owner" : boot.user.role}
              </small>
            </div>
            <button
              aria-label="Sign out of owner account"
              onClick={async () => {
                await logout();
                nav("/owner");
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <div
          className="admin-mobile-overlay"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="icon-btn mobile-only"
            aria-label="Open owner navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={21} />
          </button>
          <div className="admin-breadcrumb">
            Workspace <ChevronRight size={13} />
            <strong>{sections.find((s) => s[0] === section)?.[1]}</strong>
          </div>
          <div className="admin-top-actions">
            <form
              className="admin-global-search"
              onSubmit={(e) => {
                e.preventDefault();
                const q = new FormData(e.currentTarget).get("q");
                nav("/owner/products?q=" + encodeURIComponent(q));
              }}
            >
              <Search size={16} />
              <input
                name="q"
                placeholder="Search your store…"
                aria-label="Search owner products"
              />
              <kbd>↵</kbd>
            </form>
            <ThemeSelect />
            <button
              className="icon-btn notification-btn"
              aria-label="Owner notifications"
              onClick={() => setNotifications(true)}
            >
              <Bell size={19} />
              <i />
            </button>
            <span className="admin-avatar">{boot.user.name[0]}</span>
          </div>
        </header>
        <div className="admin-content" key={section}>
          {section === "dashboard" || section === "analytics" ? (
            <Dashboard analytics={section === "analytics"} />
          ) : section === "settings" ? (
            <StoreSettings />
          ) : section === "security" ? (
            <SecurityPanel />
          ) : (
            <Management section={section} />
          )}
        </div>
        <footer className="admin-footer">
          <span>Owner Workspace · A better kind of business.</span>
          <span>
            <i />
            {boot.storage?.database === "postgres"
              ? "Persistent PostgreSQL"
              : "Local SQLite preview"}{" "}
            ·{" "}
            {boot.checkoutMode === "cod" ? "Callback orders" : "Preview orders"}
          </span>
        </footer>
      </div>
      {notifications && (
        <Modal
          title="A little heads-up"
          onClose={() => setNotifications(false)}
        >
          <AdminNotifications onClose={() => setNotifications(false)} />
        </Modal>
      )}
    </div>
  );
}
function MoonMark() {
  return (
    <svg viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="50" stroke="currentColor" opacity=".2" />
      <path
        d="M75 28a33 33 0 1 0 17 55A38 38 0 0 1 75 28Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M91 27v14m-7-7h14" stroke="currentColor" />
    </svg>
  );
}
function AdminNotifications({ onClose }) {
  const { boot } = useStore(),
    { data, error, reload } = useData(
      "/admin/" +
        (allowed(boot, "dashboard") ? "dashboard" : boot.permissions[0]),
    );
  if (!data)
    return error ? <ErrorState error={error} retry={reload} /> : <Loading />;
  if (!allowed(boot, "dashboard"))
    return (
      <p>
        Your workspace is ready. Open your assigned section for the latest
        updates.
      </p>
    );
  return (
    <div className="admin-notifications">
      {[
        [
          "orders",
          ShoppingBag,
          `${data.pending} orders need your attention`,
          "Confirm, pack, and keep good nights moving.",
        ],
        [
          "inventory",
          Boxes,
          `${data.lowStock.length} products running low`,
          "A good time to plan your next restock.",
        ],
        [
          "support",
          MessageSquare,
          `${data.tickets} open support conversations`,
          "A little help goes a long way.",
        ],
        [
          "reviews",
          Star,
          `${data.reviews} reviews awaiting moderation`,
          "Hear how your customers are sleeping.",
        ],
      ].map(([s, I, t, p]) => (
        <Link key={s} to={"/owner/" + s} onClick={onClose}>
          <I size={21} />
          <div>
            <h4>{t}</h4>
            <p>{p}</p>
          </div>
          <ArrowRight size={16} />
        </Link>
      ))}
    </div>
  );
}
function Dashboard({ analytics = false }) {
  const { data, error, reload } = useData(
    "/admin/" + (analytics ? "analytics" : "dashboard"),
  );
  const { boot } = useStore();
  const [days, setDays] = useState("30"),
    [metric, setMetric] = useState("revenue"),
    [from, setFrom] = useState(
      new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    ),
    [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data) return <Loading />;
  const chart =
    days === "custom"
      ? data.chart.filter((r) => r.fullDate >= from && r.fullDate <= to)
      : data.chart.slice(-Number(days));
  const revenue = chart.reduce((s, r) => s + r.revenue, 0),
    orders = chart.reduce((s, r) => s + r.orders, 0);
  return (
    <>
      <div className="admin-page-title">
        <div>
          <div className="admin-overline">
            {analytics
              ? "THE BIGGER PICTURE"
              : new Date()
                  .toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                  })
                  .toUpperCase()}
          </div>
          <h1>
            {analytics
              ? "Good decisions start with clarity."
              : "A good day for better nights."}
            <span>{analytics ? "" : "☀"}</span>
          </h1>
          <p>
            {analytics
              ? "A closer look at what’s working, and what comes next."
              : `Welcome back, ${boot.user.name.split(" ")[0]}. Here’s how your store is doing.`}
          </p>
        </div>
        <div className="button-row">
          <select
            className="admin-select"
            aria-label="Dashboard date range"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          >
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 12 months</option>
            <option value="custom">Custom range</option>
          </select>
          <button
            className="btn admin-primary"
            onClick={() => exportCSV(chart, "nocte-sales")}
          >
            <Download size={16} />
            Export report
          </button>
        </div>
      </div>
      {days === "custom" && (
        <div className="admin-date-range">
          <label>
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              min={from}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      )}
      <div className="admin-demo-banner">
        <span>
          <span className="live-dot" />
          Your store at a glance
        </span>
        <span>
          Order values, not collected payments <ShieldCheck size={14} />
        </span>
      </div>
      <div className="kpi-grid">
        {[
          [
            IndianRupee,
            "Total order value",
            money(revenue),
            "Uncancelled orders in this period",
            "revenue",
          ],
          [
            ShoppingBag,
            "Orders",
            orders,
            "Orders in selected period",
            "orders",
          ],
          [
            Users,
            "Customers",
            data.customers,
            "Registered customer accounts",
            "customers",
          ],
          [
            TrendingUp,
            "Average order value",
            money(orders ? Math.round(revenue / orders) : 0),
            "Order value ÷ total orders",
            "aov",
          ],
        ].map(([I, t, v, n, k]) => (
          <div className="kpi-card" key={t}>
            <div>
              <span>{t}</span>
              <I size={18} />
            </div>
            <strong>{v}</strong>
            <div className="kpi-detail">
              <span className="kpi-trend">
                <Activity size={12} />
                Demo
              </span>
              <span>{n}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Quick Actions */}
      {!analytics && (
        <div className="quick-actions-row">
          <Link to="/owner/products" className="quick-action-card">
            <div className="qa-icon qa-green"><Package size={20} /></div>
            <div>
              <strong>Add Product</strong>
              <span>Create a new listing</span>
            </div>
            <ArrowRight size={16} />
          </Link>
          <Link to="/owner/orders" className="quick-action-card">
            <div className="qa-icon qa-blue"><ShoppingBag size={20} /></div>
            <div>
              <strong>View Orders</strong>
              <span>{data.pending} need attention</span>
            </div>
            <ArrowRight size={16} />
          </Link>
          <Link to="/owner/inventory" className="quick-action-card">
            <div className="qa-icon qa-orange"><Boxes size={20} /></div>
            <div>
              <strong>Stock Check</strong>
              <span>{data.lowStock.length} running low</span>
            </div>
            <ArrowRight size={16} />
          </Link>
          <Link to="/owner/settings" className="quick-action-card">
            <div className="qa-icon qa-purple"><Settings size={20} /></div>
            <div>
              <strong>Store Settings</strong>
              <span>Update your details</span>
            </div>
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
      <div className="dashboard-charts">
        <section className="admin-panel revenue-panel">
          <div className="panel-heading">
            <div>
              <h2>
                {metric === "revenue"
                  ? "Order value overview"
                  : "Orders overview"}
              </h2>
              <p>A little perspective on your store’s performance.</p>
            </div>
            <div className="segmented">
              <button
                className={metric === "revenue" ? "active" : ""}
                onClick={() => setMetric("revenue")}
              >
                Order value
              </button>
              <button
                className={metric === "orders" ? "active" : ""}
                onClick={() => setMetric("orders")}
              >
                Orders
              </button>
            </div>
          </div>
          <div className="chart-total">
            <strong>{metric === "revenue" ? money(revenue) : orders}</strong>
            <span>
              <i /> {metric === "revenue" ? "Order value" : "Orders"} ·{" "}
              {days === "custom" ? "Custom dates" : `Last ${days} days`}
            </span>
          </div>
          <div className="revenue-chart">
            <ResponsiveContainer width="100%" height={235}>
              <AreaChart
                data={chart}
                margin={{ top: 15, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6b927d" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6b927d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 5"
                  vertical={false}
                  stroke="var(--line)"
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                  minTickGap={35}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                  tickFormatter={(v) =>
                    metric === "revenue" ? "₹" + v / 1000 + "k" : v
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => (metric === "revenue" ? money(v) : v)}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke="#60836e"
                  fill="url(#revenueFill)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            <span>All amounts in INR · Taxes included</span>
            <span>
              Updated from your temporary database <CheckCircle2 size={12} />
            </span>
          </div>
        </section>
        <section className="admin-panel attention-panel">
          <div className="panel-heading">
            <div>
              <h2>A little attention needed</h2>
              <p>Keep the good things moving.</p>
            </div>
            <span className="attention-count">
              {data.pending + data.lowStock.length + data.tickets}
            </span>
          </div>
          {[
            [
              ShoppingBag,
              "Orders to fulfil",
              `${data.pending} orders waiting for the next step`,
              "orders",
              "warm",
            ],
            [
              Boxes,
              "Time for a restock",
              `${data.lowStock.length} products below 20 units`,
              "inventory",
              "rose",
            ],
            [
              MessageSquare,
              "A conversation to continue",
              `${data.tickets} open customer requests`,
              "support",
              "blue",
            ],
            [
              Star,
              "Customer reviews",
              `${data.reviews} reviews to moderate`,
              "reviews",
              "green",
            ],
          ].map(([I, t, p, to, c]) => (
            <Link className="attention-item" to={"/owner/" + to} key={t}>
              <span className={"attention-icon " + c}>
                <I size={18} />
              </span>
              <div>
                <h4>{t}</h4>
                <p>{p}</p>
              </div>
              <ChevronRight size={16} />
            </Link>
          ))}
          <div className="security-small">
            <ShieldCheck size={17} />
            <div>
              <strong>Server-side access checks active</strong>
              <span>Sessions, permissions & audit logging enabled</span>
            </div>
          </div>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="admin-panel recent-orders">
          <div className="panel-heading">
            <div>
              <h2>Recent orders</h2>
              <p>The start of someone’s better night.</p>
            </div>
            <Link className="admin-link" to="/owner/orders">
              View all orders <ArrowRight size={14} />
            </Link>
          </div>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.slice(0, 5).map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.id}</strong>
                      <small>{date(o.created)}</small>
                    </td>
                    <td>
                      <span className="table-customer">
                        <i>{o.customer[0]}</i>
                        {o.customer}
                      </span>
                    </td>
                    <td>
                      <Status value={o.status} />
                    </td>
                    <td>
                      <strong>{money(o.total)}</strong>
                    </td>
                    <td>
                      <Link
                        to={"/owner/orders?q=" + o.id}
                        aria-label={"Open " + o.id}
                      >
                        <ArrowUpRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="admin-panel top-products">
          <div className="panel-heading">
            <div>
              <h2>The crowd favourites</h2>
              <p>Your best-selling comfort.</p>
            </div>
            <Link to="/owner/products" aria-label="View all products">
              <ArrowUpRight size={18} />
            </Link>
          </div>
          {data.topProducts.slice(0, 4).map((p, i) => (
            <div className="top-product" key={p.name}>
              <span>0{i + 1}</span>
              <img src={p.image} alt="" />
              <div>
                <h4>{p.name}</h4>
                <p>{p.sold} sold</p>
              </div>
              <b>{money(p.revenue)}</b>
            </div>
          ))}
        </section>
      </div>
      {analytics && (
        <div className="dashboard-bottom">
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <h2>Order value by product</h2>
                <p>Order values across your collection</p>
              </div>
            </div>
            <div className="analytics-bars">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.topProducts}
                  layout="vertical"
                  margin={{ left: 25, right: 25 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={90}
                    tick={{ fontSize: 11, fill: "var(--muted)" }}
                  />
                  <Tooltip formatter={money} />
                  <Bar dataKey="revenue" fill="#738c7c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="admin-panel analytics-notes">
            <h2>A little more context.</h2>
            <div>
              <span>Simulated refunds</span>
              <b>{money(data.refunds)}</b>
            </div>
            <div>
              <span>Pending orders</span>
              <b>{data.pending}</b>
            </div>
            <div>
              <span>Low-stock products</span>
              <b>{data.lowStock.length}</b>
            </div>
            <div>
              <span>Conversion rate</span>
              <b>Not tracked</b>
            </div>
            <p>
              Conversion and acquisition metrics need a consent-aware analytics
              integration. We don’t invent visitor numbers.
            </p>
          </section>
        </div>
      )}
      <div className="admin-quick-actions">
        <span>
          <span className="quick-star">✧</span> A little less admin. A lot more
          possibility.
        </span>
        <div>
          <Link to="/owner/products">
            Manage products <ArrowRight size={14} />
          </Link>
          <Link to="/owner/content">
            Update your storefront <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </>
  );
}
function Status({ value }) {
  return (
    <span
      className={"status " + String(value).toLowerCase().replaceAll(" ", "-")}
    >
      <i />
      {value}
    </span>
  );
}
const descriptions = {
  products: "Thoughtfully made products, thoughtfully managed.",
  inventory: "Keep every layer of your stock in balance.",
  orders: "Every order is the start of a better night.",
  customers: "Get to know the people behind the good nights.",
  reviews: "Listen, respond, and build a little more trust.",
  coupons: "A little incentive for beautifully better nights.",
  content: "Your voice. Your story. Your storefront.",
  categories: "Make finding the right comfort feel effortless.",
  support: "A little care makes all the difference.",
  staff: "Good people. The right access. A better business.",
  audit: "A clear record of the things that change.",
};
function exportCSV(rows, name) {
  if (!rows?.length) return;
  const keys = Object.keys(rows[0]).filter(
    (k) =>
      !["password", "messages", "images", "specs", "address", "items"].includes(
        k,
      ),
  );
  const esc = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const text = [
    keys.map(esc).join(","),
    ...rows.map((r) =>
      keys
        .map((k) => esc(typeof r[k] === "object" ? JSON.stringify(r[k]) : r[k]))
        .join(","),
    ),
  ].join("\n");
  const u = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = u;
  a.download = name + ".csv";
  a.click();
  URL.revokeObjectURL(u);
}
function Management({ section }) {
  const { data, error, reload } = useData("/admin/" + section);
  const { notify, refresh, boot } = useStore();
  const [query, setQuery] = useState(
      new URLSearchParams(location.search).get("q") || "",
    ),
    [filter, setFilter] = useState("All"),
    [page, setPage] = useState(1),
    [sort, setSort] = useState("newest"),
    [edit, setEdit] = useState(null),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState([]),
    [history, setHistory] = useState(null),
    [view, setView] = useState("table");
  useEffect(() => {
    setPage(1);
  }, [query, filter]);
  useEffect(() => {
    setQuery(new URLSearchParams(location.search).get("q") || "");
  }, [location.search]);
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data) return <Loading />;
  const rows = data
    .filter((r) =>
      Object.values(r).some(
        (v) =>
          typeof v !== "object" &&
          String(v).toLowerCase().includes(query.toLowerCase()),
      ),
    )
    .filter(
      (r) =>
        filter === "All" ||
        (section === "products"
          ? filter === "Active"
            ? r.active
            : filter === "Archived"
              ? !r.active
              : true
          : section === "inventory"
            ? filter === "Low stock"
              ? r.stock < 20
              : filter === "Out of stock"
                ? r.stock === 0
                : r.stock >= 20
            : section === "orders" ||
                section === "reviews" ||
                section === "support"
              ? r.status === filter
              : section === "content"
                ? r.type === filter
                : true),
    );
  if (sort === "name")
    rows.sort((a, b) =>
      String(a.name || a.title || a.customer || a.code || a.id).localeCompare(
        String(b.name || b.title || b.customer || b.code || b.id),
      ),
    );
  const pages = Math.max(1, Math.ceil(rows.length / 8)),
    visible = rows.slice((page - 1) * 8, page * 8);
  const title = sections.find((s) => s[0] === section)?.[1];
  const addable = [
    "products",
    "coupons",
    "content",
    "categories",
    "staff",
  ].includes(section);
  const options =
    {
      products: ["Active", "Archived"],
      inventory: ["Low stock", "Out of stock", "Healthy"],
      orders: [
        "Awaiting confirmation",
        "Placed",
        "Confirmed",
        "Packed",
        "Shipped",
        "Out for delivery",
        "Delivered",
        "Cancelled",
        "Refunded",
      ],
      reviews: ["published", "pending", "hidden", "flagged"],
      content: ["guide", "faq", "policy", "banner"],
      support: ["Open", "In progress", "Closed"],
    }[section] || [];
  async function action(url, body, method = "PATCH", message = "All saved.") {
    setBusy(true);
    try {
      await api(url, { method, body });
      notify(message);
      setEdit(null);
      reload();
      refresh();
      return true;
    } catch (e) {
      notify(e.message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (section === "products") {
      const b = {
        ...(edit.id ? edit : {}),
        ...(edit.draftId ? { draftId: edit.draftId } : {}),
        ...(edit.id ? { expectedStock: edit.stock || 0 } : {}),
        ...(edit.images ? { images: edit.images } : {}),
        ...(edit.variants ? { variants: edit.variants } : {}),
        ...f,
        price: f.price ? +f.price : 0,
        original_price: f.original_price ? +f.original_price : null,
        stock: f.stock ? +f.stock : 0,
        active: +f.active,
      };
      await action(
        "/admin/products" + (edit.id ? "/" + edit.id : ""),
        b,
        edit.id ? "PATCH" : "POST",
        "Product saved. Your storefront is up to date.",
      );
    } else if (section === "inventory")
      await action("/admin/inventory/" + edit.id, {
        change: +f.change,
        reason: f.reason,
      });
    else if (section === "orders")
      await action("/admin/orders/" + edit.id, f, "PATCH", "Order updated.");
    else if (section === "coupons")
      await action(
        "/admin/coupons",
        {
          ...f,
          amount: +f.amount,
          minimum: +f.minimum,
          max_discount: +f.max_discount,
          usage_limit: +f.usage_limit,
        },
        "POST",
        "Coupon created.",
      );
    else if (section === "content")
      await action(
        "/admin/content",
        { ...f, active: +f.active },
        "POST",
        "Content published to your storefront.",
      );
    else if (section === "categories")
      await action("/admin/categories", f, "POST", "Category created.");
    else if (section === "staff")
      await action("/admin/staff", f, "POST", "Team member added.");
    else if (section === "reviews")
      await action("/admin/reviews/" + edit.id, f);
    else if (section === "support")
      await action("/admin/support/" + edit.id, f);
  }
  const columns =
    section === "products"
      ? ["Product", "Price", "Inventory", "Status", ""]
      : section === "inventory"
        ? ["Product", "On hand", "Availability", "Threshold", ""]
        : section === "orders"
          ? ["Order", "Customer", "Status", "Total", ""]
          : section === "customers"
            ? ["Customer", "Contact", "Orders", "Lifetime value", ""]
            : section === "reviews"
              ? ["Review", "Rating", "Product", "Status", ""]
              : section === "coupons"
                ? ["Code", "Discount", "Redemptions", "Expires", ""]
                : section === "content"
                  ? ["Page / story", "Type", "Visibility", ""]
                  : section === "categories"
                    ? ["Category", "Description", ""]
                    : section === "support"
                      ? ["Conversation", "Customer", "Category", "Status", ""]
                      : section === "staff"
                        ? ["Team member", "Email", "Role", "Joined", ""]
                        : ["Action", "Actor", "Entity", "Date", ""];
  function cells(r) {
    switch (section) {
      case "products":
        return (
          <>
            <td>
              <div className="table-product">
                <img src={r.image} alt="" />
                <div>
                  <strong>{r.name}</strong>
                  <small>
                    {r.category}{r.badge ? ` · ${r.badge}` : ""}
                  </small>
                </div>
              </div>
            </td>
            <td>
              <strong>{money(r.price)}</strong>
              {r.original_price ? (
                <small className="strike">{money(r.original_price)}</small>
              ) : null}
            </td>
            <td>
              <span className={r.stock <= 5 ? "stock-low" : r.stock <= 0 ? "stock-out" : ""}>
                {r.stock === 0
                  ? "Out of stock"
                  : r.stock <= 5
                    ? `Only ${r.stock} left`
                    : `${r.stock} in stock`}
              </span>
            </td>
            <td>
              <Status value={r.active ? "Active" : "Archived"} />
            </td>
          </>
        );
      case "inventory":
        return (
          <>
            <td>
              <div className="table-product">
                <img src={r.image} alt="" />
                <div>
                  <strong>{r.name}</strong>
                  <small>{r.id.slice(0, 12).toUpperCase()}</small>
                </div>
              </div>
            </td>
            <td>
              <strong>{r.stock}</strong> units
            </td>
            <td>
              <Status
                value={
                  r.stock === 0
                    ? "Out of stock"
                    : r.stock < 20
                      ? "Low stock"
                      : "Healthy"
                }
              />
            </td>
            <td>20 units</td>
          </>
        );
      case "orders":
        return (
          <>
            <td>
              <strong>{r.id}</strong>
              <small>{date(r.created)}</small>
            </td>
            <td>
              <strong>{r.customer}</strong>
              <small>{r.email}</small>
            </td>
            <td>
              <Status value={r.status} />
            </td>
            <td>
              <strong>{money(r.total)}</strong>
              <small>Demo · unpaid</small>
            </td>
          </>
        );
      case "customers":
        return (
          <>
            <td>
              <span className="table-customer">
                <i>{r.name[0]}</i>
                <strong>{r.name}</strong>
              </span>
              <small>Joined {date(r.created)}</small>
            </td>
            <td>
              {r.email}
              <small>{r.phone || "No phone provided"}</small>
            </td>
            <td>{r.orders}</td>
            <td>
              <strong>{money(r.spent)}</strong>
            </td>
          </>
        );
      case "reviews":
        return (
          <>
            <td>
              <strong className="truncate">{r.title}</strong>
              <small>{r.name}</small>
            </td>
            <td>
              <span className="stars">{"★".repeat(r.rating)}</span>
            </td>
            <td>{r.product_id}</td>
            <td>
              <Status value={r.status} />
            </td>
          </>
        );
      case "coupons":
        return (
          <>
            <td>
              <strong className="coupon-code">
                <Tag size={14} />
                {r.code}
              </strong>
              <small>{r.active ? "Active" : "Disabled"}</small>
            </td>
            <td>
              <strong>
                {r.type === "percentage" ? r.amount + "%" : money(r.amount)} off
              </strong>
              <small>Min. {money(r.minimum)}</small>
            </td>
            <td>
              {r.used} / {r.usage_limit}
            </td>
            <td>{date(r.expires)}</td>
          </>
        );
      case "content":
        return (
          <>
            <td>
              <strong>{r.title}</strong>
              <small>
                /{r.type === "guide" ? "sleep-guide/" : "page/"}
                {r.id}
              </small>
            </td>
            <td>
              <Status value={r.type} />
            </td>
            <td>{r.active ? "Published" : "Draft"}</td>
          </>
        );
      case "categories":
        return (
          <>
            <td>
              <strong>{r.name}</strong>
            </td>
            <td>{r.description}</td>
          </>
        );
      case "support":
        return (
          <>
            <td>
              <strong>{r.subject}</strong>
              <small>
                {r.id} · {date(r.created)}
              </small>
            </td>
            <td>
              {r.name}
              <small>{r.email}</small>
            </td>
            <td>{r.category}</td>
            <td>
              <Status value={r.status} />
            </td>
          </>
        );
      case "staff":
        return (
          <>
            <td>
              <span className="table-customer">
                <i>{r.name[0]}</i>
                <strong>{r.name}</strong>
              </span>
            </td>
            <td>{r.email}</td>
            <td>
              <Status value={r.role} />
            </td>
            <td>{date(r.created)}</td>
          </>
        );
      default:
        return (
          <>
            <td>
              <strong>{r.action}</strong>
            </td>
            <td>{r.actor}</td>
            <td className="audit-entity">{r.entity}</td>
            <td>
              {date(r.created)}
              <small>
                {new Date(r.created).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </td>
          </>
        );
    }
  }
  return (
    <>
      <div className="admin-page-title">
        <div>
          <span className="admin-overline">
            YOUR WORKSPACE / {title.toUpperCase()}
          </span>
          <h1>
            {title}
            <span className="title-count">{data.length}</span>
          </h1>
          <p>{descriptions[section]}</p>
        </div>
        <div className="button-row">
          <button
            className="btn admin-outline"
            onClick={() => exportCSV(rows, "nocte-" + section)}
            disabled={!rows.length}
          >
            <Download size={16} />
            Export
          </button>
          {addable && (
            <button className="btn admin-primary" onClick={() => setEdit({})}>
              <Plus size={16} />
              {section === "products"
                ? "Add product"
                : section === "staff"
                  ? "Add team member"
                  : section === "content"
                    ? "Create content"
                    : section === "categories"
                      ? "Add category"
                      : "Create coupon"}
            </button>
          )}
        </div>
      </div>
      {section === "inventory" && (
        <div className="mini-stat-grid">
          <div>
            <span>Total units on hand</span>
            <strong>{data.reduce((s, p) => s + p.stock, 0)}</strong>
          </div>
          <div>
            <span>Low-stock products</span>
            <strong>{data.filter((p) => p.stock < 20).length}</strong>
          </div>
          <div>
            <span>Out of stock</span>
            <strong>{data.filter((p) => !p.stock).length}</strong>
          </div>
          <div>
            <span>Stock accounting</span>
            <strong className="small-stat">Deducted at order placement</strong>
          </div>
        </div>
      )}
      {section === "staff" && (
        <div className="admin-info-note">
          <ShieldCheck size={19} />
          <span>
            Permissions are enforced by the server, not just this interface.
            Staff passwords are hashed and never displayed.
          </span>
        </div>
      )}
      {section === "audit" && (
        <div className="admin-info-note">
          <Lock size={19} />
          <span>
            Audit records are read-only. Product, stock, order, content, access
            and sign-in changes are recorded automatically.
          </span>
        </div>
      )}
      <section className="admin-panel management-panel">
        {section === "products" && (
          <div className="product-filter-tabs">
            {["All", "Active", "Archived"].map((tab) => (
              <button
                key={tab}
                className={`filter-tab ${filter === tab ? "active" : ""}`}
                onClick={() => setFilter(tab)}
              >
                {tab}
                <span className="tab-count">
                  {tab === "All"
                    ? data.length
                    : tab === "Active"
                      ? data.filter((d) => d.active).length
                      : data.filter((d) => !d.active).length}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="management-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={"Search " + title.toLowerCase() + "…"}
              aria-label={"Search " + title}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={14} />
              </button>
            )}
          </div>
          <div>
            {section === "products" && (
              <div className="view-toggle">
                <button
                  className={view === "table" ? "active" : ""}
                  onClick={() => setView("table")}
                  title="Table view"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="3" rx="1" fill="currentColor"/><rect x="1" y="6.5" width="14" height="3" rx="1" fill="currentColor"/><rect x="1" y="12" width="14" height="3" rx="1" fill="currentColor"/></svg>
                </button>
                <button
                  className={view === "grid" ? "active" : ""}
                  onClick={() => setView("grid")}
                  title="Card view"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor"/><rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor"/><rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/></svg>
                </button>
              </div>
            )}
            <select
              aria-label="Filter records"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>All</option>
              {options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <select
              aria-label="Sort records"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="name">Name A–Z</option>
            </select>
            <button
              className="icon-btn"
              onClick={reload}
              aria-label="Refresh records"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
        {selected.length > 0 && (
          <div className="bulk-bar">
            <span>{selected.length} selected</span>
            <button
              className="admin-link"
              onClick={() =>
                exportCSV(
                  data.filter((r) => selected.includes(r.id)),
                  "nocte-selected",
                )
              }
            >
              <Download size={14} />
              Export selected
            </button>
            <button onClick={() => setSelected([])}>Clear selection</button>
          </div>
        )}
        {section === "products" && view === "grid" ? (
          <div className="product-card-grid">
            {visible.map((r) => (
              <div
                key={r.id}
                className="product-card"
                onClick={async () => {
                  try {
                    const detail = await api("/products/" + r.id);
                    setEdit({ ...r, ...detail });
                  } catch {
                    setEdit(r);
                  }
                }}
              >
                <div className="product-card-img">
                  <img src={r.image} alt={r.name} />
                  {!r.active && <span className="card-archived-badge">Archived</span>}
                  {r.badge && <span className="card-badge">{r.badge}</span>}
                </div>
                <div className="product-card-body">
                  <h4>{r.name}</h4>
                  <p className="card-subtitle">{r.subtitle || r.category}</p>
                  <div className="card-price-row">
                    <strong>{money(r.price)}</strong>
                    {r.original_price ? (
                      <span className="card-mrp">{money(r.original_price)}</span>
                    ) : null}
                  </div>
                  <div className="card-meta">
                    <span className={`card-stock ${r.stock <= 0 ? "out" : r.stock <= 5 ? "low" : "ok"}`}>
                      {r.stock <= 0 ? "Out of stock" : r.stock <= 5 ? `Only ${r.stock} left` : `${r.stock} in stock`}
                    </span>
                    <Status value={r.active ? "Active" : "Archived"} />
                  </div>
                </div>
              </div>
            ))}
            {visible.length === 0 && (
              <div className="product-card-empty">
                <Package size={40} />
                <h3>No products found</h3>
                <p>Try a different search or filter.</p>
              </div>
            )}
          </div>
        ) : (
        <div className="table-wrap">
          <table
            className={
              "admin-table " + (section === "audit" ? "audit-table" : "")
            }
          >
            <thead>
              <tr>
                <th className="checkbox-cell">
                  <input
                    type="checkbox"
                    aria-label="Select visible records"
                    checked={
                      visible.length > 0 &&
                      visible.every((r) => selected.includes(r.id))
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [
                              ...new Set([
                                ...selected,
                                ...visible.map((r) => r.id),
                              ]),
                            ]
                          : selected.filter(
                              (id) => !visible.some((r) => r.id === id),
                            ),
                      )
                    }
                  />
                </th>
                {columns.map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td className="checkbox-cell">
                    <input
                      type="checkbox"
                      aria-label={"Select " + (r.name || r.title || r.id)}
                      checked={selected.includes(r.id)}
                      onChange={() =>
                        setSelected(
                          selected.includes(r.id)
                            ? selected.filter((id) => id !== r.id)
                            : [...selected, r.id],
                        )
                      }
                    />
                  </td>
                  {cells(r)}
                  <td>
                    <div className="table-actions">
                      {section === "coupons" ? (
                        <button
                          className="small-btn"
                          onClick={() =>
                            action(
                              "/admin/coupons/" + r.id,
                              { active: r.active ? 0 : 1 },
                              "PATCH",
                              r.active
                                ? "Coupon disabled."
                                : "Coupon activated.",
                            )
                          }
                        >
                          {r.active ? "Disable" : "Activate"}
                        </button>
                      ) : section === "categories" ? (
                        <Link
                          to={
                            "/mattresses?category=" + encodeURIComponent(r.name)
                          }
                          target="_blank"
                          aria-label={"View " + r.name}
                        >
                          <ExternalLink size={16} />
                        </Link>
                      ) : section === "audit" ? (
                        <button
                          aria-label="View audit details"
                          className="icon-btn"
                          onClick={() => setEdit(r)}
                        >
                          <Eye size={16} />
                        </button>
                      ) : (
                        <button
                          className="small-btn"
                          onClick={async () => {
                            if (section === "products" && r.id) {
                              // Fetch full product with variants
                              try {
                                const detail = await api("/products/" + r.id);
                                setEdit({ ...r, ...detail });
                              } catch {
                                setEdit(r);
                              }
                            } else {
                              setEdit(r);
                            }
                          }}
                        >
                          {["orders", "customers", "staff", "support"].includes(
                            section,
                          )
                            ? "View"
                            : section === "inventory"
                              ? "Adjust"
                              : "Edit"}
                          <ChevronRight size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        {!visible.length && view === "table" && (
          <Empty
            icon={Search}
            title="Nothing matches just yet."
            text="Try a different search or filter."
            action=""
          />
        )}
        <div className="pagination">
          <span>
            Showing {rows.length ? (page - 1) * 8 + 1 : 0}–
            {Math.min(page * 8, rows.length)} of {rows.length} records
          </span>
          <div>
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>
              {page} / {pages}
            </span>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </div>
      </section>
      {edit && (
        <Modal
          wide={["products", "orders", "content", "support"].includes(section)}
          title={
            section === "products"
              ? edit.id
                ? "Edit Product"
                : "Add New Product"
              : section === "orders"
                ? `Order ${edit.id}`
                : section === "inventory"
                  ? `Adjust Stock — ${edit.name}`
                  : section === "content"
                    ? "Edit Content"
                    : section === "audit"
                      ? "Audit Details"
                      : section === "staff"
                        ? edit.id
                          ? "Edit Team Member"
                          : "Add Team Member"
                        : section === "customers"
                          ? "Customer Details"
                          : section === "reviews"
                            ? "Review Details"
                            : section === "support"
                              ? edit.subject || "Support Ticket"
                              : section === "categories"
                                ? edit.id ? "Edit Category" : "Add Category"
                                : edit.id ? "Edit Coupon" : "Create Coupon"
          }
          onClose={() => setEdit(null)}
        >
          <form className="form-stack admin-editor" onSubmit={save}>
            {section === "products" && (
              <>
                <MultiImageUpload
                  images={edit.images || (edit.image ? [edit.image] : [])}
                  mainImage={edit.image || ""}
                  maxImages={15}
                  purpose="product"
                  entityId={edit.id || edit.draftId}
                  assetName={(input) =>
                    input.form?.elements?.namedItem?.("name")?.value ||
                    edit.name ||
                    "New product"
                  }
                  disabled={busy}
                  onBusy={setBusy}
                  onChange={(newImages, newMain) =>
                    setEdit((old) => ({
                      ...old,
                      draftId: old.id ? undefined : old.draftId,
                      image: newMain,
                      images: newImages,
                    }))
                  }
                />
                <input
                  type="hidden"
                  name="image"
                  value={edit.image || "/images/essential.webp"}
                />
                <div className="form-grid">
                  <Field
                    label="Product name"
                    name="name"
                    required
                    minLength={2}
                    defaultValue={edit.name}
                  />
                  <Field
                    label="Short description (optional)"
                    name="subtitle"
                    defaultValue={edit.subtitle}
                  />
                  <Field label="Category">
                    <select
                      name="category"
                      defaultValue={edit.category || "Memory Foam"}
                    >
                      {boot.categories.map((c) => (
                        <option key={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Materials">
                    <input
                      name="material"
                      defaultValue={edit.material || "Memory foam"}
                      placeholder="e.g. Memory foam, Latex"
                    />
                  </Field>
                </div>

                {/* Size & Price Grid */}
                <SizePriceGrid
                  variants={edit.variants || []}
                  disabled={busy}
                  onChange={(newVariants) =>
                    setEdit((old) => ({ ...old, variants: newVariants }))
                  }
                />

                <div className="form-grid">
                  <Field
                    label="Product badge"
                    name="badge"
                    defaultValue={edit.badge || ""}
                    placeholder="e.g. Bestseller, New"
                  />
                  <Field label="Visibility">
                    <select name="active" defaultValue={edit.active ?? 1}>
                      <option value="1">Active on storefront</option>
                      <option value="0">Archived</option>
                    </select>
                  </Field>
                </div>
                <Field label="The product story">
                  <textarea
                    rows={4}
                    name="description"
                    defaultValue={edit.description || ""}
                    placeholder="Describe the product in detail..."
                  />
                </Field>
                {edit.id && (
                  <div className="editor-actions">
                    <button
                      type="button"
                      className="text-link"
                      onClick={() =>
                        setEdit({
                          ...edit,
                          id: undefined,
                          name: edit.name + " — copy",
                        })
                      }
                    >
                      <Copy size={14} />
                      Duplicate product
                    </button>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() =>
                        action(
                          "/admin/products/" + edit.id,
                          { ...edit, active: edit.active ? 0 : 1 },
                          "PATCH",
                          edit.active
                            ? "Product archived."
                            : "Product restored.",
                        )
                      }
                    >
                      <Archive size={14} />
                      {edit.active ? "Archive product" : "Restore product"}
                    </button>
                    <Link
                      className="text-link"
                      to={"/product/" + edit.slug}
                      target="_blank"
                    >
                      View storefront <ExternalLink size={14} />
                    </Link>
                  </div>
                )}
              </>
            )}
            {section === "inventory" && (
              <>
                <div className="inventory-current">
                  <Boxes size={25} />
                  <div>
                    <span>Current stock on hand</span>
                    <strong>{edit.stock} units</strong>
                  </div>
                </div>
                <Field
                  label="Stock adjustment (+ to add, − to remove)"
                  name="change"
                  type="number"
                  min={-edit.stock}
                  required
                  placeholder="e.g. 20 or -5"
                />
                <Field
                  label="Reason / supplier reference"
                  name="reason"
                  required
                  minLength={3}
                  placeholder="Restock from supplier, reference #…"
                />
                <button
                  type="button"
                  className="text-link"
                  onClick={async () => {
                    try {
                      setHistory(
                        await api("/admin/inventory/" + edit.id + "/history"),
                      );
                    } catch (e) {
                      notify(e.message, "error");
                    }
                  }}
                >
                  View adjustment history <Clock size={14} />
                </button>
                {history && (
                  <div className="inventory-history">
                    {history.length ? (
                      history.map((h) => (
                        <div key={h.id}>
                          <b>
                            {h.change > 0 ? "+" : ""}
                            {h.change}
                          </b>
                          <span>{h.reason}</span>
                          <small>{date(h.created)}</small>
                        </div>
                      ))
                    ) : (
                      <p>No stock adjustments recorded yet.</p>
                    )}
                  </div>
                )}
              </>
            )}
            {section === "orders" && (
              <>
                <div className="order-editor-summary">
                  <div>
                    <span className="eyebrow">CUSTOMER</span>
                    <h3>{edit.customer}</h3>
                    <p>
                      {edit.email}
                      <br />
                      {edit.phone}
                    </p>
                    <p>
                      {edit.address.line1}
                      <br />
                      {edit.address.city}, {edit.address.state}{" "}
                      {edit.address.pincode}
                    </p>
                  </div>
                  <div>
                    <span className="eyebrow">ORDER TOTAL</span>
                    <h2>{money(edit.total)}</h2>
                    <Status value={edit.status} />
                    <p>
                      {edit.payment_status}
                      <br />
                      Placed {date(edit.created)}
                    </p>
                  </div>
                </div>
                {edit.items.map((i) => (
                  <div className="order-editor-item" key={i.id}>
                    <div>
                      <strong>{i.name}</strong>
                      <span>
                        {i.size} · {i.thickness}″ · {i.firmness} × {i.quantity}
                      </span>
                    </div>
                    <b>{money(i.price * i.quantity)}</b>
                  </div>
                ))}
                <div className="form-grid">
                  <Field label="Order status">
                    <select name="status" defaultValue={edit.status}>
                      {[
                        "Awaiting confirmation",
                        "Placed",
                        "Confirmed",
                        "Packed",
                        "Shipped",
                        "Out for delivery",
                        "Delivered",
                        "Cancelled",
                        "Return requested",
                        ...(["owner", "finance"].includes(boot.user.role)
                          ? ["Refunded"]
                          : []),
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Tracking reference"
                    name="tracking"
                    defaultValue={edit.tracking}
                  />
                </div>
                {JSON.parse(edit.summary || "{}").deliveryNotes && (
                  <div className="admin-info-note">
                    <p>
                      <strong>Customer delivery notes:</strong>{" "}
                      {JSON.parse(edit.summary || "{}").deliveryNotes}
                    </p>
                  </div>
                )}
                <Field label="Internal notes / refund reason">
                  <textarea rows={3} name="notes" defaultValue={edit.notes} />
                </Field>
                <div className="demo-notice">
                  <CreditCard size={17} />
                  <p>
                    No online payment is collected and no refunds are processed
                    here. Cancelling an order restores its inventory once.
                  </p>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    className="btn admin-outline"
                    onClick={async () => {
                      try {
                        await downloadInvoice(edit);
                      } catch (e) {
                        notify(e.message, "error");
                      }
                    }}
                  >
                    <Download size={15} />
                    Download PDF summary
                  </button>
                  <a
                    className="btn admin-outline"
                    href={"mailto:" + edit.email}
                  >
                    <Mail size={15} />
                    Contact customer
                  </a>
                </div>
              </>
            )}
            {section === "coupons" && (
              <>
                <div className="form-grid">
                  <Field
                    label="Coupon code"
                    name="code"
                    required
                    pattern="[A-Z0-9_-]{3,30}"
                    placeholder="SWEETDREAMS"
                  />
                  <Field label="Discount type">
                    <select name="type">
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed amount</option>
                    </select>
                  </Field>
                  <Field
                    label="Discount amount"
                    name="amount"
                    type="number"
                    min={1}
                    required
                  />
                  <Field
                    label="Minimum order (INR)"
                    name="minimum"
                    type="number"
                    min={0}
                    defaultValue={0}
                    required
                  />
                  <Field
                    label="Maximum discount (INR)"
                    name="max_discount"
                    type="number"
                    min={1}
                    defaultValue={5000}
                    required
                  />
                  <Field
                    label="Total usage limit"
                    name="usage_limit"
                    type="number"
                    min={1}
                    defaultValue={100}
                    required
                  />
                  <Field
                    label="Expiry date"
                    name="expires"
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
                <p className="fine-print">
                  Coupons apply storewide in this demo. Expiry, usage limits and
                  minimum orders are checked by the server.
                </p>
              </>
            )}
            {section === "content" && (
              <>
                <div className="form-grid">
                  <Field
                    label="Title"
                    name="title"
                    defaultValue={edit.title}
                    required
                    minLength={2}
                  />
                  <Field
                    label="URL identifier"
                    name="id"
                    defaultValue={edit.id}
                    readOnly={!!edit.id}
                    pattern="[a-z0-9-]+"
                    placeholder="a-better-night"
                    required
                  />
                  <Field label="Content type">
                    <select name="type" defaultValue={edit.type || "guide"}>
                      {["guide", "faq", "policy", "banner"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Visibility">
                    <select name="active" defaultValue={edit.active ?? 1}>
                      <option value="1">Published</option>
                      <option value="0">Draft</option>
                    </select>
                  </Field>
                </div>
                <Field label="Your story / content">
                  <textarea
                    rows={12}
                    name="body"
                    defaultValue={edit.body}
                    required
                    minLength={5}
                  />
                </Field>
                <p className="fine-print">
                  Use a blank line between paragraphs. Content is rendered as
                  safe plain text. Homepage headline and promotional copy are in
                  Settings.
                </p>
              </>
            )}
            {section === "categories" && (
              <>
                <Field
                  label="Category name"
                  name="name"
                  required
                  minLength={2}
                />
                <Field label="Short description" name="description" />
              </>
            )}
            {section === "reviews" && (
              <>
                <div className="review-moderation">
                  <span className="stars">{"★".repeat(edit.rating)}</span>
                  <h3>{edit.title}</h3>
                  <p>{edit.body}</p>
                  <small>
                    {edit.name} ·{" "}
                    {edit.verified ? "Verified purchase" : "Not verified"}
                  </small>
                </div>
                <Field label="Moderation status">
                  <select name="status" defaultValue={edit.status}>
                    {["published", "pending", "hidden", "flagged"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Public response from your shop">
                  <textarea
                    name="response"
                    defaultValue={edit.response}
                    rows={4}
                  />
                </Field>
              </>
            )}
            {section === "support" && (
              <>
                <div className="ticket-meta">
                  <span>
                    {edit.name} · {edit.email}
                  </span>
                  <Status value={edit.status} />
                </div>
                <div className="ticket-messages">
                  {edit.messages.map((m, i) => (
                    <div key={i}>
                      <strong>{m.from}</strong>
                      <p>{m.text}</p>
                      <small>{date(m.at)}</small>
                    </div>
                  ))}
                </div>
                <div className="form-grid">
                  <Field label="Status">
                    <select name="status" defaultValue={edit.status}>
                      {["Open", "In progress", "Closed"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Assign to (staff name)"
                    name="assigned"
                    defaultValue={edit.assigned}
                  />
                </div>
                <Field label="Reply to your customer">
                  <textarea
                    name="reply"
                    rows={4}
                    placeholder="A thoughtful reply starts here…"
                  />
                </Field>
              </>
            )}
            {section === "staff" &&
              (edit.id ? (
                <>
                  <div className="staff-profile">
                    <span className="large-avatar">{edit.name[0]}</span>
                    <h2>{edit.name}</h2>
                    <p>{edit.email}</p>
                    <Status value={edit.role} />
                  </div>
                  <div className="role-info">
                    <h4>Access scope</h4>
                    <p>
                      {
                        {
                          owner:
                            "Full store access, including security, staff, audit and settings.",
                          manager:
                            "Dashboard, products, inventory, orders, customers, reviews, coupons and analytics.",
                          content:
                            "Product content, categories and content studio.",
                          support:
                            "Customer support, orders, customers and review moderation.",
                          finance: "Orders, simulated refunds and analytics.",
                        }[edit.role]
                      }
                    </p>
                  </div>
                  {edit.role !== "owner" && (
                    <button
                      type="button"
                      className="btn danger"
                      onClick={() => {
                        if (
                          confirm(
                            "Revoke staff access? Their active sessions will be signed out.",
                          )
                        )
                          action(
                            "/admin/staff/" + edit.id,
                            undefined,
                            "DELETE",
                            "Staff access revoked.",
                          );
                      }}
                    >
                      <Lock size={16} />
                      Revoke staff access
                    </button>
                  )}
                </>
              ) : (
                <>
                  <Field label="Full name" name="name" required minLength={2} />
                  <Field
                    label="Email address"
                    name="email"
                    type="email"
                    required
                  />
                  <Field
                    label="Temporary password"
                    name="password"
                    type="password"
                    required
                    minLength={10}
                  />
                  <p className="fine-print">
                    10+ characters, with uppercase, lowercase and a number.
                    Share securely and ask the user to change it in their
                    account.
                  </p>
                  <Field label="Role">
                    <select name="role">
                      {[
                        ["manager", "Manager — commerce operations"],
                        ["content", "Content manager — products & content"],
                        ["support", "Support — customers, orders & tickets"],
                        ["finance", "Finance — reports & refunds"],
                      ].map(([s, l]) => (
                        <option key={s} value={s}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              ))}
            {section === "customers" && (
              <>
                <div className="staff-profile">
                  <span className="large-avatar">{edit.name[0]}</span>
                  <h2>{edit.name}</h2>
                  <p>
                    {edit.email}
                    <br />
                    {edit.phone}
                  </p>
                </div>
                <div className="mini-stat-grid two">
                  <div>
                    <span>Orders</span>
                    <strong>{edit.orders}</strong>
                  </div>
                  <div>
                    <span>Lifetime order value</span>
                    <strong>{money(edit.spent)}</strong>
                  </div>
                </div>
                <p className="fine-print">
                  Registered {date(edit.created)}. No authentication secrets are
                  accessible here.
                </p>
                <div className="button-row">
                  <a
                    className="btn admin-outline"
                    href={"mailto:" + edit.email}
                  >
                    <Mail size={15} />
                    Contact customer
                  </a>
                  <Link
                    className="btn admin-primary"
                    onClick={() => setEdit(null)}
                    to={"/owner/orders?q=" + encodeURIComponent(edit.email)}
                  >
                    View orders <ArrowRight size={15} />
                  </Link>
                </div>
              </>
            )}
            {section === "audit" && (
              <div className="audit-details">
                {[
                  ["Action", edit.action],
                  ["Actor", edit.actor],
                  ["Entity", edit.entity],
                  ["Timestamp", edit.created],
                  ["IP address", edit.ip],
                  ["Record ID", edit.id],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
            )}
            {!["customers", "audit"].includes(section) &&
              !(section === "staff" && edit.id) && (
                <div className="editor-footer">
                  <button
                    className="btn admin-outline"
                    type="button"
                    onClick={() => setEdit(null)}
                  >
                    Cancel
                  </button>
                  <Button loading={busy} className="admin-primary">
                    {section === "staff"
                      ? "Create team member"
                      : section === "coupons"
                        ? "Create coupon"
                        : "Save changes"}
                    <Check size={16} />
                  </Button>
                </div>
              )}
          </form>
        </Modal>
      )}
    </>
  );
}
function StoreSettings() {
  const { data, error, reload, setData } = useData("/admin/settings"),
    { notify, refresh, boot } = useStore();
  const [tab, setTab] = useState("Store"),
    [busy, setBusy] = useState(false);
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data) return <Loading />;
  const set = (k, v) => setData((previous) => ({ ...previous, [k]: v }));
  const tabs = [
    ["Store", Settings],
    ["Homepage", Image],
    ["Commerce", Truck],
    ["Payments", CreditCard],
    ["Appearance", Palette],
    ["SEO", Globe],
    ["Email", Mail],
    ["Google login", KeyRound],
  ];
  const input = (label, key, type = "text") => (
    <Field
      label={label}
      type={type}
      value={data[key] ?? ""}
      onChange={(e) =>
        set(key, type === "number" ? +e.target.value : e.target.value)
      }
    />
  );
  return (
    <>
      <div className="admin-page-title">
        <div>
          <span className="admin-overline">YOUR OWNER CONTROL CENTER</span>
          <h1>The finer details.</h1>
          <p>Make this store yours. No code required.</p>
        </div>
        <Button
          loading={busy}
          className="admin-primary"
          onClick={async () => {
            setBusy(true);
            try {
              await api("/admin/settings", { method: "POST", body: data });
              await refresh();
              notify("Your store settings are saved.");
            } catch (e) {
              notify(e.message, "error");
            }
            setBusy(false);
          }}
        >
          Save changes <Check size={16} />
        </Button>
      </div>
      <div className="settings-layout">
        <nav className="settings-nav">
          {tabs.map(([t, I]) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              <I size={17} />
              {t}
              <ChevronRight size={14} />
            </button>
          ))}
        </nav>
        <section className="admin-panel settings-panel">
          <h2>
            {tab === "Homepage"
              ? "Set the scene for better nights."
              : tab === "Appearance"
                ? "A considered brand, in every detail."
                : tab === "Commerce"
                  ? "The business of comfort."
                  : tab + " settings"}
          </h2>
          <p className="muted">
            Changes are saved to your configured database and reflected across
            the store.
          </p>
          <div className="form-stack">
            {tab === "Store" && (
              <>
                {input("Store name", "storeName")}
                {input("Contact email", "email", "email")}
                {input("Phone number", "phone")}
                {input("Business address", "address")}
                {input("Google Maps link", "mapUrl", "url")}
                {input("Facebook link", "facebookUrl", "url")}
                {input("Instagram link", "instagramUrl", "url")}
                {input("Business hours", "businessHours")}
              </>
            )}
            {tab === "Google login" && (
              <div className="google-setup-card">
                <h3>Customer sign-in with Google</h3>
                <Status
                  value={
                    boot.google?.configured
                      ? "Client ID configured"
                      : "Not connected"
                  }
                />
                <p>
                  Google sign-in imports the customer’s verified email, name and
                  profile photo. It cannot grant owner or staff access.
                </p>
                <ol>
                  <li>
                    Open Google Cloud Console → Google Auth Platform. Configure
                    your branding and audience.
                  </li>
                  <li>
                    Create an OAuth client of type{" "}
                    <strong>Web application</strong>.
                  </li>
                  <li>
                    Add your website’s exact origin under Authorized JavaScript
                    origins. This preview’s origin is{" "}
                    <code>{location.origin}</code>. For local testing, add{" "}
                    <code>http://localhost</code> and{" "}
                    <code>http://localhost:3000</code>.
                  </li>
                  <li>
                    Set <code>GOOGLE_CLIENT_ID</code> in your server
                    environment, then restart. This implementation does not need
                    a client secret or redirect URI.
                  </li>
                  <li>
                    Test on your own HTTPS site or localhost; embedded preview
                    restrictions may block Google’s sign-in window.
                  </li>
                </ol>
                <p>
                  Do not paste secrets into store settings. Full instructions
                  are in <strong>GOOGLE-LOGIN-SETUP.md</strong>.
                </p>
                <a
                  className="text-link"
                  href="https://console.cloud.google.com/auth/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Google Cloud Console <ExternalLink size={15} />
                </a>
              </div>
            )}
            {tab === "Homepage" && (
              <>
                {input("Promotional announcement", "announcement")}
                {input("Hero eyebrow", "heroEyebrow")}
                <Field label="Hero headline">
                  <textarea
                    rows={3}
                    value={data.heroTitle}
                    onChange={(e) => set("heroTitle", e.target.value)}
                  />
                </Field>
                <Field label="Hero supporting copy">
                  <textarea
                    rows={3}
                    value={data.heroSubtitle}
                    onChange={(e) => set("heroSubtitle", e.target.value)}
                  />
                </Field>
                <div className="settings-hero-preview">
                  <img
                    src={data.heroImage || "/images/hero.webp"}
                    alt="Current homepage hero"
                  />
                  <span>{data.heroTitle}</span>
                </div>
                {[
                  ["Desktop hero", "heroImage", "/images/hero.webp"],
                  ["Mobile hero", "heroMobileImage", "/images/hero-small.webp"],
                  ["Our story banner", "storyImage", "/images/detail.webp"],
                ].map(([label, key, fallback]) => (
                  <MediaUpload
                    key={key}
                    label={label}
                    value={data[key] || fallback}
                    purpose="banner"
                    entityId={key}
                    assetName={data.heroTitle || label}
                    disabled={busy}
                    onBusy={setBusy}
                    onChange={(r) => set(key, r.url)}
                  />
                ))}
                <p className="fine-print">
                  Image storage: {boot.storage?.images || "unconfigured"}.
                  Product and banner IDs are added to upload names
                  automatically. ImgBB chooses its own hosted ID and URL. Save
                  changes after uploading; keep a backup of your originals.
                </p>
                <Link className="admin-link" to="/" target="_blank">
                  Preview storefront <ExternalLink size={14} />
                </Link>
              </>
            )}
            {tab === "Commerce" && (
              <>
                <div className="form-grid">
                  {input(
                    "Free delivery above (INR)",
                    "shippingThreshold",
                    "number",
                  )}
                  {input(
                    "Standard delivery fee (INR)",
                    "shippingFee",
                    "number",
                  )}
                  {input("Included tax rate (%)", "taxRate", "number")}
                  <Field label="Currency">
                    <select value="INR" onChange={() => {}}>
                      <option value="INR">INR — Indian Rupee</option>
                    </select>
                  </Field>
                </div>
                {input("Delivery zones / coverage note", "deliveryZones")}
                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={Boolean(data.launchReady)}
                    onChange={(e) => set("launchReady", e.target.checked)}
                  />
                  I have reviewed actual products, shipping fees, taxes,
                  delivery coverage, published policies and all customer-facing
                  claims for launch.
                </label>
                <p className="fine-print">
                  Real callback orders require this confirmation and
                  CHECKOUT_MODE=cod. Enabling this checkbox does not purchase,
                  deploy, or connect any external service.
                </p>
                <div className="admin-info-note">
                  <ShieldCheck size={18} />
                  <span>
                    Prices, discounts, tax and delivery charges are recalculated
                    on the server. Taxes are included in product prices.
                  </span>
                </div>
              </>
            )}
            {tab === "Payments" && (
              <>
                <div className="integration-card">
                  <CreditCard size={27} />
                  <div>
                    <h3>Owner-confirmed orders</h3>
                    <p>
                      Contact → shipping → review → submit. No online money
                      collection.
                    </p>
                    <Status
                      value={
                        boot.checkoutMode === "cod"
                          ? "Callback orders enabled"
                          : "Preview orders"
                      }
                    />
                  </div>
                </div>
                <div className="integration-note">
                  <Lock size={25} />
                  <h3>A real conversation before payment.</h3>
                  <p>
                    New orders are unpaid and awaiting confirmation. The
                    customer receives an order ID, a private downloadable PDF,
                    the English/Hindi callback message, and call /
                    customer-initiated WhatsApp and email options.
                  </p>
                  <p>
                    To enable real callback orders after setup and business
                    review, set <code>CHECKOUT_MODE=cod</code> in the server
                    environment. No payment gateway is needed for this flow.
                    This workspace does not record or verify offline payments,
                    process refunds, or automatically send messages.
                  </p>
                </div>
              </>
            )}
            {tab === "Appearance" && (
              <>
                <Field label="Brand colour — contrast-safe palette">
                  <div className="color-choices">
                    {[
                      ["#354f42", "Forest"],
                      ["#384955", "Slate"],
                      ["#51453f", "Walnut"],
                    ].map(([c, n]) => (
                      <button
                        className={data.primaryColor === c ? "selected" : ""}
                        key={c}
                        onClick={() => set("primaryColor", c)}
                      >
                        <i style={{ background: c }} />
                        {n}
                        {data.primaryColor === c && <Check size={15} />}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="appearance-row">
                  <div>
                    <h4>Workspace theme</h4>
                    <p>Only changes your device preference.</p>
                  </div>
                  <ThemeSelect />
                </div>
                <div className="brand-type-preview">
                  <span className="eyebrow">A CONSIDERED TYPE SYSTEM</span>
                  <h2>A better kind of rest.</h2>
                  <p>Libre Caslon Display + DM Sans · Locally hosted fonts.</p>
                </div>
                <p className="fine-print">
                  The curated palette and typography protect consistency and
                  readability. Arbitrary colour and font overrides are
                  intentionally restricted.
                </p>
              </>
            )}
            {tab === "SEO" && (
              <>
                {input("Homepage title", "seoTitle")}
                <Field label="Meta description">
                  <textarea
                    rows={3}
                    maxLength={200}
                    value={data.seoDescription}
                    onChange={(e) => set("seoDescription", e.target.value)}
                  />
                </Field>
                <div className="search-preview">
                  <span>{location.host}</span>
                  <h3>{data.seoTitle}</h3>
                  <p>{data.seoDescription}</p>
                </div>
                <div className="button-row">
                  <a className="admin-link" href="/sitemap.xml" target="_blank">
                    View sitemap <ExternalLink size={14} />
                  </a>
                  <a className="admin-link" href="/robots.txt" target="_blank">
                    View robots.txt <ExternalLink size={14} />
                  </a>
                </div>
              </>
            )}
            {tab === "Email" && (
              <>
                <div className="integration-card">
                  <Mail size={28} />
                  <div>
                    <h3>Email delivery</h3>
                    <p>
                      Provider not connected. No emails are sent in this demo.
                    </p>
                    <Status value="Not connected" />
                  </div>
                </div>
                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={data.emailNotifications}
                    onChange={(e) =>
                      set("emailNotifications", e.target.checked)
                    }
                  />
                  Enable notification preference for future email integration
                </label>
                <p className="fine-print">
                  In-app order notifications are active. Email verification,
                  password reset delivery and promotional sends require a
                  transactional email service before launch.
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
function SecurityPanel() {
  const { data, error, reload } = useData("/admin/security"),
    { notify } = useStore();
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data) return <Loading />;
  return (
    <>
      <div className="admin-page-title">
        <div>
          <span className="admin-overline">A LITTLE MORE PEACE OF MIND</span>
          <h1>Security & access.</h1>
          <p>A clear view of the safeguards around your store.</p>
        </div>
        <Link className="btn admin-outline" to="/owner/audit">
          <ScrollText size={16} />
          View audit log
        </Link>
      </div>
      <div className="security-cards">
        {[
          [
            ShieldCheck,
            "Server-side permissions",
            "Active",
            "Every owner action checks authentication and role permissions.",
          ],
          [
            KeyRound,
            "Password protection",
            "Active",
            "bcrypt hashing, strong passwords and login attempt limiting.",
          ],
          [
            Lock,
            "Multi-factor authentication",
            "Not connected",
            "Connect a TOTP or WebAuthn provider before live deployment.",
          ],
        ].map(([I, t, s, p]) => (
          <section className="admin-panel" key={t}>
            <I size={25} />
            <h3>{t}</h3>
            <Status value={s} />
            <p>{p}</p>
          </section>
        ))}
      </div>
      <section className="admin-panel">
        <div className="panel-heading">
          <div>
            <h2>Active signed-in sessions</h2>
            <p>
              Cookie sessions expire after 7 days; isolated demo sessions after
              4 hours.
            </p>
          </div>
          <button
            className="btn admin-outline"
            onClick={async () => {
              try {
                await api("/account/revoke", { method: "POST" });
                notify("Your other sessions have been revoked.");
                reload();
              } catch (e) {
                notify(e.message, "error");
              }
            }}
          >
            Sign out my other devices <LogOut size={15} />
          </button>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Started</th>
                <th>Expires</th>
                <th>Protection</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s, i) => (
                <tr key={i}>
                  <td>
                    <strong>{s.name}</strong>
                    <small>{s.email}</small>
                  </td>
                  <td>{date(s.created)}</td>
                  <td>{date(s.expires)}</td>
                  <td>
                    <Status
                      value={s.protection || "Server-validated session"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-panel security-activity">
        <div className="panel-heading">
          <div>
            <h2>Recent sign-in activity</h2>
            <p>Successful and failed access attempts.</p>
          </div>
        </div>
        {data.logs.map((l) => (
          <div key={l.id}>
            <span
              className={
                "attention-icon " +
                (l.action.includes("Failed") ? "rose" : "green")
              }
            >
              {l.action.includes("Failed") ? (
                <AlertTriangle size={17} />
              ) : (
                <ShieldCheck size={17} />
              )}
            </span>
            <div>
              <strong>{l.action}</strong>
              <p>
                {l.actor} · {l.entity}
              </p>
            </div>
            <span>{date(l.created)}</span>
          </div>
        ))}
        {!data.logs.length && (
          <p className="muted">No sign-in events recorded yet.</p>
        )}
      </section>
      <div className="admin-info-note">
        <AlertTriangle size={20} />
        <span>
          This is a demo environment with publicly provided owner credentials.
          Replace the database and credentials, enable HTTPS, connect MFA and
          email, and complete a deployment security review before going live.
        </span>
      </div>
    </>
  );
}
