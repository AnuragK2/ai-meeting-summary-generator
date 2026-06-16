import { Link } from "react-router-dom";
import { ErrorBanner } from "../../../components/ui/ErrorBanner";
import { Spinner } from "../../../components/ui/Spinner";
import { EmptyState } from "../../../components/ui/EmptyState";
import { formatApiError } from "../../../lib/apiClient";
import { useMeetingsList } from "../api/useMeetings";
import { MeetingsTable } from "../components/MeetingsTable";

export function MeetingsListPage() {
  const { data, isLoading, isError, error, refetch } = useMeetingsList();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Meetings</h1>
          <p className="text-sm text-slate-500">
            Paste a transcript, get structured notes and action items.
          </p>
        </div>
        <Link to="/meetings/new" className="btn-primary">
          + New meeting
        </Link>
      </div>

      {isLoading && (
        <div className="card flex items-center gap-2 text-slate-600">
          <Spinner /> Loading meetings…
        </div>
      )}

      {isError && (
        <ErrorBanner
          message={formatApiError(error)}
          onRetry={() => refetch()}
        />
      )}

      {data && data.length === 0 && (
        <EmptyState
          title="No meetings yet"
          description="Create your first meeting to see notes and action items here."
          action={
            <Link to="/meetings/new" className="btn-primary">
              Create your first meeting
            </Link>
          }
        />
      )}

      {data && data.length > 0 && <MeetingsTable meetings={data} />}
    </div>
  );
}
