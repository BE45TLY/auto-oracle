import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Car } from "lucide-react";

interface CarImageProps {
  carName: string;
  style?: "card" | "hero";
  className?: string;
}

// Global queue to serialize image requests and avoid rate limiting
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
    // 1.5s delay between requests to stay under rate limits
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
      let retries = 2;
      while (retries >= 0) {
        try {
          const { data, error: fnError } = await supabase.functions.invoke("car-image", {
            body: { carName, style },
          });
          if (cancelledRef.current) return;
          if (fnError) {
            // Check if it's a rate limit error
            if (retries > 0) {
              retries--;
              await new Promise((r) => setTimeout(r, 3000));
              continue;
            }
            throw fnError;
          }
          if (data?.imageUrl) {
            setImageUrl(data.imageUrl);
            setLoading(false);
            return;
          }
          throw new Error("No image");
        } catch {
          if (retries > 0) {
            retries--;
            await new Promise((r) => setTimeout(r, 3000));
          } else {
            if (!cancelledRef.current) {
              setError(true);
              setLoading(false);
            }
            return;
          }
        }
      }
    };

    enqueue(fetchImage);

    return () => {
      cancelledRef.current = true;
    };
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
