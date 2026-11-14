"use client";

import {
  createInspectionAction,
  submitExecutionAction,
  assignCaseAction,
  approveTaskAction,
  reassignTaskAction,
  closeCaseEntirelyAction,
  changePinAction,
} from "@/app/actions/capa";
import {
  submitFormResponseAction,
  curateAndAssignResponseAction,
  submitDynamicResponseExecutionAction,
} from "@/app/actions/dynamic-forms";

export interface OfflineQueueItem {
  id: string;
  type:
    | "INSPECTION"
    | "EXECUTION"
    | "DECISION_APPROVE"
    | "DECISION_REASSIGN"
    | "DECISION_CLOSE"
    | "ASSIGNMENT"
    | "CHANGE_PIN"
    | "DYNAMIC_FORM_RESPONSE"
    | "CURATED_ASSIGNMENT"
    | "DYNAMIC_FORM_EXECUTION";
  title: string;
  timestamp: string;
  payload: any;
  status: "pending" | "syncing" | "failed";
  error?: string;
}

const STORAGE_KEY = "marasim_offline_queue_v2";
const LISTENERS: Array<(queue: OfflineQueueItem[]) => void> = [];

export function getOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read offline queue", e);
    return [];
  }
}

function saveQueue(queue: OfflineQueueItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    LISTENERS.forEach((fn) => fn(queue));
  } catch (e) {
    console.error("Failed to save offline queue", e);
  }
}

export function subscribeToQueue(fn: (queue: OfflineQueueItem[]) => void) {
  LISTENERS.push(fn);
  return () => {
    const idx = LISTENERS.indexOf(fn);
    if (idx !== -1) LISTENERS.splice(idx, 1);
  };
}

export function addToOfflineQueue(
  type: OfflineQueueItem["type"],
  title: string,
  payload: any
): OfflineQueueItem {
  const queue = getOfflineQueue();
  const newItem: OfflineQueueItem = {
    id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    title,
    timestamp: new Date().toLocaleTimeString("ar-YE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    payload,
    status: "pending",
  };

  queue.unshift(newItem);
  saveQueue(queue);
  return newItem;
}

export function removeFromOfflineQueue(id: string) {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  saveQueue(queue);
}

export function clearOfflineQueue() {
  saveQueue([]);
}

export async function processSingleQueueItem(
  item: OfflineQueueItem
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (item.type) {
      case "DYNAMIC_FORM_RESPONSE": {
        const res = await submitFormResponseAction(item.payload);
        return res;
      }
      case "CURATED_ASSIGNMENT": {
        const res = await curateAndAssignResponseAction(item.payload);
        return res;
      }
      case "DYNAMIC_FORM_EXECUTION": {
        const res = await submitDynamicResponseExecutionAction(item.payload);
        return res;
      }
      case "INSPECTION": {
        const res = await createInspectionAction(item.payload);
        return res;
      }
      case "EXECUTION": {
        const res = await submitExecutionAction(
          item.payload.caseId,
          item.payload.asgId,
          item.payload.actionTaken,
          item.payload.notes
        );
        return res;
      }
      case "DECISION_APPROVE": {
        const res = await approveTaskAction(item.payload.asgId, item.payload.notes);
        return res;
      }
      case "DECISION_REASSIGN": {
        const res = await reassignTaskAction(
          item.payload.caseId,
          item.payload.targetDepts,
          item.payload.reassignNotes
        );
        return res;
      }
      case "DECISION_CLOSE": {
        const res = await closeCaseEntirelyAction(item.payload.caseId, item.payload.closureNotes);
        return res;
      }
      case "ASSIGNMENT": {
        const res = await assignCaseAction(
          item.payload.caseId,
          item.payload.targetDepts,
          item.payload.instructions
        );
        return res;
      }
      case "CHANGE_PIN": {
        const res = await changePinAction(item.payload.currentPin, item.payload.newPin);
        return res;
      }
      default:
        return { success: false, error: "نوع العملية غير معروف" };
    }
  } catch (err: any) {
    const isFetchErr = err?.message?.includes("fetch") || err?.toString()?.includes("fetch");
    return { 
      success: false, 
      error: isFetchErr ? "تعذر الاتصال بالخادم أو قاعدة البيانات (الجهاز غير متصل أو السيرفر غير متاح)" : (err.message || "حدث خطأ أثناء المزامنة") 
    };
  }
}

