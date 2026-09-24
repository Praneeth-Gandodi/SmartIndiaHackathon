import { render, screen } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  window.localStorage.removeItem("agni-drishti-theme");
  delete document.documentElement.dataset.theme;
  delete document.documentElement.style.colorScheme;
});

test("renders the AGNI DRISHTI FIRMS dashboard shell", () => {
  render(<App />);
  expect(screen.getByText("AGNI DRISHTI")).toBeInTheDocument();
  expect(screen.getByText(/INDIA FIRMS SNAPSHOT/i)).toBeInTheDocument();
});

test("defaults to dark theme without a saved preference", () => {
  render(<App />);

  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.documentElement.style.colorScheme).toBe("dark");
});

test("restores a persisted light theme when the app mounts", () => {
  window.localStorage.setItem("agni-drishti-theme", "light");

  render(<App />);

  expect(document.documentElement.dataset.theme).toBe("light");
  expect(document.documentElement.style.colorScheme).toBe("light");
});
