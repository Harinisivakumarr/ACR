import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import Classrooms from "./pages/dashboard/Classrooms";
import Faculty from "./pages/dashboard/Faculty";
import Canteen from "./pages/dashboard/Canteen";
import Announcements from "./pages/dashboard/announcements";
import CreateAnnouncement from './pages/dashboard/create-announcement';
import Timetable from "./pages/dashboard/Timetable";
import Feedback from "./pages/dashboard/Feedback";
import AdminFeedback from "./pages/dashboard/AdminFeedback";

import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { UserRole } from "./lib/supabase";

// Define role-based route access
const roleBasedRoutes = {
  classroomManagement: ["Admin", "Faculty", "CR"] as UserRole[],
  facultyAvailability: ["Admin", "Faculty"] as UserRole[],
  menuManagement: ["Admin", "Canteen Staff"] as UserRole[],
  userManagement: ["Admin"] as UserRole[],
  createAnnouncement: ["Admin"] as UserRole[],
  timetable: ["Admin", "Faculty", "CR", "Student"] as UserRole[],
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard/classrooms"
                element={
                  <PrivateRoute>
                    <Classrooms />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard/faculty"
                element={
                  <PrivateRoute>
                    <Faculty />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard/canteen"
                element={
                  <PrivateRoute>
                    <Canteen />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard/announcements"
                element={
                  <PrivateRoute>
                    <Announcements />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard/create-announcement"
                element={
                  <PrivateRoute>
                    <CreateAnnouncement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard/timetable"
                element={
                  <PrivateRoute>
                    <Timetable />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard/feedback"
                element={
                  <PrivateRoute>
                    <Feedback />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard/admin-feedback"
                element={
                  <PrivateRoute allowedRoles={['Admin', 'admin']}>
                    <AdminFeedback />
                  </PrivateRoute>
                }
              />

              {/* Fallback 404 page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;