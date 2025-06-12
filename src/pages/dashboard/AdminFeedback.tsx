import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Clock, CheckCircle, AlertCircle, User, Mail, Calendar, Trash2, Shield } from 'lucide-react';

interface FeedbackItem {
  id: string;
  user_name: string;
  user_email: string;
  subject: string;
  message: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
  updated_at: string;
}

const confirmDelete = (
  feedbackId: string,
  feedbackSubject: string,
  onConfirm: () => void
) => {
  toast(`Delete feedback: "${feedbackSubject}"?`, {
    description: "This action cannot be undone.",
    action: {
      label: "OK",
      onClick: onConfirm,
    },
    cancel: {
      label: "Cancel",
    },
    duration: 8000,
  });
};



export default function AdminFeedback() {
  const { profile } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deletingFeedback, setDeletingFeedback] = useState<string | null>(null);

  // Check if user is admin (handle both cases)
  const isAdmin = profile?.role === 'admin' || profile?.role === 'Admin';

  useEffect(() => {
    // Always try to fetch feedback - let the database RLS handle permissions
    fetchFeedback();

    // Set up real-time subscription for new feedback
    const subscription = supabase
      .channel('public:feedback')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'feedback'
      }, (payload) => {
        const newFeedback = payload.new as FeedbackItem;
        setFeedback(current => [newFeedback, ...current]);
        
        // Show notification for new feedback
        toast.success(`New feedback received from ${newFeedback.user_name}`, {
          description: newFeedback.subject,
          duration: 5000,
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'feedback'
      }, (payload) => {
        const updatedFeedback = payload.new as FeedbackItem;
        setFeedback(current =>
          current.map(item =>
            item.id === updatedFeedback.id ? updatedFeedback : item
          )
        );
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile]); // Changed dependency to profile instead of isAdmin

  const fetchFeedback = async () => {
    try {
      console.log('🔍 Fetching feedback as admin...');
      console.log('User profile:', profile);

      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 Feedback query result:', { data, error });

      if (error) {
        console.error('Error fetching feedback:', error);
        toast.error(`Failed to load feedback: ${error.message}`);
      } else {
        console.log(`✅ Successfully fetched ${data?.length || 0} feedback items`);
        setFeedback(data || []);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (feedbackId: string, newStatus: 'pending' | 'reviewed' | 'resolved') => {
    setUpdatingStatus(feedbackId);

    try {
      const { error } = await supabase
        .from('feedback')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', feedbackId);

      if (error) {
        console.error('Error updating feedback status:', error);
        toast.error('Failed to update feedback status');
      } else {
        toast.success(`Feedback marked as ${newStatus}`);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (feedbackId: string) => {
  setDeletingFeedback(feedbackId);

  try {
    const { error } = await supabase
      .from('feedback')
      .delete()
      .eq('id', feedbackId);

    if (error) {
      console.error('Error deleting feedback:', error);
      toast.error('Failed to delete feedback');
    } else {
      setFeedback(current => current.filter(item => item.id !== feedbackId));
      toast.success('Feedback deleted successfully');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    toast.error('An unexpected error occurred');
  } finally {
    setDeletingFeedback(null);
  }
};

const deleteFeedback = (feedbackId: string, feedbackSubject: string) => {
  confirmDelete(feedbackId, feedbackSubject, () => handleDelete(feedbackId));
};


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'reviewed':
        return <AlertCircle className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading while profile is being fetched
  if (!profile) {
    return (
      <DashboardLayout title="Loading...">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading user profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Show access denied only if we're sure the user is not an admin
  if (!isAdmin) {
    return (
      <DashboardLayout title="Access Denied">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            Only administrators can access the feedback management dashboard.
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm">
            <p><strong>Your Role:</strong> {profile?.role || 'Unknown'}</p>
            <p><strong>Required Role:</strong> admin or Admin</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const pendingCount = feedback.filter(f => f.status === 'pending').length;
  const reviewedCount = feedback.filter(f => f.status === 'reviewed').length;
  const resolvedCount = feedback.filter(f => f.status === 'resolved').length;

  return (
    <DashboardLayout title="Admin Feedback">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <MessageSquare className="w-8 h-8 text-primary" />
              Feedback Management
            </h2>
            <p className="text-muted-foreground text-lg">
              Review and manage user feedback submissions
            </p>
          </div>
        </div>

        {/* Admin Overview Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Administrator Dashboard
            </CardTitle>
            <CardDescription className="text-blue-600 dark:text-blue-300">
              Manage and review user feedback submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{feedback.length}</div>
                <div className="text-blue-700 dark:text-blue-300">Total Feedback</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingCount}</div>
                <div className="text-yellow-700 dark:text-yellow-300">Pending Review</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{reviewedCount}</div>
                <div className="text-blue-700 dark:text-blue-300">Under Review</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{resolvedCount}</div>
                <div className="text-green-700 dark:text-green-300">Resolved</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600 mb-1">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Awaiting admin attention</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Under Review</CardTitle>
                <AlertCircle className="w-5 h-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-1">{reviewedCount}</div>
              <p className="text-xs text-muted-foreground">Currently being processed</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-1">{resolvedCount}</div>
              <p className="text-xs text-muted-foreground">Completed & ready to delete</p>
            </CardContent>
          </Card>
        </div>

        {/* Feedback List */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))
          ) : feedback.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Feedback Yet</h3>
                <p className="text-muted-foreground">
                  When users submit feedback, it will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            feedback.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-gray-200 hover:border-l-primary">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-3 text-foreground">{item.subject}</CardTitle>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{item.user_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-green-500" />
                          <span className="truncate">{item.user_email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-500" />
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge className={getStatusColor(item.status)}>
                        {getStatusIcon(item.status)}
                        <span className="ml-1 capitalize">{item.status}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Feedback Message:</h4>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {item.message}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Select
                        value={item.status}
                        onValueChange={(value) => updateFeedbackStatus(item.id, value as any)}
                        disabled={updatingStatus === item.id}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="reviewed">Reviewed</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Delete button - only show for resolved feedback */}
                      {item.status === 'resolved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteFeedback(item.id, item.subject)}
                          disabled={deletingFeedback === item.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          {deletingFeedback === item.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {updatingStatus === item.id && (
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Updating...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
