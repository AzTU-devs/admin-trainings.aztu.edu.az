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
import { DataTable } from "@shared/components/tables/DataTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { Spinner } from "@shared/components/ui/Spinner";
import { QueryErrorState } from "@shared/components/feedback/QueryErrorState";
import { NotFoundState } from "@shared/components/feedback/NotFoundState";
import { isLookupNotFound } from "@shared/components/feedback/queryError";
import { resolveApiUrl } from "@shared/config/env";
import { apiErrorMessage } from "@shared/lib/apiError";
import { TutorAvatar } from "@features/tutors/components/TutorAvatar";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { Form, FormSection } from "@shared/components/forms/Form";
import { FormField } from "@shared/components/forms/FormField";
import { ROUTES } from "@shared/constants/routes";
import { ENROLLMENT_STATUS, type EnrollmentStatus } from "@shared/types/lms";
import { enumLabel } from "@shared/constants/enumLabels";
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

export default function CourseParticipantsPage() {
  // Route param carries the course id — ROUTES.adminCourseParticipants(courseId).
  const { courseId } = useParams();
  const [page, setPage] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<CourseParticipantDto | null>(null);
  /** Email the server has no account for, kept to offer creating one. */
  const [unknownEmail, setUnknownEmail] = useState<string | null>(null);

  const {
    data: course,
    error: courseError,
    isLoading: courseLoading,
    refetch: refetchCourse,
  } = useGetAdminCourseByIdQuery(courseId!, { skip: !courseId });
  const { currentData: data, isFetching, isError, error, refetch } = useListCourseParticipantsQuery(
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
        meta: { lang: "az" },
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {/* Authenticated media route: TutorAvatar fetches it with the token.
                A plain <img> got a 401 and always fell back to initials. */}
            <TutorAvatar size="sm" src={resolveApiUrl(row.original.avatarUrl) || null} name={row.original.fullName} />
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{row.original.fullName}</p>
              <p className="text-xs text-gray-500 truncate">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => <Badge tone={TONE[row.original.status] ?? "neutral"} dot>{enumLabel("enrollmentStatus", row.original.status)}</Badge>,
      },
      { header: "Source", cell: ({ row }) => row.original.source ? enumLabel("enrollmentSource", row.original.source) : "—" },
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

  // After every hook. A course that does not exist used to render as a normal
  // empty roster ("No İştirakçilər yet") although both calls were 404s.
  if (courseLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!courseId || (courseError && isLookupNotFound(courseError))) {
    return (
      <NotFoundState
        title="Course not found"
        description="There is no course at this address, so there is nobody to list. It may have been deleted, or the link may be wrong."
        backTo={ROUTES.adminCourses}
        backLabel="Back to courses"
        missingSegment={courseId}
      />
    );
  }
  if (courseError) return <QueryErrorState error={courseError} onRetry={refetchCourse} what="this course" />;

  return (
    <>
      <PageHeader
        title="İştirakçilər"
        description={course ? `Enrolled on “${course.title}”.` : "Manage who is enrolled on this course."}
        crumbLabels={course ? { [course.id]: course.title } : undefined}
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={openAdd}>Add İştirakçi</Button>}
      />

      <DataTable<CourseParticipantDto>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching && !data}
        isError={isError}
        error={error}
        onRetry={refetch}
        errorWhat="İştirakçilər"
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
            <DialogDescription className="sr-only">Enrol an existing account on this course by email.</DialogDescription>
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
                toast.error(apiErrorMessage(err, "Could not add the İştirakçi"));
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
                  state={{ createParticipant: unknownEmail }}
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
            ? `${removing.fullName} loses access to this course. Their progress is kept.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          // A refusal is shown by ConfirmDialog, which keeps the dialog open.
          await removeParticipant({ courseId, userId: removing.userId }).unwrap();
          toast.success("İştirakçi removed");
        }}
      />
    </>
  );
}
