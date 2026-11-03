// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import type { FinancialMovement } from "./lib/financial-types";

// Tells React this environment wraps updates in act(), so it does not warn.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const sampleMovements: FinancialMovement[] = [
  {
    create_date: "2024-01-10",
    amount: 1000,
    operation_type: "income",
    category: "sales",
    business_type: "B2B",
  },
  {
    create_date: "2024-01-15",
    amount: 250,
    operation_type: "outcome",
    category: "suppliers",
    business_type: "B2B",
  },
  {
    create_date: "2024-02-01",
    amount: 500,
    operation_type: "income",
    category: "sales",
    business_type: "B2C",
  },
];

let container: HTMLDivElement;
let root: Root;

async function renderApp() {
  await act(async () => {
    root.render(<App />);
  });
}

// Let the fetch promise chain (then/catch/finally) and resulting renders settle.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const statusText = () => container.querySelector('[role="status"]')?.textContent;
const alert = () => container.querySelector('[role="alert"]');
const busySections = () =>
  [...container.querySelectorAll("section")].map((s) => s.getAttribute("aria-busy"));

beforeEach(() => {
  // Recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("App dashboard fetch", () => {
  it("announces loading and marks sections busy while /api/metrics is pending", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    await renderApp();

    expect(fetch).toHaveBeenCalledWith("/api/metrics");
    expect(statusText()).toBe("Loading financial data…");
    expect(busySections()).toEqual(["true", "true"]);
    expect(alert()).toBeNull();
  });

  it("renders KPI values computed from the API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => sampleMovements })),
    );

    await renderApp();
    await settle();

    const text = container.textContent ?? "";
    expect(text).toContain("$1,500"); // total income
    expect(text).toContain("$250"); // total outcome
    expect(text).toContain("$1,250"); // profit
    expect(text).toContain("83.3%"); // profit margin
    expect(statusText()).toBe("");
    expect(busySections()).toEqual(["false", "false"]);
    expect(alert()).toBeNull();
  });

  it("shows an alert marked as Spanish when the API responds with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));

    await renderApp();
    await settle();

    expect(alert()?.textContent).toBe(
      "No se pudo cargar la informacion financiera. Revisa la API de backend.",
    );
    expect(alert()?.getAttribute("lang")).toBe("es");
    expect(busySections()).toEqual(["false", "false"]);
  });

  it("shows the same alert when the request fails at the network level", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));

    await renderApp();
    await settle();

    expect(alert()).not.toBeNull();
    expect(statusText()).toBe("");
  });
});
