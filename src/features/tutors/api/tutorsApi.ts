import { baseApi } from "@lib/query/baseApi";
import type { NormalizedError } from "@lib/axios/httpClient";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { BookingDecision, TutorApprovalStatus, UUID } from "@shared/types/lms";
import type {
  CreateAwardRequest,
  CreateCertificateRequest,
  TutorAward,
  TutorCertificate,
  TutorProfileDto,
  UpdateTutorProfileRequest,
} from "@features/tutors/types";

interface ListArgs extends PageRequest {
  status?: TutorApprovalStatus;
}

/*
 * Certificates and awards are added and deleted one at a time, while the
 * profile form around them may hold unsaved edits. So a saved change is
 * written into the caller's own cached profile (ME) rather than fetched again:
 * no refetch runs under the form — one that failed would replace it with an
 * error — and coming back to the page still shows the list as saved. The
 * tutors table (LIST), whose rows carry both lists (an admin who is also a
 * tutor has a row there too), is reloaded. A refused change leaves both alone:
 * nothing changed on the server.
 */
const LIST_TAGS = [{ type: "Tutor" as const, id: "LIST" }];

/** The API's 404 for a certificate or an award that is not (or no longer) on the profile. */
type GoneCode = "CERTIFICATE_NOT_FOUND" | "AWARD_NOT_FOUND";

/** Deleted elsewhere already: the server's list is as if this delete went through. */
const alreadyGone = (error: unknown, code: GoneCode) => (error as NormalizedError | undefined)?.code === code;

/** Tags to refetch after a delete: none when it was refused, the table's when the item is gone either way. */
const afterDelete = (code: GoneCode) => (_r: unknown, error: unknown) =>
  error && !alreadyGone(error, code) ? [] : LIST_TAGS;

/** Whether a delete left the item gone: it went through, or found it already deleted. */
async function deleted(queryFulfilled: Promise<unknown>, code: GoneCode): Promise<boolean> {
  try {
    await queryFulfilled;
    return true;
  } catch (e) {
    return alreadyGone((e as { error?: unknown }).error, code);
  }
}

/** The certificates of the caller's own cached profile, changed — only if it is `tutorId`'s, when one is given. */
function changeOwnCertificates(change: (list: TutorCertificate[]) => TutorCertificate[], tutorId?: UUID) {
  return tutorsApi.util.updateQueryData("getMyTutorProfile", undefined, (profile) => {
    if (tutorId !== undefined && profile.id !== tutorId) return;
    profile.certificates = change(profile.certificates ?? []);
  });
}

/** The same for the awards. */
function changeOwnAwards(change: (list: TutorAward[]) => TutorAward[], tutorId?: UUID) {
  return tutorsApi.util.updateQueryData("getMyTutorProfile", undefined, (profile) => {
    if (tutorId !== undefined && profile.id !== tutorId) return;
    profile.awards = change(profile.awards ?? []);
  });
}

