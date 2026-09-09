import React, { lazy, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Provider, useStore, Boundary, ScrollTop, Loading } from "./core";
import {
  Header,
  Footer,
  MobileNav,
  CartDrawer,
  SearchOverlay,
  CompareBar,
} from "./components";
import {
  HomePage,
  ListingPage,
  CollectionsPage,
  ProductPage,
  QuizPage,
  ComparePage,
  WishlistPage,
  ContentPage,
} from "./storefront";
import {
  CartPage,
  CheckoutPage,
  AccountPage,
  TrackingPage,
  SupportPage,
  CustomerAuthDialog,
} from "./commerce";
import "./styles.css";
const Admin = lazy(() => import("./admin"));
function App() {
  const loc = useLocation(),
    { searchOpen, boot, products } = useStore();
  const owner = loc.pathname.startsWith("/owner"),
    checkout = loc.pathname === "/checkout";
  useEffect(() => {
    if (loc.pathname === "/") document.title = boot.settings.seoTitle;
    const current = products.find(
      (p) =>
        loc.pathname === "/product/" + p.slug ||
        loc.pathname === "/product/" + p.id,
    );
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        current
          ? current.subtitle + " " + current.description.slice(0, 120)
          : boot.settings.seoDescription,
      );
    const base = location.origin;
    let schema = document.getElementById("nocte-schema");
    if (!schema) {
      schema = document.createElement("script");
      schema.id = "nocte-schema";
      schema.type = "application/ld+json";
      document.head.appendChild(schema);
    }
    const data = [
      {
        "@type": "Organization",
        name: boot.settings.storeName,
        url: base,
        logo: base + "/favicon.svg",
      },
    ];
    if (current)
      data.push({
        "@type": "Product",
        name: current.name,
        description: current.description,
        image: new URL(current.image, base).href,
        sku: current.id,
        brand: { "@type": "Brand", name: boot.settings.storeName },
        offers: {
          "@type": "Offer",
          priceCurrency: "INR",
          price: current.price,
          availability:
            "https://schema.org/" + (current.stock ? "InStock" : "OutOfStock"),
          url: base + "/product/" + current.slug,
        },
      });
    if (loc.pathname === "/faq")
      data.push({
        "@type": "FAQPage",
        mainEntity: boot.content
          .filter((c) => c.type === "faq")
          .map((c) => ({
            "@type": "Question",
            name: c.title,
            acceptedAnswer: { "@type": "Answer", text: c.body },
          })),
      });
    if (loc.pathname !== "/")
      data.push({
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: base },
          {
            "@type": "ListItem",
            position: 2,
            name:
              current?.name ||
              loc.pathname.split("/").pop().replaceAll("-", " "),
            item: base + loc.pathname,
          },
        ],
      });
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": data,
    });
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute(
        "content",
        current
          ? current.name + " · " + boot.settings.storeName
          : boot.settings.seoTitle,
      );
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content =
      boot.demo ||
      boot.checkoutMode !== "cod" ||
      !boot.settings.launchReady ||
      owner ||
      checkout ||
      loc.pathname === "/account"
        ? "noindex, nofollow"
        : "index, follow";
  }, [
    boot.settings.seoTitle,
    boot.settings.seoDescription,
    loc.pathname,
    products,
  ]);
  return (
    <>
      <ScrollTop />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {!owner && !checkout && <Header />}
      <div id="main-content">
        <Suspense
          fallback={
            <div className="section">
              <Loading />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<ListingPage kind="search" />} />
            <Route path="/mattresses" element={<ListingPage />} />
            <Route path="/mattresses/:category" element={<ListingPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/bedding" element={<ListingPage kind="bedding" />} />
            <Route
              path="/accessories"
              element={<ListingPage kind="accessories" />}
            />
            <Route path="/offers" element={<ListingPage kind="offers" />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/faq" element={<ContentPage type="faq" />} />
            <Route
              path="/sleep-guide"
              element={<ContentPage type="guides" />}
            />
            <Route
              path="/sleep-guide/:slug"
              element={<ContentPage type="guides" />}
            />
            <Route path="/page/:slug" element={<ContentPage />} />
            <Route path="/owner" element={<Admin />} />
            <Route path="/owner/:section" element={<Admin />} />
            <Route path="*" element={<ContentPage />} />
          </Routes>
        </Suspense>
      </div>
      {!owner && !checkout && (
        <>
          <Footer />
          <MobileNav />
          <CompareBar />
        </>
      )}
      {!owner && <CartDrawer />}
      {!owner && <CustomerAuthDialog />}
      {searchOpen && <SearchOverlay />}
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <Boundary>
    <BrowserRouter>
      <Provider>
        <App />
      </Provider>
    </BrowserRouter>
  </Boundary>,
);
