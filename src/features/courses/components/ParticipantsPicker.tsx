import { useMemo, useState } from "react";
import { Check, Plus, Search, UserPlus, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@shared/components/ui/Avatar";
import { StatusBadge } from "@shared/components/ui/Badge";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Spinner } from "@shared/components/ui/Spinner";
import { cn } from "@shared/lib/cn";
import { useDebouncedValue } from "@shared/lib/useDebouncedValue";
import { useListUsersQuery } from "@features/users/api/usersApi";
import type { AdminUser } from "@features/users/types";
import {
  MAX_PARTICIPANTS,
  addParticipants,
  removeParticipant,
  type PickedParticipant,
} from "@features/courses/lib/participants";

/** One page of search results; the search narrows it, there is no paging here. */
const RESULT_SIZE = 20;

interface Props {
  value: PickedParticipant[];
  onChange: (next: PickedParticipant[]) => void;
  /** Picked ids the API refused (USER_NOT_FOUND); their chips are flagged. */
  invalidIds?: string[];
  max?: number;
}

function toPicked(u: AdminUser): PickedParticipant {
  return { id: u.id, fullName: u.fullName || u.email, email: u.email };
}

/**
 * Picks the İştirakçilər a new course starts with: a search over participant
 * accounts (role USER, `GET /admin/users`), each result added as a chip with
 * its name and email. Adding is idempotent and stops at the API's limit.
 *
 * It sits inside the course form, so Enter in the search box adds the first
 * result instead of submitting the whole course.
 */
export function ParticipantsPicker({
  value,
  onChange,
  invalidIds = [],
  max = MAX_PARTICIPANTS,
}: Props) {
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim(), 300);
  const { data, isFetching, isError, refetch } = useListUsersQuery({
    search: search || undefined,
    role: "USER",
    page: 0,
    size: RESULT_SIZE,
  });

  const results = useMemo(() => data?.content ?? [], [data]);
  const picked = useMemo(() => new Set(value.map((p) => p.id)), [value]);
  const invalid = useMemo(() => new Set(invalidIds), [invalidIds]);
  const full = value.length >= max;
  const addable = results.filter((u) => !picked.has(u.id));
  // While the debounce or the request is pending, the list is for another query.
  const stale = isFetching || search !== query.trim();

  const add = (users: AdminUser[]) => onChange(addParticipants(value, users.map(toPicked), max));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-ink-2" aria-live="polite">
          <span className="tabular-nums text-ink">{value.length}</span> selected
          <span className="font-normal text-ink-3"> · up to {max.toLocaleString()}</span>
        </p>
        {value.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-3"
            onClick={() => onChange([])}
          >
            Remove all
          </Button>
        )}
      </div>

      {value.length > 0 && (
        <ul
          aria-label="Selected İştirakçilər"
          className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto"
        >
          {value.map((p) => {
            const bad = invalid.has(p.id);
            return (
              <li
                key={p.id}
                className={cn(
                  "inline-flex h-9 max-w-full items-center gap-2 rounded-full pl-1 pr-1 text-[12.5px]",
                  bad
                    ? "bg-danger-tint text-danger shadow-[inset_0_0_0_1.5px_var(--danger)]"
                    : "bg-navy-tint text-navy",
                )}
                title={
                  bad
                    ? "No account with this id any more — remove it to save"
                    : `${p.fullName} · ${p.email}`
                }
              >
                <Avatar size="xs" className="size-7 text-[10px]">
                  <AvatarFallback name={p.fullName} />
                </Avatar>
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{p.fullName}</span>
                  <span className={cn("ml-1.5", bad ? "text-danger" : "text-ink-3")}>
                    {p.email}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${p.fullName}`}
                  onClick={() => onChange(removeParticipant(value, p.id))}
                  className="grid size-7 shrink-0 place-items-center rounded-full transition-colors hover:bg-ink/8"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="overflow-hidden rounded-[16px] border border-line-2 bg-surface">
        <div className="flex items-center gap-2 border-b border-line p-2">
          <Input
            aria-label="Search İştirakçilər"
            placeholder="Search by name or email…"
            leftIcon={<Search className="size-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (!stale && addable[0] && !full) add([addable[0]]);
            }}
          />
          {addable.length > 1 && !full && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0"
              leftIcon={<Plus className="size-4" />}
              disabled={stale}
              onClick={() => add(addable)}
            >
              Add all {addable.length}
            </Button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto p-1.5" aria-busy={isFetching}>
          {isFetching && results.length === 0 ? (
            <div className="flex justify-center py-6">
              <Spinner size={4} />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center gap-3 px-2 py-4 text-sm text-danger">
              Could not search accounts.
              <Button type="button" size="sm" variant="secondary" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : results.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-ink-3">
              {search ? `No İştirakçi matches “${search}”.` : "No İştirakçi accounts yet."}
            </p>
          ) : (
            <ul aria-label="Search results" className={cn(stale && "opacity-60")}>
              {results.map((u) => {
                const isPicked = picked.has(u.id);
                return (
                  <li
                    key={u.id}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-[12px] px-2.5 py-2",
                      isPicked ? "bg-navy-tint/60" : "hover:bg-paper-2",
                    )}
                  >
                    <Avatar size="md">
                      <AvatarFallback name={u.fullName || u.email} />
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {u.fullName || u.email}
                      </span>
                      <span className="block truncate text-[12.5px] text-ink-3">{u.email}</span>
                    </span>
                    {u.status !== "ACTIVE" && <StatusBadge value={u.status} size="sm" />}
                    {isPicked ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 shrink-0 px-3.5"
                        leftIcon={<Check className="size-4" />}
                        aria-label={`Remove ${u.fullName || u.email}`}
                        tooltip={false}
                        onClick={() => onChange(removeParticipant(value, u.id))}
                      >
                        Added
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-9 shrink-0 px-3.5"
                        leftIcon={<UserPlus className="size-4" />}
                        aria-label={`Add ${u.fullName || u.email}`}
                        tooltip={false}
                        disabled={full}
                        onClick={() => add([u])}
                      >
                        Add
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {full && (
        <p className="text-[12.5px] font-medium text-warn">
          That is the most a course can be created with ({max.toLocaleString()}). Add more from its
          İştirakçilər page later.
        </p>
      )}
    </div>
  );
}
