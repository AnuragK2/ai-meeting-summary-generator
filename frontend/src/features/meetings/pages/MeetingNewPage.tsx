import { MeetingForm } from "../components/MeetingForm";

export function MeetingNewPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New meeting</h1>
        <p className="text-sm text-slate-500">
          Paste a transcript. AI extraction runs immediately after saving — this
          may take a few seconds.
        </p>
      </div>
      <MeetingForm />
    </div>
  );
}
