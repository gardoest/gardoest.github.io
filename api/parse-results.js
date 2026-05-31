import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, player, date, webhookUrl } = req.body;

    if (!text || !player || !date || !webhookUrl) {
      return res.status(400).json({
        error: "Missing required fields: text, player, date, webhookUrl",
      });
    }

    // Parse with Claude
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Extract game scores from this text. Return JSON with only the game name and score. Games: Wordle (extract the number from "X/6"), Loldle (extract "in X shots"), TimeGuessr (extract score before /50000), Maptap (extract "Final score: X").

Text: "${text}"

Return ONLY valid JSON like:
{"games": {"Wordle": 5, "Loldle": 13, "TimeGuessr": 32222, "Maptap": 954}}

If a game is not found, omit it. Return ONLY the JSON, no other text.`,
        },
      ],
    });

    const content = message.content[0].text.trim();
    const parsed = JSON.parse(content);

    // Send each game result to Google Sheets via webhook
    const results = [];
    for (const [game, score] of Object.entries(parsed.games)) {
      const payload = {
        date,
        game,
        scores: {
          Gard: player === "Gard" ? score : "",
          Jone: player === "Jone" ? score : "",
          Elias: player === "Elias" ? score : "",
          Herman: player === "Herman" ? score : "",
          Sindre: player === "Sindre" ? score : "",
        },
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.statusText}`);
      }

      results.push({ game, score });
    }

    return res.status(200).json({
      success: true,
      message: `Parsed ${results.length} game(s)`,
      results,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: error.message || "Failed to parse results",
    });
  }
}
