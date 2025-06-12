// src/pages/dashboard/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // KEEP THIS ONE
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Users, Bell, Book, TrendingUp, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import AcademicCalendar from '@/pages/dashboard/academic_calendar';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    classroomsAvailable: 0,
    facultyAvailable: 0,
    todayAnnouncements: 0,
    canteenItems: 0,
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string>('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch classrooms stats
        const { data: classrooms } = await supabase
          .from('classrooms')
          .select('*')
          .eq('status', 'Available');

        // Fetch faculty stats
        const { data: faculty } = await supabase
          .from('faculty_availability')
          .select('*')
          .eq('status', 'AVAILABLE');

        // Fetch announcements stats
        const { data: announcements } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        // Calculate today's announcements
        const today = new Date().toISOString().split('T')[0];
        const todayAnnouncements = announcements?.filter(
          announcement => announcement.created_at.startsWith(today)
        ).length || 0;

        // Fetch canteen items
        const { data: canteenItems } = await supabase
          .from('canteen_menu')
          .select('*');

        setStats({
          classroomsAvailable: classrooms?.length || 0,
          facultyAvailable: faculty?.length || 0,
          todayAnnouncements: todayAnnouncements,
          canteenItems: canteenItems?.length || 0,
        });

        setAnnouncements(announcements || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Set up realtime subscription for announcements
    const subscription = supabase
      .channel('public:announcements')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'announcements'
      }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <DashboardLayout title="Dashboard">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6 space-y-8">
        {/* Welcome Header with Ocean Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 via-cyan-700 to-teal-700 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Welcome back, {profile?.name || 'User'}! 👋
                </h1>
                <p className="text-cyan-100 text-lg">
                  Here's what's happening at Amrita Vishwa Vidyapeetham today
                </p>
                <div className="flex items-center mt-4 space-x-4 text-sm text-cyan-100">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {profile?.role || "Loading..."}
                  </Badge>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Users className="h-16 w-16 text-white/80" />
                </div>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-20 translate-x-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16"></div>
        </div>

        {/* Stats Cards with Beautiful Gradients */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Available Classrooms"
            value={loading ? null : stats.classroomsAvailable}
            icon={<BookOpen />}
            href="/dashboard/classrooms"
            gradient="from-emerald-500 to-teal-600"
            bgColor="bg-emerald-50 dark:bg-emerald-900/20"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <StatsCard
            title="Available Faculty"
            value={loading ? null : stats.facultyAvailable}
            icon={<Users />}
            href="/dashboard/faculty"
            gradient="from-blue-500 to-indigo-600"
            bgColor="bg-blue-50 dark:bg-blue-900/20"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <StatsCard
            title="Today's Announcements"
            value={loading ? null : stats.todayAnnouncements}
            icon={<Bell />}
            href="/dashboard/announcements"
            gradient="from-purple-500 to-pink-600"
            bgColor="bg-purple-50 dark:bg-purple-900/20"
            iconColor="text-purple-600 dark:text-purple-400"
          />
          <StatsCard
            title="Canteen Items"
            value={loading ? null : stats.canteenItems}
            icon={<Book />}
            href="/dashboard/canteen"
            gradient="from-orange-500 to-red-600"
            bgColor="bg-orange-50 dark:bg-orange-900/20"
            iconColor="text-orange-600 dark:text-orange-400"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Announcements Section */}
          <div className="lg:col-span-2">
            <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-slate-700 via-cyan-700 to-teal-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center text-xl">
                  <Bell className="mr-3 h-6 w-6" />
                  Recent Announcements
                </CardTitle>
                <CardDescription className="text-cyan-100">
                  Latest updates and announcements from Amrita campus
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : announcements.length > 0 ? (
                  <div className="space-y-6">
                    {/* Dropdown Menu for Announcement Titles */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Select an announcement to view:
                      </label>
                      <Select value={selectedAnnouncementId} onValueChange={setSelectedAnnouncementId}>
                        <SelectTrigger className="w-full bg-gradient-to-r from-cyan-50 via-teal-50 to-blue-50 dark:from-cyan-900/20 dark:via-teal-900/20 dark:to-blue-900/20 border-cyan-300 dark:border-cyan-600 hover:border-teal-400 dark:hover:border-teal-500 transition-colors">
                          <SelectValue placeholder="🌊 Choose an announcement..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 bg-gradient-to-b from-cyan-50 to-teal-50 dark:from-cyan-900/90 dark:to-teal-900/90">
                          {announcements.map((announcement, index) => (
                            <SelectItem
                              key={announcement.id}
                              value={announcement.id}
                              className="cursor-pointer hover:bg-gradient-to-r hover:from-cyan-100 hover:to-teal-100 dark:hover:from-cyan-800/50 dark:hover:to-teal-800/50 transition-all duration-200"
                            >
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 via-teal-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg">
                                  {index + 1}
                                </div>
                                <span className="font-medium text-slate-700 dark:text-slate-200">{announcement.title}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Selected Announcement Details */}
                    {selectedAnnouncementId && (() => {
                      const selectedAnnouncement = announcements.find(a => a.id === selectedAnnouncementId);
                      return selectedAnnouncement ? (
                        <div className="bg-gradient-to-r from-slate-50 via-cyan-50 to-teal-50 dark:from-slate-700 dark:via-cyan-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-cyan-200 dark:border-cyan-700/50">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-gradient-to-br from-slate-600 via-cyan-600 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {announcements.findIndex(a => a.id === selectedAnnouncementId) + 1}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                                {selectedAnnouncement.title}
                              </h3>
                              <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                                {selectedAnnouncement.content}
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  {new Date(selectedAnnouncement.created_at).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </div>
                                <Badge variant="secondary" className="bg-white/50 dark:bg-slate-800/50">
                                  {selectedAnnouncement.target_role || 'All'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Show message when no announcement is selected */}
                    {!selectedAnnouncementId && (
                      <div className="text-center py-8 bg-slate-50 dark:bg-slate-700 rounded-xl">
                        <Bell className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                        <p className="text-slate-600 dark:text-slate-400">
                          Please select an announcement from the dropdown above to view its details.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bell className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 text-lg">No announcements yet</p>
                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Check back later for updates</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Academic Calendar Sidebar */}
          <div className="lg:col-span-1">
            <AcademicCalendar />
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

interface StatsCardProps {
  title: string;
  value: number | null;
  icon: React.ReactNode;
  href: string;
  gradient: string;
  bgColor: string;
  iconColor: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, href, gradient, bgColor, iconColor }) => {
  return (
    <Link to={href}>
      <Card className={`group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 ${bgColor}`}>
        {/* Gradient Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

        <CardContent className="relative p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                {title}
              </p>
              {value === null ? (
                <Skeleton className="h-10 w-20 mt-1" />
              ) : (
                <div className="flex items-baseline space-x-2">
                  <p className="text-4xl font-bold text-slate-900 dark:text-white">
                    {value}
                  </p>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Click to view details
              </p>
            </div>
            <div className={`p-3 rounded-2xl ${iconColor} bg-white dark:bg-slate-800 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              {React.cloneElement(icon as React.ReactElement, { className: "h-8 w-8" })}
            </div>
          </div>

          {/* Bottom accent line */}
          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default Dashboard;