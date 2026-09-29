import { openai } from "./openai.js";
import {
  buildPromptGeneratorInput,
  buildPromptGeneratorInstructions,
  getRandomPromptStyle,
} from "./promptgenerator.js";

export async function genPrompt(params: { history: string[] }) {
  const { history } = params;

  const style = getRandomPromptStyle();

  const resp = await openai.responses.create({
    model: "gpt-5.6-terra",

    instructions: buildPromptGeneratorInstructions(),

    input: buildPromptGeneratorInput({
      style,
      recentPrompts: [...history],
    }),
  });

  const parsed = resp.output_text.trim();

  if (!parsed) {
    throw new Error("AI returned no parsed output");
  }

  return parsed;
}
