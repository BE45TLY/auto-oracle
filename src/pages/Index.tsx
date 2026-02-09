import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TrendingUp, Zap, Trophy, Crown, Gauge } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";

const categories = [
  { label: "Electric", icon: Zap, color: "bg-cyan-500/20 text-cyan-400" },
  { label: "Racing", icon: Trophy, color: "bg-red-500/20 text-red-400" },
  { label: "Luxury", icon: Crown, color: "bg-amber-500/20 text-amber-400" },
  { label: "Performance", icon: Gauge, color: "bg-green-500/20 text-green-400" },
];

interface NewsArticle {
  title: string;
  summary: string;
  source: string;
  date: string;
  category: string;
  imageUrl?: string;
}

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: news, isLoading } = useQuery({
    queryKey: ["car-news", selectedCategory],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("car-news", {
        body: { category: selectedCategory || "latest" },
      });
      if (error) throw error;
      return data.articles as NewsArticle[];
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="container relative py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-2xl text-center"
          >
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-6xl">
              Every Car. <span className="text-primary">Every Story.</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              AI-powered encyclopedia for every car ever made
            </p>
            <form onSubmit={handleSearch} className="relative mx-auto max-w-lg">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any car — e.g. '1967 Mustang' or 'Tesla Model S'"
                className="h-14 rounded-xl border-border/50 bg-card pl-12 pr-4 text-base shadow-lg shadow-primary/5 placeholder:text-muted-foreground/60 focus-visible:ring-primary"
              />
            </form>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-8">
        <div className="flex flex-wrap gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() =>
                  setSelectedCategory(isActive ? null : cat.label)
                }
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : cat.color + " hover:opacity-80"
                }`}
              >
                <Icon className="h-4 w-4" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* News Feed */}
      <section className="container pb-16">
        <div className="mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">
            {selectedCategory ? `${selectedCategory} News` : "Breaking News"}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse border-border/50 bg-card p-6">
                <div className="mb-4 h-40 rounded-lg bg-secondary" />
                <div className="mb-2 h-4 w-3/4 rounded bg-secondary" />
                <div className="h-3 w-1/2 rounded bg-secondary" />
              </Card>
            ))}
          </div>
        ) : news && news.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Featured article */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-2 md:row-span-2"
            >
              <Card className="group h-full cursor-pointer border-border/50 bg-card p-0 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex h-full flex-col p-6">
                  <Badge variant="secondary" className="mb-3 w-fit text-xs">
                    {news[0].category}
                  </Badge>
                  <h3 className="mb-3 text-2xl font-bold leading-tight group-hover:text-primary transition-colors">
                    {news[0].title}
                  </h3>
                  <p className="mb-4 flex-1 text-muted-foreground leading-relaxed">
                    {news[0].summary}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{news[0].source}</span>
                    <span>·</span>
                    <span>{news[0].date}</span>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Rest of articles */}
            {news.slice(1).map((article, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i + 1) * 0.05 }}
              >
                <Card className="group h-full cursor-pointer border-border/50 bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                  <div className="p-5">
                    <Badge variant="secondary" className="mb-2 text-xs">
                      {article.category}
                    </Badge>
                    <h3 className="mb-2 font-semibold leading-snug group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                      {article.summary}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{article.source}</span>
                      <span>·</span>
                      <span>{article.date}</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-border/50 bg-card p-12 text-center">
            <p className="text-muted-foreground">No news articles available. Try a different category.</p>
          </Card>
        )}
      </section>
    </Layout>
  );
}
