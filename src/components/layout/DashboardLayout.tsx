
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/theme/ModeToggle";
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
  MessageSquare,
  Settings,
  Book,
  User,
  CalendarCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
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
              <Badge variant="outline" className="dark:bg-gray-700">
                {profile?.role || "Loading..."}
              </Badge>
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
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const isAdmin = useRoleCheck(["Admin"]);
  const isFaculty = useRoleCheck(["Faculty", "Admin"]);
  const isCanteenStaff = useRoleCheck(["Canteen Staff", "Admin"]);
  const isCR = useRoleCheck(["CR", "Admin"]);

  return (
    <Sidebar className="shadow-lg border-r dark:bg-gray-800 dark:border-gray-700">
      <SidebarHeader className="flex items-center justify-center py-6">
        <img src="/amrita-logo.png" alt="Amrita Logo" className="h-10" />
      </SidebarHeader>
      
      <SidebarContent>
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {(isAdmin || isFaculty || isCR || isCanteenStaff) && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {(isAdmin || isFaculty || isCR) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/dashboard/classroom-management")}>
                      <BookOpen className="h-5 w-5" />
                      <span>Manage Classrooms</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                
                {(isAdmin || isFaculty) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/dashboard/availability")}>
                      <CalendarCheck className="h-5 w-5" />
                      <span>Faculty Availability</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                
                {(isAdmin || isCanteenStaff) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/dashboard/menu-management")}>
                      <Book className="h-5 w-5" />
                      <span>Menu Management</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                
                {isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/dashboard/users")}>
                      <Users className="h-5 w-5" />
                      <span>User Management</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => navigate("/dashboard/feedback")}>
                    <MessageSquare className="h-5 w-5" />
                    <span>Feedback</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
            {profile?.name?.charAt(0) || "U"}
          </div>
          <div className="text-sm">
            <div className="font-medium truncate">{profile?.name || "User"}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {profile?.email || ""}
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
