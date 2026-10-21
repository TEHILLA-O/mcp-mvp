import { describe, expect, it } from "vitest";
import { answerAbout, isAboutMcp, plainReply } from "@/lib/chat/about";

const TOOLS = [
  "search_datasets",
  "get_statistics",
  "compare_statistics",
  "get_dataset_metadata",
  "list_indicators",
  "get_geographic_comparison",
  "calculate_trend",
  "get_available_periods",
];

describe("MCP architecture answers", () => {
  it("recognises questions about hosting, the server, the client, and allowed tools", () => {
    expect(isAboutMcp("How does the MCP work, from hosting to the server and the client?")).toBe(true);
    expect(isAboutMcp("What functions is the MCP allowed to call?")).toBe(true);
    expect(isAboutMcp("Explain the app")).toBe(true);
    expect(isAboutMcp("what about the client?")).toBe(true);
    expect(isAboutMcp("is this an api or mcp")).toBe(true);
  });

  it("leaves statistics questions to the tools", () => {
    expect(isAboutMcp("Show headline inflation from 2020 to 2025")).toBe(false);
    expect(isAboutMcp("Compare food and core inflation")).toBe(false);
  });

  it("answers the question that was asked, without dashes", () => {
    const api = answerAbout("is this an api or mcp");
    expect(api).toContain("MCP server");
    expect(api).toContain("/api/mcp");
    expect(api).not.toMatch(/[—–]/);
    expect(api.length).toBeLessThan(500);

    const tools = answerAbout("What functions is the MCP allowed to call?");
    for (const tool of TOOLS) expect(tools).toContain(tool);
    expect(tools).not.toMatch(/[—–]/);

    const overview = answerAbout("How does the MCP work, from hosting to the server and the client?");
    expect(overview).toContain("gazette-nbs");
    expect(overview).toContain("gazette-web");
    expect(overview.length).toBeLessThan(api.length + tools.length);
  });

  it("turns a dash into a sentence break", () => {
    expect(plainReply("Eight tools — each one reads the snapshot.")).toBe("Eight tools. Each one reads the snapshot.");
  });
});
