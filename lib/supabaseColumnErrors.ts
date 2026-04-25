type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null | undefined;

export function isMissingColumnError(error: SupabaseLikeError, columnName: string) {
  const text = [
    error?.message,
    error?.details,
    error?.hint,
    error?.code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes(columnName.toLowerCase()) &&
    (text.includes("does not exist") ||
      text.includes("schema cache") ||
      text.includes("column"))
  );
}
