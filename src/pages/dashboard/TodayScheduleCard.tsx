import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Adjust path if your supabase client is elsewhere
import { Calendar as CalendarIcon } from 'lucide-react'; // Renamed to CalendarIcon to avoid conflict with 'Calendar' in older context

// IMPORTANT: These imports are crucial for the 'Card' component rendering and consistent styling
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton'; // For loading states
import { Separator } from '@/components/ui/separator'; // For separators between events, consistent with announcements

interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string; // Matches DB TIMESTAMPTZ
  end_time?: string;   // Matches DB TIMESTAMPTZ, optional
  date: string;        // Matches DB DATE
  type?: string;
  location?: string;
  target_roles?: string[]; // Matches DB text[]
}

function TodayScheduleCard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      setError(null);
      try {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`; // e.g., "2025-05-23"

        // Fetch events for today's date
        // RLS policies on Supabase will automatically filter based on the logged-in user's role
        const { data, error } = await supabase
          .from('campus_schedule')
          .select('*')
          .eq('date', formattedDate)
          .order('start_time', { ascending: true }); // Sort by start time

        if (error) {
          throw error;
        }
        setEvents(data as Event[]);
      } catch (err: any) {
        console.error('Error fetching events:', err.message);
        setError('Failed to load schedule. ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();

    // Optional: Realtime subscription for immediate updates if schedule changes
    const channel = supabase
      .channel('campus_schedule_changes_today') // Use a unique channel name
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campus_schedule' }, payload => {
        // When a change occurs, re-fetch the events to ensure UI is up-to-date
        console.log('Realtime change for campus_schedule received:', payload);
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel); // Clean up subscription on component unmount
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarIcon className="mr-2 h-5 w-5" /> Today's Schedule
        </CardTitle>
        <CardDescription>Overview of campus activities for today</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => ( // Show multiple skeleton items for loading
              <div key={i} className="flex flex-col space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                {i < 3 && <Separator className="my-2" />} {/* Separator between skeletons */}
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-red-500 py-4 text-center">
            <p>Error: {error}</p>
            <p>Please check your network connection or try again later.</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No events scheduled for today ({new Date().toLocaleDateString()}).</p>
          </div>
        ) : (
          <div className="space-y-4"> {/* Use space-y-4 for consistent spacing */}
            {events.map((event) => (
              <div key={event.id} className="space-y-2">
                <h3 className="font-semibold">{event.title}</h3>
                {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
                <p className="text-xs text-gray-500">
                  {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {event.end_time ? ` - ${new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  {event.location && ` at ${event.location}`}
                  {event.type && ` (${event.type})`}
                </p>
                {event.target_roles && event.target_roles.length > 0 && (
                  <p className="text-xs text-gray-400">Target: {event.target_roles.join(', ')}</p>
                )}
                <Separator className="my-2" /> {/* Separator between events */}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TodayScheduleCard;