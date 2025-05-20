
import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth, useRoleCheck } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  created_by: string;
  target_role: string | null;
}

const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { profile } = useAuth();
  const isAdmin = useRoleCheck(['Admin']);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        let query = supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });
          
        // If not admin, only show announcements targeted to their role or null (all roles)
        if (profile && profile.role !== 'Admin') {
          query = query.or(`target_role.is.null,target_role.eq.${profile.role}`);
        }
        
        const { data, error } = await query;
          
        if (error) {
          throw error;
        }
        
        setAnnouncements(data as Announcement[]);
      } catch (error) {
        console.error('Error fetching announcements:', error);
        toast({
          title: 'Error',
          description: 'Failed to load announcements',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnnouncements();
    
    // Set up realtime subscription
    const subscription = supabase
      .channel('public:announcements')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'announcements' 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          // Only add if it's targeted for the current user's role or all roles
          const announcement = payload.new as Announcement;
          if (profile?.role === 'Admin' || 
              !announcement.target_role || 
              announcement.target_role === profile?.role) {
            setAnnouncements(current => [announcement, ...current]);
          }
        } else if (payload.eventType === 'UPDATE') {
          setAnnouncements(current => 
            current.map(announcement => 
              announcement.id === payload.new.id ? payload.new as Announcement : announcement
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setAnnouncements(current => 
            current.filter(announcement => announcement.id !== payload.old.id)
          );
        }
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [profile]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout title="Announcements">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              Campus Announcements
            </h2>
            <p className="text-muted-foreground">
              Important updates and notices from Amrita campus
            </p>
          </div>
          
          {isAdmin && (
            <Button onClick={() => window.location.href = "/dashboard/create-announcement"}>
              Create Announcement
            </Button>
          )}
        </div>
        
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : announcements.length > 0 ? (
            announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center">
                      <Bell className="mr-2 h-4 w-4" />
                      {announcement.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {announcement.target_role && (
                        <Badge variant="outline">
                          For: {announcement.target_role}
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {formatDate(announcement.created_at)}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    By {announcement.created_by}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line">{announcement.content}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-10">
                <p className="text-muted-foreground">No announcements yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Announcements;
