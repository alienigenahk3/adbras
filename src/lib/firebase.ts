import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { setLogLevel } from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject,
  listAll
} from 'firebase/storage';
import { ChurchSettings, ChurchEvent, WeeklyProgramItem, Member, Department, PrayerRequest } from '../types';
import { toSafeDate, validateTimeRangeString } from './utils';

// Web client Firebase configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDBSaRDiR7DFY-ieJ7G7O4Y2HT4MNYHHVo",
  authDomain: "gen-lang-client-0163736003.firebaseapp.com",
  projectId: "gen-lang-client-0163736003",
  storageBucket: "gen-lang-client-0163736003.firebasestorage.app",
  messagingSenderId: "346955543209",
  appId: "1:346955543209:web:6df0175e23f1cfe78aafb8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore using the specific database ID from the provisioned config
export const db = getFirestore(app, "ai-studio-agendadaigreja-9ca41ec8-3857-48ce-b0eb-eb813e0cb099");
export const storage = getStorage(app);
setLogLevel('silent');

// Helper to recursively remove undefined properties from an object so Firestore doesn't reject them
export function sanitizeData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (obj instanceof Date) {
    return obj as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeData(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          sanitized[key] = sanitizeData(val);
        }
      }
    }
    return sanitized as T;
  }
  return obj;
}

export interface DeptMessage {
  id: string;
  departmentId: string;
  senderName: string;
  senderUsername: string;
  text: string;
  date: string;
  expiresAt?: string;
}

// 1. Church Settings Helpers
export async function fetchChurchSettingsFromDb(): Promise<ChurchSettings | null> {
  try {
    const docRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as ChurchSettings;
    }
  } catch (error) {
    console.error("Error fetching church settings from Firestore:", error);
  }
  return null;
}

export async function saveChurchSettingsToDb(settings: ChurchSettings): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'global');
    const data: any = { ...settings };
    if (!data.logoUrl) {
      delete data.logoUrl;
    }
    await setDoc(docRef, sanitizeData(data), { merge: true });
  } catch (error) {
    console.error("Error saving church settings to Firestore:", error);
  }
}

// 2. Events Helpers
export async function fetchEventsFromDb(): Promise<ChurchEvent[] | null> {
  try {
    const querySnapshot = await getDocs(collection(db, 'events'));
    const events: ChurchEvent[] = [];
    const invalidDocIdsToDelete: string[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const startTime = data.startTime;
      const endTime = data.endTime;

      if (startTime && endTime) {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;
        if (endMin <= startMin) {
          console.warn(`[CLEANUP] Found invalid event "${data.title}" (${docSnap.id}) with startTime: ${startTime}, endTime: ${endTime}. Enqueuing for deletion.`);
          invalidDocIdsToDelete.push(docSnap.id);
          return;
        }
      }

      events.push({
        ...data,
        id: docSnap.id,
        date: toSafeDate(data.date),
        recurrenceEndDate: data.recurrenceEndDate ? toSafeDate(data.recurrenceEndDate) : undefined,
      } as ChurchEvent);
    });

    if (invalidDocIdsToDelete.length > 0) {
      for (const id of invalidDocIdsToDelete) {
        try {
          await deleteDoc(doc(db, 'events', id));
          console.log(`[CLEANUP] Successfully cleaned up invalid database event ID: ${id}`);
        } catch (delErr) {
          console.error(`[CLEANUP] Failed to delete invalid database event ID: ${id}`, delErr);
        }
      }
    }

    return events;
  } catch (error) {
    console.error("Error fetching events from Firestore:", error);
  }
  return null;
}

