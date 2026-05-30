import { describe, expect, it } from "vitest";

import {
  formatLeadSource,
  formatLeadStatus,
  normalizePhoneForLink,
} from "@/lib/leads";

describe("leads helpers", () => {
  it("formats lead sources in plain English", () => {
    expect(formatLeadSource("form")).toBe("Lead page");
    expect(formatLeadSource("instagram")).toBe("Instagram");
  });

  it("formats lead statuses", () => {
    expect(formatLeadStatus("new")).toBe("New");
    expect(formatLeadStatus("booked")).toBe("Booked");
  });

  it("normalizes US phone numbers for tel/sms links", () => {
    expect(normalizePhoneForLink("(516) 555-1234")).toBe("+15165551234");
    expect(normalizePhoneForLink("")).toBeNull();
  });
});
