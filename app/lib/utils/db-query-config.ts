// app/lib/utils/db-query-config.ts

/**
 * Standard populate configuration for content queries
 * Used across Memory and Post queries to ensure consistent data structure
 */
export const CONTENT_POPULATE_CONFIG = [
  { path: "author", populate: { path: "avatar" } },
  { path: "image" }
];
