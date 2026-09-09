import { test } from "node:test";
import assert from "node:assert/strict";
import { searchProducts } from "../src/search.js";
const ps = [
  {
    id: "hybrid",
    name: "The Hybrid",
    category: "Hybrid",
    material: "Pocket springs + memory foam",
    firmness: "Medium",
    stock: 20,
  },
  {
    id: "pillow",
    name: "The Cloud Pillow",
    category: "Accessories",
    material: "Memory foam",
    firmness: "Soft",
    stock: 8,
  },
  {
    id: "ortho",
    name: "The Ortho",
    category: "Orthopedic",
    material: "Support foam",
    firmness: "Firm",
    stock: 15,
  },
];
test("Search supports multiple words, size hints, spelling aliases, simple typos and all categories", () => {
  assert.equal(searchProducts(ps, "queen hybrid")[0].id, "hybrid");
  assert.equal(searchProducts(ps, "orthopaedic")[0].id, "ortho");
  assert.equal(searchProducts(ps, "hybridd")[0].id, "hybrid");
  assert.equal(searchProducts(ps, "pillows")[0].id, "pillow");
  assert.equal(searchProducts(ps, "impossiblexyz").length, 0);
  assert.equal(searchProducts(ps, "   ").length, 3);
});
