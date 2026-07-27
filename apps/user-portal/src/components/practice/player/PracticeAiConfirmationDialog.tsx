type PracticeAiConfirmationDialogProps = {
  titleId: string;
  eyebrow: string;
  title: string;
  copy: string;
  benefits: string[];
  securityNote: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PracticeAiConfirmationDialog(props: PracticeAiConfirmationDialogProps) {
  return (
    <div className="practice-ai-confirmation-backdrop">
      <section
        className="practice-item-ai-confirmation practice-ai-confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={props.titleId}
      >
        <header>
          <span aria-hidden="true">AI</span>
          <div>
            <small>{props.eyebrow}</small>
            <h2 id={props.titleId}>{props.title}</h2>
          </div>
        </header>
        <p>{props.copy}</p>
        <ul>
          {props.benefits.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
        <div className="practice-ai-security-note">
          <span aria-hidden="true">✓</span>
          <p>{props.securityNote}</p>
        </div>
        <footer>
          <button className="secondary" type="button" onClick={props.onCancel}>
            {props.cancelLabel}
          </button>
          <button type="button" onClick={props.onConfirm}>
            {props.confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
