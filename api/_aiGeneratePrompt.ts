import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { openai } from "./openai.js";

const PromptResultSchema = z.object({
  prompt: z
    .string()
    .min(3)
    .max(100)
    .refine(
      (value) => !value.includes("\n"),
      "Prompt must be a single line",
    ),
});

export async function genPrompt(params: { history: string[] }) {
  const { history } = params;

  const content: Array<any> = [
    {
      type: "input_text",
      text:
        `Generate exactly one fun prompt for Pictionary.\n` +
        `Return one short drawing idea, not a list of ideas.\n` +
        `just make sure its fun, clear and safe.\n` +
        `Example: wizard riding a skateboard` +
        `Do not repeat prompts in history.\n\n` +
        `History:\n` +
        history.map((s) => `${s}`).join("\n"),
    },
  ];

  const resp = await openai.responses.parse({
    model: "gpt-4o-mini", // supports structured outputs; pick a snapshot later if you want
    input: [{ role: "user", content }],
    text: {
      format: zodTextFormat(PromptResultSchema, "prompt_result"),
    },
  });

  const parsed = resp.output_parsed;

  if (!parsed) {
    throw new Error("AI returned no parsed output");
  }

  return parsed;
}
