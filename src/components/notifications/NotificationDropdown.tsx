import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Clock, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

interface NotificationItem {
  notification_id: string;
  user_id: string;
  is_read: boolean;
  notification_created_at: string;
  announcement_id: string;
  title: string;
  content: string;
  announcement_created_at: string;
  created_by: string;
  target_role: string | null;
}

export const NotificationDropdown: React.FC = () => {
  const { profile, user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadNotifications();

      // Set up real-time subscription for new announcements (fallback method)
      const announcementSubscription = supabase
        .channel('announcements_for_notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements'
        }, async (payload) => {
          const newAnnouncement = payload.new as any;

          // Check if this announcement is relevant to the current user
          const isRelevant = !newAnnouncement.target_role ||
                            newAnnouncement.target_role === profile?.role ||
                            profile?.role === 'admin' || profile?.role === 'Admin';

          if (isRelevant && newAnnouncement.created_by !== profile?.name) {
            // Create notification record manually (fallback if trigger doesn't work)
            try {
              const { error } = await supabase
                .from('user_notifications')
                .insert({
                  user_id: user.id,
                  announcement_id: newAnnouncement.id,
                  is_read: false
                });

              if (!error) {
                // Fetch the notification details and add to state
                const { data: notificationData } = await supabase
                  .from('unread_notifications')
                  .select('*')
                  .eq('announcement_id', newAnnouncement.id)
                  .eq('user_id', user.id)
                  .single();

                if (notificationData) {
                  setNotifications(current => [notificationData, ...current]);
                  setUnreadCount(current => current + 1);

                  // Show toast notification
                  toast.success(`New Announcement: ${newAnnouncement.title}`, {
                    description: newAnnouncement.content.substring(0, 100) + '...',
                    duration: 5000,
                  });
                }
              }
            } catch (error) {
              console.error('Error creating notification:', error);
            }
          }
        })
        .subscribe();

      return () => {
        announcementSubscription.unsubscribe();
      };
    }
  }, [user, profile]);

  const fetchUnreadNotifications = async () => {
    if (!user) return;

    try {
      console.log('🔍 Fetching notifications for user:', user.id);

      const { data, error } = await supabase
        .from('unread_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('notification_created_at', { ascending: false });

      console.log('📊 Notifications query result:', { data, error });

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.length || 0);

      console.log(`✅ Found ${data?.length || 0} unread notifications`);
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTargetRoleIcon = (targetRole: string | null) => {
    if (!targetRole) return <Users className="w-3 h-3 text-blue-500" />;
    if (targetRole === 'admin' || targetRole === 'Admin') return <AlertCircle className="w-3 h-3 text-red-500" />;
    return <Users className="w-3 h-3 text-green-500" />;
  };

  const getTargetRoleText = (targetRole: string | null) => {
    if (!targetRole) return 'All Users';
    return targetRole.charAt(0).toUpperCase() + targetRole.slice(1);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      // Remove from local state
      setNotifications(current =>
        current.filter(notification => notification.notification_id !== notificationId)
      );
      setUnreadCount(current => Math.max(0, current - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;

    try {
      const notificationIds = notifications.map(n => n.notification_id);

      const { error } = await supabase
        .from('user_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .in('id', notificationIds);

      if (error) throw error;

      // Clear local state
      setNotifications([]);
      setUnreadCount(0);

      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <>
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-6 px-2"
                >
                  Mark all read
                </Button>
              </>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-96">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No new notifications</p>
              <p className="text-xs mt-1">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.notification_id}
                className="flex-col items-start p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => markNotificationAsRead(notification.notification_id)}
              >
                <div className="w-full">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-sm line-clamp-1">{notification.title}</h4>
                    <div className="flex items-center gap-1 ml-2">
                      {getTargetRoleIcon(notification.target_role)}
                      <Clock className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {notification.content}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>By {notification.created_by}</span>
                    <div className="flex items-center gap-2">
                      <span>{getTargetRoleText(notification.target_role)}</span>
                      <span>{formatTimeAgo(notification.announcement_created_at)}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    Click to mark as read
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-center text-sm text-primary cursor-pointer"
          onClick={() => window.location.href = '/dashboard/announcements'}
        >
          View All Announcements
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
