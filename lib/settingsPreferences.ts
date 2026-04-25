export type TwoFactorMode = "off" | "sms" | "authenticator";
export type DeliveryStyle = "balanced" | "instant" | "countdown";
export type RevealBehavior = "tap_to_open" | "auto_open";

export type NotificationPreferences = {
  momentReminders: boolean;
  countdownNotifications: boolean;
  deliveryAlerts: boolean;
  recipientOpenedMoment: boolean;
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
};

export type DeliveryPreferences = {
  defaultTimezone: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  deliveryStyle: DeliveryStyle;
  revealBehavior: RevealBehavior;
};

export type SecurityPreferences = {
  twoFactorMode: TwoFactorMode;
};

export type QcSettingsPreferences = {
  notifications: NotificationPreferences;
  delivery: DeliveryPreferences;
  security: SecurityPreferences;
};

export const DEFAULT_QC_SETTINGS_PREFERENCES: QcSettingsPreferences = {
  notifications: {
    momentReminders: true,
    countdownNotifications: true,
    deliveryAlerts: true,
    recipientOpenedMoment: false,
    channels: {
      push: true,
      email: true,
      sms: false,
    },
  },
  delivery: {
    defaultTimezone: "UTC",
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    deliveryStyle: "balanced",
    revealBehavior: "tap_to_open",
  },
  security: {
    twoFactorMode: "off",
  },
};

function sanitizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeString(value: unknown, fallback: string, maxLength = 120) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function sanitizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  if (typeof value !== "string") return fallback;
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function sanitizeTime(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  return /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

export function normalizeQcSettingsPreferences(
  raw: unknown,
  fallbackTimezone = "UTC"
): QcSettingsPreferences {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const notificationsRaw =
    source.notifications && typeof source.notifications === "object"
      ? (source.notifications as Record<string, unknown>)
      : {};

  const notificationChannelsRaw =
    notificationsRaw.channels && typeof notificationsRaw.channels === "object"
      ? (notificationsRaw.channels as Record<string, unknown>)
      : {};

  const deliveryRaw =
    source.delivery && typeof source.delivery === "object"
      ? (source.delivery as Record<string, unknown>)
      : {};

  const securityRaw =
    source.security && typeof source.security === "object"
      ? (source.security as Record<string, unknown>)
      : {};

  return {
    notifications: {
      momentReminders: sanitizeBoolean(
        notificationsRaw.momentReminders,
        DEFAULT_QC_SETTINGS_PREFERENCES.notifications.momentReminders
      ),
      countdownNotifications: sanitizeBoolean(
        notificationsRaw.countdownNotifications,
        DEFAULT_QC_SETTINGS_PREFERENCES.notifications.countdownNotifications
      ),
      deliveryAlerts: sanitizeBoolean(
        notificationsRaw.deliveryAlerts,
        DEFAULT_QC_SETTINGS_PREFERENCES.notifications.deliveryAlerts
      ),
      recipientOpenedMoment: sanitizeBoolean(
        notificationsRaw.recipientOpenedMoment,
        DEFAULT_QC_SETTINGS_PREFERENCES.notifications.recipientOpenedMoment
      ),
      channels: {
        push: sanitizeBoolean(
          notificationChannelsRaw.push,
          DEFAULT_QC_SETTINGS_PREFERENCES.notifications.channels.push
        ),
        email: sanitizeBoolean(
          notificationChannelsRaw.email,
          DEFAULT_QC_SETTINGS_PREFERENCES.notifications.channels.email
        ),
        sms: sanitizeBoolean(
          notificationChannelsRaw.sms,
          DEFAULT_QC_SETTINGS_PREFERENCES.notifications.channels.sms
        ),
      },
    },
    delivery: {
      defaultTimezone: sanitizeString(
        deliveryRaw.defaultTimezone,
        fallbackTimezone,
        80
      ),
      quietHoursEnabled: sanitizeBoolean(
        deliveryRaw.quietHoursEnabled,
        DEFAULT_QC_SETTINGS_PREFERENCES.delivery.quietHoursEnabled
      ),
      quietHoursStart: sanitizeTime(
        deliveryRaw.quietHoursStart,
        DEFAULT_QC_SETTINGS_PREFERENCES.delivery.quietHoursStart
      ),
      quietHoursEnd: sanitizeTime(
        deliveryRaw.quietHoursEnd,
        DEFAULT_QC_SETTINGS_PREFERENCES.delivery.quietHoursEnd
      ),
      deliveryStyle: sanitizeEnum(
        deliveryRaw.deliveryStyle,
        ["balanced", "instant", "countdown"] as const,
        DEFAULT_QC_SETTINGS_PREFERENCES.delivery.deliveryStyle
      ),
      revealBehavior: sanitizeEnum(
        deliveryRaw.revealBehavior,
        ["tap_to_open", "auto_open"] as const,
        DEFAULT_QC_SETTINGS_PREFERENCES.delivery.revealBehavior
      ),
    },
    security: {
      twoFactorMode: sanitizeEnum(
        securityRaw.twoFactorMode,
        ["off", "sms", "authenticator"] as const,
        DEFAULT_QC_SETTINGS_PREFERENCES.security.twoFactorMode
      ),
    },
  };
}

export function mergeQcSettingsPreferences(
  base: QcSettingsPreferences,
  updates: Partial<QcSettingsPreferences>,
  fallbackTimezone = "UTC"
) {
  const merged = {
    ...base,
    ...updates,
    notifications: {
      ...base.notifications,
      ...(updates.notifications ?? {}),
      channels: {
        ...base.notifications.channels,
        ...(updates.notifications?.channels ?? {}),
      },
    },
    delivery: {
      ...base.delivery,
      ...(updates.delivery ?? {}),
    },
    security: {
      ...base.security,
      ...(updates.security ?? {}),
    },
  };

  return normalizeQcSettingsPreferences(merged, fallbackTimezone);
}
