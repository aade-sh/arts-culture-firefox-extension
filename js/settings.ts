export const NewTabSetting = {
  TURNOVER_ALWAYS: 'turnoverAlways',
  ART_PROVIDER: 'artProvider',
} as const;

export type NewTabSettingKeys = typeof NewTabSetting[keyof typeof NewTabSetting];