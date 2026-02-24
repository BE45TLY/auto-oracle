import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search as SearchIcon, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import CarImage from "@/components/CarImage";
import { multiSourceCarSearch, type CarResult } from "@/lib/carSearchService";

export default function CarSearch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<CarResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSource(null);
    try {
      // Try AI-powered search first
      const { data, error } = await supabase.functions.invoke("car-search", {
        body: { query: q },
      });
      if (data?.error) throw new Error(data.error);
      if (error) throw error;
      if (data?.results?.length) {
        setResults(data.results);
        setSource("AI");
        return;
      }
      throw new Error("No results from AI");
    } catch (e: any) {
      console.warn("AI search unavailable, using multi-source fallback:", e?.message);
      // Fallback: Wikipedia + NHTSA combined search
      const fallbackResults = await multiSourceCarSearch(q);
      if (fallbackResults.length > 0) {
        setResults(fallbackResults);
        setSource("multi");
      } else {
        setResults([]);
        setErrorMsg("No results found. Try a different search term.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`, { replace: true });
      doSearch(query.trim());
    }
  };

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-6 text-3xl font-bold">
            Search <span className="text-primary">Cars</span>
          </h1>

          <form onSubmit={handleSubmit} className="mb-8 flex gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any car — brand, model, or year..."
                className="h-12 rounded-xl border-border/50 bg-card pl-12 text-base"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 rounded-xl px-6">
              Search
            </Button>
          </form>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : results.length > 0 ? (
          <>
            {source === "multi" && (
              <div className="mb-4 rounded-lg border border-border/50 bg-secondary/50 px-4 py-2 text-sm text-muted-foreground">
                📚 Showing results from Wikipedia & NHTSA (AI search temporarily unavailable)
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((car, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  onClick={() =>
                    navigate(
                      `/car/${encodeURIComponent(car.name)}?years=${encodeURIComponent(car.yearRange)}`
                    )
                  }
                  className="group cursor-pointer border-border/50 bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  <CarImage carName={`${car.name} ${car.yearRange}`} className="w-full h-40" />
                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <Badge variant="secondary" className="mb-2 text-xs">
                          {car.category}
                        </Badge>
                        <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
                          {car.name}
                        </h3>
                      </div>
                      <span className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-mono font-medium text-muted-foreground">
                        {car.yearRange}
                      </span>
                    </div>
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                      {car.shortDescription}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      View Details <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          </>
        ) : errorMsg ? (
          <Card className="border-destructive/30 bg-destructive/5 p-12 text-center">
            <p className="text-destructive font-medium">{errorMsg}</p>
            <p className="mt-2 text-sm text-muted-foreground">The AI service may be temporarily unavailable.</p>
          </Card>
        ) : initialQuery ? (
          <Card className="border-border/50 bg-card p-12 text-center">
            <p className="text-muted-foreground">No results found for "{initialQuery}"</p>
          </Card>
        ) : (
          <Card className="border-border/50 bg-card p-12 text-center">
            <SearchIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">
              Search for any car to get AI-generated details
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
}
