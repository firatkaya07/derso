/**
 * Önbellek etiketleri — org bazlı invalidasyon için tek isimlendirme.
 * İleride `cacheTag` / `revalidateTag` ile de aynı stringler kullanılabilir.
 */

export function orgTag(organizationId: string): string {
  return `org:${organizationId}`;
}

export function settingsTag(organizationId: string): string {
  return `org:${organizationId}:settings`;
}

export function fieldsTag(organizationId: string): string {
  return `org:${organizationId}:fields`;
}

export function teachersTag(organizationId: string): string {
  return `org:${organizationId}:teachers`;
}

export function subjectsTag(organizationId: string): string {
  return `org:${organizationId}:subjects`;
}

export function classesTag(organizationId: string): string {
  return `org:${organizationId}:classes`;
}

export function lessonsTag(organizationId: string): string {
  return `org:${organizationId}:lessons`;
}

export function planningTag(organizationId: string): string {
  return `org:${organizationId}:planning`;
}

/** useAsyncData cacheKey üreticileri */
export const clientCacheKeys = {
  teachers: (organizationId: string) => `client:${teachersTag(organizationId)}`,
  subjects: (organizationId: string) => `client:${subjectsTag(organizationId)}`,
  classes: (organizationId: string) => `client:${classesTag(organizationId)}`,
  planning: (organizationId: string) => `client:${planningTag(organizationId)}`,
  lessons: (organizationId: string) => `client:${lessonsTag(organizationId)}`,
  lessonsV2: (organizationId: string) =>
    `client:org:${organizationId}:lessons-v2`,
  programOverview: (organizationId: string) =>
    `client:org:${organizationId}:program-overview`,
  programOverviewV2: (organizationId: string) =>
    `client:org:${organizationId}:program-overview-v2`,
  teacherOverview: (organizationId: string) =>
    `client:org:${organizationId}:teacher-overview`,
  teacherOverviewV2: (organizationId: string) =>
    `client:org:${organizationId}:teacher-overview-v2`,
} as const;
