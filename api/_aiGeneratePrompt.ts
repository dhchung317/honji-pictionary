import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { openai } from "./openai.js";
import {
  PROMPT_INSTRUCTIONS,
  buildPromptInput,
  getRandomPromptStyle,
} from "./promptgenerator.js";

const PromptResultSchema = z.object({
  prompt: z
    .string()
    .min(3)
    .max(100)
    .refine((value) => !value.includes("\n"), "Prompt must be a single line"),
});

export async function genPrompt(params: { history: string[] }) {
  const style = getRandomPromptStyle();

  const resp = await openai.responses.parse({
    model: "gpt-4o-mini",

    instructions: PROMPT_INSTRUCTIONS,

    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildPromptInput({
              style,
              history: params.history,
            }),
          },
        ],
      },
    ],

    text: {
      format: zodTextFormat(PromptResultSchema, "prompt_result"),
    },
  }, { timeout: 45_000, maxRetries: 0 });

  const parsed = resp.output_parsed;

  if (!parsed) {
    throw new Error("AI returned no parsed output");
  }

  return parsed;
}
