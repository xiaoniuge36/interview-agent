type NavigationTarget = {
  href: string;
};

type NavigationWarmupOptions = {
  pathname: string;
  targets: readonly NavigationTarget[];
  prefetched: Set<string>;
  prefetch: (href: string) => void;
  warmDevelopmentRoute?: (href: string, signal?: AbortSignal) => Promise<void>;
  signal?: AbortSignal;
};

type NavigationInteractionWarmupOptions = Pick<
  NavigationWarmupOptions,
  'pathname' | 'prefetched' | 'prefetch'
> & {
  href: string;
};

export async function warmNavigationRoutes(options: NavigationWarmupOptions): Promise<void> {
  if (options.signal?.aborted) return;
  const hrefs = pendingHrefs(options);
  for (const href of hrefs) options.prefetch(href);
  const warm = options.warmDevelopmentRoute;
  if (!warm) return;
  await Promise.allSettled(hrefs.map((href) => warm(href, options.signal)));
}

export function warmNavigationInteraction(options: NavigationInteractionWarmupOptions): boolean {
  if (
    isCurrentNavigationHref(options.pathname, options.href) ||
    options.prefetched.has(options.href)
  )
    return false;
  options.prefetched.add(options.href);
  options.prefetch(options.href);
  return true;
}

function pendingHrefs(options: NavigationWarmupOptions): string[] {
  const hrefs: string[] = [];
  for (const target of options.targets) {
    if (
      isCurrentNavigationHref(options.pathname, target.href) ||
      options.prefetched.has(target.href)
    )
      continue;
    options.prefetched.add(target.href);
    hrefs.push(target.href);
  }
  return hrefs;
}

function isCurrentNavigationHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export async function warmDevelopmentRoute(href: string, signal?: AbortSignal): Promise<void> {
  try {
    await fetch(href, {
      credentials: 'same-origin',
      ...(signal ? { signal } : {}),
    });
  } catch {
    return;
  }
}
