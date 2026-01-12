export type VideoTaskStatus = "draft" | "ready" | "queued" | "publishing" | "published" | "failed";

export interface VideoTask {
  id: string;
  date: string;
  time: string;
  title: string;
  caption: string;
  hashtags: string[];
  videoUrl: string;
  autopost: boolean;
  notes?: string;
  status: VideoTaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublishResponse {
  status: "success" | "error";
  message: string;
  instagramMediaId?: string;
  publishId?: string;
}
