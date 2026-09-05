import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SpecialistIdentity, specialistVisuals } from "./specialist-visuals";

describe("marketing specialist visuals", () => {
  it("defines the shared Creative and Ask Council specialist set", () => {
    expect(Object.keys(specialistVisuals)).toEqual(
      expect.arrayContaining([
        "marketing.hook-strategist",
        "marketing.script-writer",
        "marketing.creative-critic",
        "marketing.audience-researcher",
        "marketing.brand-director",
        "marketing.content-strategist",
        "strategic.challenge",
        "strategic.judge",
      ]),
    );
  });

  it("renders an accessible text identity with a Lucide visual", () => {
    render(<SpecialistIdentity id="marketing.hook-strategist" />);
    expect(screen.getByText("Hook Strategist")).toBeInTheDocument();
  });
});
