'use client';

import { message } from 'antd';
import { useCallback, useState } from 'react';
import {
  downloadAdminList,
  type AdminListQueryInput,
  type AdminListResource,
} from '@/lib/admin-list-api';

export function useAdminListExport<Resource extends AdminListResource>(
  resource: Resource,
  submittedQuery: AdminListQueryInput<Resource>,
) {
  const [isExporting, setExporting] = useState(false);
  const exportList = useCallback(async () => {
    setExporting(true);
    try {
      const file = await downloadAdminList(resource, submittedQuery);
      message.success(`已开始导出 ${file.fileName}`);
    } catch {
      return;
    } finally {
      setExporting(false);
    }
  }, [resource, submittedQuery]);

  return { exportList, isExporting };
}
