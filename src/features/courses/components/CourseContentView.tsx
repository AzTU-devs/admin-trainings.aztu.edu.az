import { ExternalLink, FileText, PlayCircle } from "lucide-react";
import { Badge } from "@shared/components/ui/Badge";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { enumLabel } from "@shared/constants/enumLabels";
import type { ModuleDto } from "@features/courses/types";

function duration(seconds: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

/**
 * Read-only outline of a course's modules and lessons.
 *
 * Staff publish and moderate courses, but the content endpoints are tutor-only
 * (`course:update_own`), so the admin screens showed a title and a description and
 * nothing of what learners would actually get. The admin course DTO already carries
 * the whole tree, so this renders it — enough to see that a course is not empty and
 * what each lesson is, without pretending staff can edit it.
 */
export function CourseContentView({ modules }: { modules: ModuleDto[] }) {
  const sorted = [...modules].sort((a, b) => a.orderIndex - b.orderIndex);
  if (sorted.length === 0) {
    return (
      <EmptyState
        title="No content yet"
        description="This course has no modules or lessons. Its editor adds them from the tutor portal."
      />
    );
  }

  const lessonCount = sorted.reduce((n, m) => n + m.lessons.length, 0);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {sorted.length} module{sorted.length === 1 ? "" : "s"} · {lessonCount} lesson
        {lessonCount === 1 ? "" : "s"}
      </p>
      <ul className="space-y-3">
        {sorted.map((m, mi) => (
          <li
            key={m.id}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark p-4"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-mono text-gray-400">{mi + 1}.</span>
              <p className="font-medium text-gray-900 dark:text-white">{m.title}</p>
              <span className="ml-auto text-xs text-gray-500">
                {m.lessons.length} lesson{m.lessons.length === 1 ? "" : "s"}
              </span>
            </div>
            {m.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{m.description}</p>
            )}
            {m.lessons.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No lessons in this module.</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {[...m.lessons]
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((l) => {
                    const Icon = l.contentType === "VIDEO" ? PlayCircle : FileText;
                    const len = duration(l.durationSeconds);
                    return (
                      <li
                        key={l.id}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2"
                      >
                        <Icon className="size-4 shrink-0 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{l.title}</span>
                        <Badge tone="neutral">{enumLabel("lessonContentType", l.contentType)}</Badge>
                        {l.preview && <Badge tone="success">Free preview</Badge>}
                        {!l.videoMediaId && !l.videoUrl && l.contentType !== "TEXT" && (
                          <Badge tone="warning">No material</Badge>
                        )}
                        {/* http(s) only: the URL is tutor-entered, and a javascript: link
                            rendered on a SUPER_ADMIN's screen would run as them. */}
                        {l.videoUrl && /^https?:\/\//i.test(l.videoUrl) && (
                          <a
                            href={l.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-700 dark:text-brand-300 hover:underline"
                          >
                            Link <ExternalLink className="size-3" />
                          </a>
                        )}
                        {len && <span className="ml-auto text-xs text-gray-500">{len}</span>}
                      </li>
                    );
                  })}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
