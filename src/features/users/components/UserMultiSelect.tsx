import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@shared/components/ui/Input";
import { Badge } from "@shared/components/ui/Badge";
import { Checkbox } from "@shared/components/ui/Checkbox";
import { Spinner } from "@shared/components/ui/Spinner";
import { useDebouncedValue } from "@shared/lib/useDebouncedValue";
import { useListUsersQuery } from "@features/users/api/usersApi";
import type { AdminUser } from "@features/users/types";

interface Props {
  value: AdminUser[];
  onChange: (users: AdminUser[]) => void;
  invalid?: boolean;
}

/**
 * Pick people by name or email. The broadcast form used to take a textarea of
 * raw user UUIDs — which no screen shows — so "specific users" was unusable in
 * practice, and a mistyped id reported success to nobody.
 */
export function UserMultiSelect({ value, onChange, invalid }: Props) {
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim(), 300);
  const { currentData, isFetching } = useListUsersQuery(
    { search, size: 10, page: 0 },
    { skip: search.length < 2 },
  );
  const selected = new Set(value.map((u) => u.id));

  const toggle = (u: AdminUser) =>
    onChange(selected.has(u.id) ? value.filter((v) => v.id !== u.id) : [...value, u]);

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((u) => (
            <Badge key={u.id} tone="brand" className="gap-1">
              <span className="truncate max-w-[14rem]" title={u.email}>{u.fullName}</span>
              <button type="button" onClick={() => toggle(u)} aria-label={`Remove ${u.fullName}`} className="-mr-0.5 inline-flex">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className={"rounded-xl border " + (invalid ? "border-error-300" : "border-gray-200 dark:border-gray-700")}>
        <div className="p-2 border-b border-gray-100 dark:border-gray-800">
          <Input
            placeholder="Search by name or email…"
            leftIcon={<Search className="size-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search users"
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {search.length < 2 ? (
            <p className="text-sm text-gray-500 px-2 py-4 text-center">Type at least two characters.</p>
          ) : isFetching && !currentData ? (
            <div className="flex justify-center py-6"><Spinner size={4} /></div>
          ) : (currentData?.content.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500 px-2 py-4 text-center">No matching users.</p>
          ) : (
            currentData!.content.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u)} />
                <span className="min-w-0">
                  <span className="block text-sm text-gray-900 dark:text-gray-100 truncate">{u.fullName}</span>
                  <span className="block text-xs text-gray-500 truncate">{u.email}</span>
                </span>
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
