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
import { ErrorBoundary as RouteErrorBoundary } from "./components/ErrorBoundary";
import { ComplianceDashboard } from "./pages/ComplianceDashboard";
import { SubmissionsPage } from "./pages/SubmissionsPage";
import { AuditPage } from "./pages/AuditPage";
import { VerticalSlicePage } from "./pages/VerticalSlicePage";
import { MTDCommandCentre } from "./pages/MTDCommandCentre";
import { SigningPage } from "./pages/SigningPage";
import { LoginPage } from "./pages/LoginPage";
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
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/sign/:token" element={<SigningPage />} />
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientListPage />} />
            <Route path="/clients/new" element={<CreateClientWizard />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/entities/:entityId" element={<EntityDetailPage />} />
            <Route path="/entities/:entityId/periods/:periodId" element={<AccountingPeriodPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/work" element={<WorkPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/deadlines" element={<RouteErrorBoundary label="deadlines"><DeadlinesPage /></RouteErrorBoundary>} />
            <Route path="/submissions" element={<SubmissionsPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/vertical-slice" element={<VerticalSlicePage />} />
            <Route path="/mtd" element={<MTDCommandCentre />} />
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
