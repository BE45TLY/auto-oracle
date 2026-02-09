import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, years } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an automotive encyclopedia with deep knowledge of every car ever made. Provide accurate, detailed information." },
          { role: "user", content: `Give me detailed information about the ${name} ${years ? `(${years})` : ""}. Include history, full specs, and a fun fact.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_car_detail",
            description: "Return detailed car information",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                yearRange: { type: "string" },
                category: { type: "string" },
                history: { type: "string", description: "2-3 paragraph history of this car" },
                specs: {
                  type: "object",
                  properties: {
                    horsepower: { type: "string" },
                    engine: { type: "string" },
                    transmission: { type: "string" },
                    mileage: { type: "string" },
                    price: { type: "string" },
                    zeroToSixty: { type: "string" },
                  },
                  required: ["horsepower", "engine", "transmission", "mileage", "price", "zeroToSixty"],
                  additionalProperties: false,
                },
                funFact: { type: "string" },
              },
              required: ["name", "yearRange", "category", "history", "specs", "funFact"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_car_detail" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Credits needed" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const carDetail = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(carDetail), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("car-detail error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
