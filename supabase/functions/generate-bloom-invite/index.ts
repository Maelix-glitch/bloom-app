/**
 * RECOVERED SOURCE — 2026-11-09.
 *
 * This function was live (v3) with no source in this repo. The text below
 * was extracted from the live deployment's eszip bundle (Management API
 * function body) and is behaviour-faithful: the deploy bundler stripped
 * TypeScript types and normalised formatting, so this is the running logic
 * verbatim rather than the original hand-written file. The live deployment
 * stays the truth until this file is deliberately redeployed.
 *
 * What it does: given an email, mints a Supabase invite link with the
 * admin client (SUPABASE_SECRET_KEY) via auth.admin.generateLink
 * (type "invite", redirect to the app's /auth/callback) and returns it.
 * verify_jwt = true at the gateway. NOT referenced by the current client.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({
        error: "Email is required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseSecretKey = Deno.env.get("SUPABASE_SECRET_KEY");
    if (!supabaseUrl || !supabaseSecretKey) {
      throw new Error("Supabase server configuration is missing");
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo: "https://maelix-glitch-bloom-app.bloomlabs.workers.dev/auth/callback"
      }
    });
    if (error) {
      console.error("Invite generation failed:", error.message);
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const inviteLink = data?.properties?.action_link;
    if (!inviteLink) {
      throw new Error("Supabase did not return an invitation link");
    }
    return new Response(JSON.stringify({
      success: true,
      inviteLink
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Generate invite error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
