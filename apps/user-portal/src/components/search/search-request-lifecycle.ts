export type SearchRequestLifecycle = {
  next: () => number;
  invalidate: () => void;
  isCurrent: (version: number) => boolean;
};

export function createSearchRequestLifecycle(): SearchRequestLifecycle {
  let latestVersion = 0;
  const next = () => ++latestVersion;
  const invalidate = () => {
    latestVersion += 1;
  };
  const isCurrent = (version: number) => version === latestVersion;
  return { next, invalidate, isCurrent };
}
