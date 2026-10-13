import { it, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "../src/i18n";
import { Neuron, Flatten, Backprop } from "../src/labs/Mechanical";
it("changing a weight changes the actual neuron output", () => {
  render(<Neuron />);
  const w = screen.getByRole("slider", { name: "Weights w1" });
  fireEvent.change(w, { target: { value: "1" } });
  expect(screen.getByText("relu(z) → 1")).toBeInTheDocument();
  cleanup();
});
it("flatten selection maps a known spatial coordinate to an index", () => {
  render(<Flatten />);
  fireEvent.click(
    screen.getByRole("button", { name: "Flatten [0, 3, 0] = 4" }),
  );
  expect(screen.getByText("[0,1,1] ↔ 3")).toBeInTheDocument();
  cleanup();
});
it("a previous snapshot does not pretend to undo an update", () => {
  render(<Backprop />);
  fireEvent.click(screen.getByRole("button", { name: "Apply one SGD update" }));
  expect(screen.getByText("z=2.6; a=2.6")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Previous" }));
  expect(screen.getByText("z=1; a=1")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("z=2.6; a=2.6")).toBeInTheDocument();
  cleanup();
});
