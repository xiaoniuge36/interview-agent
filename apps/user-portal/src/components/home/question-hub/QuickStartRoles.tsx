'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RoleGroup } from '@/lib/interview-role-types';
import { ROLE_GROUPS, roleInputFor } from '@/lib/interview-roles';
import { createJobIntent, listJobIntents } from '@/lib/workspace-api';

type QuickStartPhase = 'checking' | 'groups' | 'roles' | 'creating' | 'done' | 'hidden';

/**
 * 新用户快速定向：还没有岗位意向时，在首页两步（方向 → 岗位）完成意向创建，
 * 推荐、备考计划与模拟面试立即围绕所选岗位展开。
 */
export function QuickStartRoles({ onCreated }: { onCreated?: () => void }) {
  const { phase, pendingRole, error, pickRole } = useQuickStartFlow(onCreated);
  const [activeGroup, setActiveGroup] = useState<RoleGroup | null>(null);

  if (phase === 'checking' || phase === 'hidden') return null;
  if (phase === 'done') return <QuickStartDone role={pendingRole} />;
  return (
    <section className="quick-start motion-rise" aria-labelledby="quick-start-heading">
      <header>
        <span className="quick-start-kicker">30 秒定制</span>
        <h2 id="quick-start-heading">先选一个方向，训练立刻贴近你</h2>
        <p>选定目标岗位后，Agent 推荐、备考计划和模拟面试都会围绕它出题；之后可随时调整。</p>
      </header>
      {activeGroup ? (
        <QuickStartRolePicker
          group={activeGroup}
          creating={phase === 'creating'}
          pendingRole={pendingRole}
          onBack={() => setActiveGroup(null)}
          onPick={(title) => void pickRole(title)}
        />
      ) : (
        <QuickStartGroups onPick={setActiveGroup} />
      )}
      {error ? <p className="quick-start-error">{error}</p> : null}
    </section>
  );
}

function useQuickStartFlow(onCreated?: () => void) {
  const [phase, setPhase] = useState<QuickStartPhase>('checking');
  const [pendingRole, setPendingRole] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listJobIntents()
      .then((jobs) => {
        if (!cancelled) setPhase(jobs.length ? 'hidden' : 'groups');
      })
      .catch(() => {
        if (!cancelled) setPhase('hidden');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pickRole = useCallback(
    async (title: string) => {
      setPhase('creating');
      setPendingRole(title);
      setError('');
      try {
        await createJobIntent(roleInputFor(title));
        setPhase('done');
        onCreated?.();
      } catch {
        setPhase('roles');
        setError('岗位意向没有创建成功，请稍后再试。');
      }
    },
    [onCreated],
  );

  return { phase, pendingRole, error, pickRole };
}

export function QuickStartGroups({ onPick }: { onPick: (group: RoleGroup) => void }) {
  return (
    <div className="quick-start-groups" role="list">
      {ROLE_GROUPS.map(({ group, roles }) => (
        <button key={group} type="button" role="listitem" onClick={() => onPick(group)}>
          <strong>{group}</strong>
          <span>{roles.map((role) => role.title).join(' · ')}</span>
        </button>
      ))}
    </div>
  );
}

export function QuickStartRolePicker({
  group,
  creating,
  pendingRole,
  onBack,
  onPick,
}: {
  group: RoleGroup;
  creating: boolean;
  pendingRole: string;
  onBack: () => void;
  onPick: (title: string) => void;
}) {
  const roles = ROLE_GROUPS.find((item) => item.group === group)?.roles ?? [];
  return (
    <div className="quick-start-roles">
      <button type="button" className="quick-start-back" onClick={onBack} disabled={creating}>
        ← 换个方向
      </button>
      <div className="quick-start-role-list" role="list">
        {roles.map((role) => (
          <button
            key={role.title}
            type="button"
            role="listitem"
            disabled={creating}
            className={creating && pendingRole === role.title ? 'busy' : undefined}
            onClick={() => onPick(role.title)}
          >
            {creating && pendingRole === role.title ? '正在定制…' : role.title}
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuickStartDone({ role }: { role: string }) {
  return (
    <section className="quick-start quick-start-done motion-rise" role="status">
      <strong>已锁定「{role}」方向</strong>
      <p>推荐题单和备考计划已按这个岗位更新，去开始第一轮训练吧。</p>
    </section>
  );
}
