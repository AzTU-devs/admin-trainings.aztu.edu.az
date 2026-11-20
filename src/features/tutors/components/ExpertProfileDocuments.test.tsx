import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { ExpertProfileForm } from "./ExpertProfileForm";
import { openStoredDocument } from "@shared/lib/openDocument";
import type { TutorCertificate, TutorProfileDto } from "@features/tutors/types";

const { CATEGORY, upload } = vi.hoisted(() => ({
  CATEGORY: { id: "c0000000-0000-4000-8000-000000000001", slug: "it", name: "Information Technology", sortOrder: 0, active: true },
  upload: vi.fn(),
}));

// The form's data hooks are not what is under test; the upload is, as a mock.
vi.mock("@features/categories/api/categoriesApi", () => ({
  useListCategoriesQuery: () => ({ data: [CATEGORY], isLoading: false }),
}));
vi.mock("@shared/api/mediaApi", () => ({
  useUploadMediaMutation: () => [upload],
  mediaContentUrl: (id: string) => `/api/media/${id}/content`,
}));
vi.mock("@shared/components/upload/ImageUploader", () => ({ ImageUploader: () => null }));
vi.mock("@shared/lib/openDocument", () => ({ openStoredDocument: vi.fn(async () => undefined) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const CV_SAVED = "d0000000-0000-4000-8000-000000000001";
const CV_NEW = "d0000000-0000-4000-8000-000000000002";
const PDF_MEDIA = "d0000000-0000-4000-8000-000000000003";

function profile(overrides: Partial<TutorProfileDto> = {}): TutorProfileDto {
  return {
    id: "a0000000-0000-4000-8000-000000000001",
    userId: "a0000000-0000-4000-8000-000000000002",
    firstName: "Leyla",
    lastName: "Məmmədova",
    approvalStatus: "PENDING",
    ratingCount: 0,
    expertiseCategoryIds: [CATEGORY.id],
    certificates: [],
    ...overrides,
  };
}

const AWS: TutorCertificate = {
  id: "e0000000-0000-4000-8000-000000000001",
  title: "AWS Solutions Architect",
  issuer: "Amazon Web Services",
  issuedYear: 2021,
  mediaId: PDF_MEDIA,
  fileUrl: `/api/public/media/${PDF_MEDIA}/content`,
  createdAt: "2026-11-01T10:00:00Z",
};

/** One FormField's box (label, control, message), found by its label. */
const fieldBox = (label: string) => screen.getByText(label, { selector: "label" }).parentElement as HTMLElement;

const pdf = (name = "cv.pdf") => new File(["%PDF-1.7 test"], name, { type: "application/pdf" });

/** The upload mutation's trigger: `upload(file).unwrap()` resolves to the stored media. */
function uploadsAs(...ids: string[]) {
  for (const id of ids) {
    upload.mockImplementationOnce(() => ({ unwrap: () => Promise.resolve({ id, mimeType: "application/pdf" }) }));
  }
}

function renderForm(saved: TutorProfileDto, certificateApi: { add?: ReturnType<typeof vi.fn>; remove?: ReturnType<typeof vi.fn> } = {}) {
  const onSave = vi.fn(async (body: object) => ({ ...saved, ...body }) as TutorProfileDto);
  render(
    <ExpertProfileForm
      profile={saved}
      onSave={onSave}
      onAddCertificate={certificateApi.add as never}
      onDeleteCertificate={certificateApi.remove as never}
    />,
  );
  return { onSave };
}

beforeEach(() => {
  upload.mockReset();
  vi.mocked(openStoredDocument).mockClear();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

describe("ExpertProfileForm — CV", () => {
  it("uploads a picked PDF and saves it with the profile as cvMediaId", async () => {
    const user = userEvent.setup();
    uploadsAs(CV_NEW);
    const { onSave } = renderForm(profile());

    expect(screen.getByText("No CV yet")).toBeInTheDocument();
    // Said next to the upload: where the CV goes, and when.
    expect(screen.getByText("The CV is shown on the public expert page once the profile is approved.")).toBeInTheDocument();

    const file = pdf("leyla-cv.pdf");
    await user.upload(screen.getByLabelText("CV"), file);

    expect(upload).toHaveBeenCalledWith(file);
    expect(await screen.findByText("leyla-cv.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Not on the profile until it's saved/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ cvMediaId: CV_NEW }));
  });

  it("opens the saved CV, and removes it with null on save", async () => {
    const user = userEvent.setup();
    const { onSave } = renderForm(
      profile({ approvalStatus: "APPROVED", cvMediaId: CV_SAVED, cvUrl: `/api/public/media/${CV_SAVED}/content` }),
    );

    expect(screen.getByText("PDF · Saved on the profile.")).toBeInTheDocument();
    expect(
      screen.getByText("The profile is approved, so the CV is shown on the public expert page, where visitors can download it."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open CV" }));
    expect(openStoredDocument).toHaveBeenCalledWith(CV_SAVED, "cv.pdf");

    await user.click(screen.getByRole("button", { name: "Remove CV" }));
    expect(screen.getByText("CV removed")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ cvMediaId: null }));
  });

  it("replaces the CV with a new upload", async () => {
    const user = userEvent.setup();
    uploadsAs(CV_NEW);
    const { onSave } = renderForm(profile({ cvMediaId: CV_SAVED }));

    await user.upload(screen.getByLabelText("CV"), pdf("new-cv.pdf"));
    expect(await screen.findByText("new-cv.pdf")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ cvMediaId: CV_NEW }));
  });

  it("moves the focus to the undo when the saved CV is removed", async () => {
    const user = userEvent.setup();
    renderForm(profile({ cvMediaId: CV_SAVED }));

    // The Remove button goes with the CV.
    await user.click(screen.getByRole("button", { name: "Remove CV" }));
    expect(screen.getByRole("button", { name: "Keep the saved CV" })).toHaveFocus();
  });

  it("moves the focus to the picker when a fresh upload is removed", async () => {
    const user = userEvent.setup();
    uploadsAs(CV_NEW);
    renderForm(profile());

    await user.upload(screen.getByLabelText("CV"), pdf("new-cv.pdf"));
    await screen.findByText("new-cv.pdf");
    // No saved CV to keep: the picker is the next step.
    await user.click(screen.getByRole("button", { name: "Remove CV" }));
    expect(screen.getByRole("button", { name: "Choose PDF for the CV" })).toHaveFocus();
  });

  it("keeps the focus in the field while a picked PDF uploads, then puts it on the new CV", async () => {
    let finish: (media: { id: string }) => void = () => undefined;
    upload.mockImplementationOnce(() => ({ unwrap: () => new Promise((resolve) => (finish = resolve)) }));
    renderForm(profile());

    // As in a browser: the native picker returns focus to the button that opened it, then the file arrives.
    const choose = screen.getByRole("button", { name: "Choose PDF for the CV" });
    choose.focus();
    fireEvent.change(screen.getByLabelText("CV"), { target: { files: [pdf("leyla-cv.pdf")] } });

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Uploading leyla-cv.pdf…");
    expect(status).toHaveFocus();

    finish({ id: CV_NEW });
    await waitFor(() => expect(screen.getByRole("button", { name: "Open CV" })).toHaveFocus());
  });

  it("puts the focus back on the picker when the upload fails", async () => {
    let fail: (error: unknown) => void = () => undefined;
    upload.mockImplementationOnce(() => ({ unwrap: () => new Promise((_, reject) => (fail = reject)) }));
    renderForm(profile());

    screen.getByRole("button", { name: "Choose PDF for the CV" }).focus();
    fireEvent.change(screen.getByLabelText("CV"), { target: { files: [pdf()] } });
    expect(await screen.findByRole("status")).toHaveFocus();

    fail({ status: 500, message: "Upload failed", isNormalized: true });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Upload failed"));
    // To try again from where it started.
    await waitFor(() => expect(screen.getByRole("button", { name: "Choose PDF for the CV" })).toHaveFocus());
  });

  it("turns away a file that is not a PDF before uploading it", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderForm(profile());

    await user.upload(screen.getByLabelText("CV"), new File(["png"], "photo.png", { type: "image/png" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("photo.png is not a supported document. Use PDF.");
    expect(upload).not.toHaveBeenCalled();
  });

  // The photo's field has an error line of its own, so each check is kept to one field's box.
  it.each([
    [400, "INVALID_DOCUMENT", "The CV must be a PDF"],
    // Not about the file's type: whichever media id the save carried, here only the CV's.
    [403, "MEDIA_FORBIDDEN", "That upload is someone else's"],
    [404, "MEDIA_NOT_FOUND", "That upload no longer exists"],
  ])("shows the API's refusal of the CV on the CV (%i %s), not on the photo", async (status, code, message) => {
    const user = userEvent.setup();
    uploadsAs(CV_NEW);
    const onSave = vi.fn().mockRejectedValue({ status, code, message, isNormalized: true });
    render(<ExpertProfileForm profile={profile({ avatarMediaId: "f0000000-0000-4000-8000-000000000001" })} onSave={onSave} />);

    await user.upload(screen.getByLabelText("CV"), pdf());
    await screen.findByText("cv.pdf");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(onSave).toHaveBeenCalledWith({ cvMediaId: CV_NEW });
    expect(await within(fieldBox("CV")).findByText(message, { selector: "[data-field-error]" })).toBeInTheDocument();
    expect(screen.getByLabelText("CV").parentElement).toHaveClass("border-danger");
    expect(within(fieldBox("Profile photo")).queryByText(message)).not.toBeInTheDocument();
  });
});

describe("ExpertProfileForm — certificates", () => {
  it("adds one: uploads its PDF, posts it at once, and lists it — without saving the profile", async () => {
    const user = userEvent.setup();
    uploadsAs(PDF_MEDIA);
    const add = vi.fn(async () => AWS);
    const { onSave } = renderForm(profile(), { add, remove: vi.fn() });

    expect(screen.getByText("No certificates yet.")).toBeInTheDocument();
    // An unsaved edit on the profile: a submit that leaked out of the dialog would save it.
    await user.type(screen.getByRole("textbox", { name: "Headline" }), "Lecturer");
    await user.click(screen.getByRole("button", { name: "Add certificate" }));

    const dialog = await screen.findByRole("dialog", { name: "Add certificate" });
    await user.type(within(dialog).getByRole("textbox", { name: /^Title/ }), "AWS Solutions Architect");
    await user.type(within(dialog).getByRole("textbox", { name: "Issuer" }), "Amazon Web Services");
    await user.type(within(dialog).getByRole("spinbutton", { name: "Year issued" }), "2021");
    const file = pdf("aws.pdf");
    await user.upload(within(dialog).getByLabelText(/^Certificate PDF/), file);
    expect(await within(dialog).findByText("aws.pdf")).toBeInTheDocument();

    // Enter in a field submits the dialog's own form, not the profile around it.
    await user.type(within(dialog).getByRole("textbox", { name: "Issuer" }), "{Enter}");

    await waitFor(() =>
      expect(add).toHaveBeenCalledWith({
        title: "AWS Solutions Architect",
        issuer: "Amazon Web Services",
        issuedYear: 2021,
        mediaId: PDF_MEDIA,
      }),
    );
    expect(upload).toHaveBeenCalledWith(file);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const list = screen.getByRole("list", { name: "Certificates" });
    expect(within(list).getByText("AWS Solutions Architect")).toBeInTheDocument();
    expect(within(list).getByText("Amazon Web Services · 2021")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("Certificate added");
    expect(onSave).not.toHaveBeenCalled();

    // The profile's own save carries the profile's edits, never the certificates.
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ headline: "Lecturer" }));
  });

  it("asks for the title and the PDF before uploading anything", async () => {
    const user = userEvent.setup();
    const add = vi.fn();
    renderForm(profile(), { add, remove: vi.fn() });

    await user.click(screen.getByRole("button", { name: "Add certificate" }));
    const dialog = await screen.findByRole("dialog", { name: "Add certificate" });
    await user.type(within(dialog).getByRole("spinbutton", { name: "Year issued" }), "1949");
    await user.click(within(dialog).getByRole("button", { name: "Add certificate" }));

    expect(await within(dialog).findByText("Enter the certificate's title")).toBeInTheDocument();
    expect(within(dialog).getByText("Choose the certificate's PDF")).toBeInTheDocument();
    expect(within(dialog).getByText("1950 or later")).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });

  it("says why the API refused it, keeps the dialog, and retries without a second upload", async () => {
    const user = userEvent.setup();
    uploadsAs(PDF_MEDIA);
    const add = vi
      .fn()
      .mockRejectedValueOnce({ status: 400, code: "CERTIFICATE_LIMIT", message: "At most 30 certificates", isNormalized: true })
      .mockResolvedValueOnce(AWS);
    renderForm(profile(), { add, remove: vi.fn() });

    await user.click(screen.getByRole("button", { name: "Add certificate" }));
    const dialog = await screen.findByRole("dialog", { name: "Add certificate" });
    await user.type(within(dialog).getByRole("textbox", { name: /^Title/ }), "AWS Solutions Architect");
    await user.upload(within(dialog).getByLabelText(/^Certificate PDF/), pdf("aws.pdf"));
    await within(dialog).findByText("aws.pdf");
    await user.click(within(dialog).getByRole("button", { name: "Add certificate" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("At most 30 certificates"));
    expect(screen.getByRole("dialog", { name: "Add certificate" })).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Add certificate" }));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(2));
    expect(add).toHaveBeenLastCalledWith({ title: "AWS Solutions Architect", mediaId: PDF_MEDIA });
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("deletes one after a confirm, and opens its PDF", async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => undefined);
    renderForm(profile({ certificates: [AWS] }), { add: vi.fn(), remove });

    await user.click(screen.getByRole("button", { name: "Open the PDF of AWS Solutions Architect" }));
    expect(openStoredDocument).toHaveBeenCalledWith(PDF_MEDIA, "certificate.pdf");

    await user.click(screen.getByRole("button", { name: "Delete AWS Solutions Architect" }));
    const confirm = await screen.findByRole("dialog", { name: "Delete this certificate?" });
    expect(remove).not.toHaveBeenCalled();
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith(AWS.id));
    expect(await screen.findByText("No certificates yet.")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("Certificate deleted");
    // Its row (and the button that opened the confirm) is gone: focus lands on the list's own control.
    await waitFor(() => expect(screen.getByRole("button", { name: "Add certificate" })).toHaveFocus());
  });

  it("keeps a certificate whose delete was refused, and says why", async () => {
    const user = userEvent.setup();
    const remove = vi.fn().mockRejectedValue({ status: 403, message: "Not allowed", isNormalized: true });
    renderForm(profile({ certificates: [AWS] }), { add: vi.fn(), remove });

    await user.click(screen.getByRole("button", { name: "Delete AWS Solutions Architect" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Not allowed"));
    expect(within(screen.getByRole("list", { name: "Certificates" })).getByText("AWS Solutions Architect")).toBeInTheDocument();
  });

  it("puts the focus back on Add when the dialog is cancelled", async () => {
    const user = userEvent.setup();
    renderForm(profile(), { add: vi.fn(), remove: vi.fn() });
    const add = screen.getByRole("button", { name: "Add certificate" });

    await user.click(add);
    const dialog = await screen.findByRole("dialog", { name: "Add certificate" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(add).toHaveFocus());
  });

  it("puts the focus on the list's heading when the certificate added fills the list", async () => {
    const user = userEvent.setup();
    uploadsAs(PDF_MEDIA);
    const others = Array.from({ length: 29 }, (_, i) => ({
      ...AWS,
      id: `e0000000-0000-4000-8000-1${String(i).padStart(11, "0")}`,
      title: `Certificate ${i + 1}`,
    }));
    const add = vi.fn(async () => AWS);
    renderForm(profile({ certificates: others }), { add, remove: vi.fn() });

    await user.click(screen.getByRole("button", { name: "Add certificate" }));
    const dialog = await screen.findByRole("dialog", { name: "Add certificate" });
    await user.type(within(dialog).getByRole("textbox", { name: /^Title/ }), "AWS Solutions Architect");
    await user.upload(within(dialog).getByLabelText(/^Certificate PDF/), pdf("aws.pdf"));
    await within(dialog).findByText("aws.pdf");
    await user.click(within(dialog).getByRole("button", { name: "Add certificate" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // Thirty now, so Add is disabled and can't take the focus back.
    expect(screen.getByRole("button", { name: "Add certificate" })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Certificates" })).toHaveFocus());
  });

  it("puts the focus back on the row's delete button when the confirm is cancelled or the delete refused", async () => {
    const user = userEvent.setup();
    const remove = vi.fn().mockRejectedValue({ status: 403, message: "Not allowed", isNormalized: true });
    renderForm(profile({ certificates: [AWS] }), { add: vi.fn(), remove });
    const trash = screen.getByRole("button", { name: "Delete AWS Solutions Architect" });

    await user.click(trash);
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(trash).toHaveFocus());

    await user.click(trash);
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Not allowed"));
    await waitFor(() => expect(trash).toHaveFocus());
  });

  it("keeps the earlier free-text certifications editable only on a profile that has them", () => {
    const { unmount } = render(
      <ExpertProfileForm profile={profile({ certifications: "Cisco CCNA" })} onSave={vi.fn()} />,
    );
    expect(screen.getByRole("textbox", { name: "Earlier certification notes" })).toHaveValue("Cisco CCNA");
    unmount();

    render(<ExpertProfileForm profile={profile()} onSave={vi.fn()} />);
    expect(screen.queryByRole("textbox", { name: "Earlier certification notes" })).not.toBeInTheDocument();
  });
});
