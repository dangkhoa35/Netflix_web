export const logInfo = (scope: string, data?: unknown) => {
  console.log(`[INFO][${scope}]`, data ?? "");
};

export const logError = (scope: string, err: unknown, extra?: unknown) => {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(`[ERR][${scope}] ${e.message}`);
  console.error(e.stack); // có file + line
  if (extra !== undefined) console.error(`[ERR][${scope}] extra:`, extra);
};
