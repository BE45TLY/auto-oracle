import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Fuel, Gauge, DollarSign, Cog, Car, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import CarImage from "@/components/CarImage";
import { fetchWikipediaDetail, type CarDetailResult } from "@/lib/carSearchService";

interface CarDetail {
  name: string;
  yearRange: string;
  category: string;
  history: string;
  specs: Record<string, string>;
  funFact: string;
  source?: string;
}

const specIcons: Record<string, any> = {
  horsepower: Gauge,
  engine: Cog,
  transmission: Car,
  mileage: Fuel,
  price: DollarSign,
  zeroToSixty: Gauge,
};

const specLabels: Record<string, string> = {
  horsepower: "Horsepower",
  engine: "Engine",
  transmission: "Transmission",
  mileage: "Fuel Economy",
  price: "MSRP (new)",
  zeroToSixty: "0-60 mph",
};

export default function CarDetailPage() {
  const { name } = useParams();
  const [searchParams] = useSearchParams();
  const years = searchParams.get("years") || "";

  const { data: car, isLoading } = useQuery({
    queryKey: ["car-detail", name, years],
    queryFn: async (): Promise<CarDetail | null> => {
      const decodedName = decodeURIComponent(name || "");

      // Try AI first
      try {
        const { data, error } = await supabase.functions.invoke("car-detail", {
          body: { name: decodedName, years },
        });
        if (data?.error) throw new Error(data.error);
        if (error) throw error;
        if (data?.name) return { ...data, source: "AI" } as CarDetail;
      } catch (e) {
        console.warn("AI detail unavailable, trying Wikipedia:", e);
      }

      // Fallback to Wikipedia
      const wiki = await fetchWikipediaDetail(decodedName);
      if (wiki) return { ...wiki } as CarDetail;

      return null;
    },
    enabled: !!name,
    retry: false,
  });

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <Link
          to="/search"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Search
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-6 w-1/4" />
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
            <Skeleton className="h-40" />
          </div>
        ) : car ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Hero Image */}
            <CarImage
              carName={`${car.name} ${car.yearRange}`}
              style="hero"
              className="w-full h-64 md:h-80 mb-8"
            />

            {/* Header */}
            <div className="mb-8">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <Badge variant="secondary">{car.category}</Badge>
                {car.yearRange && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground font-mono">
                    <Calendar className="h-3.5 w-3.5" />
                    {car.yearRange}
                  </span>
                )}
                {car.source === "Wikipedia" && (
                  <a
                    href={`https://en.wikipedia.org/wiki/${encodeURIComponent(car.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> View on Wikipedia
                  </a>
                )}
              </div>
              <h1 className="text-4xl font-bold md:text-5xl">{car.name}</h1>
            </div>

            {/* Specs Grid */}
            <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(car.specs).map(([key, value], i) => {
                const Icon = specIcons[key] || Gauge;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="border-border/50 bg-card p-4 transition-all hover:border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {specLabels[key] || key}
                          </p>
                          <p className="font-semibold">{value}</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* History */}
            <Card className="mb-6 border-border/50 bg-card p-6">
              <h2 className="mb-3 text-xl font-bold">History & Heritage</h2>
              <p className="leading-relaxed text-muted-foreground">{car.history}</p>
            </Card>

            {/* Fun Fact */}
            <Card className="border-primary/20 bg-primary/5 p-6">
              <h3 className="mb-2 text-sm font-semibold text-primary">💡 Fun Fact</h3>
              <p className="text-sm text-muted-foreground">{car.funFact}</p>
            </Card>
          </motion.div>
        ) : (
          <Card className="border-border/50 bg-card p-12 text-center">
            <p className="text-muted-foreground">Car not found.</p>
          </Card>
        )}
      </div>
    </Layout>
  );
}
