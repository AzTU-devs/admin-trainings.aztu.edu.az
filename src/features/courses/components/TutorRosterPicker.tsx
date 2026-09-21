import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@shared/components/ui/Input";
import { Badge } from "@shared/components/ui/Badge";
import { Button } from "@shared/components/ui/Button";
import { Checkbox } from "@shared/components/ui/Checkbox";
import { Spinner } from "@shared/components/ui/Spinner";
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
    <div className="space-y-2">
      {value.tutorIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.tutorIds.map((id) => (
            <Badge key={id} tone={id === value.authorizedTutorId ? "gold" : "brand"} className="gap-1">
              <span className="truncate max-w-[12rem]">{nameById.get(id) ?? id}</span>
              {id === value.authorizedTutorId && <span className="text-[10px] uppercase">editor</span>}
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
            placeholder="Search tutors…"
            leftIcon={<Search className="size-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {isLoading ? (
            <div className="flex justify-center py-6"><Spinner size={4} /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 px-2 py-4 text-center">No approved tutors found.</p>
          ) : (
            filtered.map((t) => {
              const selected = value.tutorIds.includes(t.id);
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <label className="flex flex-1 min-w-0 items-center gap-2.5 cursor-pointer">
                    <Checkbox checked={selected} onCheckedChange={() => toggle(t.id)} />
                    <span className="min-w-0">
                      <span className="block text-sm text-gray-700 dark:text-gray-200 truncate">
                        {t.firstName} {t.lastName}
                      </span>
                      {t.headline && (
                        <span className="block text-xs text-gray-500 truncate">{t.headline}</span>
                      )}
                    </span>
                  </label>
                  {selected && (
                    <Button
                      type="button"
                      size="sm"
                      variant={t.id === value.authorizedTutorId ? "gold" : "ghost"}
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
