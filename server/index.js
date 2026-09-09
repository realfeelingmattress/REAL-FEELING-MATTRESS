import "./env.js";
import app from "./app.js";
import express from "express";
import path from "node:path";
import { db } from "./db.js";
import { pruneExpired } from "./security-store.js";
export { calculate } from "./app.js";
export default app;
if (!process.env.VERCEL) {
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("/{*path}", (req, res) =>
      res.sendFile(path.resolve("dist/index.html")),
    );
  }
  setInterval(
    () =>
      pruneExpired().catch((e) =>
        console.error("Session cleanup failed", e.message),
      ),
    120000,
  ).unref();
  const port = process.env.PORT || 3000;
  app.listen(port, "0.0.0.0", () =>
    console.log(
      `REAL FEELING MATTRESS is ready on port ${port}; ${db.kind} database; ${process.env.CHECKOUT_MODE === "cod" ? "cod" : "preview"} orders.`,
    ),
  );
}
