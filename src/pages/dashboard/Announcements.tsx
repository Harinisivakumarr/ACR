import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth, useRoleCheck } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Trash2, PencilLine, Bell } from 'lucide-react';

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
  const isAdmin = useRoleCheck(['admin']);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        let query = supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });

        if (profile) {
          if (profile.role === 'admin') {
            query = query.or(
              `target_role.is.null,target_role.eq.admin,created_by.eq.${profile.name}`
            );
          } else {
            query = query.or(
              `target_role.is.null,target_role.eq.${profile.role}`
            );
          }
        }

        const { data, error } = await query;
        if (error) throw error;
        setAnnouncements(data as Announcement[]);
      } catch (error) {
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

    const subscription = supabase
      .channel('public:announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const announcement = payload.new as Announcement;
          if (
            profile?.role === 'admin' ||
            !announcement.target_role ||
            announcement.target_role === profile?.role ||
            announcement.created_by === profile?.name
          ) {
            setAnnouncements(current => [announcement, ...current]);
          }
        } else if (payload.eventType === 'UPDATE') {
          setAnnouncements(current =>
            current.map(a => (a.id === payload.new.id ? payload.new as Announcement : a))
          );
        } else if (payload.eventType === 'DELETE') {
          setAnnouncements(current =>
            current.filter(a => a.id !== payload.old.id)
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

  const deleteAnnouncement = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('announcements').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Announcement has been deleted' });
      setDeleteId(null);
    }
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditing(announcement);
    setEditTitle(announcement.title);
    setEditContent(announcement.content);
  };

  const updateAnnouncement = async () => {
    if (!editing) return;
    const { error } = await supabase.from('announcements').update({
      title: editTitle,
      content: editContent,
    }).eq('id', editing.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: 'Announcement updated successfully' });
      setEditing(null);
    }
  };

  return (
    <DashboardLayout title="Announcements">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Campus Announcements</h2>
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
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-1/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))
          ) : announcements.length ? (
            announcements.map(announcement => (
              <Card key={announcement.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      {announcement.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {announcement.target_role && (
                        <Badge variant="outline">For: {announcement.target_role}</Badge>
                      )}
                      <Badge variant="secondary">{formatDate(announcement.created_at)}</Badge>
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(announcement)}>
                            <PencilLine className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(announcement.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Announcement?</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete this announcement?
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
                                <Button variant="destructive" onClick={deleteAnnouncement}>Delete</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                    </div>
                  </div>
                  <CardDescription>By {announcement.created_by}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line">{announcement.content}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-10">
                <p className="text-muted-foreground">No announcements found</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" />
              <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="Content" rows={5} />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={updateAnnouncement}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Announcements;