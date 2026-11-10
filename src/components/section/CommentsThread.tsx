// CommentsThread — the shared discussion (spec step 13): both roles post even
// in readOnly (the admin's only write besides their profile); period tag on
// every comment; the current user's own comments are styled distinctly.
import { useState } from "react";
import { Button, Field, Select, Textarea } from "../../components/ui";
import { PERIODS, PERIOD_LABELS } from "../../types";
import type { Comment, PeriodId, Profile } from "../../types";
import { errMessage } from "./useSectionData";
import { relativeDay } from "../../lib/format";
import { cx } from "./cx";

export interface CommentsThreadProps {
  comments: Comment[];
  readOnly: boolean;
  currentUser: Profile;
  /** Resolves on success; rejects on failure (toast from SectionPage). */
  onPost(input: { period: PeriodId | null; body: string }): Promise<void>;
}

export function CommentsThread({ comments, readOnly, currentUser, onPost }: CommentsThreadProps): JSX.Element {
  const [body, setBody] = useState("");
  const [period, setPeriod] = useState<PeriodId | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(): Promise<void> {
    const trimmed = body.trim();
    if (trimmed === "") return;
    setBusy(true);
    setError(null);
    try {
      await onPost({ period: period === "" ? null : period, body: trimmed });
      setBody("");
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sec-comments">
      <div className="sec-comments__composer">
        <Field
          label="New comment"
          htmlFor="sec-comment-body"
          hint={readOnly ? "Review mode — comments are open to both roles." : "Visible to the professor and the department head."}
        >
          <Textarea
            id="sec-comment-body"
            rows={3}
            value={body}
            placeholder="Share a note about this section…"
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void post();
              }
            }}
          />
        </Field>
        <div className="sec-comments__composerrow">
          <label className="mono-label" htmlFor="sec-comment-period">
            Tag
          </label>
          <Select id="sec-comment-period" value={period} onChange={(e) => setPeriod(e.target.value as PeriodId | "")}>
            <option value="">General</option>
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p]}
              </option>
            ))}
          </Select>
          <Button variant="primary" onClick={() => void post()} loading={busy} disabled={busy || body.trim() === ""}>
            Post comment
          </Button>
        </div>
        {error ? (
          <p className="sec-comments__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {comments.length === 0 ? (
        <p className="sec-comments__empty">No comments yet — start the discussion.</p>
      ) : (
        <ul className="sec-comments__list">
          {comments.map((c) => {
            const own = c.authorId === currentUser.id;
            return (
              <li key={c.id} className={cx("sec-comment", own && "sec-comment--own")}>
                <div className="sec-comment__head">
                  <span className="sec-comment__author">{c.authorName}</span>
                  <span className="sec-comment__tag mono-label">
                    {own ? "You · " : ""}
                    {c.period ? PERIOD_LABELS[c.period] : "General"}
                  </span>
                  <span className="sec-comment__time num" title={c.at}>
                    {relativeDay(c.at)}
                  </span>
                </div>
                <p className="sec-comment__body serif-prose">{c.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
