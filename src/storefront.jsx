import React, { useState, useEffect, useMemo } from "react";
import { searchProducts } from "./search";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  Check,
  Heart,
  Star,
  Moon,
  Sun,
  Leaf,
  Wind,
  Layers,
  ShieldCheck,
  Truck,
  Sparkles,
  SlidersHorizontal,
  X,
  Search,
  GitCompareArrows,
  ShoppingBag,
  Plus,
  Minus,
  Maximize2,
  MapPin,
  CheckCircle2,
  ThumbsUp,
  ArrowLeft,
  Package,
  MoveRight,
  Lock,
} from "lucide-react";
import {
  useStore,
  api,
  useData,
  Button,
  Field,
  Stars,
  Modal,
  Quantity,
  Empty,
  Loading,
  ErrorState,
  Accordion,
  Breadcrumb,
  money,
} from "./core";
import { ProductCard, TrustStrip } from "./components";
export function HomePage() {
  const { boot, products } = useStore();
  const [tab, setTab] = useState("All mattresses"),
    [slide, setSlide] = useState(0);
  const best = products
    .filter(
      (p) =>
        !["Bedding", "Accessories"].includes(p.category) &&
        (tab === "All mattresses" || p.category === tab),
    )
    .slice(0, 4);
  const tabs = [
    "All mattresses",
    ...boot.categories
      .filter((c) =>
        ["Memory Foam", "Orthopedic", "Hybrid", "Latex"].includes(c.name),
      )
      .map((c) => c.name),
  ];
  return (
    <>
      <section className="hero">
        <img
          className="hero-photo"
          src={boot.settings.heroImage || "/images/hero.webp"}
          srcSet={`${boot.settings.heroMobileImage || boot.settings.heroImage || "/images/hero-small.webp"} 960w, ${boot.settings.heroImage || "/images/hero.webp"} 1920w`}
          sizes="100vw"
          alt="Morning sunlight in a calm, naturally styled bedroom with a comfortable mattress"
          fetchPriority="high"
          width="1920"
          height="1072"
        />
        <div className="hero-wash" />
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span />
            {slide === 0
              ? boot.settings.heroEyebrow
              : "FIND YOUR EVERYDAY EXTRAORDINARY."}
          </div>
          <h1>
            {slide === 0 ? (
              boot.settings.heroTitle
            ) : (
              <>
                Less tossing.
                <br />
                More dreaming.
              </>
            )}
          </h1>
          <p>
            {slide === 0
              ? boot.settings.heroSubtitle
              : "A little science. A lot of comfort.\nMeet mattresses made for your kind of sleep."}
          </p>
          <div className="hero-buttons">
            <Link to="/mattresses" className="btn">
              Shop mattresses <ArrowRight size={17} />
            </Link>
            <Link to="/quiz" className="btn outline">
              Find my perfect fit <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="hero-social-proof">
            <div>
              <strong>A local shop. A real conversation.</strong>
              <p>
                <a href={"tel:" + boot.settings.phone.replace(/[^+0-9]/g, "")}>
                  {boot.settings.phone}
                </a>{" "}
                · Ahmedabad
              </p>
            </div>
          </div>
        </div>
        <div className="hero-product-note">
          <span className="pulse-dot" />
          <div>
            <span>COMFORT, WITHOUT COMPROMISE</span>
            <Link
              to={products[0] ? "/product/" + products[0].slug : "/mattresses"}
            >
              {products[0]
                ? "Meet " + products[0].name
                : "Explore our mattresses"}{" "}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        <div className="hero-bottom">
          <span>DESIGNED FOR LIFE. MADE FOR REST.</span>
          <div className="slide-controls">
            <button
              className={slide === 0 ? "active" : ""}
              onClick={() => setSlide(0)}
              aria-label="Show first hero slide"
            />
            <button
              className={slide === 1 ? "active" : ""}
              onClick={() => setSlide(1)}
              aria-label="Show second hero slide"
            />
            <span>
              0{slide + 1} <i>/ 02</i>
            </span>
          </div>
        </div>
      </section>
      <TrustStrip />
      {boot.demo && (
        <section className="press-strip">
          <span>DESIGN INSPIRATION, NOT ENDORSEMENTS.</span>
          <div>
            VOGUE
            <span className="press-ad">
              AD <small>ARCHITECTURAL DIGEST</small>
            </span>
            <span className="press-gq">GQ</span>
            <span className="press-elle">ELLE DECOR</span>
            <span className="press-forbes">Forbes</span>
          </div>
        </section>
      )}
      <section className="section bestsellers">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR COMFORT, YOUR WAY</span>
            <h2>Meet your new favourite place.</h2>
            <p>Different sleepers. Thoughtfully different mattresses.</p>
          </div>
          <Link to="/mattresses" className="text-link">
            Explore all mattresses <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="product-tabs">
          {tabs.map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
          <span>
            Made for better mornings <Sun size={16} />
          </span>
        </div>
        <div className="product-grid home-products">
          {best.map((p) => (
            <ProductCard p={p} key={p.id} />
          ))}
        </div>
        {!best.length && (
          <Empty
            title="Something good is on its way."
            text="Discover another collection while we prepare this one."
          />
        )}
      </section>
      <section className="quiz-banner">
        <div className="quiz-art">
          <span className="orbit one" />
          <span className="orbit two" />
          <span className="orbit three" />
          <Moon size={58} strokeWidth={0.8} />
          <i className="art-star a">✧</i>
          <i className="art-star b">✧</i>
          <span className="sleep-caption">
            YOUR SLEEP IS PERSONAL.
            <br />
            YOUR MATTRESS SHOULD BE, TOO.
          </span>
        </div>
        <div>
          <span className="eyebrow">LET’S FIND YOUR KIND OF COMFORT</span>
          <h2>
            You’re one good match
            <br />
            away from better sleep.
          </h2>
          <p>
            A few simple questions. A mattress that feels like you.
            <br />
            Meet your perfect match in under 2 minutes.
          </p>
          <Link to="/quiz" className="btn cream">
            Find my mattress <ArrowUpRight size={17} />
          </Link>
          <span className="quiz-no-pressure">
            No guesswork. No pressure. Just good sleep.
          </span>
        </div>
      </section>
      <section className="section philosophy">
        <div className="philosophy-image">
          <img
            src={boot.settings.storyImage || "/images/detail.webp"}
            loading="lazy"
            alt="Thoughtfully layered bedding in natural morning light"
          />
          <span>THE ART OF DOING NOTHING, BETTER.</span>
        </div>
        <div className="philosophy-copy">
          <span className="eyebrow">A LITTLE SCIENCE. A LOT OF SOUL.</span>
          <h2>
            Better by design.
            <br />
            Comfortable by nature.
          </h2>
          <p>
            We don’t believe in one-size-fits-all sleep. We believe in
            considered materials, thoughtful engineering, and the kind of
            comfort you look forward to coming home to.
          </p>
          <div className="values-list">
            {[
              [
                Layers,
                "Comfort in every layer",
                "Purposefully layered. Beautifully balanced.",
              ],
              [
                Wind,
                "A breath of fresh air",
                "Breathable materials for your cooler side.",
              ],
              [
                Leaf,
                "Good things, thoughtfully made",
                "Less excess. More of what matters.",
              ],
            ].map(([I, t, s]) => (
              <div key={t}>
                <I size={23} strokeWidth={1.3} />
                <div>
                  <h4>{t}</h4>
                  <p>{s}</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/page/about" className="text-link">
            A little more about us <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      {Boolean(boot.testimonials?.length) && (
        <section className="reviews-section section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">REST EASY. THEY DO.</span>
              <h2>Good nights. In their own words.</h2>
            </div>
            <p className="small muted">Published customer reviews</p>
          </div>
          <div className="testimonial-grid">
            {boot.testimonials.map((r) => (
              <article key={r.id}>
                <Stars rating={r.rating} />
                <h3>{r.title}</h3>
                <p>
                  {r.body.length > 250 ? r.body.slice(0, 250) + "…" : r.body}
                </p>
                <div className="review-author">
                  <span className="avatar-initial">{r.name[0]}</span>
                  <div>
                    <strong>{r.name}</strong>
                    <span>{r.product_name}</span>
                  </div>
                  {Boolean(r.verified) && (
                    <span className="verified">
                      <CheckCircle2 size={12} />
                      Verified buyer
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
          {boot.demo && (
            <p className="sample-note">
              Local preview contains sample reviews. Clean cloud setup does not
              copy them.
            </p>
          )}
        </section>
      )}
      <section className="section sleep-guide-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE SLEEP GUIDE</span>
            <h2>A little wisdom. A lot more rest.</h2>
          </div>
          <Link to="/sleep-guide" className="text-link">
            Explore the journal <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="journal-grid">
          {boot.content
            .filter((c) => c.type === "guide")
            .map((g, i) => (
              <Link
                to={"/sleep-guide/" + g.id}
                key={g.id}
                className="journal-card"
              >
                <div>
                  <img
                    src={
                      [
                        "/images/detail.webp",
                        "/images/natural.webp",
                        "/images/bedding.webp",
                      ][i % 3]
                    }
                    loading="lazy"
                    alt={g.title}
                  />
                  <span>0{i + 1}</span>
                </div>
                <span className="eyebrow">
                  {
                    ["SLEEP BETTER", "KNOW YOUR MATTRESS", "EVERYDAY RITUALS"][
                      i % 3
                    ]
                  }{" "}
                  · 4 MIN READ
                </span>
                <h3>{g.title}</h3>
                <span className="text-link">
                  Make time for a little reading <ArrowUpRight size={16} />
                </span>
              </Link>
            ))}
        </div>
      </section>
      <section className="faq-home section">
        <div>
          <span className="eyebrow">REST ASSURED</span>
          <h2>
            A few things
            <br />
            you might be wondering.
          </h2>
          <Link to="/faq" className="text-link">
            All your questions, answered <ArrowUpRight size={17} />
          </Link>
        </div>
        <div>
          {boot.content
            .filter((c) => c.type === "faq")
            .map((c) => (
              <Accordion key={c.id} title={c.title}>
                {c.body}
              </Accordion>
            ))}
        </div>
      </section>
    </>
  );
}
export function ListingPage({ kind }) {
  const { products, boot } = useStore();
  const [params, setParams] = useSearchParams();
  const { category: routeCategory } = useParams();
  const [filterOpen, setFilterOpen] = useState(false),
    [sort, setSort] = useState("featured"),
    [max, setMax] = useState(60000),
    [firm, setFirm] = useState("All"),
    [cool, setCool] = useState(false),
    [stock, setStock] = useState(false),
    [size, setSize] = useState("Any size"),
    [thick, setThick] = useState("Any height"),
    [rating, setRating] = useState(false);
  const cat =
      params.get("category") ||
      (routeCategory
        ? boot.categories.find(
            (c) => c.name.toLowerCase().replaceAll(" ", "-") === routeCategory,
          )?.name
        : "") ||
      "",
    q = params.get("q") || "";
  const isBedding = kind === "bedding",
    isAccessories = kind === "accessories",
    isOffers = kind === "offers";
  const title =
    kind === "search"
      ? q
        ? `Comfort, found for “${q}”.`
        : "Find your kind of comfort."
      : isBedding
        ? "Layer on a little luxury."
        : isAccessories
          ? "The little things. The better nights."
          : isOffers
            ? "Good sleep. Even better value."
            : "Your best nights start here.";
  let list = searchProducts(products, q).filter(
    (p) =>
      (isBedding
        ? p.category === "Bedding"
        : isAccessories
          ? p.category === "Accessories"
          : kind === "search" ||
            !["Bedding", "Accessories"].includes(p.category)) &&
      (!cat || p.category === cat) &&
      p.price <= max &&
      (firm === "All" || p.firmness === firm) &&
      (!stock || p.stock > 0) &&
      (!cool || p.specs.cooling) &&
      (!rating || p.rating >= 4.8) &&
      (thick === "Any height" || p.thickness === thick),
  );
  list.sort(
    sort === "low"
      ? (a, b) => a.price - b.price
      : sort === "high"
        ? (a, b) => b.price - a.price
        : sort === "rating"
          ? (a, b) => b.rating - a.rating
          : (a, b) => (q ? 0 : b.reviews - a.reviews),
  );
  function setParam(key, val) {
    const n = new URLSearchParams(params);
    val ? n.set(key, val) : n.delete(key);
    setParams(n);
  }
  function reset() {
    setParams({});
    setMax(60000);
    setFirm("All");
    setCool(false);
    setStock(false);
    setSize("Any size");
    setThick("Any height");
    setRating(false);
  }
  const filter = (
    <>
      <div className="filter-heading">
        <h3>Refine your rest</h3>
        <button className="text-link" onClick={reset}>
          Reset
        </button>
      </div>
      <Accordion title="Mattress type" open>
        <div className="filter-options">
          {[
            "All mattresses",
            ...boot.categories
              .filter(
                (c) =>
                  ![
                    "King",
                    "Queen",
                    "Single",
                    "Custom",
                    "Bedding",
                    "Accessories",
                  ].includes(c.name),
              )
              .map((c) => c.name),
          ].map((t) => (
            <label key={t}>
              <input
                type="radio"
                name="category"
                checked={cat === (t === "All mattresses" ? "" : t)}
                onChange={() =>
                  setParam("category", t === "All mattresses" ? "" : t)
                }
              />
              {t}
            </label>
          ))}
        </div>
      </Accordion>
      <Accordion title="Your budget" open>
        <input
          type="range"
          min="5000"
          max="60000"
          step="1000"
          value={max}
          aria-label="Maximum price"
          onChange={(e) => setMax(+e.target.value)}
        />
        <div className="range-labels">
          <span>₹5,000</span>
          <b>{money(max)}</b>
        </div>
      </Accordion>
      <Accordion title="Comfort preference" open>
        <div className="filter-options">
          {["All", "Soft", "Medium", "Firm"].map((f) => (
            <label key={f}>
              <input
                type="radio"
                name="firmness"
                checked={firm === f}
                onChange={() => setFirm(f)}
              />
              {f === "All" ? "Any feel" : f}
            </label>
          ))}
        </div>
      </Accordion>
      <Accordion title="Size & height">
        <Field label="Mattress size">
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            {["Any size", "Single", "Double", "Queen", "King"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Mattress height">
          <select value={thick} onChange={(e) => setThick(e.target.value)}>
            <option>Any height</option>
            {["6", "8", "10"].map((x) => (
              <option key={x} value={x}>
                {x} inches
              </option>
            ))}
          </select>
        </Field>
        <small>
          All mattresses are offered in standard sizes. Final variant price is
          shown on the product page.
        </small>
      </Accordion>
      <Accordion title="The details that matter">
        <div className="filter-options">
          <label>
            <input
              type="checkbox"
              checked={cool}
              onChange={(e) => setCool(e.target.checked)}
            />
            Cooling comfort
          </label>
          <label>
            <input
              type="checkbox"
              checked={stock}
              onChange={(e) => setStock(e.target.checked)}
            />
            In stock only
          </label>
          <label>
            <input
              type="checkbox"
              checked={rating}
              onChange={(e) => setRating(e.target.checked)}
            />
            4.8 stars & above
          </label>
        </div>
      </Accordion>
      <div className="filter-help">
        <Moon size={27} />
        <h4>A little help choosing?</h4>
        <p>Find the comfort that fits you.</p>
        <Link to="/quiz" className="text-link">
          Take the sleep quiz <ArrowRight size={14} />
        </Link>
      </div>
    </>
  );
  return (
    <main className="listing-page">
      <div className="page-intro">
        <Breadcrumb
          items={[
            isBedding
              ? "Beds & Bedding"
              : isAccessories
                ? "Accessories"
                : isOffers
                  ? "Offers"
                  : "Mattresses",
          ]}
        />
        <span className="eyebrow">
          THOUGHTFULLY DIFFERENT. EXCEPTIONALLY COMFORTABLE.
        </span>
        <h1>{title}</h1>
        <p>
          {isOffers
            ? "Use REST10 for 10% off orders over ₹10,000. Your better nights are waiting."
            : "Find considered materials, beautifully balanced support, and a comfort that’s all yours."}
        </p>
      </div>
      <div className="listing-layout section">
        <aside className="filter-sidebar">{filter}</aside>
        <div className="listing-content">
          <div className="listing-toolbar">
            <div className="search-input">
              <Search size={17} />
              <input
                aria-label="Search collection"
                placeholder="Find your comfort…"
                value={q}
                onChange={(e) => setParam("q", e.target.value)}
              />
              {q && (
                <button
                  aria-label="Clear search"
                  onClick={() => setParam("q", "")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              className="mobile-filter btn outline"
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>
            <span className="result-count">
              {list.length} thoughtfully made products
            </span>
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="featured">Most loved</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="rating">Top rated</option>
            </select>
          </div>
          {cat && (
            <div className="chips">
              <button onClick={() => setParam("category", "")}>
                {cat}
                <X size={13} />
              </button>
            </div>
          )}
          {list.length ? (
            <div className="product-grid listing-products">
              {list.map((p) => (
                <ProductCard p={p} key={p.id} />
              ))}
            </div>
          ) : (
            <Empty
              icon={Search}
              title="Let’s try a different kind of comfort."
              text="No products match these filters. Adjust your search or reset your preferences."
              action=""
            />
          )}
          {!list.length && (
            <button className="btn" onClick={reset}>
              Reset filters
            </button>
          )}
        </div>
      </div>
      {filterOpen && (
        <Modal
          title="Find your comfort"
          onClose={() => setFilterOpen(false)}
          drawer
        >
          {filter}
          <button className="btn full" onClick={() => setFilterOpen(false)}>
            Show {list.length} products <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      <TrustStrip />
    </main>
  );
}
export function CollectionsPage() {
  const { boot } = useStore();
  return (
    <main className="section collections-page">
      <Breadcrumb items={["Collections"]} />
      <span className="eyebrow">COMFORT COMES IN MANY FORMS</span>
      <h1>A little something for every sleeper.</h1>
      <p className="lead">
        Thoughtfully curated. Ready to make yourself at home.
      </p>
      <div className="collection-grid">
        {boot.categories
          .filter(
            (c) => !["King", "Queen", "Single", "Custom"].includes(c.name),
          )
          .map((c, i) => (
            <Link
              to={
                c.name === "Bedding"
                  ? "/bedding"
                  : c.name === "Accessories"
                    ? "/accessories"
                    : "/mattresses?category=" + encodeURIComponent(c.name)
              }
              key={c.id}
            >
              <img
                src={
                  [
                    "/images/essential.webp",
                    "/images/ortho.webp",
                    "/images/hybrid.webp",
                    "/images/natural.webp",
                    "/images/detail.webp",
                  ][i % 5]
                }
                alt={c.name}
                loading="lazy"
              />
              <div>
                <h2>{c.name}</h2>
                <ArrowUpRight size={25} />
              </div>
              <p>{c.description}</p>
            </Link>
          ))}
      </div>
    </main>
  );
}
export function ProductPage() {
  const { slug } = useParams(),
    { data: p, error, reload } = useData("/products/" + slug);
  const {
    addCart,
    toggleWish,
    wishlist,
    toggleCompare,
    compare,
    notify,
    boot,
  } = useStore();
  const [size, setSize] = useState("Queen"),
    [firmness, setFirmness] = useState("Medium"),
    [thickness, setThickness] = useState("8"),
    [qty, setQty] = useState(1),
    [photo, setPhoto] = useState(0),
    [zoom, setZoom] = useState(false),
    [pin, setPin] = useState(""),
    [delivery, setDelivery] = useState(""),
    [review, setReview] = useState(false),
    [busy, setBusy] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    if (p) {
      setThickness(p.thickness);
      setFirmness(p.firmness);
      setSize(
        ["Bedding", "Accessories"].includes(p.category) ? "Standard" : "Queen",
      );
      setPhoto(0);
      document.title = `${p.name} — ${p.material} | ${boot.settings.storeName}`;
    }
  }, [p?.id]);
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!p)
    return (
      <div className="section">
        <Loading />
      </div>
    );
  const variant =
      p.variants.find(
        (v) =>
          v.size === size &&
          v.thickness === thickness &&
          v.firmness === firmness,
      ) || p.variants[0],
    images = p.images.length ? p.images : [p.image],
    price = variant?.price || p.price,
    accessory = ["Bedding", "Accessories"].includes(p.category);
  let touch = 0;
  return (
    <main className="product-page">
      <div className="section pdp-top">
        <Breadcrumb
          items={[{ label: "Mattresses", to: "/mattresses" }, p.name]}
        />
        <div className="pdp-layout">
          <div className="pdp-gallery">
            <div
              className="main-product-photo"
              onTouchStart={(e) => (touch = e.changedTouches[0].clientX)}
              onTouchEnd={(e) => {
                const d = e.changedTouches[0].clientX - touch;
                if (Math.abs(d) > 40)
                  setPhoto(
                    (photo + (d < 0 ? 1 : images.length - 1)) % images.length,
                  );
              }}
            >
              <img src={images[photo]} alt={`${p.name}, image ${photo + 1}`} />
              <span className="product-badge">
                {p.badge || "Thoughtfully made"}
              </span>
              <button
                className="zoom-btn icon-btn"
                onClick={() => setZoom(true)}
                aria-label="View fullscreen image"
              >
                <Maximize2 size={20} />
              </button>
              <button
                className="gallery-prev icon-btn"
                aria-label="Previous photo"
                onClick={() =>
                  setPhoto((photo + images.length - 1) % images.length)
                }
              >
                <ChevronLeft />
              </button>
              <button
                className="gallery-next icon-btn"
                aria-label="Next photo"
                onClick={() => setPhoto((photo + 1) % images.length)}
              >
                <ChevronRight />
              </button>
            </div>
            <div className="thumbnails">
              {images.map((im, i) => (
                <button
                  className={photo === i ? "active" : ""}
                  onClick={() => setPhoto(i)}
                  key={im + i}
                  aria-label={`View product image ${i + 1}`}
                >
                  <img src={im} alt="" />
                </button>
              ))}
            </div>
            <div className="gallery-caption">
              <Leaf size={18} />
              <span>Thoughtfully layered for beautifully better nights.</span>
            </div>
          </div>
          <div className="pdp-info">
            <div className="pdp-eyebrow">
              <span className="eyebrow">{p.category} COLLECTION</span>
              <button
                className="icon-btn"
                aria-label="Save product"
                onClick={() => toggleWish(p.id)}
              >
                <Heart
                  size={21}
                  fill={wishlist.includes(p.id) ? "currentColor" : "none"}
                />
              </button>
            </div>
            <h1>{p.name}</h1>
            <p className="pdp-subtitle">{p.subtitle}</p>
            <button
              className="review-jump"
              onClick={() =>
                document
                  .getElementById("reviews")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <Stars rating={p.rating} count={p.reviews} />
              <span>Read the reviews</span>
            </button>
            <div className="pdp-price">
              <strong>{money(price)}</strong>
              <del>
                {money(Math.round((price * p.original_price) / p.price))}
              </del>
              <span>
                {Math.round((1 - p.price / p.original_price) * 100)}% off
              </span>
            </div>
            <p className="tax-note">
              Inclusive of all taxes · EMI available after payment integration
            </p>
            <div className="pdp-benefits">
              <span>
                <Wind size={17} />
                Breathable comfort
              </span>
              <span>
                <Layers size={17} />
                {firmness} support
              </span>
              <span>
                <Moon size={17} />
                Less motion transfer
              </span>
            </div>
            {!accessory && (
              <>
                <div className="selector-heading">
                  <b>1. Choose your size</b>
                  <Link to="/faq" className="text-link">
                    Size guide <ArrowUpRight size={13} />
                  </Link>
                </div>
                <div className="size-selector">
                  {["Single", "Double", "Queen", "King"].map((s) => (
                    <button
                      aria-pressed={size === s}
                      key={s}
                      className={size === s ? "selected" : ""}
                      onClick={() => setSize(s)}
                    >
                      <b>{s}</b>
                      <span>
                        {
                          {
                            Single: "36 × 75",
                            Double: "54 × 75",
                            Queen: "60 × 78",
                            King: "72 × 78",
                          }[s]
                        }{" "}
                        in
                      </span>
                    </button>
                  ))}
                </div>
                <div className="selector-heading">
                  <b>2. A little more height?</b>
                  <span>Choose your profile</span>
                </div>
                <div className="pill-select">
                  {["6", "8", "10"].map((t) => (
                    <button
                      key={t}
                      className={thickness === t ? "selected" : ""}
                      aria-pressed={thickness === t}
                      onClick={() => setThickness(t)}
                    >
                      {t} inches{t === p.thickness && <span>Recommended</span>}
                    </button>
                  ))}
                </div>
                <div className="selector-heading">
                  <b>3. Make it feel like you</b>
                  <span>Choose your comfort</span>
                </div>
                <div className="pill-select">
                  {[...new Set(p.variants.map((v) => v.firmness))].map((f) => (
                    <button
                      key={f}
                      className={firmness === f ? "selected" : ""}
                      aria-pressed={firmness === f}
                      onClick={() => setFirmness(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="firmness-line">
                  <span>Comfort feel</span>
                  <div>
                    <span>Soft</span>
                    <div className="firmness-meter">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <i
                          key={i}
                          className={
                            i <= { Soft: 1, Medium: 2, Firm: 4 }[firmness]
                              ? "fill"
                              : ""
                          }
                        />
                      ))}
                    </div>
                    <span>Firm</span>
                  </div>
                  <b>{firmness}</b>
                </div>
              </>
            )}
            {accessory && (
              <div className="accessory-info">
                <CheckCircle2 size={18} />
                <div>
                  <strong>One thoughtfully chosen size.</strong>
                  <p>
                    Standard · {p.material} · Ready to make your bed feel a
                    little better.
                  </p>
                </div>
              </div>
            )}
            <div className="pdp-purchase">
              <Quantity value={qty} onChange={setQty} />
              <Button
                disabled={!p.stock}
                onClick={() => addCart(p, variant, qty)}
              >
                {p.stock ? "Add to bag" : "Out of stock"}
                <ShoppingBag size={17} />
              </Button>
            </div>
            <button
              className="btn outline full"
              disabled={!p.stock}
              onClick={() => {
                if (addCart(p, variant, qty, "/checkout")) nav("/checkout");
              }}
            >
              Buy now <ArrowRight size={17} />
            </button>
            <div className="stock-note">
              <i />
              {p.stock > 0
                ? `In stock. Ready for better nights.`
                : "We’re making more comfort. Check back soon."}
              <button onClick={() => toggleCompare(p.id)}>
                <GitCompareArrows size={14} />
                {compare.includes(p.id) ? "Added to comparison" : "Compare"}
              </button>
            </div>
            <form
              className="delivery-check"
              onSubmit={(e) => {
                e.preventDefault();
                setDelivery(
                  /^[1-9]\d{5}$/.test(pin)
                    ? "Delivery estimate: 5–7 business days. Final availability confirmed by our team."
                    : "Enter a valid 6-digit Indian PIN code.",
                );
              }}
            >
              <div>
                <Truck size={18} />
                <b>Good sleep, delivered.</b>
              </div>
              <div className="pin-input">
                <input
                  aria-label="Delivery PIN code"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter your PIN code"
                />
                <button>Check</button>
              </div>
              {delivery && <p role="status">{delivery}</p>}
            </form>
          </div>
        </div>
      </div>
      <TrustStrip />
      <section className="section product-story">
        <div>
          <span className="eyebrow">REST, REIMAGINED</span>
          <h2>
            Every layer.
            <br />A little more lovely.
          </h2>
          <p>{p.description}</p>
          <Link to="/quiz" className="text-link">
            Is this your perfect match? <ArrowUpRight size={16} />
          </Link>
        </div>
        <img
          src={p.image}
          alt={`${p.name} material and quilted surface`}
          loading="lazy"
        />
      </section>
      <section className="section pdp-details">
        <div>
          <span className="eyebrow">THE FINER DETAILS</span>
          <h2>Comfort, considered.</h2>
          <div className="spec-grid">
            {[
              ["Material", p.material],
              ["Comfort feel", p.firmness],
              ["Height options", "6, 8 or 10 inches"],
              ["Motion isolation", p.specs.motionIsolation || "Excellent"],
              ["Edge support", p.specs.edgeSupport || "Supportive"],
              ["Sleep position", p.specs.sleepPosition || "All positions"],
              [
                "Support capacity",
                `${p.specs.weight || 150} kg per sleeper (sample)`,
              ],
              ["Warranty", "See the shop warranty policy"],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Accordion title="Materials & craftsmanship" open>
            {p.description}
          </Accordion>
          <Accordion title="Delivery & setup">
            Your mattress arrives carefully packed. Allow it to settle before
            your first night. Our demo delivery estimate is 5–7 business days.{" "}
            <Link to="/page/shipping">Read our delivery information.</Link>
          </Accordion>
          <Accordion title="Care & warranty">
            Use a breathable protector and rotate regularly. Never soak your
            mattress.{" "}
            <Link to="/page/warranty">View warranty information.</Link>
          </Accordion>
        </div>
      </section>
      <section id="reviews" className="section product-reviews">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GOOD NIGHTS, IN THEIR OWN WORDS</span>
            <h2>The rest is in the reviews.</h2>
            <Stars rating={p.rating} count={p.reviews} />
          </div>
          <button
            className="btn outline"
            onClick={() => (boot.user ? setReview(true) : nav("/account"))}
          >
            Share your experience <Plus size={16} />
          </button>
        </div>
        <div className="testimonial-grid">
          {p.reviewList.map((r) => (
            <article key={r.id}>
              <Stars rating={r.rating} />
              <h3>{r.title}</h3>
              <p>{r.body}</p>
              <div className="review-author">
                <strong>{r.name}</strong>
                {!!r.verified && (
                  <span className="verified">
                    <CheckCircle2 size={12} />
                    Verified buyer
                  </span>
                )}
              </div>
              {r.response && (
                <div className="review-response">
                  <b>{boot.settings.storeName} replied</b>
                  <p>{r.response}</p>
                </div>
              )}
              <button
                className="helpful-btn"
                onClick={async () => {
                  try {
                    await api("/reviews/" + r.id + "/helpful", {
                      method: "POST",
                    });
                    reload();
                    notify("Thanks for your feedback.");
                  } catch (e) {
                    notify(e.message, "error");
                  }
                }}
              >
                <ThumbsUp size={13} /> Helpful ({r.helpful})
              </button>
            </article>
          ))}
        </div>
      </section>
      {zoom && (
        <Modal title={p.name} onClose={() => setZoom(false)} wide>
          <img className="fullscreen-photo" src={images[photo]} alt={p.name} />
          <div className="modal-controls">
            <button
              className="btn outline"
              onClick={() =>
                setPhoto((photo + images.length - 1) % images.length)
              }
            >
              <ChevronLeft />
              Previous
            </button>
            <span>
              {photo + 1} / {images.length}
            </span>
            <button
              className="btn outline"
              onClick={() => setPhoto((photo + 1) % images.length)}
            >
              Next
              <ChevronRight />
            </button>
          </div>
        </Modal>
      )}
      {review && (
        <Modal title="How are you sleeping?" onClose={() => setReview(false)}>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const f = Object.fromEntries(new FormData(e.currentTarget));
              try {
                await api("/reviews", {
                  method: "POST",
                  body: { ...f, productId: p.id, rating: +f.rating },
                });
                notify("Thank you. Your review is awaiting moderation.");
                setReview(false);
              } catch (e) {
                notify(e.message, "error");
              }
              setBusy(false);
            }}
          >
            <Field label="Your rating">
              <select name="rating">
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} stars
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="A few words to sum it up"
              name="title"
              required
              minLength={3}
            />
            <Field label="Tell us about your nights">
              <textarea name="body" minLength={10} required rows={4} />
            </Field>
            <p className="fine-print">
              Reviews are available to customers with a delivered order.
            </p>
            <Button loading={busy}>Submit review</Button>
          </form>
        </Modal>
      )}
      <div className="mobile-purchase">
        <div>
          <span>
            {p.name} · {size}
          </span>
          <b>{money(price)}</b>
        </div>
        <button
          className="btn"
          disabled={!p.stock}
          onClick={() => addCart(p, variant, qty)}
        >
          Add to bag <ShoppingBag size={17} />
        </button>
      </div>
    </main>
  );
}
const questions = [
  {
    title: "How do you drift off?",
    sub: "Start with the position you find most comfortable.",
    options: [
      "On my side",
      "On my back",
      "On my stomach",
      "A little of everything",
    ],
    icons: ["☾", "☀", "⌁", "✧"],
  },
  {
    title: "Who’s sharing your dreams?",
    sub: "A little room for you. Maybe someone else, too.",
    options: ["Just me", "Me and my partner", "We share with a little one"],
  },
  {
    title: "What’s your kind of comfort?",
    sub: "There’s no right answer. Just your answer.",
    options: [
      "Soft and cloud-like",
      "A balanced medium",
      "Firm and supportive",
      "I’m not sure yet",
    ],
  },
  {
    title: "Any pressure around your shoulders or hips?",
    sub: "We’ll keep your comfort in mind. This isn’t medical advice.",
    options: ["Often", "Sometimes", "Not usually"],
  },
  {
    title: "Do your nights run a little warm?",
    sub: "Let’s find your cooler side.",
    options: ["Yes, I sleep hot", "Sometimes", "No, I’m usually comfortable"],
  },
  {
    title: "Your approximate weight range?",
    sub: "This helps us suggest a comfortable level of support.",
    options: ["Under 60 kg", "60–90 kg", "90–120 kg", "Over 120 kg"],
  },
  {
    title: "What budget feels comfortable?",
    sub: "Better sleep, at a price that feels right.",
    options: [
      "Under ₹15,000",
      "₹15,000–₹25,000",
      "₹25,000–₹40,000",
      "Comfort comes first",
    ],
  },
  {
    title: "How much room to dream?",
    sub: "Choose the size that fits your space.",
    options: ["Single", "Double", "Queen", "King"],
  },
];
export function QuizPage() {
  const { products, addCart } = useStore(),
    [step, setStep] = useState(0),
    [answers, setAnswers] = useState([]),
    [selected, setSelected] = useState(null);
  const done = step === questions.length;
  const ranked = useMemo(() => {
    return products
      .filter((p) => !["Bedding", "Accessories", "Kids"].includes(p.category))
      .map((p) => {
        let score = 65;
        const soft = answers[2] === 0,
          firm = answers[2] === 2;
        if (
          (soft && p.firmness === "Soft") ||
          (firm && p.firmness === "Firm") ||
          (!soft && !firm && p.firmness === "Medium")
        )
          score += 12;
        if (answers[4] === 0 && ["Hybrid", "Latex"].includes(p.category))
          score += 8;
        if (answers[3] < 2 && p.category === "Memory Foam") score += 6;
        if (answers[5] >= 2 && ["Hybrid", "Orthopedic"].includes(p.category))
          score += 6;
        const cap = [15000, 25000, 40000, 100000][answers[6] ?? 3];
        if (p.price <= cap) score += 9;
        else score -= 20;
        return { ...p, match: Math.min(98, score) };
      })
      .sort((a, b) => b.match - a.match);
  }, [answers, products]);
  if (done) {
    const p = ranked[0];
    return (
      <main className="quiz-result section">
        <span className="eyebrow">A LITTLE SCIENCE. A VERY GOOD MATCH.</span>
        <h1>Hello, better nights.</h1>
        <p>
          Based on your preferences, we think you’ll feel right at home here.
        </p>
        <div className="match-product">
          <img src={p.image} alt={p.name} />
          <div>
            <span className="match-score">
              <Sparkles size={15} />
              {p.match}% preference match
            </span>
            <h2>{p.name}</h2>
            <p>{p.subtitle}</p>
            <ul>
              <li>
                <Check size={17} />
                {p.firmness} comfort that suits your preference
              </li>
              <li>
                <Check size={17} />
                {p.material} for balanced, all-night support
              </li>
              <li>
                <Check size={17} />
                {p.specs.cooling
                  ? "Breathable layers to help keep things comfortable"
                  : "Considered layers for your kind of sleep"}
              </li>
            </ul>
            <h3>{money(p.price)}</h3>
            <Link className="btn" to={"/product/" + p.slug}>
              Meet your mattress <ArrowUpRight size={17} />
            </Link>
            <p className="fine-print">
              A shopping recommendation, not a clinical assessment. Match scores
              are illustrative.
            </p>
          </div>
        </div>
        <h2>A couple more good possibilities.</h2>
        <div className="product-grid quiz-alternatives">
          {ranked.slice(1, 3).map((p) => (
            <ProductCard p={p} key={p.id} />
          ))}
        </div>
        <button
          className="text-link"
          onClick={() => {
            setStep(0);
            setAnswers([]);
            setSelected(null);
          }}
        >
          <ArrowLeft size={15} />
          Start fresh
        </button>
      </main>
    );
  }
  const q = questions[step];
  return (
    <main className="quiz-page">
      <Link className="quiz-back" to="/mattresses">
        <ArrowLeft size={15} />
        Back to mattresses
      </Link>
      <div className="quiz-shell">
        <div className="quiz-progress-label">
          <span className="eyebrow">YOUR PERSONAL COMFORT FINDER</span>
          <span>0{step + 1} / 08</span>
        </div>
        <div className="quiz-progress">
          <i style={{ width: ((step + 1) / 8) * 100 + "%" }} />
        </div>
        <span className="quiz-symbol">
          <Moon size={32} strokeWidth={1} />
        </span>
        <h1>{q.title}</h1>
        <p>{q.sub}</p>
        <div className="quiz-options">
          {q.options.map((o, i) => (
            <button
              key={o}
              className={selected === i ? "selected" : ""}
              onClick={() => setSelected(i)}
            >
              {q.icons && <span className="option-symbol">{q.icons[i]}</span>}
              <span>{o}</span>
              <i>{selected === i && <Check size={14} />}</i>
            </button>
          ))}
        </div>
        <div className="quiz-navigation">
          <button
            disabled={!step}
            className="text-link"
            onClick={() => {
              setStep(step - 1);
              setSelected(answers[step - 1]);
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <Button
            disabled={selected === null}
            onClick={() => {
              setAnswers([...answers.slice(0, step), selected]);
              setStep(step + 1);
              setSelected(answers[step + 1] ?? null);
            }}
          >
            {step === 7 ? "Find my match" : "Continue"}
            <ArrowRight size={17} />
          </Button>
        </div>
        <p className="quiz-privacy">
          <Lock size={13} /> Your answers stay in this session. Just a little
          guidance, no pressure.
        </p>
      </div>
    </main>
  );
}
export function ComparePage() {
  const { products, compare, toggleCompare, setCompare } = useStore();
  const [add, setAdd] = useState(false);
  const ps = products.filter((p) => compare.includes(p.id));
  const rows = [
    ["Queen price", (p) => money(p.price)],
    ["Materials", (p) => p.material],
    ["Comfort feel", (p) => p.firmness],
    ["Height", (p) => p.thickness + " inches"],
    ["Cooling", (p) => (p.specs.cooling ? "Breathable layers" : "Standard")],
    ["Motion isolation", (p) => p.specs.motionIsolation || "Excellent"],
    ["Edge support", (p) => p.specs.edgeSupport || "Supportive"],
    ["Support", (p) => p.specs.support || "Balanced"],
    ["Warranty", (p) => String(p.specs.warranty || "Confirm with the shop")],
    ["Weight capacity", (p) => (p.specs.weight || 150) + " kg / sleeper*"],
    ["Best for", (p) => p.specs.sleepPosition || "All sleep positions"],
  ];
  return (
    <main className="section compare-page">
      <Breadcrumb items={["Compare mattresses"]} />
      <span className="eyebrow">A SIDE-BY-SIDE KIND OF CLARITY</span>
      <h1>Find your just-right.</h1>
      <div className="section-heading">
        <p>A few thoughtful differences. One very personal decision.</p>
        <button
          className="btn outline"
          disabled={compare.length >= 3}
          onClick={() => setAdd(true)}
        >
          <Plus size={16} />
          Add a mattress
        </button>
      </div>
      {!ps.length ? (
        <Empty
          icon={GitCompareArrows}
          title="Make a little room to compare."
          text="Select up to three mattresses to see their finer details, side by side."
        />
      ) : (
        <>
          <div className="comparison-scroll">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>
                    <span className="eyebrow">THE FINER DETAILS</span>
                    <h3>
                      Good choices.
                      <br />
                      Better clarity.
                    </h3>
                  </th>
                  {ps.map((p) => (
                    <th key={p.id}>
                      <button
                        className="compare-remove icon-btn"
                        aria-label={`Remove ${p.name}`}
                        onClick={() => toggleCompare(p.id)}
                      >
                        <X size={15} />
                      </button>
                      <img src={p.image} alt={p.name} />
                      <h3>{p.name}</h3>
                      <Stars rating={p.rating} />
                      <Link className="btn" to={"/product/" + p.slug}>
                        Explore <ArrowRight size={15} />
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, get]) => (
                  <tr key={label}>
                    <th>{label}</th>
                    {ps.map((p) => (
                      <td key={p.id}>{get(p)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine-print">
            *Sample product specifications and terms. Confirm with the owner
            before purchasing.
          </p>
        </>
      )}
      {add && (
        <Modal title="A little more to compare" onClose={() => setAdd(false)}>
          <div className="search-results">
            {products
              .filter(
                (p) =>
                  !compare.includes(p.id) &&
                  !["Bedding", "Accessories"].includes(p.category),
              )
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    toggleCompare(p.id);
                    setAdd(false);
                  }}
                >
                  <img src={p.image} alt="" />
                  <div>
                    <h4>{p.name}</h4>
                    <span>{p.category}</span>
                  </div>
                  <Plus size={20} />
                </button>
              ))}
          </div>
        </Modal>
      )}
    </main>
  );
}
export function WishlistPage() {
  const { products, wishlist } = useStore();
  return (
    <main className="section wishlist-page">
      <Breadcrumb items={["Wishlist"]} />
      <span className="eyebrow">KEEP A LITTLE COMFORT CLOSE</span>
      <h1>Good things, saved for later.</h1>
      <p className="lead">
        Your favourite ways to end the day. All in one place.
      </p>
      {wishlist.length ? (
        <div className="product-grid">
          {products
            .filter((p) => wishlist.includes(p.id))
            .map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
        </div>
      ) : (
        <Empty
          icon={Heart}
          title="A little empty. Full of possibility."
          text="Tap the heart on a product to save it here for a better night later."
        />
      )}
    </main>
  );
}
export function ContentPage({ type }) {
  const { boot } = useStore();
  const { slug } = useParams();
  const content = boot.content.find((c) => c.id === slug);
  if (type === "faq")
    return (
      <main className="section content-page">
        <Breadcrumb items={["FAQs"]} />
        <span className="eyebrow">A LITTLE CLARITY, A LOT OF COMFORT</span>
        <h1>Rest assured.</h1>
        <p className="lead">Your questions. Thoughtfully answered.</p>
        <div className="faq-list">
          {boot.content
            .filter((c) => c.type === "faq")
            .map((c) => (
              <Accordion title={c.title} key={c.id}>
                {c.body}
              </Accordion>
            ))}
        </div>
        <div className="contact-callout">
          <h3>Still wondering about something?</h3>
          <p>Our team is here to help find your comfort.</p>
          <Link className="btn" to="/support">
            Let’s talk <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    );
  if (type === "guides" && !slug)
    return (
      <main className="section content-page">
        <Breadcrumb items={["The Sleep Guide"]} />
        <span className="eyebrow">LESS SCROLLING. MORE RESTING.</span>
        <h1>The art of a better night.</h1>
        <p className="lead">
          Thoughtful advice, little rituals, and everything in between.
        </p>
        <div className="journal-grid">
          {boot.content
            .filter((c) => c.type === "guide")
            .map((c, i) => (
              <Link
                className="journal-card"
                key={c.id}
                to={"/sleep-guide/" + c.id}
              >
                <div>
                  <img
                    src={
                      [
                        "/images/detail.webp",
                        "/images/natural.webp",
                        "/images/bedding.webp",
                      ][i % 3]
                    }
                    alt={c.title}
                  />
                </div>
                <span className="eyebrow">THE SLEEP GUIDE · 4 MIN READ</span>
                <h2>{c.title}</h2>
                <span className="text-link">
                  Read the story <ArrowUpRight size={16} />
                </span>
              </Link>
            ))}
        </div>
      </main>
    );
  if (!content)
    return (
      <Empty
        title="This page is taking a little rest."
        text="Let’s find your way back to something comfortable."
        to="/"
        action="Back to home"
      />
    );
  return (
    <main className="section article-page">
      <Breadcrumb
        items={[
          content.type === "guide"
            ? { label: "Sleep Guide", to: "/sleep-guide" }
            : { label: boot.settings.storeName, to: "/" },
          content.title,
        ]}
      />
      <span className="eyebrow">
        {content.type === "guide"
          ? "THE SLEEP GUIDE"
          : `A LITTLE CLARITY FROM ${boot.settings.storeName}`}
      </span>
      <h1>{content.title}</h1>
      {content.type === "guide" && (
        <img
          className="article-hero"
          src="/images/detail.webp"
          alt="A peaceful, light-filled bedroom"
        />
      )}
      <div className="article-body">
        {content.body.split("\n\n").map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="contact-callout">
        <h3>A little more help?</h3>
        <Link className="text-link" to="/support">
          We’re here for you <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
