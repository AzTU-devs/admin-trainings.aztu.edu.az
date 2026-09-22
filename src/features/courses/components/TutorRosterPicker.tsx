import { useMemo, useState } from "react";
import { PenLine, Search } from "lucide-react";
import { Input } from "@shared/components/ui/Input";
import { Avatar, AvatarFallback } from "@shared/components/ui/Avatar";
import { Button } from "@shared/components/ui/Button";
import { Checkbox } from "@shared/components/ui/Checkbox";
import { Spinner } from "@shared/components/ui/Spinner";
import { cn } from "@shared/lib/cn";
import { useListTutorsQuery } from "@features/tutors/api/tutorsApi";
import { TUTOR_APPROVAL_STATUS, type UUID } from "@shared/types/lms";

export interface TutorRoster {
  tutorIds: UUID[];
  /** The one tutor allowed to edit the course; always one of `tutorIds`. */
  authorizedTutorId?: UUID;
}

interface Props {
  value: TutorRoster;
  onChange: (next: TutorRoster) => void;
  invalid?: boolean;
  /**
   * Names for tutors already on the roster. Only the first page of tutors is
   * fetched, so without these an existing roster member further down the list
   * would show as a bare id.
   */
  labels?: Record<UUID, string>;
}

/**
 * Picks a course's teaching roster and nominates its authorised editor.
 *
 * Only APPROVED tutors are offered: the backend rejects anyone else with
 * TUTOR_NOT_APPROVED, so listing them would only produce a failed save.
 */
export function TutorRosterPicker({ value, onChange, invalid, labels }: Props) {
  const { data, isLoading } = useListTutorsQuery({
    status: TUTOR_APPROVAL_STATUS.APPROVED,
    page: 0,
    size: 100,
  });
  const [query, setQuery] = useState("");

  const tutors = useMemo(() => data?.content ?? [], [data]);

  const nameById = useMemo(() => {
    const m = new Map<UUID, string>(Object.entries(labels ?? {}));
    tutors.forEach((t) => m.set(t.id, `${t.firstName} ${t.lastName}`));
    return m;
  }, [tutors, labels]);

  const filtered = useMemo(() => {
    if (!query) return tutors;
    const q = query.toLowerCase();
    return tutors.filter((t) => `${t.firstName} ${t.lastName}`.toLowerCase().includes(q));
  }, [tutors, query]);

  const toggle = (id: UUID) => {
    if (value.tutorIds.includes(id)) {
      const tutorIds = value.tutorIds.filter((t) => t !== id);
      // The editor must stay on the roster, so dropping them hands the role to
      // whoever is left rather than leaving the course without an editor.
      const authorizedTutorId =
        value.authorizedTutorId === id ? tutorIds[0] : value.authorizedTutorId;
      onChange({ tutorIds, authorizedTutorId });
      return;
    }
    const tutorIds = [...value.tutorIds, id];
    onChange({ tutorIds, authorizedTutorId: value.authorizedTutorId ?? id });
  };

  return (
    <div className="space-y-2.5">
      {value.tutorIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.tutorIds.map((id) => {
            const editor = id === value.authorizedTutorId;
            const name = nameById.get(id);
            return (
              // Each roster member as an avatar pill; the editor's is gold.
              <span
                key={id}
                className={cn(
                  "inline-flex h-8 max-w-full items-center gap-2 rounded-full pl-1 pr-3 text-[12.5px] font-semibold",
                  editor ? "bg-gold-tint text-gold-ink" : "bg-navy-tint text-navy",
                )}
              >
                <Avatar size="xs" className="size-6 text-[10px]">
                  <AvatarFallback name={name ?? id} />
                </Avatar>
                <span className="truncate max-w-[12rem]">{name ?? id}</span>
                {/* No opacity on the tag: the gold ink is 5.6:1 on the gold
                    tint, but at 90% it fell to 4.31:1 — under AA at 11.5px. */}
                {editor && (
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-medium">
                    <PenLine className="size-3" aria-hidden />
                    editor
                  </span>
                )}
              </span>
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
            placeholder="Search tutors…"
            leftIcon={<Search className="size-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {isLoading ? (
            <div className="flex justify-center py-6"><Spinner size={4} /></div>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-ink-3">No approved tutors found.</p>
          ) : (
            filtered.map((t) => {
              const selected = value.tutorIds.includes(t.id);
              const name = `${t.firstName} ${t.lastName}`;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex min-h-14 items-center gap-3 rounded-[12px] px-2.5 py-2 transition-colors",
                    selected ? "bg-navy-tint/60" : "hover:bg-paper-2",
                  )}
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <Checkbox checked={selected} onCheckedChange={() => toggle(t.id)} />
                    <Avatar size="md">
                      <AvatarFallback name={name} />
                    </Avatar>
                    <span className="min-w-0">
                      <span className={cn("block truncate text-sm", selected ? "font-semibold text-ink" : "font-medium text-ink")}>
                        {t.firstName} {t.lastName}
                      </span>
                      {t.headline && (
                        <span className="block truncate text-[12.5px] text-ink-3">{t.headline}</span>
                      )}
                    </span>
                  </label>
                  {selected && (
                    <Button
                      type="button"
                      size="sm"
                      variant={t.id === value.authorizedTutorId ? "gold" : "secondary"}
                      className="h-9 shrink-0 px-3.5"
                      onClick={() => onChange({ ...value, authorizedTutorId: t.id })}
                    >
                      {t.id === value.authorizedTutorId ? "Editor" : "Make editor"}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
