/** Stable query keys for `public/field-guide.html?p=…` — keep in sync with templates there. */
const PROJECT_ID_TO_FIELD_GUIDE_SLUG: Record<string, string> = {
  "proj-holycow": "holycow",
  "proj-shushu": "shushu",
  "proj-cum": "cum",
  "proj-cea-aztech": "cea",
  "proj-assetd-plafond": "assetd",
};

export function fieldGuideSlugForProjectId(projectId: string): string {
  return PROJECT_ID_TO_FIELD_GUIDE_SLUG[projectId] ?? projectId.replace(/^proj-/, "");
}

export function fieldGuideHtmlPath(slug: string): string {
  return `/field-guide.html?p=${encodeURIComponent(slug)}`;
}

/** Short labels for the field-guide top bar switcher. */
export const FIELD_GUIDE_TOPBAR_LABEL: Record<string, string> = {
  holycow: "Holycow",
  shushu: "Shushu",
  cum: "Cipta Usaha Media",
  cea: "Cahaya Energi Asia",
  assetd: "Maju (#4)",
};
