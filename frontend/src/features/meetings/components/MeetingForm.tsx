import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CreateMeetingInput } from "../../../types/api";
import { Spinner } from "../../../components/ui/Spinner";
import { formatApiError } from "../../../lib/apiClient";
import { useCreateMeeting } from "../api/useMeetings";

interface FormErrors {
  title?: string;
  date?: string;
  raw_transcript?: string;
}

const todayIso = new Date().toISOString().slice(0, 10);

export function MeetingForm() {
  const navigate = useNavigate();
  const create = useCreateMeeting();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayIso);
  const [participantsRaw, setParticipantsRaw] = useState("");
  const [transcript, setTranscript] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!title.trim()) e.title = "Title is required";
    if (!date) e.date = "Date is required";
    if (transcript.trim().length < 50)
      e.raw_transcript = "Transcript must be at least 50 characters";
    return e;
  }

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const eMap = validate();
    setErrors(eMap);
    if (Object.keys(eMap).length > 0) return;
    const input: CreateMeetingInput = {
      title: title.trim(),
      date,
      participants: participantsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      raw_transcript: transcript.trim(),
    };
    create.mutate(input, {
      onSuccess: (detail) => navigate(`/meetings/${detail.meeting.id}`),
    });
  }

  const submitting = create.isPending;
  // Keep the inline error in addition to the toast: the toast may be dismissed
  // or off-screen by the time the user retries, but the form error should
  // persist until they edit and resubmit.
  const apiError = create.error ? formatApiError(create.error) : null;

  return (
    <form className="card space-y-5" onSubmit={onSubmit}>
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

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate("/")}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? "Extracting…" : "Save & extract"}
        </button>
      </div>
    </form>
  );
}
