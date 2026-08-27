import { forwardRef, type AnchorHTMLAttributes } from 'react';

type PushNavigationLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
};

/**
 * 学习中心内“同路由仅 query 变化且 query 含非 ASCII 参数”的导航，
 * 在 Next 15 生产构建下客户端路由不可靠：<Link> 点击后 RSC 请求被中止
 * （症状同 vercel/next.js#75318）；router.push 虽能拿到 200 的 RSC 响应，
 * 但并发压力下 React 18 transition 始终不提交，URL 与 UI 停留在原页。
 * 因此这类链接统一用原生 <a> 整页导航，由服务端渲染保证行为正确。
 */
export const PushNavigationLink = forwardRef<HTMLAnchorElement, PushNavigationLinkProps>(
  function PushNavigationLink({ href, children, ...props }, ref) {
    return (
      <a {...props} ref={ref} href={href}>
        {children}
      </a>
    );
  },
);
