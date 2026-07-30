import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@shared/components/ui/Input";
import { Badge } from "@shared/components/ui/Badge";
import { Checkbox } from "@shared/components/ui/Checkbox";
import { Spinner } from "@shared/components/ui/Spinner";
import { useListCategoriesQuery } from "@features/categories/api/categoriesApi";
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

  const byId = useMemo(() => {
    const m = new Map<string, string>();
    (categories ?? []).forEach((c) => m.set(c.id, c.name));
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
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <Badge key={id} tone="brand" className="gap-1">
              <span className="truncate max-w-[12rem]">{byId.get(id) ?? id}</span>
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-label="Remove category"
                className="-mr-0.5 inline-flex"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div
        className={
          "rounded-xl border " +
          (invalid ? "border-error-300" : "border-gray-200 dark:border-gray-700")
        }
      >
        <div className="p-2 border-b border-gray-100 dark:border-gray-800">
          <Input
            placeholder="Search categories…"
            leftIcon={<Search className="size-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {isLoading ? (
            <div className="flex justify-center py-6"><Spinner size={4} /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 px-2 py-4 text-center">No categories found.</p>
          ) : (
            filtered.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <Checkbox checked={value.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                <span className="text-sm text-gray-700 dark:text-gray-200">{c.name}</span>
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
