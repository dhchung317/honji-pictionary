import { Submission } from "../../shared/submission";
import { PlayerScore } from "../../shared/roundscore";

export interface RankedSubmission {
  submission: Submission;
  result: PlayerScore;
}

export function getRankedSubmissions(
  submissions: Submission[],
  results: PlayerScore[],
): RankedSubmission[] {
  const submissionsByPlayer = new Map(
    submissions.map((submission) => [submission.playerId, submission]),
  );

  return [...results]
    .sort((a, b) => a.rank - b.rank)
    .map((result) => {
      const submission = submissionsByPlayer.get(result.playerId);

      if (!submission) {
        return undefined;
      }

      return {
        submission,
        result,
      };
    })
    .filter((item): item is RankedSubmission => item !== undefined);
}
