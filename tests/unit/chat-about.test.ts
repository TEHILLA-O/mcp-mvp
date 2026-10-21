import { describe, expect, it } from "vitest";
import { isAboutMcp, MCP_ARCHITECTURE } from "@/lib/chat/about";

describe("MCP architecture answers", () => {
  it("recognises questions about hosting, the server, the client, and allowed tools", () => {
    expect(isAboutMcp("How does the MCP work, from hosting to the server and the client?")).toBe(true);
    expect(isAboutMcp("What functions is the MCP allowed to call?")).toBe(true);
    expect(isAboutMcp("Explain the app")).toBe(true);
    expect(isAboutMcp("what about the client?")).toBe(true);
  });

  it("leaves statistics questions to the tools", () => {
    expect(isAboutMcp("Show headline inflation from 2020 to 2025")).toBe(false);
    expect(isAboutMcp("Compare food and core inflation")).toBe(false);
  });

  it("names the host, both sides of the connection, and the eight tools", () => {
    expect(MCP_ARCHITECTURE).toContain("/api/mcp");
    expect(MCP_ARCHITECTURE).toContain("gazette-nbs");
    expect(MCP_ARCHITECTURE).toContain("gazette-web");
    for (const tool of [
      "search_datasets",
      "get_statistics",
      "compare_statistics",
      "get_dataset_metadata",
      "list_indicators",
      "get_geographic_comparison",
      "calculate_trend",
      "get_available_periods",
    ]) {
      expect(MCP_ARCHITECTURE).toContain(tool);
    }
    expect(MCP_ARCHITECTURE).toContain("not offered get_dataset_metadata or get_available_periods");
  });
});
