'use client';

import { message } from 'antd';
import { useCallback, useState } from 'react';
import {
  downloadAdminList,
  type AdminListQueryInput,
  type AdminListResource,
} from '@/lib/admin-list-api';

// 为什么：大列表导出可能耗时较长，提示里说明等待预期，避免运营误以为卡死而关闭页面。
export function adminExportSuccessMessage(fileName: string): string {
  return `已开始导出 ${fileName}，数据量较大时请稍候，勿关闭页面。`;
}

export function useAdminListExport<Resource extends AdminListResource>(
  resource: Resource,
  submittedQuery: AdminListQueryInput<Resource>,
) {
  const [isExporting, setExporting] = useState(false);
  const exportList = useCallback(async () => {
    setExporting(true);
    try {
      const file = await downloadAdminList(resource, submittedQuery);
      message.success(adminExportSuccessMessage(file.fileName));
    } catch {
      return;
    } finally {
      setExporting(false);
    }
  }, [resource, submittedQuery]);

  return { exportList, isExporting };
}
