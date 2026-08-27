type NavigationTarget = {
  href: string;
};

type NavigationWarmupOptions = {
  pathname: string;
  targets: readonly NavigationTarget[];
  prefetched: Set<string>;
  prefetch: (href: string) => void;
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
  if (!isDevelopmentRuntime()) return;
  // dev 模式下 router.prefetch 是 no-op，首次点击会阻塞在按需编译上且无任何反馈。
  // 这里在空闲时预热路由触发服务端编译；必须串行——历史上并行 fetch 挤占过 dev server。
  for (const href of hrefs) {
    if (options.signal?.aborted) return;
    await warmDevelopmentRoute(href, options.signal);
  }
}

export function warmNavigationInteraction(options: NavigationInteractionWarmupOptions): boolean {
  if (
    isCurrentNavigationHref(options.pathname, options.href) ||
    options.prefetched.has(options.href)
  )
    return false;
  options.prefetched.add(options.href);
  options.prefetch(options.href);
  if (isDevelopmentRuntime()) void warmDevelopmentRoute(options.href);
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

function isDevelopmentRuntime(): boolean {
  return process.env.NODE_ENV === 'development';
}

// 桌面侧栏与移动端底部导航同时挂载，各自持有 prefetched 集合；
// 模块级去重避免同一路由被预热两次。
const devWarmedRoutes = new Set<string>();

export function resetDevelopmentWarmupForTests(): void {
  devWarmedRoutes.clear();
}

async function warmDevelopmentRoute(href: string, signal?: AbortSignal): Promise<void> {
  if (devWarmedRoutes.has(href)) return;
  devWarmedRoutes.add(href);
  try {
    const response = await fetch(href, {
      credentials: 'same-origin',
      ...(signal ? { signal } : {}),
    });
    // 响应体不消费，主动取消释放连接；预热只为触发 dev server 编译。
    await response.body?.cancel();
  } catch {
    // 失败视为未预热，交互时（hover/focus）可再次尝试。
    devWarmedRoutes.delete(href);
  }
}
