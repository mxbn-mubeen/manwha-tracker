export type NotificationType = 'new_chapter' | 'source_error' | 'sync_complete';

export interface Notification {
  id: number;
  manhwaId: number | null;
  chapterId: number | null;
  type: NotificationType;
  message: string;
  sentAt: Date;
  isRead: boolean;
}

export type InsertNotification = Omit<Notification, 'id'>;
