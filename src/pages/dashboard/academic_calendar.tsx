import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, ChevronUp, ChevronDown, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AcademicEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  event_type: string;
  color: string;
  created_at: string;
  created_by?: string;
}

function AcademicCalendar() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  const [showEditEventDialog, setShowEditEventDialog] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState<AcademicEvent[]>([]);
  const [editingEvent, setEditingEvent] = useState<AcademicEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    message: '',
    color: 'red'
  });

  const { profile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === 'admin';

  // Simple color options for admin
  const colorOptions = [
    { value: 'red', label: 'Red', color: '#ef4444', bgColor: 'bg-red-500' },
    { value: 'yellow', label: 'Yellow', color: '#eab308', bgColor: 'bg-yellow-500' },
    { value: 'green', label: 'Green', color: '#22c55e', bgColor: 'bg-green-500' }
  ];

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch events when component mounts or date changes
  useEffect(() => {
    fetchEvents();

    // Set up real-time subscription
    const channel = supabase
      .channel('academic_calendar_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'academic_calendar'
      }, () => {
        console.log('Real-time update received');
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDate]);

  // Fetch events from database
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('academic_calendar')
        .select('*')
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get color info
  const getColorInfo = (colorValue: string) => {
    return colorOptions.find(color => color.value === colorValue) || colorOptions[0];
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  // Add new message/event
  const handleAddEvent = async () => {
    if (!newEvent.message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a message.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const colorInfo = getColorInfo(newEvent.color);
      // Get the current user's auth ID
      const { data: { user } } = await supabase.auth.getUser();

      const eventData = {
        title: newEvent.message,
        description: null,
        date: selectedDate.toISOString().split('T')[0],
        event_type: 'message',
        color: colorInfo.color,
        created_by: user?.id
      };

      const { error } = await supabase
        .from('academic_calendar')
        .insert([eventData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Message added successfully!',
      });

      setShowAddEventDialog(false);
      setNewEvent({ message: '', color: 'red' });
      fetchEvents();
    } catch (error: any) {
      console.error('Error adding message:', error);
      toast({
        title: 'Error',
        description: 'Failed to add message. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle edit event
  const handleEditEvent = (event: AcademicEvent) => {
    setEditingEvent(event);
    setNewEvent({
      message: event.title,
      color: colorOptions.find(c => c.color === event.color)?.value || 'red'
    });
    setShowEventDialog(false);
    setShowEditEventDialog(true);
  };

  // Handle update event
  const handleUpdateEvent = async () => {
    if (!editingEvent || !newEvent.message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a message.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const colorInfo = getColorInfo(newEvent.color);

      const { error } = await supabase
        .from('academic_calendar')
        .update({
          title: newEvent.message,
          color: colorInfo.color,
        })
        .eq('id', editingEvent.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Message updated successfully!',
      });

      setShowEditEventDialog(false);
      setEditingEvent(null);
      setNewEvent({ message: '', color: 'red' });
      fetchEvents();
    } catch (error: any) {
      console.error('Error updating message:', error);
      toast({
        title: 'Error',
        description: 'Failed to update message. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle delete event
  const handleDeleteEvent = (event: AcademicEvent) => {
  toast({
    title: 'Are you sure?',
    description: 'Do you really want to delete this message?',
    action: (
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={async () => {
            const { error } = await supabase
              .from('academic_calendar')
              .delete()
              .eq('id', event.id);

            if (error) {
              toast({
                title: 'Error',
                description: 'Failed to delete message. Please try again.',
                variant: 'destructive',
              });
              return;
            }

            toast({
              title: 'Deleted',
              description: 'Message deleted successfully.',
            });

            fetchEvents();
            setSelectedDateEvents(prev => prev.filter(e => e.id !== event.id));
          }}
        >
          Delete
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Just dismiss the toast
            toast({
              title: 'Cancelled',
              description: 'Message was not deleted.',
            });
          }}
        >
          Cancel
        </Button>
      </div>
    ),
  });
};
  // Format time like laptop clock
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Format date like laptop
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();

    const days = [];

    // Add previous month's trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        events: [],
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      });
    }

    // Add current month's days
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const dayEvents = getEventsForDate(date);

      days.push({
        date,
        events: dayEvents,
        isCurrentMonth: true,
        isToday,
        isSelected
      });
    }

    // Add next month's leading days
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        events: [],
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      });
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dayEvents = getEventsForDate(date);
    setSelectedDateEvents(dayEvents);

    if (dayEvents.length > 0 || isAdmin) {
      setShowEventDialog(true);
    }
  };

  const calendarDays = generateCalendarDays();
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Card className="w-full bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-700 shadow-2xl">
      {/* Digital Clock Header */}
      <CardHeader className="pb-2 text-center">
        <div className="space-y-1">
          <div className="text-2xl font-mono font-bold tracking-wider text-blue-400">
            {formatTime(currentTime)}
          </div>
          <div className="text-xs text-slate-300">
            {formatDate(currentTime)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Calendar Toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCalendar(!showCalendar)}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar
            {showCalendar ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>
        </div>

        {/* Calendar Grid */}
        {showCalendar && (
          <div className="space-y-3">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="text-slate-300 hover:text-white hover:bg-slate-700 p-1"
              >
                ‹
              </Button>
              <div className="text-sm font-medium text-slate-200">
                {monthYear}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="text-slate-300 hover:text-white hover:bg-slate-700 p-1"
              >
                ›
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0.5 text-xs">
              {/* Day headers */}
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={index} className="p-1 text-center text-slate-400 font-medium text-xs">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, index) => (
                <button
                  key={index}
                  onClick={() => handleDateClick(day.date)}
                  className={`
                    aspect-square p-0.5 text-xs rounded transition-all duration-200 hover:bg-slate-700 relative
                    ${day.isCurrentMonth ? 'text-slate-200' : 'text-slate-500'}
                    ${day.isToday ? 'bg-blue-600 text-white font-bold ring-1 ring-blue-400' : ''}
                    ${day.isSelected && !day.isToday ? 'bg-slate-600 text-white' : ''}
                    ${!day.isCurrentMonth ? 'opacity-50' : ''}
                  `}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span>{day.date.getDate()}</span>
                    {/* Event indicators */}
                    {day.events.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                        {day.events.slice(0, 3).map((event: AcademicEvent, eventIndex: number) => {
                          return (
                            <div
                              key={eventIndex}
                              className="w-1 h-1 rounded-full"
                              style={{ backgroundColor: event.color }}
                              title={event.title}
                            />
                          );
                        })}
                        {day.events.length > 3 && (
                          <div className="text-xs text-slate-400">+</div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Date Info */}
            {selectedDate && (
              <div className="mt-3 p-2 bg-slate-700 rounded text-center">
                <div className="text-xs text-slate-300">Selected Date</div>
                <div className="text-sm font-medium text-white">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex justify-center space-x-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCurrentDate(new Date());
              setSelectedDate(new Date());
            }}
            className="text-xs text-slate-300 hover:text-white hover:bg-slate-700"
          >
            Today
          </Button>
        </div>
      </CardContent>

      {/* Event Details Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => {
                    setShowEventDialog(false);
                    setShowAddEventDialog(true);
                  }}
                  className="ml-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Message
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-96">
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No events scheduled for this date</p>
                {isAdmin && (
                  <p className="text-sm mt-2">Click "Add Message" to create one</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => {
                  return (
                    <div key={event.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{event.title}</h4>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {event.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="secondary"
                              className="text-xs"
                              style={{
                                backgroundColor: `${event.color}20`,
                                color: event.color,
                                borderColor: event.color
                              }}
                            >
                              Message
                            </Badge>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditEvent(event)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEvent(event)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Message Dialog */}
      <Dialog open={showAddEventDialog} onOpenChange={setShowAddEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Message</DialogTitle>
            <DialogDescription>
              Add a message for {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={newEvent.message}
                onChange={(e) => setNewEvent(prev => ({ ...prev, message: e.target.value }))}
                placeholder="e.g., End Semester Exams Start, Holiday, Assignment Due..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color *</Label>
              <Select
                value={newEvent.color}
                onValueChange={(value) => {
                  setNewEvent(prev => ({
                    ...prev,
                    color: value
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: color.color }}
                        />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Preview */}
            {newEvent.message && (
              <div className="p-3 border rounded-lg bg-gray-50">
                <Label className="text-sm font-medium">Preview:</Label>
                <div className="mt-2">
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: `${getColorInfo(newEvent.color).color}20`,
                      color: getColorInfo(newEvent.color).color,
                      borderColor: getColorInfo(newEvent.color).color
                    }}
                  >
                    {newEvent.message}
                  </Badge>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddEventDialog(false);
                  setNewEvent({ message: '', color: 'red' });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddEvent}>
                Add Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Message Dialog */}
      <Dialog open={showEditEventDialog} onOpenChange={setShowEditEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
            <DialogDescription>
              Edit the message for {editingEvent?.date && new Date(editingEvent.date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-message">Message *</Label>
              <Textarea
                id="edit-message"
                value={newEvent.message}
                onChange={(e) => setNewEvent(prev => ({ ...prev, message: e.target.value }))}
                placeholder="e.g., End Semester Exams Start, Holiday, Assignment Due..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-color">Color *</Label>
              <Select
                value={newEvent.color}
                onValueChange={(value) => {
                  setNewEvent(prev => ({
                    ...prev,
                    color: value
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${color.bgColor}`}
                        />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Preview */}
            <div className="p-3 border rounded-lg bg-muted">
              <div className="text-sm text-muted-foreground mb-2">Preview:</div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="text-xs"
                  style={{
                    backgroundColor: `${getColorInfo(newEvent.color).color}20`,
                    color: getColorInfo(newEvent.color).color,
                    borderColor: getColorInfo(newEvent.color).color
                  }}
                >
                  {newEvent.message || 'Your message here'}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditEventDialog(false);
                setEditingEvent(null);
                setNewEvent({ message: '', color: 'red' });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateEvent}>
              Update Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default AcademicCalendar;