export async function saveEventToDb(event: ChurchEvent): Promise<void> {
  if (event.startTime && event.endTime) {
    const [startH, startM] = event.startTime.split(':').map(Number);
    const [endH, endM] = event.endTime.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    if (endMin <= startMin) {
      const errMsg = `[VALIDATION] Rejeitado: O horário de término (${event.endTime}) deve ser posterior ao horário de início (${event.startTime}) para o evento "${event.title}".`;
      console.error(errMsg);
      throw new Error(errMsg);
    }
  }

  try {
    const docRef = doc(db, 'events', event.id);
    const data: any = {
      ...event,
      date: event.date instanceof Date ? event.date.toISOString() : event.date,
      recurrenceEndDate: event.recurrenceEndDate instanceof Date ? event.recurrenceEndDate.toISOString() : (event.recurrenceEndDate || null),
    };
    if (!data.bannerUrl) {
      delete data.bannerUrl;
    }
    await setDoc(docRef, sanitizeData(data));
  } catch (error) {
    console.error("Error saving event to Firestore:", error);
    throw error;
  }
}

export async function deleteEventFromDb(eventId: string): Promise<void> {
  try {
    console.log(`[DELETE_EVENT] Requesting deletion of event ID: ${eventId} from Firestore.`);
    await deleteDoc(doc(db, 'events', eventId));
    console.log(`[DELETE_EVENT] Deletion command completed for event ID: ${eventId}. Running follow-up verification.`);
    
    // Follow-up verification to confirm removal from source of truth (Firestore server)
    try {
      const docSnap = await getDocFromServer(doc(db, 'events', eventId));
      if (docSnap.exists()) {
        console.warn(`[DELETE_EVENT] Verification WARNING: Event ${eventId} still exists on the server!`);
      } else {
        console.log(`[DELETE_EVENT] Verification SUCCESS: Event ${eventId} was successfully removed from the source of truth (Firestore server).`);
      }
    } catch (verifError) {
      console.error(`[DELETE_EVENT] Verification error during delete confirmation for ${eventId}:`, verifError);
    }
  } catch (error) {
    console.error("Error deleting event from Firestore:", error);
  }
}



// 3. Weekly Programs Helpers
export async function fetchWeeklyProgramsFromDb(): Promise<WeeklyProgramItem[] | null> {
  try {
    const querySnapshot = await getDocs(collection(db, 'weekly_programs'));
    const items: WeeklyProgramItem[] = [];
    const invalidDocIdsToDelete: string[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const time = data.time;
      if (time) {
        const validation = validateTimeRangeString(time);
        if (!validation.isValid) {
          console.warn(`[CLEANUP] Found invalid weekly program "${data.title}" (${docSnap.id}) with time: ${time}. Enqueuing for deletion.`);
          invalidDocIdsToDelete.push(docSnap.id);
          return;
        }
      }

      items.push({
        ...data,
        id: docSnap.id,
      } as WeeklyProgramItem);
    });

    if (invalidDocIdsToDelete.length > 0) {
      for (const id of invalidDocIdsToDelete) {
        try {
          await deleteDoc(doc(db, 'weekly_programs', id));
          console.log(`[CLEANUP] Successfully cleaned up invalid database weekly program ID: ${id}`);
        } catch (delErr) {
          console.error(`[CLEANUP] Failed to delete invalid database weekly program ID: ${id}`, delErr);
        }
      }
    }

    return items;
  } catch (error) {
    console.error("Error fetching weekly programs from Firestore:", error);
  }
  return null;
}
export async function saveWeeklyProgramToDb(program: WeeklyProgramItem): Promise<void> {
  if (program.time) {
    const validation = validateTimeRangeString(program.time);
    if (!validation.isValid) {
      const errMsg = `[VALIDATION] Rejeitado: ${validation.error} para a atividade semanal "${program.title}".`;
      console.error(errMsg);
      throw new Error(errMsg);
    }
  }

  try {
    const data: any = { ...program };
    if (!data.bannerUrl) {
      delete data.bannerUrl;
    }
    await setDoc(doc(db, 'weekly_programs', program.id), sanitizeData(data));
  } catch (error) {
    console.error("Error saving weekly program to Firestore:", error);
    throw error;
  }
}
export async function deleteWeeklyProgramFromDb(programId: string): Promise<void> {
  try {
    console.log(`[DELETE_PROGRAM] Requesting deletion of weekly program ID: ${programId} from Firestore.`);
    await deleteDoc(doc(db, 'weekly_programs', programId));
    console.log(`[DELETE_PROGRAM] Deletion command completed for weekly program ID: ${programId}. Running follow-up verification.`);
    
    // Follow-up verification to confirm removal from source of truth (Firestore server)
    try {
      const docSnap = await getDocFromServer(doc(db, 'weekly_programs', programId));
      if (docSnap.exists()) {
        console.warn(`[DELETE_PROGRAM] Verification WARNING: Weekly program ${programId} still exists on the server!`);
      } else {
        console.log(`[DELETE_PROGRAM] Verification SUCCESS: Weekly program ${programId} was successfully removed from the source of truth (Firestore server).`);
      }
    } catch (verifError) {
      console.error(`[DELETE_PROGRAM] Verification error during delete confirmation for ${programId}:`, verifError);
    }
  } catch (error) {
    console.error("Error deleting weekly program from Firestore:", error);
  }
}

