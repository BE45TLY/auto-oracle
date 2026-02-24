/**
 * Multi-source car search service.
 * Combines Wikipedia, NHTSA (US gov vehicle database), and Wikidata
 * to find information on virtually any car — all free, no API keys needed.
 */

export interface CarResult {
  name: string;
  yearRange: string;
  category: string;
  shortDescription: string;
  imageKeyword: string;
  source: string;
}

export interface CarDetailResult {
  name: string;
  yearRange: string;
  category: string;
  history: string;
  specs: Record<string, string>;
  funFact: string;
  source: string;
}

// ─── Wikipedia Search ────────────────────────────────────────────────────────

async function searchWikipedia(query: string): Promise<CarResult[]> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + " car automobile")}&format=json&srlimit=10&origin=*`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    const searchResults = data?.query?.search || [];

    const carTerms = [
      "car", "vehicle", "automobile", "engine", "sedan", "coupe", "suv", "truck",
      "motor", "horsepower", "mph", "cylinder", "turbo", "hybrid", "electric",
      "hatchback", "convertible", "sports car", "luxury", "manufacturer", "model",
      "production", "wheelbase", "drivetrain", "transmission", "displacement",
    ];

    const results: CarResult[] = [];
    for (const item of searchResults) {
      const title = item.title;
      const snippet = (item.snippet || "").toLowerCase();
      const isCarRelated =
        carTerms.some((t) => snippet.includes(t)) ||
        query.toLowerCase().split(" ").some((w) => w.length > 2 && title.toLowerCase().includes(w));
      if (!isCarRelated && results.length > 0) continue;

      const yearMatch = snippet.match(/(\d{4})\s*[-–]\s*(\d{4}|present)/i);
      const singleYear = snippet.match(/(\d{4})/);
      const yearRange = yearMatch ? yearMatch[0] : singleYear ? singleYear[0] : "";
      const cleanSnippet = item.snippet?.replace(/<[^>]*>/g, "") || title;

      results.push({
        name: title,
        yearRange,
        category: "Automobile",
        shortDescription: cleanSnippet,
        imageKeyword: title,
        source: "Wikipedia",
      });
    }
    return results.slice(0, 8);
  } catch (e) {
    console.error("Wikipedia search failed:", e);
    return [];
  }
}

// ─── NHTSA Vehicle API (US government, completely free) ──────────────────────

async function searchNHTSA(query: string): Promise<CarResult[]> {
  try {
    // Try to extract make/model from query
    const words = query.trim().split(/\s+/);
    const results: CarResult[] = [];

    // Search NHTSA for makes matching the query
    const makesRes = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json`
    );
    const makesData = await makesRes.json();
    const allMakes: Array<{ Make_Name: string; Make_ID: number }> = makesData?.Results || [];

    // Find matching makes
    const queryLower = query.toLowerCase();
    const matchingMakes = allMakes.filter((m) =>
      m.Make_Name.toLowerCase().includes(queryLower) ||
      queryLower.includes(m.Make_Name.toLowerCase())
    ).slice(0, 3);

    for (const make of matchingMakes) {
      // Get models for this make
      const modelsRes = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(make.Make_Name)}?format=json`
      );
      const modelsData = await modelsRes.json();
      const models: Array<{ Model_Name: string; Make_Name: string }> = modelsData?.Results || [];

      // Filter models that match the query
      let matchedModels = models.filter((m) =>
        words.some((w) => w.length > 2 && m.Model_Name.toLowerCase().includes(w.toLowerCase()))
      );

      // If no specific model match, show top models for the make
      if (matchedModels.length === 0) {
        matchedModels = models.slice(0, 6);
      }

      for (const model of matchedModels.slice(0, 6)) {
        const fullName = `${model.Make_Name} ${model.Model_Name}`;
        // Avoid duplicates
        if (results.some((r) => r.name.toLowerCase() === fullName.toLowerCase())) continue;
        results.push({
          name: fullName,
          yearRange: "",
          category: "Vehicle",
          shortDescription: `${model.Make_Name} ${model.Model_Name} — official NHTSA registered vehicle model.`,
          imageKeyword: fullName,
          source: "NHTSA",
        });
      }
    }

    // If no make matched, try model-level search for specific models
    if (results.length === 0 && words.length >= 1) {
      const modelSearch = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(words[0])}?format=json`
      );
      const modelData = await modelSearch.json();
      const models = modelData?.Results || [];
      for (const model of models.slice(0, 8)) {
        results.push({
          name: `${model.Make_Name} ${model.Model_Name}`,
          yearRange: "",
          category: "Vehicle",
          shortDescription: `${model.Make_Name} ${model.Model_Name} — official NHTSA registered vehicle.`,
          imageKeyword: `${model.Make_Name} ${model.Model_Name}`,
          source: "NHTSA",
        });
      }
    }

    return results.slice(0, 8);
  } catch (e) {
    console.error("NHTSA search failed:", e);
    return [];
  }
}

