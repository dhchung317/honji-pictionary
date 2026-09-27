// api/_aiScoreRound.ts
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

  // Build a single multimodal user message:
  // - explain rubric
  // - provide a mapping from "drawing #N" -> playerId
  // - attach the images
  const content: Array<any> = [
    {
      type: "input_text",
      text:
        `You are judging a drawing round.\n` +
        `Prompt: "${prompt}".\n\n` +
        `Rank the drawings from best to worst based on: (1) matches prompt, (2) clarity/readability, (3) creativity.\n` +
        `Give every player a score from 0–100. Higher is better. Include exactly one results entry per playerId.` +
        `Note that these drawings are done under tight time constraints, with no tools that allow for polish or detail` +
        `That being said, feel free to roast the artist for bad drawings` +
        `Instead of stating the obvious, use comedic and witty language, up to the edge of profanity, but be blunt and concise, 35 words soft limit` +
        `Return ONLY the JSON schema.\n\n` +
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
    model: "gpt-4o-mini", // supports structured outputs; pick a snapshot later if you want
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
