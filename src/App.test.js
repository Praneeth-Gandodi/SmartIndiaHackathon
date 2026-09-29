import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

/*
 * The 3D globe needs a WebGL canvas, which jsdom does not provide. Stub it so
 * the walkthrough tests can advance past the loading screen without dragging
 * a WebGL renderer into every test.
 */
jest.mock("./components/SatelliteEarth", () => ({
  __esModule: true,
  default: () => <div data-testid="satellite-earth-stub" />
}));

/* The reveal-on-scroll effect only runs once loading finishes, and jsdom has
   no IntersectionObserver. */
class IntersectionObserverStub {
  observe() {}

  unobserve() {}

  disconnect() {}
}

global.IntersectionObserver =
  global.IntersectionObserver || IntersectionObserverStub;

const WALKTHROUGH_KEY = "agni-drishti-walkthrough-seen";

/*
 * The app shows a loading screen for roughly 2.7s before the navbar exists,
 * then waits 600ms before auto-starting the walkthrough.
 *
 * This has to advance in two steps: `act` flushes effects after the advance
 * returns, so a single advance would schedule the walkthrough timer only once
 * the clock had already run out.
 */
function advancePastLoading() {
  act(() => {
    jest.advanceTimersByTime(4000);
  });
  act(() => {
    jest.advanceTimersByTime(1500);
  });
}

afterEach(() => {
  window.localStorage.removeItem("agni-drishti-theme");
  window.localStorage.removeItem(WALKTHROUGH_KEY);
  delete document.documentElement.dataset.theme;
  delete document.documentElement.style.colorScheme;
  jest.useRealTimers();
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

test("opens the walkthrough on a first visit and marks it seen on skip", () => {
  jest.useFakeTimers();
  render(<App />);

  advancePastLoading();

  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(
    screen.getByText("Three pages, and how to get back")
  ).toBeInTheDocument();

  act(() => {
    screen.getByText("SKIP").click();
  });

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    window.localStorage.getItem(WALKTHROUGH_KEY)
  ).toBe("1");
});

test("does not reopen the walkthrough once it has been seen", () => {
  window.localStorage.setItem(WALKTHROUGH_KEY, "1");
  jest.useFakeTimers();

  render(<App />);
  advancePastLoading();

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("replays the walkthrough from the navbar", () => {
  window.localStorage.setItem(WALKTHROUGH_KEY, "1");
  jest.useFakeTimers();

  render(<App />);
  advancePastLoading();

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  act(() => {
    screen.getByLabelText("Replay walkthrough").click();
  });

  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(
    screen.getByText("Three pages, and how to get back")
  ).toBeInTheDocument();
});

test("shows an empty state instead of unfiltered data when a filter matches nothing", () => {
  jest.useFakeTimers();
  render(<App />);
  advancePastLoading();

  act(() => {
    screen.getByText("Analytics").click();
  });

  // EAST INDIA has zero detections in the snapshot. The priority card used to
  // fall back to the unfiltered set and display 101 under a label reading
  // "FILTERED THERMAL EVENTS", which contradicted the rest of the page.
  const region = screen.getByDisplayValue("ALL REGIONS");
  fireEvent.change(region, { target: { value: "EAST INDIA" } });

  expect(screen.getByText("SHOWING 0 OF 101 EVENTS")).toBeInTheDocument();
  expect(screen.getByText(/NO MATCHING/)).toBeInTheDocument();
  expect(
    screen.queryByText("FILTERED THERMAL EVENTS")
  ).not.toBeInTheDocument();
});

test("moves forward and back through the walkthrough steps", () => {
  window.localStorage.setItem(WALKTHROUGH_KEY, "1");
  jest.useFakeTimers();

  render(<App />);
  advancePastLoading();

  act(() => {
    screen.getByLabelText("Replay walkthrough").click();
  });

  act(() => {
    screen.getByText("NEXT").click();
  });
  expect(screen.getByText("Two ways in")).toBeInTheDocument();

  act(() => {
    screen.getByText("BACK").click();
  });
  expect(
    screen.getByText("Three pages, and how to get back")
  ).toBeInTheDocument();
});
