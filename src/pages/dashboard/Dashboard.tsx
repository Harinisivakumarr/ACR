
import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, Bell, Book, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

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
      <div className="grid gap-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">
            Welcome, {profile?.name || 'User'}!
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening at Amrita Vishwa Vidyapeetham today
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            title="Available Classrooms"
            value={loading ? null : stats.classroomsAvailable}
            icon={<BookOpen />}
            href="/dashboard/classrooms"
          />
          <StatsCard 
            title="Available Faculty"
            value={loading ? null : stats.facultyAvailable}
            icon={<Users />}
            href="/dashboard/faculty"
          />
          <StatsCard 
            title="Today's Announcements"
            value={loading ? null : stats.todayAnnouncements}
            icon={<Bell />}
            href="/dashboard/announcements"
          />
          <StatsCard 
            title="Canteen Items"
            value={loading ? null : stats.canteenItems}
            icon={<Book />}
            href="/dashboard/canteen"
          />
        </div>
        
        <Separator className="my-2" />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" /> Recent Announcements
            </CardTitle>
            <CardDescription>
              Latest updates and announcements from Amrita campus
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/5" />
                    <Separator className="my-2" />
                  </div>
                ))}
              </div>
            ) : announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="space-y-2">
                    <div className="flex justify-between">
                      <h3 className="font-semibold">{announcement.title}</h3>
                      <Badge variant="outline">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{announcement.content}</p>
                    <Badge variant="secondary">{announcement.target_role || 'All'}</Badge>
                    <Separator className="my-2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No announcements yet</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" /> Today's Schedule
            </CardTitle>
            <CardDescription>
              Overview of campus activities for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Calendar features coming soon
                </p>
                <Link to="/dashboard/classrooms" className="text-primary underline">
                  View classroom availability
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

interface StatsCardProps {
  title: string;
  value: number | null;
  icon: React.ReactNode;
  href: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, href }) => {
  return (
    <Link to={href}>
      <Card className="hover:shadow-md transition-shadow card-hover">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium">{title}</p>
              {value === null ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-3xl font-bold">{value}</p>
              )}
            </div>
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default Dashboard;
