// pages/dashboard/create-announcement.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { useAuth, useRoleCheck } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const CreateAnnouncement: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = useRoleCheck(['admin']);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect non-admins immediately
  useEffect(() => {
    if (isAdmin === false) {
      toast({
        title: 'Unauthorized',
        description: 'You do not have permission to access this page.',
        variant: 'destructive',
      });
      navigate('/dashboard/announcements', { replace: true });
    }
  }, [isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and content cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('announcements').insert({
      title: title.trim(),
      content: content.trim(),
      created_by: profile?.name || 'admin',
      target_role: targetRole, // null means “all roles”
    });

    if (error) {
      console.error('Insert error:', error);
      toast({
        title: 'Error',
        description: 'Could not create announcement. Check console.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Announcement created!',
      });
      navigate('/dashboard/announcements');
    }

    setLoading(false);
  };

  return (
    <DashboardLayout title="Create Announcement">
      <form
        onSubmit={handleSubmit}
        className="max-w-xl mx-auto space-y-6 py-8"
      >
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="e.g. Library closed today"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            rows={6}
            placeholder="Write your announcement here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="targetRole">Target Role</Label>
          <Select
            value={targetRole || ''}
            onValueChange={(val) =>
              setTargetRole(val === '' ? null : val)
            }
          >
            <SelectTrigger id="targetRole">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
              <SelectItem value="cr">CR</SelectItem>
              <SelectItem value="canteen_staff">Canteen Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? 'Posting…' : 'Post Announcement'}
        </Button>
      </form>
    </DashboardLayout>
  );
};

export default CreateAnnouncement;