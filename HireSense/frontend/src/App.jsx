import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/ui/Layout';
import ApplicantLayout from './components/ui/ApplicantLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import Chatbot from './components/ui/Chatbot';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Candidates = lazy(() => import('./pages/Candidates'));
const Pipeline = lazy(() => import('./pages/Pipeline'));
const Analyze = lazy(() => import('./pages/Analyze'));
const AtsCheck = lazy(() => import('./pages/AtsCheck'));
const Jobs = lazy(() => import('./pages/Jobs'));
const Finder = lazy(() => import('./pages/Finder'));
const Results = lazy(() => import('./pages/Results'));
const Recruiter = lazy(() => import('./pages/Recruiter'));
const Applicants = lazy(() => import('./pages/Applicants'));
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AuthConfirm = lazy(() => import('./pages/AuthConfirm'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Browse = lazy(() => import('./pages/applicant/Browse'));
const Applications = lazy(() => import('./pages/applicant/Applications'));
const ApplicantProfile = lazy(() => import('./pages/applicant/ApplicantProfile'));
const ApplicantAtsCheck = lazy(() => import('./pages/applicant/ApplicantAtsCheck'));

const RouteFallback = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    color: 'var(--text2)',
  }}>
    Loading…
  </div>
);

// Persona gates: keep applicants inside /student and recruiters inside /.
function RecruiterGate({ children }) {
  const { role } = useAuth();
  if (role === 'applicant') return <Navigate to="/student" replace />;
  return children;
}
function ApplicantGate({ children }) {
  const { role } = useAuth();
  if (role !== 'applicant') return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/confirm" element={<AuthConfirm />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

        {/* Recruiter region */}
        <Route path="/" element={
          <ProtectedRoute>
            <RecruiterGate>
              <Layout />
            </RecruiterGate>
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="analyze" element={<Analyze />} />
          <Route path="ats-check" element={<AtsCheck />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="finder" element={<Finder />} />
          <Route path="results" element={<Results />} />
          <Route path="recruiter" element={<Recruiter />} />
          <Route path="applicants" element={<Applicants />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admin" element={<Admin />} />
        </Route>

        {/* Applicant region */}
        <Route path="/student" element={
          <ProtectedRoute>
            <ApplicantGate>
              <ApplicantLayout />
            </ApplicantGate>
          </ProtectedRoute>
        }>
          <Route index element={<Browse />} />
          <Route path="applications" element={<Applications />} />
          <Route path="ats-check" element={<ApplicantAtsCheck />} />
          <Route path="profile" element={<ApplicantProfile />} />
        </Route>
      </Routes>
      </Suspense>
      <Chatbot />
    </Router>
  );
}

export default App;
