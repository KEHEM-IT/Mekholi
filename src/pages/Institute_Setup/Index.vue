<!-- D:\Web\ERP\Mekholi\src\pages\Institute_Setup\Index.vue -->
<template>
  <section class="institute-setup">
    <h1>Institute Setup</h1>
    <p>This is the Institute Setup page.</p>

    <!-- File Upload Section -->
    <div class="upload-section" style="margin: 24px 0">
      <label
        for="file-upload"
        style="display: block; font-weight: bold; margin-bottom: 8px; cursor: pointer"
      >
        Upload School Info File (.md, .txt, .json):
      </label>
      <input
        id="file-upload"
        type="file"
        accept=".md,.txt,.json"
        @change="handleFileUpload"
        style="
          padding: 8px;
          background: #1e293b;
          color: #f8fafc;
          border: 1px solid #334155;
          border-radius: 6px;
        "
      />
    </div>

    <!-- Error Display -->
    <div v-if="errorMessage" style="color: #ef4444; margin-bottom: 16px; font-weight: 500">
      {{ errorMessage }}
    </div>

    <!-- Raw JSON Return Display -->
    <div v-if="returnedJson" class="json-display-section" style="margin-top: 24px">
      <h2 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px; color: #818cf8">
        Returned JSON:
      </h2>
      <pre
        style="
          background: #020617;
          color: #10b981;
          padding: 16px;
          border: 1px solid #1e293b;
          border-radius: 8px;
          overflow: auto;
          max-height: 500px;
          font-family: monospace;
          font-size: 0.85rem;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-all;
        "
        >{{ returnedJson }}</pre
      >
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { convertMarkdownToSchoolJson } from "../../assets/school/converter";

// Explicit multi-word component name to satisfy linter
defineOptions({ name: "InstituteSetup" });

const returnedJson = ref<string>("");
const errorMessage = ref<string>("");

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  errorMessage.value = "";
  returnedJson.value = "";

  const reader = new FileReader();

  reader.onload = (e) => {
    const text = e.target?.result as string;
    try {
      let resultObj: any;

      // Check if file is a JSON file
      if (file.name.endsWith(".json") || text.trim().startsWith("{")) {
        resultObj = JSON.parse(text);

        // Normalize: if the JSON is just the raw school object, wrap it
        if (resultObj && !resultObj.school_data) {
          if (Array.isArray(resultObj)) {
            resultObj = { school_data: resultObj };
          } else if (resultObj.institute_name_en || resultObj.institute_name_bn) {
            resultObj = { school_data: [resultObj] };
          } else {
            resultObj = { school_data: [resultObj] };
          }
        }
      } else {
        // Parse Markdown or Text
        resultObj = convertMarkdownToSchoolJson(text);
      }

      // Return pretty-formatted raw JSON string as expected
      returnedJson.value = JSON.stringify(resultObj, null, 2);
    } catch (err: any) {
      console.error(err);
      errorMessage.value = "Failed to parse file: " + err.message;
    }
  };

  reader.onerror = () => {
    errorMessage.value = "FileReader encountered an error reading the file.";
  };

  reader.readAsText(file);
};
</script>

<style scoped lang="scss">
.institute-setup {
  padding: 1.5rem;

  h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  p {
    color: #94a3b8;
    font-size: 0.95rem;
  }
}
</style>
