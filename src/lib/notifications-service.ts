
import { Firestore, collection, addDoc } from 'firebase/firestore';

export type NotificationType = 'expense' | 'member' | 'reminder' | 'system';

export function createNotification(
  db: Firestore | null,
  ownerId: string,
  message: string,
  type: NotificationType,
  details: string = "",
  createdBy: string = "",
  createdByName: string = ""
) {
  if (!db || !ownerId) return;

  const notificationData = {
    message,
    details,
    type,
    timestamp: Date.now(),
    ownerId,
    readBy: [],
    hiddenBy: [],
    createdBy,
    createdByName,
  };

  addDoc(collection(db, 'notifications'), notificationData)
    .catch((err) => console.error('Failed to create notification', err));
}
