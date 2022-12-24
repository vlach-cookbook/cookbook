// A username has to be a non-empty string of letters, numbers, and dashes, but these can be from
// all over Unicode, not just ASCII.

export const usernamePattern = "[-\\p{Alphabetic}\\p{N}]+";
export const usernameRegex = new RegExp(`^${usernamePattern}$`, 'u');
