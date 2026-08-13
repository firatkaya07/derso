/** İstemci ve sunucuda güvenle import edilebilir önbellek API’si. */
export {
  orgTag,
  settingsTag,
  fieldsTag,
  teachersTag,
  subjectsTag,
  classesTag,
  lessonsTag,
  planningTag,
  clientCacheKeys,
} from "./tags";

export {
  CLIENT_CACHE_TTL_MS,
  readClientCache,
  writeClientCache,
  invalidateClientCache,
  invalidateOrgClientCache,
} from "./client";

// Sunucu istek önbelleği: yalnızca Server Component / layout’tan
// `import { … } from "@/lib/cache/request"` ile kullanın.
