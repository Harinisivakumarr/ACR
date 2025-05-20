
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

interface FacultyMember {
  id: string;
  name: string;
  email: string;
  department: string;
  status: FacultyAvailability;
  return_date: string | null;
  last_updated: string;
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
  
  const { profile } = useAuth();
  const canEditAvailability = useRoleCheck(['Admin', 'Faculty']);
  const isSelf = (faculty: FacultyMember) => profile?.email === faculty.email;

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const { data, error } = await supabase
          .from('faculty_availability')
          .select('*')
          .order('name');
          
        if (error) {
          throw error;
        }
        
        setFaculty(data as FacultyMember[]);
        setFilteredFaculty(data as FacultyMember[]);
      } catch (error) {
        console.error('Error fetching faculty data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load faculty data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchFaculty();
    
    // Set up realtime subscription
    const subscription = supabase
      .channel('public:faculty_availability')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'faculty_availability' 
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setFaculty(currentFaculty => 
            currentFaculty.map(faculty => 
              faculty.id === payload.new.id ? payload.new as FacultyMember : faculty
            )
          );
          
          // Update filtered faculty as well
          setFilteredFaculty(currentFiltered => 
            currentFiltered.map(faculty => 
              faculty.id === payload.new.id ? payload.new as FacultyMember : faculty
            )
          );
        }
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filter faculty based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFaculty(faculty);
      return;
    }
    
    const lowercaseQuery = searchQuery.toLowerCase();
    const filtered = faculty.filter(faculty => 
      faculty.name.toLowerCase().includes(lowercaseQuery) ||
      faculty.department.toLowerCase().includes(lowercaseQuery)
    );
    
    setFilteredFaculty(filtered);
  }, [searchQuery, faculty]);

  const handleUpdateStatus = async () => {
    if (!selectedFaculty || !newStatus || !profile) return;
    
    try {
      const updateData: any = {
        status: newStatus,
        last_updated: new Date().toISOString(),
      };
      
      // Clear return_date if status is not UNAVAILABLE
      if (newStatus !== 'UNAVAILABLE') {
        updateData.return_date = null;
      }
      
      const { error } = await supabase
        .from('faculty_availability')
        .update(updateData)
        .eq('id', selectedFaculty.id);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Status Updated',
        description: `${selectedFaculty.name} is now ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating faculty status:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update faculty availability status',
        variant: 'destructive',
      });
    } finally {
      setIsDialogOpen(false);
      setSelectedFaculty(null);
      setNewStatus(null);
    }
  };

  const openUpdateDialog = (faculty: FacultyMember, status: FacultyAvailability) => {
    setSelectedFaculty(faculty);
    setNewStatus(status);
    setIsDialogOpen(true);
  };

  const getStatusBadgeClasses = (status: FacultyAvailability) => {
    switch (status) {
      case 'AVAILABLE':
        return 'status-available';
      case 'BUSY':
        return 'status-busy';
      case 'UNAVAILABLE':
        return 'status-unavailable';
      default:
        return '';
    }
  };

  return (
    <DashboardLayout title="Faculty Availability">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">
            Faculty Status
          </h2>
          <p className="text-muted-foreground">
            View and manage faculty availability
          </p>
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
          ) : filteredFaculty.length > 0 ? (
            filteredFaculty.map((facultyMember) => (
              <Card key={facultyMember.id} className={isSelf(facultyMember) ? 'border-primary border-2' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{facultyMember.name}</CardTitle>
                  <CardDescription>
                    {facultyMember.department}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Badge className={getStatusBadgeClasses(facultyMember.status)}>
                        {facultyMember.status}
                      </Badge>
                      
                      {facultyMember.status === 'UNAVAILABLE' && facultyMember.return_date && (
                        <p className="text-xs mt-1">
                          Returns: {new Date(facultyMember.return_date).toLocaleDateString()}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        Last updated: {new Date(facultyMember.last_updated).toLocaleString()}
                      </p>
                      
                      {facultyMember.notes && (
                        <p className="text-sm mt-2 italic">{facultyMember.notes}</p>
                      )}
                    </div>
                    
                    {(canEditAvailability && (isSelf(facultyMember) || profile?.role === 'Admin')) && (
                      <div className="flex flex-wrap gap-2">
                        {facultyMember.status !== 'AVAILABLE' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-green-600"
                            onClick={() => openUpdateDialog(facultyMember, 'AVAILABLE')}
                          >
                            Set Available
                          </Button>
                        )}
                        
                        {facultyMember.status !== 'BUSY' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-orange-600"
                            onClick={() => openUpdateDialog(facultyMember, 'BUSY')}
                          >
                            Set Busy
                          </Button>
                        )}
                        
                        {facultyMember.status !== 'UNAVAILABLE' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-gray-600"
                            onClick={() => openUpdateDialog(facultyMember, 'UNAVAILABLE')}
                          >
                            Set Unavailable
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-10">
              <p className="text-muted-foreground">No faculty members found matching your search</p>
              <Button 
                variant="link" 
                onClick={() => setSearchQuery('')}
                className="mt-2"
              >
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
              Are you sure you want to change {selectedFaculty?.name}'s status to {newStatus}?
              {newStatus === 'UNAVAILABLE' && (
                <p className="mt-2">
                  Note: You'll be able to set a return date after confirming this change.
                </p>
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
