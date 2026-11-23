// netlify/functions/stylist.js
const OUTFITS = require('../../data/outfits.json');

const MODEL = 'llama-3.3-70b-versatile'; // change here if Groq retires it
const OCCASIONS = ['interview', 'office', 'wedding', 'date', 'party'];
const COLORS = ['any', 'black', 'charcoal', 'gray', 'navy', 'blue', 'olive', 'green', 'burgundy', 'brown', 'cream', 'tan'];
const SYSTEM = 'You are a menswear stylist. Pick exactly one suit from the list you are given. Never invent a suit. '
  + 'Reply with JSON only: {"outfitId":"<an id from the list>","reason":"<two sentences at most>"}. '
  + 'Match the occasion first, then the colour preference, then overall fit. The budget is already applied to the list. '
  + 'Be practical and confident, no hype. If your pick differs from what was asked (for example the colour), say how.';

const reply = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const bandsFor = (budget) => (budget <= 8000 ? ['budget'] : budget <= 20000 ? ['budget', 'mid'] : ['budget', 'mid', 'premium']);

function closest(list, occasion, color) {
  let best = list[0], top = -1;
  list.forEach((o) => {
    const score = (o.occasions.includes(occasion) ? 3 : 0) + (color !== 'any' && o.colors.includes(color) ? 2 : 0);
    if (score > top) { top = score; best = o; }
  });
  return best;
}

async function askGroq(key, candidates, occasion, budget, color) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: ctl.signal,
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: JSON.stringify({
            occasion, budgetInr: budget, colourPreference: color,
            suits: candidates.map((o) => ({ id: o.id, name: o.name, about: o.desc, occasions: o.occasions, colours: o.colors, priceBand: o.priceBand })),
          }) },
        ],
      }),
    });
    if (!res.ok) throw new Error('Groq status ' + res.status);
    const data = await res.json();
    return data.choices[0].message.content;
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Use POST.' });
  if (!event.body || event.body.length > 500) return reply(400, { error: 'Invalid request.' });

  let input;
  try { input = JSON.parse(event.body); } catch (e) { return reply(400, { error: 'Invalid request.' }); }
  const occasion = input.occasion, color = input.colorPref, budget = Number(input.budget);
  if (!OCCASIONS.includes(occasion) || !COLORS.includes(color) || !Number.isFinite(budget) || budget < 1000 || budget > 200000) {
    return reply(400, { error: 'Please choose an occasion, a budget and a colour.' });
  }

  const candidates = OUTFITS.filter((o) => bandsFor(budget).includes(o.priceBand));
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.error('GROQ_API_KEY is not set');
    return reply(502, { error: 'The stylist is unavailable right now.' });
  }

  let text;
  try {
    text = await askGroq(key, candidates, occasion, budget, color);
  } catch (e) {
    console.error('Groq call failed:', e.message);
    return reply(502, { error: 'The stylist is unavailable right now.' });
  }

  try {
    const pick = JSON.parse(text);
    const chosen = candidates.find((o) => o.id === pick.outfitId);
    if (chosen && typeof pick.reason === 'string' && pick.reason.trim()) {
      return reply(200, { outfitId: chosen.id, reason: pick.reason.trim().slice(0, 300), fallback: false });
    }
  } catch (e) { /* unusable model output: fall through to the fallback */ }

  const fb = closest(candidates, occasion, color);
  return reply(200, { outfitId: fb.id, reason: 'Closest match from our guides for your occasion and budget.', fallback: true });
};