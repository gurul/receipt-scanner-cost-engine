// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReceiptScanner } from "./receipt-scanner";

afterEach(cleanup);

describe("ReceiptScanner mobile image controls", () => {
  it("offers separate rear-camera and photo-library inputs", () => {
    render(<ReceiptScanner />);

    const cameraLabel = screen.getByText("Take photo").closest("label");
    const libraryLabel = screen.getByText("Photo library").closest("label");
    const cameraInput = cameraLabel?.querySelector("input[type=file]");
    const libraryInput = libraryLabel?.querySelector("input[type=file]");

    expect(cameraInput?.getAttribute("accept")).toBe("image/*");
    expect(cameraInput?.getAttribute("capture")).toBe("environment");
    expect(libraryInput?.getAttribute("accept")).toBe("image/*");
    expect(libraryInput?.hasAttribute("capture")).toBe(false);
  });
});