// ─── Wikipedia article detail (for car detail page) ──────────────────────────

export async function fetchWikipediaDetail(carName: string): Promise<CarDetailResult | null> {
  try {
    // Search for the article
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(carName)}&format=json&srlimit=1&origin=*`
    );
    const searchData = await searchRes.json();
    const title = searchData?.query?.search?.[0]?.title;
    if (!title) return null;

    // Get full extract
    const extractRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts|pageimages&exintro=false&explaintext=true&exsectionformat=plain&format=json&origin=*&pithumbsize=800&redirects=1`
    );
    const extractData = await extractRes.json();
    const pages = extractData?.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0] as any;
    const fullText: string = page?.extract || "";
    if (!fullText || fullText.length < 50) return null;

    // Extract sections
    const paragraphs = fullText.split("\n").filter((p: string) => p.trim().length > 20);
    const history = paragraphs.slice(0, 4).join("\n\n") || "Information not available.";

    // Try to extract specs from text
    const specs: Record<string, string> = {};
    const specPatterns: Record<string, RegExp[]> = {
      engine: [/engine[:\s]+([^\n.]{5,60})/i, /(\d+\.?\d*[- ]?(?:liter|litre|L|cc|ci)[^\n.]{0,40})/i],
      horsepower: [/(\d{2,4}\s*(?:hp|bhp|PS|kW|horsepower)[^\n.]{0,30})/i],
      transmission: [/transmission[:\s]+([^\n.]{5,60})/i, /(\d-speed\s+\w+)/i],
      zeroToSixty: [/0[–-](?:60|100)[:\s]+([^\n.]{3,30})/i, /([\d.]+\s*(?:seconds?|s)\s*(?:0[–-](?:60|100)))/i],
    };
    for (const [key, patterns] of Object.entries(specPatterns)) {
      for (const pat of patterns) {
        const match = fullText.match(pat);
        if (match) {
          specs[key] = match[1] || match[0];
          break;
        }
      }
    }

    // Extract year range
    const yearMatch = fullText.match(/(\d{4})\s*[-–]\s*(\d{4}|present)/i);
    const singleYear = fullText.match(/(\d{4})/);

    // Find a fun fact — last paragraph or something interesting
    const funFact = paragraphs.find((p: string) =>
      /record|first|unique|famous|popular|iconic|fastest|rare|limited/i.test(p)
    ) || paragraphs[paragraphs.length - 1] || "No fun fact available.";

    return {
      name: title,
      yearRange: yearMatch ? yearMatch[0] : singleYear ? singleYear[0] : "",
      category: "Automobile",
      history,
      specs: Object.keys(specs).length > 0 ? specs : {
        engine: "See full article",
        horsepower: "See full article",
        transmission: "See full article",
      },
      funFact: funFact.length > 300 ? funFact.slice(0, 297) + "..." : funFact,
      source: "Wikipedia",
    };
  } catch (e) {
    console.error("Wikipedia detail fetch failed:", e);
    return null;
  }
}

// ─── Combined multi-source search ────────────────────────────────────────────

export async function multiSourceCarSearch(query: string): Promise<CarResult[]> {
  // Run Wikipedia and NHTSA searches in parallel
  const [wikiResults, nhtsaResults] = await Promise.all([
    searchWikipedia(query),
    searchNHTSA(query),
  ]);

  // Merge and deduplicate results, prioritizing Wikipedia (richer descriptions)
  const seen = new Set<string>();
  const merged: CarResult[] = [];

  for (const r of wikiResults) {
    const key = r.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }

  for (const r of nhtsaResults) {
    const key = r.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }

  return merged.slice(0, 12);
}
