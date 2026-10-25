import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { UserPlus, Users } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { CourseDetailsForm } from "@features/courses/components/CourseDetailsForm";
import { FormCard } from "@features/courses/components/FormCard";
import { ParticipantsPicker } from "@features/courses/components/ParticipantsPicker";
import {
  TutorRosterPicker,
  type TutorRoster,
} from "@features/courses/components/TutorRosterPicker";
import { useCreateAdminCourseMutation } from "@features/courses/api/coursesApi";
import {
  MAX_PARTICIPANTS,
  buildAdminCreateRequest,
  participantNamedIn,
  type PickedParticipant,
} from "@features/courses/lib/participants";
import { ROUTES } from "@shared/constants/routes";
import { COURSE_TYPE, type CourseType } from "@shared/types/lms";
import type { NormalizedError } from "@lib/axios/httpClient";

const PARTICIPANTS_CARD_ID = "new-course-participants";

/** `?type=ONE_TIME` (from "New one-time training") as a course type, if it is one. */
function presetType(raw: string | null): CourseType | undefined {
  return Object.values(COURSE_TYPE).find((t) => t === raw);
}

/**
 * Admin course creation. Unlike the tutor flow the teaching roster is stated
 * explicitly — an admin has no tutor profile of their own, and the course
 * belongs to the university whoever ends up teaching it.
 *
 * İştirakçilər can be seated in the same request (contract E). That is the
 * point of a one-time training — a session for a known group — so for that
 * type the card is open and sits with the roster under the session's date;
 * for the other types it stays folded until asked for.
 */
export default function AdminCourseNewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialType = presetType(params.get("type"));
  const oneTimePreset = initialType === COURSE_TYPE.ONE_TIME;

  const [createAdminCourse] = useCreateAdminCourseMutation();
  const [roster, setRoster] = useState<TutorRoster>({ tutorIds: [] });
  const [participants, setParticipants] = useState<PickedParticipant[]>([]);
  // Ids the API answered USER_NOT_FOUND for, flagged on their chips.
  const [missingIds, setMissingIds] = useState<string[]>([]);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  // The roster is only flagged once a save has been attempted: the picker
  // starts empty by definition, and a red border on arrival reads as an error
  // the admin has made rather than a field still to fill.
  const [attempted, setAttempted] = useState(false);

  const rosterMissing = roster.tutorIds.length === 0 || !roster.authorizedTutorId;

  const changeParticipants = (next: PickedParticipant[]) => {
    setParticipants(next);
    // A flagged chip that was removed is no longer a problem.
    setMissingIds((ids) => ids.filter((id) => next.some((p) => p.id === id)));
  };

  const extra = (courseType: CourseType) => {
    const oneTime = courseType === COURSE_TYPE.ONE_TIME;
    const showPicker = oneTime || participantsOpen || participants.length > 0;
    return (
      <>
        <FormCard
          icon={<Users />}
          title="Teaching roster"
          description={
            oneTime
              ? "The tutors running this training. The nominated editor is the one tutor allowed to change it."
              : "Everyone who teaches this course. The nominated editor is the one tutor allowed to change it."
          }
          grid={false}
        >
          <TutorRosterPicker
            value={roster}
            onChange={setRoster}
            invalid={attempted && rosterMissing}
          />
          {attempted && rosterMissing && (
            <p className="mt-2 text-[12.5px] font-medium text-danger">
              Assign at least one tutor and nominate the editor.
            </p>
          )}
        </FormCard>

        <div id={PARTICIPANTS_CARD_ID} className="scroll-mt-24">
          <FormCard
            icon={<UserPlus />}
            title="İştirakçilər"
            description={
              oneTime
                ? "Who attends. Each person gets a seat the moment the training is created, as when an admin adds them: no payment, and the seat limit does not stop them."
                : "Optional: seat people on the course the moment it is created, as when an admin adds them. They can also be added later from the course's İştirakçilər page."
            }
            grid={false}
          >
            {showPicker ? (
              <ParticipantsPicker
                value={participants}
                onChange={changeParticipants}
                invalidIds={missingIds}
              />
            ) : (
              <Button
                type="button"
                variant="secondary"
                leftIcon={<UserPlus className="size-4" />}
                onClick={() => setParticipantsOpen(true)}
              >
                Add İştirakçilər now
              </Button>
            )}
          </FormCard>
        </div>
      </>
    );
  };

  return (
    <>
      <PageHeader
        title={oneTimePreset ? "New one-time training" : "New course"}
        description={
          oneTimePreset
            ? "Set its date and times, assign the tutors who lead it and seat its İştirakçilər, all in one go."
            : "Create a course for the university and assign the tutors who teach it."
        }
      />
      {/* The form brings its own section cards; the roster and İştirakçilər
          are two more. Capped so the two-column fields keep a readable line
          on wide screens. */}
      <div className="max-w-[1040px]">
        <CourseDetailsForm
          // A different preset is a different starting form, not an edit of this one.
          key={initialType ?? "default"}
          submitLabel={oneTimePreset ? "Create training" : "Create course"}
          defaultCourseType={initialType}
          extra={extra}
          onSubmit={async (values) => {
            setAttempted(true);
            // The roster sits outside the course schema, so this is the only
            // place it can be enforced; the form surfaces the throw as a toast.
            if (rosterMissing) {
              throw new Error("Assign at least one tutor and nominate the editor");
            }
            if (participants.length > MAX_PARTICIPANTS) {
              throw new Error(
                `A course can be created with at most ${MAX_PARTICIPANTS} İştirakçilər`,
              );
            }
            if (missingIds.length) {
              throw new Error(
                "Remove the İştirakçilər marked in red: their accounts no longer exist",
              );
            }
            try {
              const created = await createAdminCourse(
                buildAdminCreateRequest(
                  values,
                  { tutorIds: roster.tutorIds, authorizedTutorId: roster.authorizedTutorId! },
                  participants,
                ),
              ).unwrap();
              navigate(ROUTES.adminCourseEdit(created.id));
            } catch (e) {
              const err = e as NormalizedError;
              if (err?.code !== "USER_NOT_FOUND") throw e;
              // Nothing was created. Point at the person the API could not
              // find (it names the id), so one removal fixes the save.
              const missing = participantNamedIn(err.message, participants);
              if (missing) setMissingIds([missing.id]);
              document
                .getElementById(PARTICIPANTS_CARD_ID)
                ?.scrollIntoView?.({ behavior: "smooth", block: "center" });
              throw new Error(
                missing
                  ? `${missing.fullName} (${missing.email}) no longer has an account. Remove them and save again.`
                  : err.message || "One of the İştirakçilər no longer has an account.",
              );
            }
          }}
        />
      </div>
    </>
  );
}
