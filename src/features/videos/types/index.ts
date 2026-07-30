export interface VideoAsset {
  id: string;
  title: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  sizeBytes: number;
  status: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  courseId?: string;
  lessonId?: string;
  uploadedAt: string;
}
