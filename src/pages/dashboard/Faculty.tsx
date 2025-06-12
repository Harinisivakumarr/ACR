import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase, FacultyAvailability } from '@/lib/supabase';
import { useAuth, useRoleCheck } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, User } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FacultyMember {
  id: string;
  name: string;
  email: string;
  department: string;
  status: FacultyAvailability;
  return_date: string | null;
  notes: string | null;
}

const Faculty: React.FC = () => {
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [filteredFaculty, setFilteredFaculty] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyMember | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<FacultyAvailability | null>(null);
  const [returnDate, setReturnDate] = useState<string>('');

  const { profile } = useAuth();
  const canEditAvailability = useRoleCheck(['admin', 'faculty']);
  const isSelf = (f: FacultyMember) => profile?.email === f.email;

  useEffect(() => {
    const fetchFaculty = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('faculty_availability')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;

        setFaculty(data as FacultyMember[]);
        setFilteredFaculty(data as FacultyMember[]);
      } catch (error) {
        console.error('Error fetching faculty data:', error);
        toast({ title: 'Error', description: 'Failed to load faculty data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchFaculty();

    const subscription = supabase
      .channel('public:faculty_availability')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faculty_availability' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setFaculty(current => current.map(f => f.id === payload.new.id ? payload.new as FacultyMember : f));
          setFilteredFaculty(current => current.map(f => f.id === payload.new.id ? payload.new as FacultyMember : f));
        }
        if (payload.eventType === 'INSERT') {
          setFaculty(current => [...current, payload.new as FacultyMember]);
          setFilteredFaculty(current => [...current, payload.new as FacultyMember]);
        }
        if (payload.eventType === 'DELETE') {
          setFaculty(current => current.filter(f => f.id !== payload.old.id));
          setFilteredFaculty(current => current.filter(f => f.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFaculty(faculty);
      return;
    }

    const q = searchQuery.toLowerCase();
    setFilteredFaculty(faculty.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.department.toLowerCase().includes(q)
    ));
  }, [searchQuery, faculty]);

  const handleUpdateStatus = async () => {
    if (!selectedFaculty || !newStatus) return;

    const updateData: Partial<FacultyMember> = {
      status: newStatus,
      return_date: newStatus === 'UNAVAILABLE' ? (returnDate || null) : null,
    };

    try {
      const { error } = await supabase
        .from('faculty_availability')
        .update(updateData)
        .eq('id', selectedFaculty.id);

      if (error) throw error;

      setFaculty(current =>
        current.map(f => f.id === selectedFaculty.id ? { ...f, ...updateData } as FacultyMember : f)
      );
      setFilteredFaculty(current =>
        current.map(f => f.id === selectedFaculty.id ? { ...f, ...updateData } as FacultyMember : f)
      );

      toast({ title: 'Status Updated', description: `${selectedFaculty.name} is now ${newStatus}` });
    } catch (error) {
      console.error('Error updating faculty status:', error);
      toast({ title: 'Update Failed', description: 'Could not update faculty availability status', variant: 'destructive' });
    } finally {
      setIsDialogOpen(false);
      setSelectedFaculty(null);
      setNewStatus(null);
      setReturnDate('');
    }
  };

  const openUpdateDialog = (faculty: FacultyMember, status: FacultyAvailability) => {
    setSelectedFaculty(faculty);
    setNewStatus(status);
    setReturnDate(status === 'UNAVAILABLE' ? (faculty.return_date || '') : '');
    setIsDialogOpen(true);
  };

  const getStatusBadgeClasses = (status: FacultyAvailability) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800';
      case 'BUSY': return 'bg-yellow-100 text-yellow-800';
      case 'UNAVAILABLE': return 'bg-gray-300 text-gray-700';
      default: return '';
    }
  };

  return (
    <DashboardLayout title="Faculty Availability">
      <div className="space-y-6">
        {/* Professional Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 via-cyan-700 to-teal-700 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2">Faculty Status</h1>
                    <p className="text-cyan-100 text-lg">View and manage faculty availability</p>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <User className="h-16 w-16 text-white/80" />
                </div>
              </div>
            </div>
          </div>
          {/* Subtle decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-20 translate-x-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16"></div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <Input
            placeholder="Search by name or department"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2"><Skeleton className="h-5 w-3/4" /></CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-8 w-full mt-4" />
                </CardContent>
              </Card>
            ))
          ) : filteredFaculty.length > 0 ? (
            filteredFaculty.map(f => (
              <Card key={f.id} className={isSelf(f) ? 'border-primary border-2' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{f.name}</CardTitle>
                  <CardDescription>{f.department}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Badge className={getStatusBadgeClasses(f.status)}>{f.status}</Badge>
                    {f.status === 'UNAVAILABLE' && f.return_date && (
                      <p className="text-xs mt-1">Returns: {new Date(f.return_date).toLocaleDateString()}</p>
                    )}
                  </div>

                  {(canEditAvailability && (isSelf(f) || profile?.role === 'admin')) && (
                    <div className="flex flex-wrap gap-2">
                      {f.status !== 'AVAILABLE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600"
                          onClick={() => openUpdateDialog(f, 'AVAILABLE')}
                        >
                          Set Available
                        </Button>
                      )}
                      {f.status !== 'BUSY' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600"
                          onClick={() => openUpdateDialog(f, 'BUSY')}
                        >
                          Set Busy
                        </Button>
                      )}
                      {f.status !== 'UNAVAILABLE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-gray-600"
                          onClick={() => openUpdateDialog(f, 'UNAVAILABLE')}
                        >
                          Set Unavailable
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-10">
              <p className="text-muted-foreground">No faculty members found matching your search</p>
              <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2">
                Clear search
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Availability Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change {selectedFaculty?.name}&apos;s status to {newStatus}?
              {newStatus === 'UNAVAILABLE' && (
                <Input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="mt-3"
                />
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateStatus}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Faculty;
