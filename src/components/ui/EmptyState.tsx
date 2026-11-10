import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="ui-empty">
      <h3 className="ui-empty__title">{title}</h3>
      {body != null ? <div className="ui-empty__body">{body}</div> : null}
      {action != null ? <div className="ui-empty__action">{action}</div> : null}
    </div>
  );
}
