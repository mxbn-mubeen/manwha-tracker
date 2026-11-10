import { SourceRow } from "./SourceRow";
import { SourceCard } from "./SourceCard";
import type { SourceItem } from "./ManhwaSourcesView";

export function FlatTableSourcesView({ sources }: { sources: SourceItem[] }) {
  return (
    <>
      {/* Desktop table */}
      <div className="border border-border/20 rounded-xl overflow-hidden bg-[#111214] hidden md:block shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm text-left">
            <thead className="text-[10px] tracking-wider uppercase bg-[#161719] text-zinc-500 border-b border-border/20 font-semibold">
              <tr>
                <th className="px-6 py-4 w-[250px] lg:w-[350px]">Manhwa Title</th>
                <th className="px-6 py-4 w-[150px]">Adapter</th>
                <th className="px-6 py-4 w-full">Source URL</th>
                <th className="px-6 py-4 text-right w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {sources.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-zinc-500">
                    No sources found matching your filters.
                  </td>
                </tr>
              ) : (
                sources.map((source) => <SourceRow key={source.id} source={source} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {sources.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 border border-border/20 rounded-xl bg-[#111214]">
            No sources found matching your filters.
          </div>
        ) : (
          sources.map((source) => <SourceCard key={source.id} source={source} />)
        )}
      </div>
    </>
  );
}

