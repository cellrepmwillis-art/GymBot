// "Ask the trainer": quick workout questions answered by Claude, using the
// person's own API key. The conversation is append-only: the system prompt
// never changes, and today's workout goes into the question itself, so
// earlier turns (and their thinking blocks) stay valid when sent back.
import Anthropic from "./vendor/anthropic-sdk-0.131.0.js";

const MODEL = "claude-sonnet-5-5";

// When SYSTEM changes, bump CHAT_VERSION in app.js so conversations started
// with the old instructions start over.

const SYSTEM = `You are a trainer at a typical American commercial gym (Planet Fitness, Anytime Fitness and the like). The person is in the gym, between sets, and wants a quick gut check.
Answer in 2 to 4 short sentences, or up to 4 short lines starting with "- ". Plain text only: no headings, bold or tables. Lead with the direct answer, then the one or two cues that matter most.
Use the workout context in their message when it's relevant, such as their aim, their trainer setting and the equipment their gym has. Some people train outdoors and at home with no gym: then stick to bodyweight, a park bench, a resistance band, a backpack or water jugs.
If a question needs more than a quick answer, give the key cue and suggest a YouTube search phrase for a form video.
If they describe sharp pain, numbness or joint pain, tell them to stop that exercise and get it checked. For medical questions, including about medication, give general guidance and tell them to check with their doctor.`;

export class AskError extends Error {
  name = "AskError";
}

// history: earlier messages, exactly as returned by previous calls.
// context: a short description of today's workout, or null if it hasn't
// changed since the last question. Returns { history, answer }, where history
// includes this question and its answer.
export async function askTrainer({ apiKey, history, question, context }) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const text = context ? `My workout today: ${context}\n\nMy question: ${question}` : question;
  const messages = [...history, { role: "user", content: [{ type: "text", text }] }];

  let response;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages,
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new AskError("Your API key was rejected. Check it in Settings.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new AskError("Too many questions right now. Wait a moment and try again.");
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new AskError("Couldn't reach the trainer. Check your connection; gyms often have weak signal.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new AskError(`The trainer returned an error (${err.status ?? "unknown"}): ${err.message}`);
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new AskError("The trainer couldn't answer that one. Try asking it a different way.");
  }
  const answer = response.content.filter((block) => block.type === "text").map((block) => block.text).join("").trim();
  if (!answer) throw new AskError("The trainer returned no answer. Please try again.");

  // The whole response goes back into the history unchanged, thinking blocks
  // included.
  return { history: [...messages, { role: "assistant", content: response.content }], answer };
}