export async function syncAllOfflineQueue(
  onProgress?: (syncedCount: number, totalCount: number) => void
): Promise<{ successCount: number; failureCount: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { successCount: 0, failureCount: 0 };

  let successCount = 0;
  let failureCount = 0;
  const remainingQueue: OfflineQueueItem[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    item.status = "syncing";
    saveQueue(queue);

    const result = await processSingleQueueItem(item);
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
      item.status = "failed";
      item.error = result.error || "تعذر الإرسال";
      remainingQueue.push(item);
    }

    if (onProgress) {
      onProgress(successCount + failureCount, queue.length);
    }
  }

  saveQueue(remainingQueue);
  return { successCount, failureCount };
}

// Background Auto-Sync setup when browser comes online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("🌐 Connection restored! Auto-syncing pending offline items...");
    syncAllOfflineQueue().then(({ successCount }) => {
      if (successCount > 0) {
        window.dispatchEvent(
          new CustomEvent("marasim_notification", {
            detail: {
              type: "success",
              title: "تمت المزامنة بنجاح 🚀",
              message: `تم ترحيل (${successCount}) عملية محفوظة في وضع عدم الاتصال إلى الخادم تلقائياً.`,
            },
          })
        );
      }
    });
  });
}

// ==========================================
// INDEXEDDB DRAFTS ENGINE FOR DYNAMIC FORMS
// ==========================================

const DRAFT_DB_NAME = "marasim_capa_drafts_v1";
const DRAFT_STORE_NAME = "form_drafts";

function openDraftDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB not supported"));
    }

    const request = indexedDB.open(DRAFT_DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        db.createObjectStore(DRAFT_STORE_NAME, { keyPath: "template_id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFormDraft(
  templateId: number,
  answers: Record<number, any>,
  currentStep: number,
  locationCode?: string
): Promise<void> {
  try {
    const db = await openDraftDB();
    const tx = db.transaction(DRAFT_STORE_NAME, "readwrite");
    const store = tx.objectStore(DRAFT_STORE_NAME);
    store.put({
      template_id: templateId,
      answers,
      current_step: currentStep,
      location_code: locationCode || "",
      saved_at: new Date().toISOString(),
    });
  } catch (e) {
    // Fallback to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `marasim_draft_${templateId}`,
        JSON.stringify({ answers, current_step: currentStep, location_code: locationCode, saved_at: new Date().toISOString() })
      );
    }
  }
}

export async function getFormDraft(
  templateId: number
): Promise<{ answers: Record<number, any>; current_step: number; location_code?: string; saved_at: string } | null> {
  try {
    const db = await openDraftDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DRAFT_STORE_NAME, "readonly");
      const store = tx.objectStore(DRAFT_STORE_NAME);
      const req = store.get(templateId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(`marasim_draft_${templateId}`);
      return raw ? JSON.parse(raw) : null;
    }
    return null;
  }
}

export async function clearFormDraft(templateId: number): Promise<void> {
  try {
    const db = await openDraftDB();
    const tx = db.transaction(DRAFT_STORE_NAME, "readwrite");
    tx.objectStore(DRAFT_STORE_NAME).delete(templateId);
  } catch (e) {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`marasim_draft_${templateId}`);
    }
  }
}

// ==========================================
// OFFLINE MEDIA & GPS HELPERS
// ==========================================

export async function compressImageFile(file: File, maxDimension = 1200, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(String(e.target?.result || ""));
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = String(e.target?.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function getCurrentGPS(): Promise<{ lat: number; lng: number } | null> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}
