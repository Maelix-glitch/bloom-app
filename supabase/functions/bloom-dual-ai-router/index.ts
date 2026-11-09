/**
 * RECOVERED SOURCE — 2026-11-09.
 *
 * This function was live (v21) with no source in this repo. The text below
 * was extracted from the live deployment's eszip bundle (Management API
 * function body) and is behaviour-faithful: the deploy bundler stripped
 * TypeScript types and normalised formatting, so this is the running logic
 * verbatim rather than the original hand-written file. The live deployment
 * stays the truth until this file is deliberately redeployed.
 *
 * What it does: a simple two-step Coach backend — one Groq request
 * (openai/gpt-oss-20b), one Gemini fallback (gemini-3.6-flash); images go
 * straight to Gemini vision. The gateway has verify_jwt = false; the
 * function authenticates the caller itself (getUser) and writes both sides
 * of the exchange to coach_messages. NOT referenced by the current client,
 * which invokes the `coach` function instead.
 */
// supabase/functions/bloom-dual-ai-router/index.ts
// One Groq request, then one Gemini fallback. No model-scanning loops.
import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
const json = (body, status = 200)=>new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });
function errorText(provider, status, body) {
  return `${provider} returned ${status}: ${body.slice(0, 700)}`;
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: corsHeaders
  });
  if (req.method !== "POST") return json({
    error: "METHOD_NOT_ALLOWED"
  }, 405);
  const startedAt = Date.now();
  try {
    const groqKey = Deno.env.get("GROQ_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!groqKey && !geminiKey) {
      return json({
        error: "MISSING_API_KEYS",
        message: "Configure GROQ_API_KEY and/or GEMINI_API_KEY in Edge Function secrets."
      }, 500);
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return json({
        error: "SUPABASE_ENV_MISSING",
        message: "SUPABASE_URL or SUPABASE_ANON_KEY is unavailable in this Edge Function."
      }, 500);
    }
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({
      error: "NO_AUTH",
      message: "Please sign in before using Coach."
    }, 401);
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization
        }
      }
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user) return json({
      error: "INVALID_USER",
      message: authError?.message || "Your session is invalid. Please sign in again."
    }, 401);
    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const mode = [
      "ask",
      "reflect",
      "plan"
    ].includes(body.mode) ? body.mode : "ask";
    const context = body.context && typeof body.context === "object" ? body.context : {};
    const history = Array.isArray(body.history) ? body.history : [];
    const base64Data = typeof body.base64Data === "string" ? body.base64Data : null;
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : typeof body.fileType === "string" ? body.fileType : "image/jpeg";
    if (!message && !base64Data) return json({
      error: "EMPTY_REQUEST",
      message: "Enter a message or attach an image."
    }, 400);
    const system = [
      "You are Bloom Coach, a supportive wellness coach.",
      `Mode: ${mode}.`,
      "Use only the supplied tracker context; never invent tracked values.",
      "Be concise: two or three short paragraphs and one practical next step.",
      "Do not diagnose medical conditions. Encourage professional help for urgent or serious concerns.",
      `Tracker context: ${JSON.stringify(context).slice(0, 4000)}`
    ].join("\n");
    let text = "";
    let provider = "";
    let model = "";
    let lastError = "";
    // Images require Gemini. Text uses Groq first, exactly once.
    if (base64Data) {
      if (!geminiKey) return json({
        error: "VISION_UNAVAILABLE",
        message: "Image analysis needs GEMINI_API_KEY."
      }, 503);
      // Gemini is intentionally pinned to one model: no Gemini model fallback loop.
      model = "gemini-3.6-flash";
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${system}\n\nUser request: ${message || "Analyse this image."}`
                },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 600
          }
        })
      });
      if (!response.ok) return json({
        error: "GEMINI_VISION_FAILED",
        message: errorText("Gemini", response.status, await response.text())
      }, 502);
      const data = await response.json();
      text = data.candidates?.[0]?.content?.parts?.map((part)=>part.text || "").join("").trim() || "";
      provider = "Gemini";
    } else {
      if (groqKey) {
        // Pinned to a model confirmed as available in your Groq Playground.
        // One Groq attempt only; Gemini is used only if this request fails.
        model = "openai/gpt-oss-20b";
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "system",
                  content: system
                },
                ...history.slice(-8).map((turn)=>({
                    role: turn.role === "user" ? "user" : "assistant",
                    content: String(turn.content || turn.text || "").slice(0, 1000)
                  })),
                {
                  role: "user",
                  content: message
                }
              ],
              temperature: 0.3,
              max_tokens: 600
            })
          });
          if (!response.ok) throw new Error(errorText("Groq", response.status, await response.text()));
          const data = await response.json();
          text = data.choices?.[0]?.message?.content?.trim() || "";
          provider = "Groq";
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          console.error("Groq primary failed:", lastError);
        }
      }
      // One fallback request only — not a sequential list of models.
      if (!text && geminiKey) {
        // Gemini is intentionally pinned to one model: no Gemini model fallback loop.
        model = "gemini-3.6-flash";
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${system}\n\nUser request: ${message}`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 600
            }
          })
        });
        if (!response.ok) lastError = errorText("Gemini", response.status, await response.text());
        else {
          const data = await response.json();
          text = data.candidates?.[0]?.content?.parts?.map((part)=>part.text || "").join("").trim() || "";
          provider = "Gemini";
        }
      }
    }
    if (!text) return json({
      error: "AI_PROCESSING_FAILED",
      message: lastError || "The provider returned an empty answer."
    }, 502);
    // Persistence should never block a valid coach answer.
    const { error: saveError } = await supabase.from("coach_messages").insert([
      {
        profile_id: user.id,
        role: "user",
        content: {
          paragraphs: [
            message || "Uploaded image"
          ],
          blocks: []
        },
        sources: []
      },
      {
        profile_id: user.id,
        role: "coach",
        content: {
          paragraphs: [
            text
          ],
          blocks: []
        },
        sources: [
          "live-data"
        ]
      }
    ]);
    if (saveError) console.error("Could not save coach messages:", saveError.message);
    return json({
      text,
      paragraphs: [
        text
      ],
      blocks: [],
      sources: [
        "live-data"
      ],
      provider,
      model,
      timeMs: Date.now() - startedAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("bloom-dual-ai-router crashed:", message);
    return json({
      error: "SERVER_PROCESS_ERROR",
      message,
      timeMs: Date.now() - startedAt
    }, 500);
  }
});
