import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/ui/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Candidates from './pages/Candidates';
import Pipeline from './pages/Pipeline';
import Analyze from './pages/Analyze';
import AtsCheck from './pages/AtsCheck';
import Jobs from './pages/Jobs';
import Finder from './pages/Finder';
import Results from './pages/Results';
import Recruiter from './pages/Recruiter';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
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
          <Route path="profile" element={<Profile />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
