// Borrowed from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping.
export function escapeRegExp(re: string) {
  return re.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
