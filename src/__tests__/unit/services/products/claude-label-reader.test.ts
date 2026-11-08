import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type Anthropic from "@anthropic-ai/sdk";
import { ClaudeLabelReader } from "@/integrations/claude/label-reader.js";
import { ClaudeConditionNoteTranslator } from "@/integrations/claude/condition-note-translator.js";
import { CLAUDE_MODEL } from "@/integrations/claude/claude-client.js";
import { ExternalServiceError } from "@/errors/external-service.error.js";

type ParseMock = jest.Mock<(params: Record<string, unknown>) => Promise<unknown>>;

const reading = {
  artists: ["Bunnington Judah"],
  title: "Jah Prophecy",
  label: "Zulu Vibes",
  catalogNumber: "ZV-7-006",
  year: null,
  format: '7"',
  speed: 45,
  sides: [],
};

describe("Claude integrations", () => {
  let parse: ParseMock;
  let client: Anthropic;

  beforeEach(() => {
    parse = jest.fn<(params: Record<string, unknown>) => Promise<unknown>>();
    client = { beta: { messages: { parse } } } as unknown as Anthropic;
  });

  it("should send label photos as base64 images with refusal fallbacks", async () => {
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: reading });

    const result = await new ClaudeLabelReader(client, "claude-opus-5-5").read([
      { data: Buffer.from("side-a"), mediaType: "image/jpeg" },
      { data: Buffer.from("side-b"), mediaType: "image/png" },
    ]);

    expect(result).toEqual(reading);

    const params = parse.mock.calls[0]![0] as {
      model: string;
      betas: string[];
      fallbacks: string;
      output_config: { effort: string };
      messages: { content: { type: string; source?: { data: string; media_type: string } }[] }[];
    };

    expect(params.model).toBe("claude-opus-5-5");
    expect(params.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(params.fallbacks).toBe("default");
    expect(params.output_config.effort).toBe("low");

    const images = params.messages[0]!.content.filter((block) => block.type === "image");

    expect(images.map((block) => block.source)).toEqual([
      { type: "base64", media_type: "image/jpeg", data: Buffer.from("side-a").toString("base64") },
      { type: "base64", media_type: "image/png", data: Buffer.from("side-b").toString("base64") },
    ]);
  });

  it("should fail clearly when Claude refuses", async () => {
    parse.mockResolvedValue({ stop_reason: "refusal", parsed_output: null });

    await expect(
      new ClaudeLabelReader(client).read([{ data: Buffer.from("x"), mediaType: "image/webp" }]),
    ).rejects.toThrow(new ExternalServiceError("Claude declined to read the label"));
  });

  it("should fail clearly when the answer does not match the schema", async () => {
    parse.mockResolvedValue({ stop_reason: "max_tokens", parsed_output: null });

    await expect(
      new ClaudeConditionNoteTranslator(client).translate("Lekki trzask"),
    ).rejects.toThrow(new ExternalServiceError("Claude could not translate the condition note"));
  });

  it("should wrap network errors", async () => {
    parse.mockRejectedValue(new Error("socket hang up"));

    await expect(
      new ClaudeConditionNoteTranslator(client).translate("Lekki trzask"),
    ).rejects.toBeInstanceOf(ExternalServiceError);
  });

  it("should return the translations", async () => {
    parse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { en: "Light crackle", es: "Ligero crujido" },
    });

    expect(await new ClaudeConditionNoteTranslator(client).translate("Lekki trzask")).toEqual({
      en: "Light crackle",
      es: "Ligero crujido",
    });
  });

  it("should use the configured model and skip refusal fallbacks for Haiku", async () => {
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { en: "a", es: "b" } });

    await new ClaudeConditionNoteTranslator(client, "claude-haiku-5-5").translate("a");

    const params = parse.mock.calls[0]![0];

    expect(params.model).toBe("claude-haiku-5-5");
    expect(params).not.toHaveProperty("fallbacks");
    expect(params).not.toHaveProperty("betas");
  });

  it("should use Haiku 5.5 by default", async () => {
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: reading });

    await new ClaudeLabelReader(client).read([{ data: Buffer.from("x"), mediaType: "image/jpeg" }]);

    expect(CLAUDE_MODEL).toBe("claude-haiku-5-5");
    expect(parse.mock.calls[0]![0].model).toBe("claude-haiku-5-5");
  });
});
