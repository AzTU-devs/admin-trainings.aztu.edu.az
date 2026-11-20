import { useDropzone, type FileRejection } from "react-dropzone";
import { env } from "@shared/config/env";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_FORMATS_LABEL,
  validateDocumentFile,
} from "@shared/components/upload/uploadConstraints";

interface Options {
  /** A PDF that passed the size and type check. */
  onPick: (file: File) => void;
  /** Why a dropped or chosen file was turned away, in words to show under the field. */
  onProblem: (message: string) => void;
  disabled?: boolean;
}

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
export function usePdfPicker({ onPick, onProblem, disabled }: Options) {
  const maxMb = env.uploads.maxDocumentMb;
  const dropzone = useDropzone({
    accept: DOCUMENT_ACCEPT,
    multiple: false,
    maxSize: maxMb * 1024 * 1024,
    disabled,
    noClick: true,
    noKeyboard: true,
    onDrop: (accepted) => {
      const file = accepted[0];
      if (!file) return;
      // The dropzone matches on a browser-reported type that is sometimes empty.
      const problem = validateDocumentFile(file, maxMb);
      if (problem) onProblem(problem);
      else onPick(file);
    },
    // react-dropzone's own words are a raw byte count; say which files would work.
    onDropRejected: (rejections: FileRejection[]) => {
      const file = rejections[0]?.file;
      onProblem((file && validateDocumentFile(file, maxMb)) ?? `Use a ${DOCUMENT_FORMATS_LABEL} file up to ${maxMb} MB.`);
    },
  });
  return { ...dropzone, maxMb };
}
