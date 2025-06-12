import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useAuth, useRoleCheck } from "@/contexts/AuthContext";
import {
  Home,
  LogOut,
  BookOpen,
  Users,
  Bell,
  Book,
  Calendar,
  MessageSquare,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  headerActions?: React.ReactNode;  // NEW optional prop for extra header buttons or UI
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  headerActions,
}) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const isAdmin = useRoleCheck(["Admin"]);
  const isFaculty = useRoleCheck(["Faculty", "Admin"]);
  const isCanteenStaff = useRoleCheck(["Canteen Staff", "Admin"]);
  const isCR = useRoleCheck(["CR", "Admin"]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 px-4 border-b bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm flex items-center justify-between">
            <div className="flex items-center">
              <SidebarTrigger className="mr-4" />
              <h1 className="text-xl font-semibold">{title}</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Inject additional header actions if provided */}
              {headerActions}
              <Badge variant="outline" className="dark:bg-gray-700">
                {profile?.role || "Loading..."}
              </Badge>
              <NotificationDropdown />
              <ModeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut()}
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto py-6 px-4 md:px-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

function AppSidebar() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <Sidebar className="shadow-lg border-r dark:bg-gray-800 dark:border-gray-700">
      <SidebarContent>
        {/* Video background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        >
          <source src="/sidebar.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/dashboard")}>
                  <Home className="h-5 w-5" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/dashboard/classrooms")}>
                  <BookOpen className="h-5 w-5" />
                  <span>Classrooms</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/dashboard/faculty")}>
                  <Users className="h-5 w-5" />
                  <span>Faculty</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/dashboard/canteen")}>
                  <Book className="h-5 w-5" />
                  <span>Canteen</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/dashboard/announcements")}>
                  <Bell className="h-5 w-5" />
                  <span>Announcements</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/dashboard/timetable")}>
                  <Calendar className="h-5 w-5" />
                  <span>Timetable</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Hide regular feedback for admins - they have Manage Feedback instead */}
              {!(profile?.role === 'admin' || profile?.role === 'Admin') && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => navigate("/dashboard/feedback")}>
                    <MessageSquare className="h-5 w-5" />
                    <span>Feedback</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {(profile?.role === 'admin' || profile?.role === 'Admin') && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => navigate("/dashboard/admin-feedback")}>
                    <Settings className="h-5 w-5" />
                    <span>Manage Feedback</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
