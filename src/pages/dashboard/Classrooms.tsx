import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

import { Button } from '@/components/ui/button';
import { supabase, ClassroomStatus } from '@/lib/supabase';
import { useAuth, useRoleCheck } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Search,
  Building,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  Eye,
  MapPin,
  Clock,
  User,
  Zap,
  Star,
  Activity
} from 'lucide-react';
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

  // Get status statistics for the hero section
  const statusStats = {
    total: classrooms.length,
    available: classrooms.filter(c => c.status === 'Available').length,
    occupied: classrooms.filter(c => c.status === 'Occupied').length,
    maintenance: classrooms.filter(c => c.status === 'Maintenance').length,
  };

  return (
    <DashboardLayout title="Classroom Availability">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6 space-y-8">
        {/* Professional Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 via-cyan-700 to-teal-700 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <Building className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2">Classroom Availability</h1>
                    <p className="text-cyan-100 text-lg">Real-time campus classroom monitoring</p>
                  </div>
                </div>

                {/* Professional Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-white" />
                      <span className="text-sm font-medium">Total Rooms</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{statusStats.total}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-300" />
                      <span className="text-sm font-medium">Available</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-emerald-300">{statusStats.available}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-300" />
                      <span className="text-sm font-medium">Occupied</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-red-300">{statusStats.occupied}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-300" />
                      <span className="text-sm font-medium">Maintenance</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-orange-300">{statusStats.maintenance}</p>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Activity className="h-16 w-16 text-white/80" />
                </div>
              </div>
            </div>
          </div>
          {/* Subtle decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-20 translate-x-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16"></div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search classrooms..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-cyan-500 dark:focus:border-cyan-400"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            {[
              { key: 'All', label: 'All' },
              { key: 'Available', label: 'Available' },
              { key: 'Occupied', label: 'Occupied' },
              { key: 'Maintenance', label: 'Maintenance' }
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={statusFilter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(key as ClassroomStatus | 'All')}
                className={`
                  transition-all duration-200
                  ${statusFilter === key
                    ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }
                `}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Classroom Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md border border-slate-200 dark:border-slate-700">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ))
          ) : (
            filteredClassrooms.map((classroom) => {
              const statusConfig = {
                Available: {
                  bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
                  textColor: 'text-emerald-800 dark:text-emerald-200',
                  borderColor: 'border-emerald-300 dark:border-emerald-700',
                  icon: CheckCircle
                },
                Occupied: {
                  bgColor: 'bg-red-100 dark:bg-red-900/30',
                  textColor: 'text-red-800 dark:text-red-200',
                  borderColor: 'border-red-300 dark:border-red-700',
                  icon: XCircle
                },
                Maintenance: {
                  bgColor: 'bg-orange-100 dark:bg-orange-900/30',
                  textColor: 'text-orange-800 dark:text-orange-200',
                  borderColor: 'border-orange-300 dark:border-orange-700',
                  icon: AlertTriangle
                }
              };

              const config = statusConfig[classroom.status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={classroom.id}
                  className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-200"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                        {classroom.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <MapPin className="h-4 w-4" />
                        <span>{classroom.building}, Floor {classroom.floor}</span>
                      </div>
                    </div>
                    <StatusIcon className={`h-5 w-5 ${config.textColor}`} />
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      {classroom.status}
                    </span>
                  </div>

                  {/* Updated Info */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                    <Clock className="h-3 w-3" />
                    <span>Updated by {classroom.updated_by}</span>
                  </div>

                  {/* Action Buttons */}
                  {canEditClassroom && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Quick Actions:</p>
                      <div className="flex flex-wrap gap-2">
                        {['Available', 'Occupied', 'Maintenance']
                          .filter(status => status !== classroom.status)
                          .map(status => {
                            const btnConfig = statusConfig[status as ClassroomStatus];
                            const BtnIcon = btnConfig.icon;

                            return (
                              <Button
                                key={status}
                                size="sm"
                                variant="outline"
                                className={`
                                  transition-all duration-200 ${btnConfig.textColor}
                                  hover:bg-slate-100 dark:hover:bg-slate-700
                                `}
                                onClick={() => openUpdateDialog(classroom, status as ClassroomStatus)}
                              >
                                <BtnIcon className="h-3 w-3 mr-1" />
                                Set {status}
                              </Button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Professional Confirmation Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
              Update Classroom Status
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              Are you sure you want to change{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {selectedClassroom?.name}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                {newStatus}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateStatus}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              Confirm Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Classrooms;
