/**
 * Shared utility types — zero-dependency.
 */

/** Make all properties in T nullable. */
export type Nullable<T> = { [K in keyof T]: T[K] | null };

/** Deep partial. */
export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

/** Non-nullable assertion helper type. */
export type NonNull<T> = T extends null | undefined ? never : T;

/** Extract union member by discriminator field. */
export type Discriminate<T, K extends keyof T, V extends T[K]> = Extract<T, { [P in K]: V }>;
