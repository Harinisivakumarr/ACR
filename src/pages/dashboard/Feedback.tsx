import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, CheckCircle } from 'lucide-react';

export default function Feedback() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error('Please fill in both subject and message fields.');
      return;
    }

    if (!user || !profile) {
      toast.error('You must be logged in to submit feedback.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('feedback')
        .insert([
          {
            user_id: user.id,
            user_name: profile.name || 'Anonymous',
            user_email: profile.email,
            subject: formData.subject.trim(),
            message: formData.message.trim(),
            status: 'pending'
          }
        ]);

      if (error) {
        console.error('Feedback submission error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error(`Failed to submit feedback: ${error.message || 'Unknown error'}. Please try again.`);
      } else {
        toast.success('Feedback submitted successfully! Thank you for your input.');
        setSubmitted(true);
        setFormData({ subject: '', message: '' });
        
        // Reset submitted state after 3 seconds
        setTimeout(() => setSubmitted(false), 3000);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewFeedback = () => {
    setSubmitted(false);
    setFormData({ subject: '', message: '' });
  };

  if (submitted) {
    return (
      <DashboardLayout title="Feedback">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl text-green-600 dark:text-green-400">
                Feedback Submitted!
              </CardTitle>
              <CardDescription className="text-lg">
                Thank you for your feedback. Our admin team will review it shortly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleNewFeedback} className="mt-4">
                Submit Another Feedback
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Feedback">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            Submit Feedback
          </h2>
          <p className="text-muted-foreground text-lg">
            Help us improve your campus experience. Share your thoughts, suggestions, or report any issues.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Feedback</CardTitle>
            <CardDescription>
              All feedback is sent directly to the admin team and will be reviewed promptly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-medium">
                  Subject *
                </Label>
                <Input
                  id="subject"
                  name="subject"
                  placeholder="Brief description of your feedback topic"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">
                  Message *
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Please provide detailed feedback, suggestions, or describe any issues you've encountered..."
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full resize-none"
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Your information:</strong><br />
                  Name: {profile?.name || 'Not available'}<br />
                  Email: {profile?.email || 'Not available'}<br />
                  Role: {profile?.role || 'Not available'}
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={loading || !formData.subject.trim() || !formData.message.trim()}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Your feedback helps us make Amrita Campus Radar better for everyone. 
            Thank you for taking the time to share your thoughts!
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
