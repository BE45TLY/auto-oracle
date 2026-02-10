import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Car } from "lucide-react";

interface CarImageProps {
  carName: string;
  style?: "card" | "hero";
  className?: string;
}

export default function CarImage({ carName, style = "card", className = "" }: CarImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchImage = async () => {
      setLoading(true);
      setError(false);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("car-image", {
          body: { carName, style },
        });
        if (fnError) throw fnError;
        if (!cancelled && data?.imageUrl) {
          setImageUrl(data.imageUrl);
        } else if (!cancelled) {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchImage();
    return () => { cancelled = true; };
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
