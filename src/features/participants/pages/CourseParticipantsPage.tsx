import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, UserMinus, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { StatusBadge } from "@shared/components/ui/Badge";
import { DataTable } from "@shared/components/tables/DataTable";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { Form, FormSection } from "@shared/components/forms/Form";
import { FormField } from "@shared/components/forms/FormField";
import { ROUTES } from "@shared/constants/routes";
import { ENROLLMENT_STATUS } from "@shared/types/lms";
import type { NormalizedError } from "@lib/axios/httpClient";
import { useGetAdminCourseByIdQuery } from "@features/courses/api/coursesApi";
import {
  useAddCourseParticipantMutation,
  useListCourseParticipantsQuery,
  useRemoveCourseParticipantMutation,
} from "@features/participants/api/participantsApi";
import {
  addParticipantSchema,
  type AddParticipantFormValues,
} from "@features/participants/schemas/participant.schema";
import type { CourseParticipantDto } from "@features/participants/types";
import { DateCell, PersonCell } from "@features/participants/components/PersonCell";

export default function CourseParticipantsPage() {
  // Route param carries the course id — ROUTES.adminCourseParticipants(courseId).
  const { courseId } = useParams();
  const [page, setPage] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<CourseParticipantDto | null>(null);
  /** Email the server has no account for, kept to offer creating one. */
  const [unknownEmail, setUnknownEmail] = useState<string | null>(null);

  const { data: course } = useGetAdminCourseByIdQuery(courseId!, { skip: !courseId });
  const { data, isFetching } = useListCourseParticipantsQuery(
    { courseId: courseId!, page, size: 10 },
    { skip: !courseId },
  );
  const [addParticipant] = useAddCourseParticipantMutation();
  const [removeParticipant] = useRemoveCourseParticipantMutation();

  const form = useForm<AddParticipantFormValues>({
    resolver: zodResolver(addParticipantSchema),
    defaultValues: { email: "" },
  });

  const openAdd = () => {
    form.reset({ email: "" });
    setUnknownEmail(null);
    setAddOpen(true);
  };

  const columns = useMemo<ColumnDef<CourseParticipantDto>[]>(
    () => [
      {
        header: "İştirakçi",
        cell: ({ row }) => (
          <PersonCell name={row.original.fullName} email={row.original.email} avatarUrl={row.original.avatarUrl} />
        ),
      },
      {
        header: "Status",
        // The shared status pill: "Active" is the same green as on Users.
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
      },
      {
        header: "Source",
        // How the seat was granted is a system value, not a state: a quiet
        // neutral pill with no status dot.
        cell: ({ row }) =>
          row.original.source ? (
            <StatusBadge value={row.original.source} dot={false} size="sm" />
          ) : (
            <span className="text-ink-3">—</span>
          ),
      },
      { header: "Enrolled", cell: ({ row }) => <DateCell value={row.original.enrolledAt} /> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <RemoveButton participant={row.original} onRemove={() => setRemoving(row.original)} />
          </div>
        ),
      },
    ],
    [],
  );

  if (!courseId) return <p className="text-sm text-danger">Course not found.</p>;

  return (
    <>
      <PageHeader
        title="İştirakçilər"
        description={course ? `Enrolled on “${course.title}”.` : "Manage who is enrolled on this course."}
        // The course crumb names the course instead of a clipped id.
        crumbLabel={course?.title}
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={openAdd}>Add İştirakçi</Button>}
      />

      <DataTable<CourseParticipantDto>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No İştirakçilər yet"
        emptyDescription="Add someone by email, or wait for the first enrollment."
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        getRowId={(r) => r.userId}
        renderMobileRow={(p) => (
          <ParticipantPhoneRow participant={p} onRemove={() => setRemoving(p)} />
        )}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent size="sm" aria-describedby={undefined}>
          <DialogHeader icon={<UserPlus />}>
            <DialogTitle>Add İştirakçi</DialogTitle>
          </DialogHeader>
          <Form
            form={form}
            onSubmit={async ({ email }) => {
              setUnknownEmail(null);
              try {
                await addParticipant({ courseId, body: { email } }).unwrap();
                toast.success("İştirakçi added");
                setAddOpen(false);
              } catch (e) {
                const err = e as NormalizedError;
                // Two things can 404 here, and only the missing account is
                // actionable: offer to create it instead of a dead-end toast.
                if (err.status === 404 && err.code !== "COURSE_NOT_FOUND") {
                  setUnknownEmail(email);
                  return;
                }
                toast.error(err.message || "Could not add the İştirakçi");
              }
            }}
          >
            <FormSection title="">
              <FormField<AddParticipantFormValues>
                name="email"
                label="Email"
                description="Access is granted immediately — no payment and no enrollment request."
                required
                className="md:col-span-2"
              >
                {({ field, invalid }) => (
                  <Input
                    type="email"
                    {...field}
                    value={field.value as string}
                    invalid={invalid}
                    onChange={(e) => { setUnknownEmail(null); field.onChange(e); }}
                    placeholder="ad.soyad@aztu.edu.az"
                  />
                )}
              </FormField>
            </FormSection>

            {unknownEmail && (
              <div className="flex gap-3 rounded-[18px] bg-warn-tint p-4 text-sm">
                <UserX aria-hidden className="mt-0.5 size-[18px] shrink-0 text-warn" />
                <div className="min-w-0">
                  <p className="break-words font-semibold text-ink">No account for {unknownEmail}</p>
                  <p className="mt-0.5 leading-relaxed text-ink-2">
                    Create the account first, then add them to this course.
                  </p>
                  <Link
                    to={ROUTES.adminUsers}
                    className="mt-2.5 inline-flex items-center font-semibold text-navy decoration-gold decoration-2 underline-offset-4 hover:underline"
                  >
                    Create the account →
                  </Link>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="secondary" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" loading={form.formState.isSubmitting}>Add</Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove İştirakçi?"
        description={
          removing
            ? `${removing.fullName} loses access to this course. Their progress and any certificate are kept.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          try {
            await removeParticipant({ courseId, userId: removing.userId }).unwrap();
            toast.success("İştirakçi removed");
          } catch (e) {
            toast.error((e as NormalizedError).message || "Could not remove the İştirakçi");
          }
        }}
      />
    </>
  );
}

/** Remove from the course — the row's one action, on the table and on a phone. */
function RemoveButton({ participant, onRemove }: { participant: CourseParticipantDto; onRemove: () => void }) {
  // A cancelled enrollment is already off the course — removing it again does nothing.
  if (participant.status === ENROLLMENT_STATUS.CANCELLED) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Remove İştirakçi"
      onClick={onRemove}
      className="text-ink-3 hover:bg-danger-tint hover:text-danger"
    >
      <UserMinus className="size-4" />
    </Button>
  );
}

/**
 * A participant on a phone (below md), where the table's columns do not fit:
 * the person with the remove button beside them, then status, source and the
 * enrolment date on one meta line.
 */
function ParticipantPhoneRow({ participant: p, onRemove }: { participant: CourseParticipantDto; onRemove: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <PersonCell name={p.fullName} email={p.email} avatarUrl={p.avatarUrl} />
        </div>
        <div className="-mr-1.5 shrink-0">
          <RemoveButton participant={p} onRemove={onRemove} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px] text-ink-3">
        <StatusBadge value={p.status} size="sm" />
        {p.source && <StatusBadge value={p.source} dot={false} size="sm" />}
        <span className="flex gap-1.5">
          Enrolled <DateCell value={p.enrolledAt} />
        </span>
      </div>
    </div>
  );
}
