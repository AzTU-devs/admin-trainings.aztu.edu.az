import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@shared/components/ui/Input";
import { Badge } from "@shared/components/ui/Badge";
import { Checkbox } from "@shared/components/ui/Checkbox";
import { Spinner } from "@shared/components/ui/Spinner";
import { CategorySwatch } from "@shared/components/bright";
import { categoryStyle } from "@shared/lib/categoryStyle";
import { cn } from "@shared/lib/cn";
import { useListCategoriesQuery } from "@features/categories/api/categoriesApi";
import type { CategoryDto } from "@features/categories/types";
import type { UUID } from "@shared/types/lms";

interface Props {
  value: UUID[];
  onChange: (ids: UUID[]) => void;
  invalid?: boolean;
}

/**
 * Multi-select category picker backed by `categoriesApi.listCategories`.
 * Replaces the old comma-separated UUID input.
 */
export function CategoryMultiSelect({ value, onChange, invalid }: Props) {
  const { data: categories, isLoading } = useListCategoriesQuery();
  const [query, setQuery] = useState("");

  // Whole categories, not just names: the chips need the slug for their colour.
  const byId = useMemo(() => {
    const m = new Map<string, CategoryDto>();
    (categories ?? []).forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    const list = (categories ?? []).filter((c) => c.active);
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  const toggle = (id: UUID) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className="space-y-2.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const c = byId.get(id);
            return (
              // Selected categories in their own colours, as the website's
              // topic chips show them.
              <Badge key={id} tone="hue" className={cn("h-7 gap-1.5 pl-1.5 pr-1", categoryStyle(c).k)}>
                <span aria-hidden className="size-2 shrink-0 rounded-[3px] bg-k-500" />
                <span className="truncate max-w-[12rem]">{c?.name ?? id}</span>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-label="Remove category"
                  className="inline-flex size-5 items-center justify-center rounded-full transition-colors hover:bg-k-200"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      <div
        className={cn(
          "overflow-hidden rounded-[16px] border bg-surface",
          invalid ? "border-danger" : "border-line-2",
        )}
      >
        <div className="border-b border-line p-2">
          <Input
            placeholder="Search categories…"
            leftIcon={<Search className="size-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1.5">
          {isLoading ? (
            <div className="flex justify-center py-6"><Spinner size={4} /></div>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-ink-3">No categories found.</p>
          ) : (
            filtered.map((c) => {
              const checked = value.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-[12px] px-2.5 py-1.5 transition-colors",
                    checked ? "bg-navy-tint/60 hover:bg-navy-tint" : "hover:bg-paper-2",
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(c.id)} />
                  <CategorySwatch category={c} round className="size-7" />
                  <span className={cn("min-w-0 text-sm", checked ? "font-medium text-ink" : "text-ink-2")}>
                    {c.name}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