// 4. Members Helpers
export async function fetchMembersFromDb(): Promise<Member[] | null> {
  try {
    const querySnapshot = await getDocs(collection(db, 'members'));
    const items: Member[] = [];
    querySnapshot.forEach((doc) => {
      items.push({
        ...doc.data(),
        id: doc.id,
      } as Member);
    });
    return items;
  } catch (error) {
    console.error("Error fetching members from Firestore:", error);
  }
  return null;
}
export async function saveMemberToDb(member: Member): Promise<void> {
  try {
    await setDoc(doc(db, 'members', member.id), sanitizeData(member));
  } catch (error) {
    console.error("Error saving member to Firestore:", error);
  }
}
export async function deleteMemberFromDb(memberId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'members', memberId));
  } catch (error) {
    console.error("Error deleting member from Firestore:", error);
  }
}

// 5. Departments Helpers
export async function fetchDepartmentsFromDb(): Promise<Department[] | null> {
  try {
    const querySnapshot = await getDocs(collection(db, 'departments'));
    const items: Department[] = [];
    querySnapshot.forEach((doc) => {
      items.push({
        ...doc.data(),
        id: doc.id,
      } as Department);
    });
    return items;
  } catch (error) {
    console.error("Error fetching departments from Firestore:", error);
  }
  return null;
}
export async function saveDepartmentToDb(dept: Department): Promise<void> {
  try {
    await setDoc(doc(db, 'departments', dept.id), sanitizeData(dept));
  } catch (error) {
    console.error("Error saving department to Firestore:", error);
  }
}
export async function deleteDepartmentFromDb(deptId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'departments', deptId));
  } catch (error) {
    console.error("Error deleting department from Firestore:", error);
  }
}

// 6. Prayer Requests Helpers
export async function fetchPrayerRequestsFromDb(): Promise<PrayerRequest[] | null> {
  try {
    const querySnapshot = await getDocs(collection(db, 'prayer_requests'));
    const items: PrayerRequest[] = [];
    querySnapshot.forEach((doc) => {
      items.push({
        ...doc.data(),
        id: doc.id,
      } as PrayerRequest);
    });
    return items;
  } catch (error) {
    console.error("Error fetching prayer requests from Firestore:", error);
  }
  return null;
}
export async function savePrayerRequestToDb(request: PrayerRequest): Promise<void> {
  try {
    await setDoc(doc(db, 'prayer_requests', request.id), sanitizeData(request));
  } catch (error) {
    console.error("Error saving prayer request to Firestore:", error);
  }
}
export async function deletePrayerRequestFromDb(requestId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'prayer_requests', requestId));
  } catch (error) {
    console.error("Error deleting prayer request from Firestore:", error);
  }
}

