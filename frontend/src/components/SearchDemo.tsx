"use client";

import { useState } from "react";
import { Search, ExternalLink, User, Hash, Tag, Filter } from "lucide-react";

interface SearchResult {
  score: number;
  title: string;
  url: string;
  type: string;
  number: number | string;
  status: string;
  author: string;
}

export default function SearchDemo() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Search Input */}
      <form onSubmit={handleSearch} className="space-y-5">
        <div className="relative group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Elastic Context..."
            className="w-full rounded-2xl border-2 border-[#30363d] bg-[#0d1117] py-4 pl-14 pr-32 text-sm text-white placeholder:text-neutral-600 outline-none transition-all group-focus-within:border-neutral-500 group-focus-within:ring-8 group-focus-within:ring-white/5"
          />
          <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-600 group-focus-within:text-white transition-colors" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-white px-5 py-2 text-[11px] font-black uppercase tracking-widest text-black shadow-lg transition-all hover:bg-neutral-200 active:scale-95 disabled:opacity-50"
            >
              {loading ? "..." : "QUERY"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 px-4">
          <div className="flex items-center gap-2 group cursor-pointer">
            <Filter className="h-3 w-3 text-neutral-600 group-hover:text-white" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600 group-hover:text-neutral-400">Apply Semantic Filter</span>
          </div>
          <div className="h-3 w-px bg-[#30363d]" />
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600">Top Results: {results.length}</div>
        </div>
      </form>

      {/* Results */}
      <div className="overflow-y-auto pr-2 scroll-smooth max-h-[520px]">
        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
            {results.map((res, i) => (
              <div
                key={`${res.url}-${i}`}
                className="stagger-item group relative rounded-2xl border border-[#30363d] bg-[#161b22] p-5 transition-all hover:bg-[#1c2128] hover:border-neutral-500 hover:translate-x-0.5"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest border border-[#30363d] bg-white/5 text-neutral-300">
                        {res.type}
                      </span>
                      <span className="mono-text flex items-center gap-1.5 text-[10px] font-bold text-neutral-500">
                        <Hash className="h-3 w-3" />
                        {res.number}
                      </span>
                    </div>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-[#0d1117] text-neutral-500 hover:text-white transition-all hover:bg-[#21262d]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <h4 className="text-[13px] font-bold leading-snug text-neutral-200 group-hover:text-white transition-colors">
                    {res.title}
                  </h4>

                  <div className="flex items-center gap-5 pt-1">
                    <div className="flex items-center gap-2 group/user">
                      <div className="h-5 w-5 rounded-full bg-[#21262d] flex items-center justify-center">
                        <User className="h-3 w-3 text-neutral-500 group-hover/user:text-white transition-colors" />
                      </div>
                      <span className="text-[11px] font-semibold text-neutral-500 group-hover/user:text-neutral-300 transition-colors">{res.author}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3 text-neutral-600" />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-neutral-500">{res.status}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded bg-[#0d1117]">
                      <span className="text-[9px] font-black text-neutral-600">SCR:</span>
                      <span className="text-[10px] font-bold text-neutral-400 mono-text">{(res.score * 100).toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 group-hover:h-8 bg-white rounded-r-full transition-all duration-300" />
              </div>
            ))}
          </div>
        ) : query && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="h-12 w-12 rounded-full border border-[#30363d] flex items-center justify-center">
              <Search className="h-5 w-5 text-neutral-600" />
            </div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">No Matches Identified</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-6 opacity-30 group">
            <div className="relative">
              <Search className="h-12 w-12 text-neutral-600 group-hover:scale-110 transition-transform" />
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0d1117] bg-white" />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">Semantic Discovery Hub</p>
              <p className="text-[11px] font-medium text-neutral-600 max-w-[240px] leading-relaxed">
                Query the elasticsearch knowledge base to retrieve contextual nodes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
