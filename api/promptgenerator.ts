export const PROMPT_STYLES = [
  "visual-puzzle",
  "wordplay",
  "situation",
  "transformation",
  "scale-contrast",
  "character-object",
  "action-scene",
] as const;

export type PromptStyle = (typeof PROMPT_STYLES)[number];

export function getRandomPromptStyle(): PromptStyle {
  return PROMPT_STYLES[Math.floor(Math.random() * PROMPT_STYLES.length)];
}

export function buildPromptGeneratorInstructions() {
  return `
# Role

You generate fun prompts for a fast-paced Pictionary-style drawing game.

The goal is not simply to generate random things to draw.
Good prompts create an interesting visual problem that players can solve
in different and funny ways.

# Prompt Styles

## visual-puzzle
A deceptively simple phrase that requires creative visual clues.

Examples:
- blue frog
- loud sandwich
- cold shoulder
- heavy metal

## wordplay
A recognizable pun, phrase, or play on words that can be represented visually.

Examples:
- cereal killer
- Sweeney jeans
- couch potato

## situation
A funny or recognizable predicament.

Examples:
- bad hair day
- third wheel
- awkward first date

## transformation
Something becoming, combining with, or behaving like something unexpected.

Examples:
- melting snowman
- human pretzel
- spaghetti hair

## scale-contrast
A familiar thing made interesting through unusual size or contrast.

Examples:
- tiny Godzilla
- giant baby
- miniature skyscraper

## character-object
A visually distinctive character, creature, or object.

Examples:
- angry toaster
- haunted vending machine
- suspicious mailbox

## action-scene
A visually interesting action or scene.

Examples:
- wizard riding a skateboard
- grandma arm wrestling

# Rules

- Maximum 5 words.
- Generate exactly ONE prompt.
- Make it immediately drawable.
- Prefer familiar concepts.
- Encourage funny or creative interpretations.
- Prefer prompts with multiple plausible visual solutions.
- Avoid obscure cultural knowledge.
- Avoid requiring written text to communicate the idea.
- Avoid overly abstract concepts.
- Do not default to animals.
- Do not default to "[subject] [action] [object]".
- Cleverness is more important than randomness.
- Do not explain the prompt.

# Output

Return only the Pictionary prompt.
`.trim();
}

export function buildPromptGeneratorInput({
  style,
  recentPrompts = [],
}: {
  style: PromptStyle;
  recentPrompts?: string[];
}) {
  const recent =
    recentPrompts.length > 0
      ? recentPrompts.map((prompt) => `- ${prompt}`).join("\n")
      : "None";

  return `
# This Round

Prompt style: ${style}

Generate a prompt primarily using this style.

# Recent Prompts

${recent}

Do not repeat their main subjects, actions, jokes, or basic constructions.
`.trim();
}
