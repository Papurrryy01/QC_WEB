export type TimezoneOption = {
  value: string;
  label: string;
};

const TIMEZONE_LABELS: Record<string, string> = {
  "America/New_York": "Eastern Time",
  "America/Detroit": "Eastern Time",
  "America/Indiana/Indianapolis": "Eastern Time",
  "America/Kentucky/Louisville": "Eastern Time",
  "America/Kentucky/Monticello": "Eastern Time",
  "America/Chicago": "Central Time",
  "America/Indiana/Knox": "Central Time",
  "America/Indiana/Tell_City": "Central Time",
  "America/Menominee": "Central Time",
  "America/North_Dakota/Center": "Central Time",
  "America/North_Dakota/New_Salem": "Central Time",
  "America/North_Dakota/Beulah": "Central Time",
  "America/Denver": "Mountain Time",
  "America/Boise": "Mountain Time",
  "America/Phoenix": "Mountain Time (Arizona)",
  "America/Los_Angeles": "Pacific Time",
  "America/Anchorage": "Alaska Time",
  "America/Juneau": "Alaska Time",
  "America/Sitka": "Alaska Time",
  "America/Nome": "Alaska Time",
  "Pacific/Honolulu": "Hawaii Time",
  "America/Puerto_Rico": "Atlantic Time",
  UTC: "UTC",
  "Etc/UTC": "UTC",
};

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Phoenix", label: "Mountain Time (Arizona)" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "America/Puerto_Rico", label: "Atlantic Time" },
  { value: "UTC", label: "UTC" },
];

function toCityLabel(timezone: string) {
  const lastPart = timezone.split("/").pop() || timezone;
  return lastPart.replace(/_/g, " ");
}

export function toFriendlyTimezoneLabel(timezone: string | null | undefined) {
  const value = timezone?.trim();
  if (!value) return "Local Time";

  const knownLabel = TIMEZONE_LABELS[value];
  if (knownLabel) return knownLabel;

  if (value.toLowerCase().endsWith(" time")) return value;
  if (!value.includes("/")) return value;

  return `${toCityLabel(value)} Time`;
}

export function getTimezoneOptions(selectedValue: string | null | undefined) {
  const value = selectedValue?.trim();
  if (!value) return TIMEZONE_OPTIONS;

  const alreadyListed = TIMEZONE_OPTIONS.some((option) => option.value === value);
  if (alreadyListed) return TIMEZONE_OPTIONS;

  return [
    {
      value,
      label: `${toFriendlyTimezoneLabel(value)} (Current)`,
    },
    ...TIMEZONE_OPTIONS,
  ];
}
