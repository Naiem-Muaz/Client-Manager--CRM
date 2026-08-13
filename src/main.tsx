import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ClientListPage } from "./pages/ClientListPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { SetupPage } from "./pages/SetupPage";
import { CreateClientWizard } from "./pages/CreateClientWizard";
import { EntityDetailPage } from "./pages/EntityDetailPage";
import { AccountingPeriodPage } from "./pages/AccountingPeriodPage";
import { TasksPage } from "./pages/TasksPage";
import { WorkPage } from "./pages/WorkPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { DeadlinesPage } from "./pages/DeadlinesPage";
import { ReminderQueuePage } from "./pages/ReminderQueuePage";
import { RequestsPage } from "./pages/RequestsPage";
import { InboxPage } from "./pages/InboxPage";
import { ErrorBoundary as RouteErrorBoundary } from "./components/ErrorBoundary";
import { ComplianceDashboard } from "./pages/ComplianceDashboard";
import { SubmissionsPage } from "./pages/SubmissionsPage";
import { AuditPage } from "./pages/AuditPage";
import { VerticalSlicePage } from "./pages/VerticalSlicePage";
import { MTDCommandCentre } from "./pages/MTDCommandCentre";
import MyTimePage from "./pages/MyTimePage";
import { IncorporationsPage } from "./pages/IncorporationsPage";
import { IncorporationWizardPage } from "./pages/IncorporationWizardPage";
import { SigningPage } from "./pages/SigningPage";
import { ProposalPage } from "./pages/ProposalPage";
import { RequestPage } from "./pages/RequestPage";
import { EsignPage } from "./pages/EsignPage";
import { ProposalsPage } from "./pages/ProposalsPage";
import { ProposalBuilderPage, NewProposalPage } from "./pages/ProposalBuilderPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { AcceptInvitePage } from "./pages/AcceptInvitePage";
import { AuthProvider, RequireAuth } from "./context/AuthContext";

import "./index.css";

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children; 
  }
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/sign/:token" element={<SigningPage />} />
          <Route path="/proposal/:token" element={<ProposalPage />} />
          <Route path="/request/:token" element={<RequestPage />} />
          <Route path="/esign/:token" element={<EsignPage />} />
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientListPage />} />
            <Route path="/clients/new" element={<CreateClientWizard />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/entities/:entityId" element={<EntityDetailPage />} />
            <Route path="/entities/:entityId/periods/:periodId" element={<AccountingPeriodPage />} />
            {/* /tasks is retired — the dead shell; send old links/bookmarks to the
                working jobs board. (TasksPage kept but unreachable; delete later.) */}
            <Route path="/tasks" element={<Navigate to="/work" replace />} />
            <Route path="/work" element={<WorkPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/deadlines" element={<RouteErrorBoundary label="deadlines"><DeadlinesPage /></RouteErrorBoundary>} />
            <Route path="/reminders" element={<RouteErrorBoundary label="reminders"><ReminderQueuePage /></RouteErrorBoundary>} />
            <Route path="/requests" element={<RouteErrorBoundary label="requests"><RequestsPage /></RouteErrorBoundary>} />
            <Route path="/inbox" element={<RouteErrorBoundary label="inbox"><InboxPage /></RouteErrorBoundary>} />
            <Route path="/submissions" element={<SubmissionsPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/vertical-slice" element={<VerticalSlicePage />} />
            <Route path="/mtd" element={<MTDCommandCentre />} />
            <Route path="/proposals" element={<ProposalsPage />} />
            <Route path="/proposals/new" element={<NewProposalPage />} />
            <Route path="/proposals/:id" element={<ProposalBuilderPage />} />
            <Route path="/incorporations" element={<IncorporationsPage />} />
            <Route path="/incorporations/:id" element={<IncorporationWizardPage />} />
            <Route path="/my-time" element={<MyTimePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
