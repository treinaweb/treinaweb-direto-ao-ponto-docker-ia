import { describe, expect, it } from "vitest";
import { parseTicketId } from "@/lib/validation/params";

describe("parseTicketId", () => {
  it("aceita UUID", () => {
    expect(parseTicketId("2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11")).toBe(
      "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11",
    );
  });

  it.each(["abc", "", "123", "2b1f0c39-6b39-4b8a-9d36", null, undefined, 42])(
    "rejeita %j",
    (value) => {
      expect(parseTicketId(value)).toBeNull();
    },
  );
});
