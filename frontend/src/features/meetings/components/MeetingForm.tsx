import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CreateMeetingInput } from "../../../types/api";
import { Spinner } from "../../../components/ui/Spinner";
import { formatApiError } from "../../../lib/apiClient";
import { useCreateMeeting } from "../api/useMeetings";
import { SAMPLE_TRANSCRIPTS } from "./sampleTranscripts";

interface FormErrors {
  title?: string;
  date?: string;
  participants?: string;
  raw_transcript?: string;
}

// Mirror the Zod constraints on `CreateMeetingInputSchema` so users get
// immediate feedback instead of waiting for the server round-trip.
const TITLE_MAX = 200;
const PARTICIPANTS_MAX = 100;
const TRANSCRIPT_MIN = 50;

const todayIso = new Date().toISOString().slice(0, 10);

function parseParticipants(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function MeetingForm() {
  const navigate = useNavigate();
  const create = useCreateMeeting();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayIso);
  const [participantsRaw, setParticipantsRaw] = useState("");
  const [transcript, setTranscript] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [sampleId, setSampleId] = useState<string>("");

  function validate(): FormErrors {
    const e: FormErrors = {};
    const trimmedTitle = title.trim();
    if (!trimmedTitle) e.title = "Title is required";
    else if (trimmedTitle.length > TITLE_MAX)
      e.title = `Title must be at most ${TITLE_MAX} characters`;
    if (!date) e.date = "Date is required";
    if (parseParticipants(participantsRaw).length > PARTICIPANTS_MAX)
      e.participants = `At most ${PARTICIPANTS_MAX} participants allowed`;
    if (transcript.trim().length < TRANSCRIPT_MIN)
      e.raw_transcript = `Transcript must be at least ${TRANSCRIPT_MIN} characters`;
    return e;
  }

  function onSubmit(ev?: React.FormEvent) {
    ev?.preventDefault();
    const eMap = validate();
    setErrors(eMap);
    if (Object.keys(eMap).length > 0) return;
    const input: CreateMeetingInput = {
      title: title.trim(),
      date,
      participants: parseParticipants(participantsRaw),
      raw_transcript: transcript.trim(),
    };
    create.mutate(input, {
      onSuccess: (detail) => navigate(`/meetings/${detail.meeting.id}`),
    });
  }

  function loadSample(id: string) {
    setSampleId(id);
    if (!id) return;
    const sample = SAMPLE_TRANSCRIPTS.find((s) => s.id === id);
    if (!sample) return;
    setTitle(sample.title);
    setDate(sample.date);
    setParticipantsRaw(sample.participants);
    setTranscript(sample.text);
    setErrors({});
  }

  // Cmd/Ctrl + Enter submits from anywhere in the form (matches the
  // pattern used by GitHub, Linear, Slack — power-user friendly).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, date, participantsRaw, transcript]);

  const submitting = create.isPending;
  // Keep the inline error in addition to the toast: the toast may be dismissed
  // or off-screen by the time the user retries, but the form error should
  // persist until they edit and resubmit.
  const apiError = create.error ? formatApiError(create.error) : null;

  return (
    <form className="card space-y-5" onSubmit={onSubmit}>
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:w-auto">
          <label className="label" htmlFor="sample">
            Try a sample transcript
          </label>
          <select
            id="sample"
            className="select w-full sm:w-auto"
            value={sampleId}
            onChange={(e) => loadSample(e.target.value)}
            disabled={submitting}
          >
            <option value="">— None —</option>
            {SAMPLE_TRANSCRIPTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500 sm:max-w-xs sm:text-right">
          Tip: press{" "}
          <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">
            ⌘ / Ctrl
          </kbd>{" "}
          +{" "}
          <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">
            Enter
          </kbd>{" "}
          to submit.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Sprint planning — Oct 14"
          disabled={submitting}
          maxLength={TITLE_MAX + 50}
        />
        {errors.title && (
          <p className="mt-1 text-xs text-rose-600">{errors.title}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">
            Date
          </label>
          <input
            id="date"
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
          />
          {errors.date && (
            <p className="mt-1 text-xs text-rose-600">{errors.date}</p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="participants">
            Participants (comma separated)
          </label>
          <input
            id="participants"
            className="input"
            value={participantsRaw}
            onChange={(e) => setParticipantsRaw(e.target.value)}
            placeholder="Alice, Bob, Carol"
            disabled={submitting}
          />
          {errors.participants && (
            <p className="mt-1 text-xs text-rose-600">{errors.participants}</p>
          )}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="transcript">
          Transcript
        </label>
        <textarea
          id="transcript"
          className="input min-h-[260px] font-mono text-xs leading-relaxed"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste the meeting transcript here…"
          disabled={submitting}
        />
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>{transcript.length} characters</span>
          {errors.raw_transcript && (
            <span className="text-rose-600">{errors.raw_transcript}</span>
          )}
        </div>
      </div>

      {apiError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {apiError}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          className="btn-secondary w-full sm:w-auto"
          onClick={() => navigate("/")}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary w-full sm:w-auto"
          disabled={submitting}
        >
          {submitting && <Spinner />}
          {submitting ? "Extracting…" : "Save & extract"}
        </button>
      </div>
    </form>
  );
}
