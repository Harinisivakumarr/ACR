
import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase, ClassroomStatus } from '@/lib/supabase';
import { useAuth, useRoleCheck } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
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
  
  const { profile } = useAuth();
  const canEditClassroom = useRoleCheck(['Admin', 'Faculty', 'CR']);

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const { data, error } = await supabase
          .from('classrooms')
          .select('*')
          .order('building')
          .order('floor')
          .order('name');
          
        if (error) {
          throw error;
        }
        
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
    
    // Set up realtime subscription
    const subscription = supabase
      .channel('public:classrooms')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'classrooms' 
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setClassrooms(currentClassrooms => 
            currentClassrooms.map(classroom => 
              classroom.id === payload.new.id ? payload.new as Classroom : classroom
            )
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
        
      if (error) {
        throw error;
      }
      
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

  return (
    <DashboardLayout title="Classroom Availability">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">
            Classroom Status
          </h2>
          <p className="text-muted-foreground">
            View and manage classroom availability across campus
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index}>
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
            classrooms.map((classroom) => (
              <Card key={classroom.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{classroom.name}</CardTitle>
                  <CardDescription>
                    {classroom.building}, Floor {classroom.floor}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Badge
                        className={`
                          ${classroom.status === 'Available' ? 'status-available' : ''}
                          ${classroom.status === 'Occupied' ? 'status-occupied' : ''}
                          ${classroom.status === 'Maintenance' ? 'status-maintenance' : ''}
                        `}
                      >
                        {classroom.status}
                      </Badge>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        Last updated: {new Date(classroom.last_updated).toLocaleString()}
                        {classroom.updated_by && ` by ${classroom.updated_by}`}
                      </p>
                    </div>
                    
                    {canEditClassroom && (
                      <div className="flex flex-wrap gap-2">
                        {classroom.status !== 'Available' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-green-600"
                            onClick={() => openUpdateDialog(classroom, 'Available')}
                          >
                            Set Available
                          </Button>
                        )}
                        
                        {classroom.status !== 'Occupied' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600"
                            onClick={() => openUpdateDialog(classroom, 'Occupied')}
                          >
                            Set Occupied
                          </Button>
                        )}
                        
                        {classroom.status !== 'Maintenance' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-yellow-600"
                            onClick={() => openUpdateDialog(classroom, 'Maintenance')}
                          >
                            Set Maintenance
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Classroom Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change {selectedClassroom?.name} to {newStatus}?
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
