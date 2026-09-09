import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";
const font = fileURLToPath(
  new URL("./fonts/NotoSansDevanagari.ttf", import.meta.url),
);
export const callbackEnglish = "The owner will call you soon.";
export const callbackHindi = "दुकान के मालिक जल्द ही आपको कॉल करेंगे।";
const amount = (n) =>
  "INR " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export function orderPdf(order, shop) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 44, bottom: 52, left: 44, right: 44 },
      bufferPages: true,
      info: {
        Title: `Order summary ${order.id}`,
        Author: shop.storeName || "REAL FEELING MATTRESS",
        Subject: "Unpaid order summary — not a tax invoice or payment receipt",
      },
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    try {
      doc.registerFont("Body", font);
      doc.font("Body").fillColor("#272d29");
      const width = doc.page.width - 88;
      const ensure = (h) => {
        if (doc.y + h > doc.page.height - 65) doc.addPage();
      };
      const text = (value, size = 10, options = {}) => {
        doc.fontSize(size).text(String(value ?? ""), 44, doc.y, {
          width,
          lineGap: 3,
          ...options,
        });
      };
      const section = (label) => {
        ensure(70);
        doc.moveDown(0.65);
        text(label, 10);
        doc
          .moveTo(44, doc.y + 3)
          .lineTo(doc.page.width - 44, doc.y + 3)
          .strokeColor("#d8d9d1")
          .stroke();
        doc.moveDown(0.7);
      };
      text(shop.storeName || "REAL FEELING MATTRESS", 19);
      text("ORDER SUMMARY", 10);
      doc.moveDown(0.5);
      text(order.id, 15);
      text(
        "Submitted: " +
          new Date(order.created).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          }) +
          " IST",
        9,
      );
      text(
        "Status: " + order.status + "  |  Payment: " + order.payment_status,
        10,
      );
      text(
        "Not a tax invoice or payment receipt. No online payment collected.",
        9,
      );
      if (order.summary?.isPreview)
        text("PREVIEW ORDER — no real purchase or callback is scheduled.", 10);
      section("CONTACT & SHIPPING");
      text(order.customer, 12);
      text(order.email + "  |  +91 " + order.phone);
      const a = order.address || {};
      text(a.line1);
      text([a.city, a.state, a.pincode].filter(Boolean).join(", "));
      text(
        "Shipping: Standard delivery — timing to be confirmed by the owner.",
        9,
      );
      section("YOUR ITEMS");
      for (const i of order.items) {
        doc.fontSize(11);
        const titleHeight = doc.heightOfString(i.name, {
          width: 350,
          lineGap: 3,
        });
        const detail = `${i.size} · ${i.thickness} in · ${i.firmness} · Qty ${i.quantity} · Unit ${amount(i.price)}`;
        doc.fontSize(9);
        const detailHeight = doc.heightOfString(detail, { width, lineGap: 3 });
        ensure(titleHeight + detailHeight + 22);
        const y = doc.y;
        doc.fontSize(11).text(i.name, 44, y, { width: 350, lineGap: 3 });
        doc.fontSize(10).text(amount(i.quantity * i.price), 402, y, {
          width: 149,
          align: "right",
        });
        doc.y = y + titleHeight + 2;
        text(detail, 9);
        doc.moveDown(0.6);
      }
      section("ORDER TOTAL");
      for (const [label, value] of [
        ["Subtotal", order.subtotal],
        [
          "Discount" + (order.coupon ? " (" + order.coupon + ")" : ""),
          -order.discount,
        ],
        ["Shipping", order.shipping],
        [
          "Included tax" +
            (order.summary?.taxRate !== undefined
              ? " (" + order.summary.taxRate + "%)"
              : ""),
          order.tax,
        ],
        ["TOTAL — UNPAID", order.total],
      ]) {
        ensure(25);
        const y = doc.y;
        text(label, label.startsWith("TOTAL") ? 12 : 10);
        doc
          .fontSize(label.startsWith("TOTAL") ? 12 : 10)
          .text(amount(value), 390, y, { width: 161, align: "right" });
        doc.y = Math.max(doc.y, y + 22);
      }
      text("Tax shown is included in the item prices, not added again.", 8);
      if (order.summary?.deliveryNotes) {
        section("CUSTOMER DELIVERY NOTES");
        text(order.summary.deliveryNotes, 10);
      }
      section("WHAT HAPPENS NEXT");
      if (["Awaiting confirmation", "Placed"].includes(order.status)) {
        text(callbackEnglish, 12);
        text(callbackHindi, 12);
      } else
        text(
          "Current order status: " +
            order.status +
            ". Contact the shop with any questions.",
          12,
        );
      text(
        "Await owner confirmation of availability, delivery and payment arrangements. Submission is not payment confirmation.",
        9,
      );
      section("CONTACT THE SHOP");
      text(shop.phone || "Contact details are available in your account.", 10);
      if (shop.email) text(shop.email, 9);
      if (shop.address) text(shop.address, 9);
      text(
        "Sharing this PDF discloses your contact and delivery details to the recipient. WhatsApp and email sharing are customer-initiated, not automatic.",
        8,
      );
      const range = doc.bufferedPageRange();
      for (let n = 0; n < range.count; n++) {
        doc.switchToPage(n);
        const old = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc
          .fontSize(8)
          .fillColor("#68706a")
          .text(
            order.id + "  •  PRIVATE ORDER SUMMARY",
            44,
            doc.page.height - 32,
            { width: 410 },
          );
        doc.text(`${n + 1} / ${range.count}`, 480, doc.page.height - 32, {
          width: 70,
          align: "right",
        });
        doc.page.margins.bottom = old;
      }
      doc.end();
    } catch (e) {
      reject(e);
      doc.destroy();
    }
  });
}
