import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Car } from "lucide-react";

interface CarImageProps {
  carName: string;
  style?: "card" | "hero";
  className?: string;
}

// Simple in-memory cache for Wikipedia image URLs
const wikiCache = new Map<string, string | null>();

// Try fetching an image from Wikipedia's API (free, no key needed)
async function fetchWikipediaImage(carName: string): Promise<string | null> {
  const cacheKey = carName.toLowerCase();
  if (wikiCache.has(cacheKey)) return wikiCache.get(cacheKey)!;

  try {
    // Search for the Wikipedia page
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(carName)}&prop=pageimages&format=json&pithumbsize=800&origin=*&redirects=1`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    const pages = data?.query?.pages;
    if (pages) {
      const page = Object.values(pages)[0] as any;
      if (page?.thumbnail?.source) {
        wikiCache.set(cacheKey, page.thumbnail.source);
        return page.thumbnail.source;
      }
    }
    // If exact title didn't work, try a search
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(carName + " car")}&format=json&srlimit=1&origin=*`
    );
    const searchData = await searchRes.json();
    const title = searchData?.query?.search?.[0]?.title;
    if (title) {
      const pageRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=800&origin=*&redirects=1`
      );
      const pageData = await pageRes.json();
      const pages2 = pageData?.query?.pages;
      if (pages2) {
        const p = Object.values(pages2)[0] as any;
        if (p?.thumbnail?.source) {
          wikiCache.set(cacheKey, p.thumbnail.source);
          return p.thumbnail.source;
        }
      }
    }
  } catch (e) {
    console.warn("Wikipedia image fetch failed:", e);
  }
  wikiCache.set(cacheKey, null);
  return null;
}

// Global queue for AI fallback requests only
const queue: (() => void)[] = [];
let running = false;

function enqueue(fn: () => Promise<void>) {
  return new Promise<void>((resolve) => {
    queue.push(async () => {
      await fn();
      resolve();
    });
    processQueue();
  });
}

async function processQueue() {
  if (running) return;
  running = true;
  while (queue.length > 0) {
    const task = queue.shift()!;
    await task();
    await new Promise((r) => setTimeout(r, 1500));
  }
  running = false;
}

export default function CarImage({ carName, style = "card", className = "" }: CarImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    setError(false);
    setImageUrl(null);

    const fetchImage = async () => {
      // 1. Try Wikipedia first (fast, free, no rate limits)
      const wikiUrl = await fetchWikipediaImage(carName);
      if (cancelledRef.current) return;
      if (wikiUrl) {
        setImageUrl(wikiUrl);
        setLoading(false);
        return;
      }

      // 2. Fall back to AI generation (queued to avoid rate limits)
      await enqueue(async () => {
        let retries = 2;
        while (retries >= 0) {
          try {
            const { data, error: fnError } = await supabase.functions.invoke("car-image", {
              body: { carName, style },
            });
            if (cancelledRef.current) return;
            if (fnError) {
              if (retries > 0) { retries--; await new Promise((r) => setTimeout(r, 3000)); continue; }
              throw fnError;
            }
            if (data?.imageUrl) {
              setImageUrl(data.imageUrl);
              setLoading(false);
              return;
            }
            throw new Error("No image");
          } catch {
            if (retries > 0) { retries--; await new Promise((r) => setTimeout(r, 3000)); }
            else {
              if (!cancelledRef.current) { setError(true); setLoading(false); }
              return;
            }
          }
        }
      });
    };

    fetchImage();

    return () => { cancelledRef.current = true; };
  }, [carName, style]);

  if (loading) {
    return (
      <Skeleton className={`bg-muted flex items-center justify-center ${className}`}>
        <Car className="h-8 w-8 text-muted-foreground/30 animate-pulse" />
      </Skeleton>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`bg-muted flex items-center justify-center rounded-lg ${className}`}>
        <Car className="h-10 w-10 text-muted-foreground/20" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={carName}
      className={`object-cover rounded-lg ${className}`}
      loading="lazy"
    />
  );
}
