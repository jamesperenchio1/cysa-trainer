export type DomainCode = "SO" | "VM" | "IR" | "RC";

export interface ChapterMeta {
  file: string;
  index: number;
  title: string;
  domainCode: DomainCode;
}

export const DOMAIN_NAMES: Record<DomainCode, string> = {
  SO: "Security Operations",
  VM: "Vulnerability Management",
  IR: "Incident Response",
  RC: "Reporting & Communication",
};

export const CHAPTERS: ChapterMeta[] = [
  { file: "c001.xhtml", index: 1, title: "Today's Cybersecurity Analyst", domainCode: "SO" },
  { file: "c002.xhtml", index: 2, title: "System and Network Architecture", domainCode: "SO" },
  { file: "c003.xhtml", index: 3, title: "Malicious Activity", domainCode: "SO" },
  { file: "c004.xhtml", index: 4, title: "Threat Intelligence", domainCode: "SO" },
  { file: "c005.xhtml", index: 5, title: "Reconnaissance and Intelligence Gathering", domainCode: "SO" },
  { file: "c006.xhtml", index: 6, title: "Designing a Vulnerability Management Program", domainCode: "VM" },
  { file: "c007.xhtml", index: 7, title: "Analyzing Vulnerability Scans", domainCode: "VM" },
  { file: "c008.xhtml", index: 8, title: "Managing Risk", domainCode: "VM" },
  { file: "c009.xhtml", index: 9, title: "Building an Incident Response Program", domainCode: "IR" },
  { file: "c010.xhtml", index: 10, title: "Evidence and Analysis", domainCode: "IR" },
  { file: "c011.xhtml", index: 11, title: "Containment, Eradication, and Recovery", domainCode: "IR" },
  { file: "c012.xhtml", index: 12, title: "Reporting and Communication", domainCode: "RC" },
];

export function normalizeChapterKey(href: string): string {
  return (href || "").split("#")[0].split("/").pop() || "";
}

export function chaptersForMaterial(key: string, name: string): ChapterMeta[] | null {
  const haystack = `${key} ${name}`.toLowerCase().replace(/[-_]+/g, " ");
  if (haystack.includes("study guide")) return CHAPTERS;
  return null;
}
