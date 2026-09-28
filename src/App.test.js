import { act, render, screen } from "@testing-library/react";
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
    screen.getByText("The snapshot at a glance")
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
    screen.getByText("The snapshot at a glance")
  ).toBeInTheDocument();
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
  expect(
    screen.getByText("One row, one real observation")
  ).toBeInTheDocument();

  act(() => {
    screen.getByText("BACK").click();
  });
  expect(
    screen.getByText("The snapshot at a glance")
  ).toBeInTheDocument();
});
