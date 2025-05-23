import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase, ClassroomStatus } from '@/lib/supabase';
import { useAuth, useRoleCheck } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
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

interface Classroom {
  id: string;
  name: string;
  building: string;
  floor: number;
  status: ClassroomStatus;
  last_updated: string;
  updated_by: string;
}

const Classrooms: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ClassroomStatus | null>(null);
  const [statusFilter, setStatusFilter] = useState<ClassroomStatus | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const { profile } = useAuth();
  const canEditClassroom = useRoleCheck(['admin', 'faculty', 'cr']);

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const { data, error } = await supabase
          .from('classrooms')
          .select('*')
          .order('building')
          .order('floor')
          .order('name');

        if (error) throw error;

        setClassrooms(data as Classroom[]);
      } catch (error) {
        console.error('Error fetching classrooms:', error);
        toast({
          title: 'Error',
          description: 'Failed to load classroom data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchClassrooms();

    const subscription = supabase
      .channel('public:classrooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classrooms' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setClassrooms(current =>
            current.map(c => (c.id === payload.new.id ? payload.new as Classroom : c))
          );
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdateStatus = async () => {
    if (!selectedClassroom || !newStatus || !profile) return;

    try {
      const { error } = await supabase
        .from('classrooms')
        .update({
          status: newStatus,
          last_updated: new Date().toISOString(),
          updated_by: profile.name,
        })
        .eq('id', selectedClassroom.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `${selectedClassroom.name} is now ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating classroom status:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update classroom status',
        variant: 'destructive',
      });
    } finally {
      setIsDialogOpen(false);
      setSelectedClassroom(null);
      setNewStatus(null);
    }
  };

  const openUpdateDialog = (classroom: Classroom, status: ClassroomStatus) => {
    setSelectedClassroom(classroom);
    setNewStatus(status);
    setIsDialogOpen(true);
  };

  // Filter classrooms by status and search term (case-insensitive)
  const filteredClassrooms = classrooms.filter(c => {
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout title="Classroom Availability">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header + Controls */}
        <section>
          {/* Search Bar styled like Faculty's */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <Input
              type="text"
              placeholder="Search classrooms..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            {['All', 'Available', 'Occupied', 'Maintenance'].map(status => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                onClick={() => setStatusFilter(status as ClassroomStatus | 'All')}
                size="sm"
              >
                {status}
              </Button>
            ))}
          </div>
        </section>

        {/* Classroom Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-8 w-full mt-4" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            filteredClassrooms.map(classroom => (
              <Card key={classroom.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{classroom.name}</CardTitle>
                  <CardDescription>
                    {classroom.building}, Floor {classroom.floor}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Badge
                      className={
                        classroom.status === 'Available'
                          ? 'bg-green-100 text-green-700'
                          : classroom.status === 'Occupied'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }
                    >
                      {classroom.status}
                    </Badge>

                    {canEditClassroom && (
                      <div className="flex flex-wrap gap-2">
                        {['Available', 'Occupied', 'Maintenance']
                          .filter(status => status !== classroom.status)
                          .map(status => (
                            <Button
                              key={status}
                              size="sm"
                              variant="outline"
                              className={
                                status === 'Available'
                                  ? 'text-green-600'
                                  : status === 'Occupied'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                              }
                              onClick={() => openUpdateDialog(classroom, status as ClassroomStatus)}
                            >
                              Set {status}
                            </Button>
                          ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Classroom Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change <strong>{selectedClassroom?.name}</strong> to{' '}
              <strong>{newStatus}</strong>?
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

export default Classrooms;
