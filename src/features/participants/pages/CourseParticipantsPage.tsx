import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Badge } from "@shared/components/ui/Badge";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/components/ui/Avatar";
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
import { ENROLLMENT_STATUS, type EnrollmentStatus } from "@shared/types/lms";
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

const TONE: Record<EnrollmentStatus, "neutral" | "warning" | "success" | "danger" | "brand"> = {
  [ENROLLMENT_STATUS.PENDING_PAYMENT]: "warning",
  [ENROLLMENT_STATUS.ACTIVE]: "brand",
  [ENROLLMENT_STATUS.COMPLETED]: "success",
  [ENROLLMENT_STATUS.CANCELLED]: "danger",
  [ENROLLMENT_STATUS.REFUNDED]: "neutral",
};

function initials(name: string) {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

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
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarImage src={row.original.avatarUrl} />
              <AvatarFallback>{initials(row.original.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{row.original.fullName}</p>
              <p className="text-xs text-gray-500 truncate">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => <Badge tone={TONE[row.original.status]} dot>{row.original.status.replace(/_/g, " ")}</Badge>,
      },
      { header: "Source", cell: ({ row }) => row.original.source ? row.original.source.replace(/_/g, " ") : "—" },
      { header: "Enrolled", cell: ({ row }) => new Date(row.original.enrolledAt).toLocaleDateString() },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            {/* A cancelled enrollment is already off the course — removing it again does nothing. */}
            {row.original.status !== ENROLLMENT_STATUS.CANCELLED && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove İştirakçi"
                onClick={() => setRemoving(row.original)}
              >
                <UserMinus className="size-4 text-error-500" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  if (!courseId) return <p className="text-sm text-error-600">Course not found.</p>;

  return (
    <>
      <PageHeader
        title="İştirakçilər"
        description={course ? `Enrolled on “${course.title}”.` : "Manage who is enrolled on this course."}
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
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent size="sm">
          <DialogHeader>
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
              <div className="rounded-xl bg-warning-50 p-3 text-sm dark:bg-warning-500/10">
                <p className="font-medium text-gray-900 dark:text-white">No account for {unknownEmail}</p>
                <p className="mt-0.5 text-gray-600 dark:text-gray-300">
                  Create the account first, then add them to this course.
                </p>
                <Link
                  to={ROUTES.adminUsers}
                  className="mt-2 inline-block font-medium text-brand-700 hover:underline dark:text-brand-300"
                >
                  Create the account →
                </Link>
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