// 7. Department Messages Helpers
export async function fetchDeptMessagesFromDb(): Promise<DeptMessage[] | null> {
  try {
    const querySnapshot = await getDocs(collection(db, 'dept_messages'));
    const items: DeptMessage[] = [];
    querySnapshot.forEach((doc) => {
      items.push({
        ...doc.data(),
        id: doc.id,
      } as DeptMessage);
    });
    return items;
  } catch (error) {
    console.error("Error fetching department messages from Firestore:", error);
  }
  return null;
}
export async function saveDeptMessageToDb(msg: DeptMessage): Promise<void> {
  try {
    await setDoc(doc(db, 'dept_messages', msg.id), sanitizeData(msg));
  } catch (error) {
    console.error("Error saving department message to Firestore:", error);
  }
}
export async function deleteDeptMessageFromDb(msgId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'dept_messages', msgId));
  } catch (error) {
    console.error("Error deleting department message from Firestore:", error);
  }
}
export async function clearAllDeptMessagesFromDb(departmentId: string): Promise<void> {
  try {
    const querySnapshot = await getDocs(collection(db, 'dept_messages'));
    const batch = writeBatch(db);
    let count = 0;
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const departmentIds = data.departmentIds || (data.departmentId ? [data.departmentId] : []);
      if (departmentIds.includes(departmentId)) {
        batch.delete(doc(db, 'dept_messages', docSnap.id));
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error("Error clearing department messages from Firestore:", error);
  }
}

export async function clearAllEventsFromDb(): Promise<void> {
  try {
    const querySnapshot = await getDocs(collection(db, 'events'));
    const batch = writeBatch(db);
    let count = 0;
    querySnapshot.forEach((docSnap) => {
      batch.delete(doc(db, 'events', docSnap.id));
      count++;
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error("Error clearing all events from Firestore:", error);
  }
}

export async function clearAllWeeklyProgramsFromDb(): Promise<void> {
  try {
    const querySnapshot = await getDocs(collection(db, 'weekly_programs'));
    const batch = writeBatch(db);
    let count = 0;
    querySnapshot.forEach((docSnap) => {
      batch.delete(doc(db, 'weekly_programs', docSnap.id));
      count++;
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error("Error clearing all weekly programs from Firestore:", error);
  }
}

export async function resetAllAppDataInDb(): Promise<void> {
  try {
    await clearAllEventsFromDb();
    await clearAllWeeklyProgramsFromDb();

    // Clear uploaded images
    const imgSnap = await getDocs(collection(db, 'uploaded_images'));
    const imgBatch = writeBatch(db);
    let imgCount = 0;
    imgSnap.forEach((docSnap) => {
      imgBatch.delete(doc(db, 'uploaded_images', docSnap.id));
      imgCount++;
    });
    if (imgCount > 0) {
      await imgBatch.commit();
    }

    // Clear local storage completely for church keys
    try {
      localStorage.removeItem('church_events');
      localStorage.removeItem('church_weekly_programs');
      localStorage.removeItem('church_uploaded_images');
      localStorage.removeItem('church_deleted_images');
    } catch (e) {}

  } catch (error) {
    console.error("Error resetting all app data:", error);
  }
}


function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) {
    return false;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  return true;
}

async function smartSyncCollection(collectionName: string, items: any[], sanitizeAndFormat: (item: any) => any) {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const existingItems = new Map<string, any>();
    querySnapshot.forEach((doc) => existingItems.set(doc.id, doc.data()));

    const batch = writeBatch(db);
    let writes = 0;
    const currentIds = new Set(items.map(e => e.id));

    existingItems.forEach((data, id) => {
      if (!currentIds.has(id)) {
        batch.delete(doc(db, collectionName, id));
        writes++;
        console.log(`Deleting from ${collectionName}:`, id);
      }
    });

    items.forEach((item) => {
      if (!item.id) return;
      const docRef = doc(db, collectionName, item.id);
      const formattedData = sanitizeAndFormat(item);
      const sanitizedData = sanitizeData(formattedData);
      
      const existing = existingItems.get(item.id);
      if (!existing || !deepEqual(existing, sanitizedData)) {
        batch.set(docRef, sanitizedData);
        writes++;
        console.log(`Writing to ${collectionName}:`, item.id);
      }
    });

    if (writes > 0 && writes <= 500) {
      await batch.commit();
    } else if (writes > 500) {
      console.warn(`Too many writes (${writes}) for collection ${collectionName} in a single batch.`);
    }
  } catch (error: any) {
    if (error.code === 'resource-exhausted') {
      console.warn(`Firestore quota exceeded for ${collectionName}, skipping sync:`, error.message);
    } else {
      console.error(`Error bulk syncing ${collectionName} to Firestore:`, error);
    }
  }
}

export async function syncAllEventsToDb(events: ChurchEvent[]): Promise<void> {
  for (const event of events) {
    if (event.startTime && event.endTime) {
      const [startH, startM] = event.startTime.split(':').map(Number);
      const [endH, endM] = event.endTime.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      if (endMin <= startMin) {
        const errMsg = `[VALIDATION] Sincronização cancelada: O evento "${event.title}" tem horário de término (${event.endTime}) menor ou igual ao horário de início (${event.startTime}).`;
        console.error(errMsg);
        throw new Error(errMsg);
      }
    }
  }

  return smartSyncCollection('events', events, (event) => {
    const data: any = {
      ...event,
      date: event.date instanceof Date ? event.date.toISOString() : event.date,
      recurrenceEndDate: event.recurrenceEndDate instanceof Date ? event.recurrenceEndDate.toISOString() : (event.recurrenceEndDate || null),
    };
    if (!data.bannerUrl) {
      delete data.bannerUrl;
    }
    return data;
  });
}

export async function syncAllWeeklyProgramsToDb(items: WeeklyProgramItem[]): Promise<void> {
  return smartSyncCollection('weekly_programs', items, (item) => {
    const data: any = { ...item };
    if (!data.bannerUrl) {
      delete data.bannerUrl;
    }
    return data;
  });
}

export async function syncAllMembersToDb(items: Member[]): Promise<void> {
  return smartSyncCollection('members', items, (item) => item);
}

export async function syncAllDepartmentsToDb(items: Department[]): Promise<void> {
  return smartSyncCollection('departments', items, (item) => item);
}

export async function syncAllPrayerRequestsToDb(items: PrayerRequest[]): Promise<void> {
  return smartSyncCollection('prayer_requests', items, (item) => item);
}

export async function syncAllDeptMessagesToDb(items: DeptMessage[]): Promise<void> {
  return smartSyncCollection('dept_messages', items, (item) => item);
}
// 8. Storage Helpers (Firestore + localStorage based gallery)
export async function uploadImage(fileData: string, fileName: string): Promise<string> {
  try {
    let deletedUrls: string[] = [];
    try {
      deletedUrls = JSON.parse(localStorage.getItem('church_deleted_images') || '[]');
    } catch (e) {}

    // Remove from deleted blacklist if user is uploading or re-using this image
    const newDeleted = deletedUrls.filter((u: string) => u !== fileData);
    try {
      localStorage.setItem('church_deleted_images', JSON.stringify(newDeleted));
    } catch (e) {}

    try {
      const querySnapshot = await getDocs(collection(db, 'uploaded_images'));
      let exists = false;
      querySnapshot.forEach((docSnap) => {
        if (docSnap.data().url === fileData) {
          exists = true;
        }
      });
      if (exists) {
        return fileData;
      }
    } catch (e) {}

    const imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const imageData = {
      id: imageId,
      name: fileName || 'Imagem',
      url: fileData,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'uploaded_images', imageId), sanitizeData(imageData));
    
    try {
      const existing = JSON.parse(localStorage.getItem('church_uploaded_images') || '[]');
      if (!existing.some((img: any) => img.url === fileData)) {
        existing.unshift(imageData);
        localStorage.setItem('church_uploaded_images', JSON.stringify(existing.slice(0, 50)));
      }
    } catch (e) {}

    return fileData;
  } catch (error) {
    console.error("Error uploading image:", error);
    return fileData;
  }
}

export async function deleteImage(url: string): Promise<void> {
  try {
    // Add to deleted blacklist immediately
    try {
      const deletedUrls = JSON.parse(localStorage.getItem('church_deleted_images') || '[]');
      if (!deletedUrls.includes(url)) {
        deletedUrls.push(url);
        localStorage.setItem('church_deleted_images', JSON.stringify(deletedUrls));
      }
      
      const existing = JSON.parse(localStorage.getItem('church_uploaded_images') || '[]');
      const filtered = existing.filter((img: any) => img.url !== url);
      localStorage.setItem('church_uploaded_images', JSON.stringify(filtered));
    } catch (e) {}

    // Delete from uploaded_images collection
    const querySnapshot = await getDocs(collection(db, 'uploaded_images'));
    const deletePromises: Promise<void>[] = [];
    querySnapshot.forEach((document) => {
      const data = document.data();
      if (data.url === url) {
        deletePromises.push(deleteDoc(doc(db, 'uploaded_images', document.id)));
      }
    });
    await Promise.all(deletePromises);

    // Also remove bannerUrl from events where bannerUrl === url
    try {
      const eventsSnap = await getDocs(collection(db, 'events'));
      const eventBatch = writeBatch(db);
      let eventWrites = 0;
      eventsSnap.forEach((docSnap) => {
        const evData = docSnap.data();
        if (evData.bannerUrl === url) {
          eventBatch.update(doc(db, 'events', docSnap.id), { bannerUrl: null });
          eventWrites++;
        }
      });
      if (eventWrites > 0) {
        await eventBatch.commit();
      }
    } catch (e) {
      console.error("Error cleaning event banners for deleted image:", e);
    }

    // Also remove bannerUrl from weekly programs where bannerUrl === url
    try {
      const progSnap = await getDocs(collection(db, 'weekly_programs'));
      const progBatch = writeBatch(db);
      let progWrites = 0;
      progSnap.forEach((docSnap) => {
        const pData = docSnap.data();
        if (pData.bannerUrl === url) {
          progBatch.update(doc(db, 'weekly_programs', docSnap.id), { bannerUrl: null });
          progWrites++;
        }
      });
      if (progWrites > 0) {
        await progBatch.commit();
      }
    } catch (e) {
      console.error("Error cleaning weekly program banners for deleted image:", e);
    }

    // Also remove logoUrl from settings if it matches
    try {
      const settingsRef = doc(db, 'settings', 'global');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const sData = settingsSnap.data();
        if (sData.logoUrl === url) {
          await setDoc(settingsRef, { logoUrl: null }, { merge: true });
        }
      }
    } catch (e) {
      console.error("Error cleaning church settings logo for deleted image:", e);
    }

  } catch (error) {
    console.error("Error deleting image:", error);
  }
}

export async function listImages(): Promise<{ id: string, name: string, url: string }[]> {
  let deletedUrls: string[] = [];
  try {
    deletedUrls = JSON.parse(localStorage.getItem('church_deleted_images') || '[]');
  } catch (e) {}

  try {
    const querySnapshot = await getDocs(collection(db, 'uploaded_images'));
    const imagesMap = new Map<string, { id: string, name: string, url: string }>();
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.url && !deletedUrls.includes(data.url)) {
        imagesMap.set(data.url, {
          id: data.id || docSnap.id,
          name: data.name || 'Imagem',
          url: data.url
        });
      }
    });

    const images = Array.from(imagesMap.values());

    // Synchronize localStorage with Firestore state (excluding deleted ones)
    try {
      localStorage.setItem('church_uploaded_images', JSON.stringify(images.map(img => ({ id: img.id, name: img.name, url: img.url, createdAt: new Date().toISOString() }))));
    } catch (e) {}

    return images;
  } catch (error) {
    console.error("Error listing images from Firestore, trying localStorage:", error);
    try {
      const local = JSON.parse(localStorage.getItem('church_uploaded_images') || '[]');
      const imagesMap = new Map<string, { id: string, name: string, url: string }>();
      for (const item of local) {
        if (item.url && !deletedUrls.includes(item.url)) {
          imagesMap.set(item.url, {
            id: item.id || ('local_' + Math.random().toString(36).substr(2, 9)),
            name: item.name || 'Imagem',
            url: item.url
          });
        }
      }
      return Array.from(imagesMap.values());
    } catch (e) {
      return [];
    }
  }
}

