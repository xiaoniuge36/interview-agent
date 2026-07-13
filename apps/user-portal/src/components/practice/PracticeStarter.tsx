type PracticeStarterProps = {
  title: string;
  setTitle: (value: string) => void;
  busy: boolean;
  onStart: () => void;
};

export function PracticeStarter(props: PracticeStarterProps) {
  return (
    <div className="practice-starter">
      <label className="label">
        Practice title
        <input
          className="input"
          value={props.title}
          onChange={(event) => props.setTitle(event.target.value)}
        />
      </label>
      <button
        className="button"
        type="button"
        onClick={() => void props.onStart()}
        disabled={props.busy}
      >
        {props.busy ? 'Creating?' : 'Start smart practice'}
      </button>
    </div>
  );
}
