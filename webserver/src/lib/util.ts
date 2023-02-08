// Borrowed from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping.
export function escapeRegExp(re: string) {
  return re.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

const sortCollator = new Intl.Collator();

/** Filters a list of items so that |filter| matches projection(item). Then sorts the list so
 * items that start with |filter| appear first, and everything's alphabetical by projection(item).
 *
 * @returns a new list
 */
export function filterListWithInitialMatchesFirst<T>(
  list: Iterable<T>,
  filter: RegExp,
  projection: (item: T) => string) {
  const filtered = Array.from(list, item => {
    const proj = projection(item);
    return [proj.search(filter), proj, item] as const;
  }).filter(([index, _1, _2]) => index !== -1);
  filtered.sort(([index1, proj1, _1], [index2, proj2, _2]) => {
    const atStart1 = index1 === 0;
    const atStart2 = index2 === 0;
    if (atStart1 !== atStart2) {
      return atStart1 ? -1 : 1;
    }
    return sortCollator.compare(proj1, proj2);
  });
  return filtered.map(([_1, _2, item]) => item);
}
