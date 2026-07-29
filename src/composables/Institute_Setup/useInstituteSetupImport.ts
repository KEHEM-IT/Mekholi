// D:\Web\ERP\Mekholi\src\composables\Institute_Setup\useInstituteSetupImport.ts
//
// Backs Institute Setup > Institute Dashboard's EMIS import panel: parses a
// government-style EMIS workbook export (Bangla Markdown table dump or a
// raw JSON export) into SchoolDataWrapper, previews it as tabbed tables, and
// (dev only) saves it into src/assets/school/*.json via the Vite middleware
// registered in vite.config.ts (instituteSetupImportApi).
//
// That save traffic talks to fetch() directly instead of
// services/http.ts on purpose - '/__institute-setup/*' isn't part of the
// real backend (no auth, no API_BASE_URL prefix) and the middleware isn't
// even registered outside `pnpm dev`, same spirit as the dev-only fake
// login (assets/auth/dev_users.json). Never wire this into a real save flow.

import { computed, ref } from "vue";
import {
  convertMarkdownToSchoolJson,
  type SchoolDataWrapper,
  type SchoolDetails,
} from "@/assets/school/converter";

type TableTabKey = keyof Pick<
  SchoolDetails,
  | "recognition_history"
  | "mpo_info"
  | "bank_accounts"
  | "committee_members"
  | "staff_positions"
  | "former_committee_members"
  | "development_projects"
  | "committee_formation_history"
  | "committee_meetings"
  | "facilities"
  | "disasters"
  | "trainings"
  | "academic_result_tables"
  | "other_tables"
>;

export interface TableTab {
  key: TableTabKey;
  label: string;
  label_bn: string;
}

export const TABLE_TABS: TableTab[] = [
  { key: "recognition_history", label: "Recognition history", label_bn: "স্বীকৃতির ইতিহাস" },
  { key: "mpo_info", label: "MPO info", label_bn: "এমপিও তথ্য" },
  { key: "bank_accounts", label: "Bank accounts", label_bn: "ব্যাংক হিসাব" },
  { key: "committee_members", label: "Committee members", label_bn: "কমিটির সদস্য" },
  { key: "staff_positions", label: "Staff positions", label_bn: "জনবল কাঠামো" },
  {
    key: "former_committee_members",
    label: "Former committee members",
    label_bn: "সাবেক কমিটির সদস্য",
  },
  { key: "development_projects", label: "Development projects", label_bn: "উন্নয়ন প্রকল্প" },
  { key: "committee_formation_history", label: "Committee formation", label_bn: "কমিটি গঠন" },
  { key: "committee_meetings", label: "Meeting minutes", label_bn: "সভার বিবরণ" },
  { key: "facilities", label: "Facilities", label_bn: "সুবিধাদি" },
  { key: "disasters", label: "Disasters", label_bn: "দুর্যোগ" },
  { key: "trainings", label: "Trainings", label_bn: "প্রশিক্ষণ" },
  { key: "academic_result_tables", label: "Academic results", label_bn: "পরীক্ষার ফলাফল" },
  { key: "other_tables", label: "Other data", label_bn: "অন্যান্য তথ্য" },
];

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function normalizeJson(raw: unknown): SchoolDataWrapper {
  if (raw && typeof raw === "object" && "school_data" in raw) {
    return raw as SchoolDataWrapper;
  }
  const details = Array.isArray(raw) ? raw : [raw];
  return { school_data: details as SchoolDetails[] };
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsText(file);
  });
}

export function useInstituteSetupImport() {
  const parsed = ref<SchoolDataWrapper | null>(null);
  const school = computed<SchoolDetails | null>(() => parsed.value?.school_data[0] ?? null);

  const fileName = ref("");
  const fileSize = ref(0);
  const isDragging = ref(false);
  const isBusy = ref(false);
  const isSaving = ref(false);
  const errorMessage = ref("");

  const activeTab = ref<TableTabKey>(TABLE_TABS[0]!.key);

  const activeRows = computed<Record<string, unknown>[]>(() => {
    const rows = school.value?.[activeTab.value];
    return (rows ?? []) as unknown as Record<string, unknown>[];
  });

  const activeColumns = computed(() => Object.keys(activeRows.value[0] ?? {}));

  /** Flat key-value rows from the converter's `general_info` record so the
   *  page can render a summary table without manual property lists. */
  const generalInfoRows = computed<{ key: string; value: unknown }[]>(() => {
    const info = school.value?.general_info;
    if (!info) return [];
    return Object.entries(info).map(([key, value]) => ({ key, value }));
  });

  async function parseText(text: string, isJsonHint: boolean) {
    const isJson = isJsonHint || text.trim().startsWith("{");
    return isJson ? normalizeJson(JSON.parse(text)) : convertMarkdownToSchoolJson(text);
  }

  async function importFile(file: File) {
    errorMessage.value = "";
    isBusy.value = true;
    try {
      const text = await readAsText(file);
      parsed.value = await parseText(text, file.name.toLowerCase().endsWith(".json"));
      fileName.value = file.name;
      fileSize.value = file.size;
      activeTab.value = TABLE_TABS[0]!.key;
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : "Failed to parse the file.";
    } finally {
      isBusy.value = false;
    }
  }

  function onDrop(event: DragEvent) {
    isDragging.value = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) void importFile(file);
  }

  function onFileInputChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) void importFile(file);
    (event.target as HTMLInputElement).value = "";
  }

  function clear() {
    parsed.value = null;
    fileName.value = "";
    fileSize.value = 0;
    errorMessage.value = "";
  }

  // --- Save JSON -----------------------------------------------------------
  // In dev mode (pnpm dev) the Vite middleware writes the file into
  // src/assets/school/. In production (Vercel, etc.) the endpoint doesn't
  // exist, so we fall back to a browser download instead.

  function downloadJson(targetName: string) {
    if (!parsed.value) return;
    const blob = new Blob([JSON.stringify(parsed.value, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${targetName.trim()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function saveAs(targetName: string) {
    if (!parsed.value || !targetName.trim()) return;
    isSaving.value = true;
    errorMessage.value = "";
    try {
      const res = await fetch("/__institute-setup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: targetName.trim(), data: parsed.value }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        // Dev endpoint not available (production) — fall back to browser download
        downloadJson(targetName);
        return;
      }
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) throw new Error(data.message ?? "Save failed.");
    } catch (err) {
      // If fetch itself fails (network error, CORS, etc.) also fall back to download
      if (err instanceof TypeError) {
        downloadJson(targetName);
        return;
      }
      errorMessage.value = err instanceof Error ? err.message : "Failed to save the import.";
    } finally {
      isSaving.value = false;
    }
  }

  return {
    parsed,
    school,
    fileName,
    fileSize,
    isDragging,
    isBusy,
    isSaving,
    errorMessage,
    activeTab,
    activeRows,
    activeColumns,
    generalInfoRows,
    importFile,
    onDrop,
    onFileInputChange,
    clear,
    saveAs,
  };
}
