export interface VideoAsset {
  id: number;
  title: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  sizeBytes: number;
  status: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  courseId?: number;
  lessonId?: number;
  uploadedAt: string;
}
