import { useDropzone, type Accept, type FileRejection } from "react-dropzone";
import { env } from "@shared/config/env";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_FORMATS_LABEL,
  DOCUMENT_OR_IMAGE_ACCEPT,
  DOCUMENT_OR_IMAGE_FORMATS_LABEL,
  validateDocumentFile,
  validateDocumentOrImageFile,
} from "@shared/components/upload/uploadConstraints";

interface Options {
  /** A file that passed the size and type check. */
  onPick: (file: File) => void;
  /** Why a dropped or chosen file was turned away, in words to show under the field. */
  onProblem: (message: string) => void;
  disabled?: boolean;
}

/** What one picker takes: the filter, the check, and the size caps it is held to. */
interface Kind {
  accept: Accept;
  check: (file: File) => string | null;
  /** The dropzone's own ceiling: the largest file any accepted type may be. */
  maxBytes: number;
  /** The cap to quote in help text: the smallest, so it never promises more than the API takes. */
  maxMb: number;
  formats: string;
}

const MB = 1024 * 1024;

/**
 * The PDF picker behind the CV and the certificate dialog: a drop target for
 * a single PDF, checked against the API's document allowlist and size cap
 * before anything is uploaded (the API refuses anything else with 400
 * INVALID_DOCUMENT, but only after the transfer).
 *
 * Clicks and keys on the zone itself do nothing: a visible button calls
 * `open()`, and the hidden input takes the field's label, so the picker is a
 * named control rather than a clickable box.
 */
export function usePdfPicker(options: Options) {
  const maxMb = env.uploads.maxDocumentMb;
  return useFilePicker(options, {
    accept: DOCUMENT_ACCEPT,
    check: (file) => validateDocumentFile(file, maxMb),
    maxBytes: maxMb * MB,
    maxMb,
    formats: `a ${DOCUMENT_FORMATS_LABEL} file`,
  });
}

/**
 * The same picker for a file that may be a PDF or an image (an award's scan or
 * photo): the API's image types and PDFs, each held to its own size cap.
 */
export function usePdfOrImagePicker(options: Options) {
  const { maxImageMb, maxDocumentMb } = env.uploads;
  return useFilePicker(options, {
    accept: DOCUMENT_OR_IMAGE_ACCEPT,
    check: (file) => validateDocumentOrImageFile(file, { maxImageMb, maxDocumentMb }),
    maxBytes: Math.max(maxImageMb, maxDocumentMb) * MB,
    maxMb: Math.min(maxImageMb, maxDocumentMb),
    formats: DOCUMENT_OR_IMAGE_FORMATS_LABEL,
  });
}

function useFilePicker({ onPick, onProblem, disabled }: Options, kind: Kind) {
  const dropzone = useDropzone({
    accept: kind.accept,
    multiple: false,
    maxSize: kind.maxBytes,
    disabled,
    noClick: true,
    noKeyboard: true,
    onDrop: (accepted) => {
      const file = accepted[0];
      if (!file) return;
      // The dropzone matches on a browser-reported type that is sometimes empty.
      const problem = kind.check(file);
      if (problem) onProblem(problem);
      else onPick(file);
    },
    // react-dropzone's own words are a raw byte count; say which files would work.
    onDropRejected: (rejections: FileRejection[]) => {
      const file = rejections[0]?.file;
      onProblem((file && kind.check(file)) ?? `Use ${kind.formats} up to ${kind.maxMb} MB.`);
    },
  });
  return { ...dropzone, maxMb: kind.maxMb };
}
