import { QuestionCatalogList } from './QuestionCatalogList';
import { QuestionFilterPanel } from './QuestionFilterPanel';
import { SelectedQuestionTray } from './SelectedQuestionTray';
import type { useQuestionPicker } from './useQuestionPicker';

type SelfPickerWorkspaceProps = {
  picker: ReturnType<typeof useQuestionPicker>;
};

export function SelfPickerWorkspace({ picker }: SelfPickerWorkspaceProps) {
  return (
    <section className="question-self-picker-workspace" id="self-picker-workspace">
      <header>
        <div>
          <span>自主组卷</span>
          <h2>自己组合一轮练习</h2>
          <p>筛选、选题和开始练习始终由你掌控，Agent 推荐不会限制你的选择。</p>
        </div>
      </header>
      <QuestionFilterPanel
        query={picker.query}
        facets={picker.catalog?.facets}
        onChange={picker.updateFilter}
      />
      <div className="question-picker-layout">
        <QuestionCatalogList
          catalog={picker.catalog}
          loading={picker.loading}
          error={picker.error}
          selectedIds={picker.selected.map((item) => item.id)}
          onToggle={picker.toggle}
          onRetry={picker.reload}
          onPage={picker.changePage}
        />
        <SelectedQuestionTray
          selected={picker.selected}
          message={picker.selectionMessage}
          error={picker.startError}
          starting={picker.starting}
          onRemove={picker.remove}
          onClear={picker.clear}
          onQuickCompose={picker.quickCompose}
          quickComposeDisabled={!picker.catalog?.items.length}
          onStart={() => void picker.start()}
        />
      </div>
    </section>
  );
}
