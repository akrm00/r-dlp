import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

Object.defineProperty(Element.prototype, "hasPointerCapture", {
  value: () => false,
});

Object.defineProperty(Element.prototype, "setPointerCapture", {
  value: () => undefined,
});

Object.defineProperty(Element.prototype, "releasePointerCapture", {
  value: () => undefined,
});

Object.defineProperty(Element.prototype, "scrollIntoView", {
  value: () => undefined,
});

class ResizeObserverStub implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub;
