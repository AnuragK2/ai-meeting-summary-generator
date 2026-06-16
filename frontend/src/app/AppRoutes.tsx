import { Route, Routes } from "react-router-dom";
import { ActionItemsDashboardPage } from "../features/action-items/pages/ActionItemsDashboardPage";
import { MeetingDetailPage } from "../features/meetings/pages/MeetingDetailPage";
import { MeetingNewPage } from "../features/meetings/pages/MeetingNewPage";
import { MeetingsListPage } from "../features/meetings/pages/MeetingsListPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MeetingsListPage />} />
      <Route path="/meetings/new" element={<MeetingNewPage />} />
      <Route path="/meetings/:id" element={<MeetingDetailPage />} />
      <Route path="/dashboard" element={<ActionItemsDashboardPage />} />
    </Routes>
  );
}