export const tutorsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Admin review queue — backend `GET /api/portal/tutor/admin`. */
    listTutors: build.query<ApiPage<TutorProfileDto>, ListArgs | void>({
      query: (params) => ({ url: "/portal/tutor/admin", method: "GET", params: params ?? undefined }),
      providesTags: [{ type: "Tutor", id: "LIST" }],
    }),
    /** Approve / reject — backend `POST /api/portal/tutor/admin/{tutorId}/decision`. */
    decideTutor: build.mutation<TutorProfileDto, { id: UUID; decision: BookingDecision; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/portal/tutor/admin/${id}/decision`, method: "POST", data: body }),
      invalidatesTags: [{ type: "Tutor", id: "LIST" }],
    }),
    /** The caller's own expert profile — backend `GET /api/portal/tutor/me`. */
    getMyTutorProfile: build.query<TutorProfileDto, void>({
      query: () => ({ url: "/portal/tutor/me", method: "GET" }),
      providesTags: [{ type: "Tutor", id: "ME" }],
    }),
    /** The expert edits their own profile — backend `PATCH /api/portal/tutor/me`. */
    updateMyTutorProfile: build.mutation<TutorProfileDto, UpdateTutorProfileRequest>({
      query: (body) => ({ url: "/portal/tutor/me", method: "PATCH", data: body }),
      // LIST too: an admin who is also a tutor sees their own row in the tutors table.
      invalidatesTags: [{ type: "Tutor", id: "ME" }, { type: "Tutor", id: "LIST" }],
    }),
    /** An admin edits any expert's profile — backend `PATCH /api/admin/tutors/{tutorId}`. */
    updateTutorProfile: build.mutation<TutorProfileDto, { id: UUID; body: UpdateTutorProfileRequest }>({
      query: ({ id, body }) => ({ url: `/admin/tutors/${id}`, method: "PATCH", data: body }),
      invalidatesTags: [{ type: "Tutor", id: "LIST" }, { type: "Tutor", id: "ME" }],
    }),

    /* Certificates: one at a time, saved at once — never part of the profile PATCH. */

    /** The expert adds one of their own — backend `POST /api/portal/tutor/me/certificates`. */
    addMyCertificate: build.mutation<TutorCertificate, CreateCertificateRequest>({
      query: (body) => ({ url: "/portal/tutor/me/certificates", method: "POST", data: body }),
      invalidatesTags: (_r, error) => (error ? [] : LIST_TAGS),
      async onQueryStarted(_body, { dispatch, queryFulfilled }) {
        try {
          const { data: created } = await queryFulfilled;
          dispatch(changeOwnCertificates((list) => [...list, created]));
        } catch {
          // Refused: nothing to write.
        }
      },
    }),
    /** Backend `DELETE /api/portal/tutor/me/certificates/{id}`. */
    deleteMyCertificate: build.mutation<void, UUID>({
      query: (id) => ({ url: `/portal/tutor/me/certificates/${id}`, method: "DELETE" }),
      invalidatesTags: afterDelete("CERTIFICATE_NOT_FOUND"),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        if (await deleted(queryFulfilled, "CERTIFICATE_NOT_FOUND")) {
          dispatch(changeOwnCertificates((list) => list.filter((c) => c.id !== id)));
        }
      },
    }),
    /** An admin adds one to any expert — backend `POST /api/admin/tutors/{tutorId}/certificates`. */
    addTutorCertificate: build.mutation<TutorCertificate, { tutorId: UUID; body: CreateCertificateRequest }>({
      query: ({ tutorId, body }) => ({ url: `/admin/tutors/${tutorId}/certificates`, method: "POST", data: body }),
      invalidatesTags: (_r, error) => (error ? [] : LIST_TAGS),
      async onQueryStarted({ tutorId }, { dispatch, queryFulfilled }) {
        try {
          const { data: created } = await queryFulfilled;
          dispatch(changeOwnCertificates((list) => [...list, created], tutorId));
        } catch {
          // Refused: nothing to write.
        }
      },
    }),
    /** Backend `DELETE /api/admin/tutors/{tutorId}/certificates/{id}`. */
    deleteTutorCertificate: build.mutation<void, { tutorId: UUID; id: UUID }>({
      query: ({ tutorId, id }) => ({ url: `/admin/tutors/${tutorId}/certificates/${id}`, method: "DELETE" }),
      invalidatesTags: afterDelete("CERTIFICATE_NOT_FOUND"),
      async onQueryStarted({ tutorId, id }, { dispatch, queryFulfilled }) {
        if (await deleted(queryFulfilled, "CERTIFICATE_NOT_FOUND")) {
          dispatch(changeOwnCertificates((list) => list.filter((c) => c.id !== id), tutorId));
        }
      },
    }),

    /* Awards: the same way as certificates — one at a time, saved at once, never part of the profile PATCH. */

    /** The expert adds one of their own — backend `POST /api/portal/tutor/me/awards`. */
    addMyAward: build.mutation<TutorAward, CreateAwardRequest>({
      query: (body) => ({ url: "/portal/tutor/me/awards", method: "POST", data: body }),
      invalidatesTags: (_r, error) => (error ? [] : LIST_TAGS),
      async onQueryStarted(_body, { dispatch, queryFulfilled }) {
        try {
          const { data: created } = await queryFulfilled;
          dispatch(changeOwnAwards((list) => [...list, created]));
        } catch {
          // Refused: nothing to write.
        }
      },
    }),
    /** Backend `DELETE /api/portal/tutor/me/awards/{id}`. */
    deleteMyAward: build.mutation<void, UUID>({
      query: (id) => ({ url: `/portal/tutor/me/awards/${id}`, method: "DELETE" }),
      invalidatesTags: afterDelete("AWARD_NOT_FOUND"),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        if (await deleted(queryFulfilled, "AWARD_NOT_FOUND")) {
          dispatch(changeOwnAwards((list) => list.filter((a) => a.id !== id)));
        }
      },
    }),
    /** An admin adds one to any expert — backend `POST /api/admin/tutors/{tutorId}/awards`. */
    addTutorAward: build.mutation<TutorAward, { tutorId: UUID; body: CreateAwardRequest }>({
      query: ({ tutorId, body }) => ({ url: `/admin/tutors/${tutorId}/awards`, method: "POST", data: body }),
      invalidatesTags: (_r, error) => (error ? [] : LIST_TAGS),
      async onQueryStarted({ tutorId }, { dispatch, queryFulfilled }) {
        try {
          const { data: created } = await queryFulfilled;
          dispatch(changeOwnAwards((list) => [...list, created], tutorId));
        } catch {
          // Refused: nothing to write.
        }
      },
    }),
    /** Backend `DELETE /api/admin/tutors/{tutorId}/awards/{id}`. */
    deleteTutorAward: build.mutation<void, { tutorId: UUID; id: UUID }>({
      query: ({ tutorId, id }) => ({ url: `/admin/tutors/${tutorId}/awards/${id}`, method: "DELETE" }),
      invalidatesTags: afterDelete("AWARD_NOT_FOUND"),
      async onQueryStarted({ tutorId, id }, { dispatch, queryFulfilled }) {
        if (await deleted(queryFulfilled, "AWARD_NOT_FOUND")) {
          dispatch(changeOwnAwards((list) => list.filter((a) => a.id !== id), tutorId));
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useListTutorsQuery,
  useDecideTutorMutation,
  useGetMyTutorProfileQuery,
  useUpdateMyTutorProfileMutation,
  useUpdateTutorProfileMutation,
  useAddMyCertificateMutation,
  useDeleteMyCertificateMutation,
  useAddTutorCertificateMutation,
  useDeleteTutorCertificateMutation,
  useAddMyAwardMutation,
  useDeleteMyAwardMutation,
  useAddTutorAwardMutation,
  useDeleteTutorAwardMutation,
} = tutorsApi;
