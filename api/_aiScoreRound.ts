// api/_aiScoreRound.ts
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ScoringInput = {
  playerId: string;
  playerName: string;
  imageUrl: string;
};

const ScoreResultSchema = z.object({
  rankedPlayerIds: z.array(z.string()).min(1),
  notesByPlayerId: z.record(z.string(), z.string()).optional(),
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
        `Return ONLY the JSON schema.\n\n` +
        `Drawings:\n` +
        submissions
          .map(
            (s, i) => `#${i + 1}: playerId=${s.playerId} name=${s.playerName}`
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

  return resp.output_parsed; // { rankedPlayerIds, notesByPlayerId? }
}
