import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { openai } from "./openai.js";

export type ScoringInput = {
  playerId: string;
  playerName: string;
  imageUrl: string;
};

const ScoreResultSchema = z.object({
  rankedPlayerIds: z.array(z.string()),
  notes: z.array(
    z.object({
      playerId: z.string(),
      score: z.number().int().min(0).max(100),
      note: z.string(),
    }),
  ),
});

export async function scoreRoundWithAI(params: {
  prompt: string;
  submissions: ScoringInput[];
}) {
  const { prompt, submissions } = params;

  const content: Array<any> = [
    {
      type: "input_text",
      text:
        `You are the judge for a fast-paced multiplayer drawing game.\n` +
        `Drawing prompt: "${prompt}"\n\n` +
        `Judge each drawing primarily on:\n` +
        `1. Prompt match — how clearly and successfully it communicates the prompt.\n` +
        `2. Visual effectiveness — composition, readability, creativity, expressiveness, and intentionality.\n\n` +
        `Do not reward realism, detail, or technical polish by themselves. ` +
        `A simple or crude drawing can beat a detailed drawing if it communicates the prompt more effectively.\n` +
        `Players had very limited time and simple drawing tools. Judge within that context.\n\n` +
        `Rank every drawing from best to worst and give every player a score from 0–100. ` +
        `Scores should reflect meaningful differences between drawings and be consistent with the ranking. ` +
        `Include exactly one result for every playerId.\n\n` +
        `For each player, write a short reaction to their drawing. ` +
        `Be playful, witty, and lightly roast weak or ridiculous drawings when appropriate. ` +
        `You may use mild profanity, but keep it fun rather than cruel or personal. ` +
        `Do not merely describe what is visible. Aim for roughly 20 words or fewer.\n\n` +
        `Drawings:\n` +
        submissions
          .map(
            (s, i) => `#${i + 1}: playerId=${s.playerId} name=${s.playerName}`,
          )
          .join("\n"),
    },
  ];

  for (let i = 0; i < submissions.length; i++) {
    content.push({ type: "input_text", text: `Drawing #${i + 1}` });
    content.push({
      type: "input_image",
      image_url: submissions[i].imageUrl,
      // optional speed/cost tradeoff:
      // detail: "low",
    });
  }

  const resp = await openai.responses.parse({
    model: "gpt-5.4-mini", // supports structured outputs; pick a snapshot later if you want
    reasoning: { effort: "low" },
    input: [{ role: "user", content }],
    text: {
      format: zodTextFormat(ScoreResultSchema, "score_result"),
    },
  });

  const parsed = resp.output_parsed;

  if (!parsed) {
    throw new Error("AI returned no parsed output");
  }

  return parsed;
}
