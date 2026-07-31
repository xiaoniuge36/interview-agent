type ArchivedInterviewControlState = {
  hasArchivedTarget: boolean;
  hasSession: boolean;
  busy: boolean;
  loadFailed: boolean;
};

export function archivedInterviewControl(state: ArchivedInterviewControlState) {
  if (state.hasArchivedTarget && !state.hasSession) {
    if (state.loadFailed) {
      return { action: 'retry' as const, disabled: state.busy, label: '重新加载本轮面试' };
    }
    return { action: 'start' as const, disabled: true, label: '正在恢复本轮…' };
  }
  return {
    action: state.hasSession ? ('restart' as const) : ('start' as const),
    disabled: state.busy,
    label: state.hasSession ? '重新开始本轮' : '开始模拟面试',
  };
}

export type ArchivedInterviewControl = ReturnType<typeof archivedInterviewControl>;
