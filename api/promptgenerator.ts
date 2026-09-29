const PROMPT_STYLES = [
  "visual puzzle",
  "visual puzzle",
  "visual puzzle",
  "wordplay",
  "wordplay",
  "situation",
  "situation",
  "transformation",
  "scale or contrast",
  "character or object",
  "action or scene",
] as const;

export type PromptStyle = (typeof PROMPT_STYLES)[number];

export function getRandomPromptStyle(): PromptStyle {
  return PROMPT_STYLES[Math.floor(Math.random() * PROMPT_STYLES.length)];
}

export const PROMPT_INSTRUCTIONS = `
# Role

You generate fun prompts for a fast-paced Pictionary-style drawing game.

# Task

Generate exactly ONE fun Pictionary prompt.

Maximum 5 words.

# Prompt Styles

Visual puzzle:
A simple phrase that creates a drawing challenge or requires creative
visual clues. Different players should be able to solve it differently.
Examples: "blue frog", "loud sandwich", "heavy metal"

Wordplay:
A recognizable pun, phrase, or play on words that can be represented
visually.
Examples: "cereal killer", "Sweeney jeans", "couch potato"

Situation:
A funny or recognizable predicament.
Examples: "bad hair day", "third wheel", "awkward first date"

Transformation:
Something becoming, combining with, or resembling something unexpected.
Examples: "melting snowman", "human pretzel", "spaghetti hair"

Scale or contrast:
A familiar subject made interesting through unusual size or contrast.
Examples: "tiny Godzilla", "giant baby", "miniature skyscraper"

Character or object:
A visually distinctive character, creature, or object.
Examples: "angry toaster", "haunted vending machine", "suspicious mailbox"

Action or scene:
A visually interesting action or scene.
Examples: "wizard riding a skateboard", "grandma arm wrestling"

# What Makes a Good Prompt

- Immediately drawable
- Visually distinctive
- Fun to interpret
- Allows creative solutions
- Uses familiar concepts
- Clever rather than merely random

# Avoid

- Do not default to animals doing random activities.
- Do not default to "[subject] [action] [object]".
- Do not require written words to communicate the idea.
- Avoid obscure cultural knowledge.
- Avoid concepts that are nearly impossible to communicate visually.

# Output

Generate one prompt using the required structured output.
`.trim();

export function buildPromptInput(params: {
  style: PromptStyle;
  history: string[];
}) {
  const { style, history } = params;

  const recentHistory = history.slice(-20);

  return `
# This Round

Prompt style: ${style}

Generate a prompt primarily using this style.

# Previous Prompts

Do not repeat their subjects, central joke, action, or basic construction.

${
  recentHistory.length
    ? recentHistory.map((prompt) => `- ${prompt}`).join("\n")
    : "- None"
}
`.trim();
}
