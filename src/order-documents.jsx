import React, { useState } from "react";
import {
  Download,
  Phone,
  MessageCircle,
  Mail,
  Share2,
  ArrowRight,
} from "lucide-react";
import { api, Button, Field, money, date, useStore } from "./core";
export const callbackEnglish = "The owner will call you soon.";
export const callbackHindi = "दुकान के मालिक जल्द ही आपको कॉल करेंगे।";
export async function loadOrderFile(id) {
  const d = await api("/account/orders/" + encodeURIComponent(id) + "/pdf");
  const bytes = Uint8Array.from(atob(d.base64), (c) => c.charCodeAt(0));
  return new File([bytes], d.filename, { type: d.mime });
}
export function saveOrderFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function downloadInvoice(o) {
  saveOrderFile(await loadOrderFile(o.id));
}
const phoneNumber = (value) => {
  let n = String(value || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  return n.length === 10 ? "91" + n : n;
};
export function orderText(o, shop) {
  const a = o.address || {},
    preview = o.summary?.isPreview;
  return `${shop.storeName || "REAL FEELING MATTRESS"}\n${preview ? "PREVIEW " : ""}ORDER SUMMARY — ${o.id}\nStatus: ${o.status}\nPayment: ${o.payment_status}\nSubmitted: ${date(o.created)}\n\n${o.customer}\nEmail: ${o.email}\nPhone: +91 ${o.phone}\nShipping: ${a.line1}, ${a.city}, ${a.state} ${a.pincode}\n\n${o.items.map((i) => `${i.name} — ${i.size}, ${i.thickness} in, ${i.firmness}\nQty ${i.quantity} × INR ${i.price} = INR ${i.quantity * i.price}`).join("\n\n")}\n\nSubtotal: INR ${o.subtotal}\nDiscount${o.coupon ? " (" + o.coupon + ")" : ""}: INR ${o.discount}\nShipping: INR ${o.shipping}\nIncluded tax: INR ${o.tax}\nTOTAL — UNPAID: INR ${o.total}\n${o.summary?.deliveryNotes ? "Delivery notes: " + o.summary.deliveryNotes + "\n" : ""}\n${["Awaiting confirmation", "Placed"].includes(o.status) ? callbackEnglish + "\n" + callbackHindi : "Current order status: " + o.status + ". Contact the shop with any questions."}\nDelivery timing and payment arrangements require owner confirmation.\nShop: ${shop.phone || ""}\n${shop.address || ""}\nNot a tax invoice or payment receipt. No online payment collected.${preview ? " Preview only: no real callback is scheduled." : ""}`;
}
export function OrderActions({ order }) {
  const { boot, notify } = useStore(),
    shop = order.summary?.shop || boot.settings;
  const [recipient, setRecipient] = useState(phoneNumber(boot.settings.phone)),
    [file, setFile] = useState(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const text = orderText(order, shop),
    number = phoneNumber(recipient),
    valid = /^[1-9]\d{7,14}$/.test(number);
  const short = `${shop.storeName} — order ${order.id}\nTotal: INR ${order.total}\n${order.payment_status}\nFull details are in the order PDF. Please attach the downloaded PDF manually.`;
  const whatsappText = encodeURIComponent(text).length < 6500 ? text : short;
  const emailText = encodeURIComponent(text).length < 5000 ? text : short;
  async function prepare(download = false) {
    setBusy(download ? "download" : "prepare");
    setError("");
    try {
      const f = file || (await loadOrderFile(order.id));
      setFile(f);
      if (download) saveOrderFile(f);
      else notify("PDF ready. Tap “Share PDF” to choose an app.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  async function share() {
    if (!file) return prepare();
    setError("");
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Order " + order.id });
      } else {
        saveOrderFile(file);
        notify(
          "File sharing is not supported here. Attach the downloaded PDF in WhatsApp or email.",
        );
      }
    } catch (e) {
      if (e.name !== "AbortError")
        setError(
          "Your browser could not share the file. Download the PDF and attach it manually.",
        );
    }
  }
  return (
    <section
      className="order-actions"
      aria-label="Download and share your order"
    >
      <h3>Keep a copy. Get in touch.</h3>
      <div className="receipt-action-grid">
        <Button
          type="button"
          loading={busy === "download"}
          disabled={Boolean(busy)}
          onClick={() => prepare(true)}
        >
          <Download size={17} />
          Download PDF
        </Button>
        <button
          type="button"
          className="btn outline"
          disabled={Boolean(busy)}
          onClick={share}
        >
          <Share2 size={17} />
          {busy === "prepare"
            ? "Preparing PDF…"
            : file
              ? "Share PDF"
              : "Prepare PDF to share"}
        </button>
        {boot.settings.phone && (
          <a
            className="btn outline"
            href={"tel:+" + phoneNumber(boot.settings.phone)}
          >
            <Phone size={17} />
            Call the shop
          </a>
        )}
        <a
          className="btn outline"
          href={
            "mailto:" +
            encodeURIComponent(boot.settings.email || "") +
            "?subject=" +
            encodeURIComponent("Order " + order.id + " — " + shop.storeName) +
            "&body=" +
            encodeURIComponent(emailText)
          }
        >
          <Mail size={17} />
          Email details
        </a>
      </div>
      <div className="whatsapp-share">
        <Field label="Send order details to a WhatsApp number">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="off"
            maxLength={22}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            aria-describedby="whatsapp-help"
          />
        </Field>
        {valid ? (
          <a
            className="btn outline"
            href={
              "https://wa.me/" +
              number +
              "?text=" +
              encodeURIComponent(whatsappText)
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={17} />
            Open WhatsApp
            <ArrowRight size={16} />
          </a>
        ) : (
          <button type="button" className="btn outline" disabled>
            Enter a valid number
          </button>
        )}
      </div>
      <p id="whatsapp-help" className="fine-print">
        Starts with the shop’s number. You can change it; 10-digit numbers use
        India’s +91 country code.
      </p>
      <p className="fine-print">
        Sharing includes your name, phone and delivery address. Nothing is sent
        automatically: choose a recipient and tap Send in your app.
        WhatsApp/email links share text, <strong>not the PDF</strong>. Use Share
        PDF where supported, or download and attach it manually. Long orders use
        a short message plus a reminder to attach the PDF. Your usual internet
        or call charges may apply.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
export function OrderReceipt({ order, actions = true }) {
  const s =
    typeof order.summary === "string"
      ? JSON.parse(order.summary || "{}")
      : order.summary || {};
  const o = { ...order, summary: s },
    a = o.address || {};
  return (
    <div className="order-receipt">
      <div className="receipt-heading">
        <div>
          <span className="eyebrow">YOUR ORDER NUMBER</span>
          <h2>{o.id}</h2>
          <p>{date(o.created)}</p>
        </div>
        <span className="status">{o.status}</span>
      </div>
      <div className="callback-notice">
        {["Awaiting confirmation", "Placed"].includes(o.status) ? (
          <>
            <h3>{callbackEnglish}</h3>
            <p lang="hi">{callbackHindi}</p>
          </>
        ) : (
          <h3>Order status: {o.status}</h3>
        )}
        <p>
          Delivery and payment arrangements will be confirmed by the owner. No
          online payment has been collected.
        </p>
        {s.isPreview && (
          <p className="preview-order-note">
            <strong>Preview order:</strong> no real purchase or callback is
            scheduled in this preview.
          </p>
        )}
      </div>
      <div className="receipt-contact">
        <div>
          <h3>Contact</h3>
          <p>
            {o.customer}
            <br />
            {o.email}
            <br />
            +91 {o.phone}
          </p>
        </div>
        <div>
          <h3>Ship to</h3>
          <p>
            {a.line1}
            <br />
            {a.city}, {a.state} {a.pincode}
          </p>
          <small>Standard delivery · timing to be confirmed</small>
        </div>
      </div>
      <div className="receipt-items">
        {o.items.map((i, n) => (
          <div className="receipt-item" key={i.id || n}>
            <div>
              <strong>{i.name}</strong>
              <p>
                {i.size} · {i.thickness}″ · {i.firmness}
                <br />
                Qty {i.quantity} × {money(i.price)}
              </p>
            </div>
            <b>{money(i.price * i.quantity)}</b>
          </div>
        ))}
      </div>
      <dl className="receipt-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{money(o.subtotal)}</dd>
        </div>
        <div>
          <dt>Discount {o.coupon && "(" + o.coupon + ")"}</dt>
          <dd>−{money(o.discount)}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>{o.shipping ? money(o.shipping) : "Free"}</dd>
        </div>
        <div>
          <dt>
            Included tax{s.taxRate !== undefined ? " (" + s.taxRate + "%)" : ""}
          </dt>
          <dd>{money(o.tax)}</dd>
        </div>
        <div className="receipt-grand-total">
          <dt>Total · unpaid</dt>
          <dd>{money(o.total)}</dd>
        </div>
      </dl>
      {s.deliveryNotes && (
        <div className="receipt-notes">
          <h3>Your delivery notes</h3>
          <p>{s.deliveryNotes}</p>
        </div>
      )}
      <p className="fine-print">
        {o.payment_status} · Tax is included in the item prices. This order
        summary is not a tax invoice or payment receipt.
      </p>
      {actions && <OrderActions order={o} />}
    </div>
  );
}
