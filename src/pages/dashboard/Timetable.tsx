import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRoleCheck } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar, Clock, MapPin, BookOpen, Plus, Edit, Trash2 } from "lucide-react";

// Define types for our data
interface TimetableEntry {
  id: string;
  class_id: string;
  day_of_week: string;
  period_number: number;
  subject: string;
  classroom_id: string | null;
  start_time?: string;
  end_time?: string;
  year: string;
  branch: string;
}

// Form validation schema
const timetableFormSchema = z.object({
  class_id: z.string().min(1, "Class ID is required"),
  day_of_week: z.string().min(1, "Day is required"),
  period_number: z.number().min(1).max(8),
  subject: z.string().min(1, "Subject is required"),
  classroom_id: z.string().optional().nullable(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  year: z.string().min(1, "Year is required"),
  branch: z.string().min(1, "Branch is required"),
});

type TimetableFormData = z.infer<typeof timetableFormSchema>;

// Define vibrant color pool for dynamic assignment
const colorPool = [
  'bg-blue-400 border-blue-500 text-white font-semibold',
  'bg-green-400 border-green-500 text-white font-semibold',
  'bg-purple-400 border-purple-500 text-white font-semibold',
  'bg-orange-400 border-orange-500 text-white font-semibold',
  'bg-pink-400 border-pink-500 text-white font-semibold',
  'bg-yellow-400 border-yellow-500 text-gray-900 font-semibold',
  'bg-cyan-400 border-cyan-500 text-white font-semibold',
  'bg-indigo-400 border-indigo-500 text-white font-semibold',
  'bg-red-400 border-red-500 text-white font-semibold',
  'bg-teal-400 border-teal-500 text-white font-semibold',
  'bg-emerald-400 border-emerald-500 text-white font-semibold',
  'bg-violet-400 border-violet-500 text-white font-semibold',
  'bg-rose-400 border-rose-500 text-white font-semibold',
  'bg-amber-400 border-amber-500 text-gray-900 font-semibold',
  'bg-lime-400 border-lime-500 text-gray-900 font-semibold'
];

// Add a function to get color for a subject
const getSubjectColor = (subject: string, subjectColorMap: Record<string, string>) => {
  // Always return vibrant grey for lunch
  if (subject.toLowerCase() === 'lunch') {
    return 'bg-gray-500 border-gray-600 text-white font-semibold';
  }
  // Special styling for free periods
  if (subject.toLowerCase().includes('free')) {
    return 'bg-gray-300 border-gray-400 text-gray-700 font-medium';
  }
  return subjectColorMap[subject] || 'bg-slate-300 border-slate-400 text-gray-900 font-medium';
};

// Function to generate dynamic color mapping for subjects
const generateSubjectColors = (subjects: string[]): Record<string, string> => {
  const colorMap: Record<string, string> = {};
  let colorIndex = 0;
  
  subjects.forEach(subject => {
    if (subject.toLowerCase() !== 'lunch') {
      colorMap[subject] = colorPool[colorIndex % colorPool.length];
      colorIndex++;
    }
  });
  
  return colorMap;
};

// Function to extract section from class_id (e.g., "AI-A" → "A")
const extractSection = (classId: string): string => {
  const parts = classId.split('-');
  return parts.length > 1 ? parts[parts.length - 1] : '';
};

const Timetable = () => {
  const { toast } = useToast();
  const [timetableData, setTimetableData] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [subjectColorMap, setSubjectColorMap] = useState<Record<string, string>>({});

  // Admin management states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user can edit timetable (Admin ONLY)
  const canEditTimetable = useRoleCheck(['Admin', 'admin']);



  // Form for adding/editing timetable entries
  const form = useForm<TimetableFormData>({
    resolver: zodResolver(timetableFormSchema),
    defaultValues: {
      class_id: "",
      day_of_week: "",
      period_number: 1,
      subject: "",
      classroom_id: "",
      start_time: "",
      end_time: "",
      year: "",
      branch: "",
    },
  });
  
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const periods = [
    { number: 1, time: "09:00 - 09:50" },
    { number: 2, time: "09:50 - 10:40" },
    { number: 3, time: "10:50 - 11:40" },
    { number: 4, time: "11:40 - 12:30" },
    { number: 5, time: "12:30 - 13:20" },
    { number: 6, time: "14:10 - 15:00" },
    { number: 7, time: "15:10 - 16:00" },
    { number: 8, time: "16:00 - 16:50" },
  ];

  // Admin CRUD Functions
  const handleCreateEntry = async (data: TimetableFormData) => {
    if (!canEditTimetable) {
      toast({
        title: 'Access Denied',
        description: 'Only admins can create timetable entries.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Debug current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: profile } = await supabase
          .from('preapproved_users')
          .select('*')
          .eq('email', user.email)
          .single();
        console.log('👤 Current User Profile:', profile);
        console.log('🔑 User Role:', profile?.role);
        console.log('🆔 Auth UID:', user.id);
        console.log('🆔 Profile ID:', profile?.id);
      }
      // Clean the data - convert empty strings to null for UUID fields
      const cleanedData = {
        ...data,
        classroom_id: data.classroom_id?.trim() || null,
        start_time: data.start_time?.trim() || null,
        end_time: data.end_time?.trim() || null,
      };

      console.log('Attempting to insert:', cleanedData);

      const { error } = await supabase
        .from('timetable')
        .insert([cleanedData]);

      console.log('Insert error:', error);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Timetable entry created successfully.',
      });

      setIsDialogOpen(false);
      form.reset();
      fetchTimetableData();
    } catch (error) {
      console.error('Error creating timetable entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to create timetable entry. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEntry = async (data: TimetableFormData) => {
    if (!canEditTimetable || !editingEntry) {
      toast({
        title: 'Access Denied',
        description: 'Only admins can update timetable entries.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Clean the data - convert empty strings to null for UUID fields
      const cleanedData = {
        ...data,
        classroom_id: data.classroom_id?.trim() || null,
        start_time: data.start_time?.trim() || null,
        end_time: data.end_time?.trim() || null,
      };

      const { error } = await supabase
        .from('timetable')
        .update(cleanedData)
        .eq('id', editingEntry.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Timetable entry updated successfully.',
      });

      setIsDialogOpen(false);
      setEditingEntry(null);
      form.reset();
      fetchTimetableData();
    } catch (error) {
      console.error('Error updating timetable entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to update timetable entry. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!canEditTimetable) {
      toast({
        title: 'Access Denied',
        description: 'Only admins can delete timetable entries.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('timetable')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Timetable entry deleted successfully.',
      });

      fetchTimetableData();
    } catch (error) {
      console.error('Error deleting timetable entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete timetable entry. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const openCreateDialog = () => {
    setEditingEntry(null);
    form.reset({
      class_id: selectedBranch && selectedSection ? `${selectedBranch}-${selectedSection}` : "",
      day_of_week: "",
      period_number: 1,
      subject: "",
      classroom_id: "",
      start_time: "",
      end_time: "",
      year: selectedYear,
      branch: selectedBranch,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    form.reset({
      class_id: entry.class_id,
      day_of_week: entry.day_of_week,
      period_number: entry.period_number,
      subject: entry.subject,
      classroom_id: entry.classroom_id || "",
      start_time: entry.start_time || "",
      end_time: entry.end_time || "",
      year: entry.year,
      branch: entry.branch,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: TimetableFormData) => {
    if (editingEntry) {
      handleUpdateEntry(data);
    } else {
      handleCreateEntry(data);
    }
  };

  // Function to fetch years and branches
  const fetchYearsAndBranches = async () => {
    try {
      console.log('Fetching years and branches...');

      // Fetch all unique years
      const { data: yearData, error: yearError } = await supabase
        .from('timetable')
        .select('year')
        .order('year');

      if (yearError) {
        console.error('Year fetch error:', yearError);
        throw yearError;
      }

      // Fetch all unique branches
      const { data: branchData, error: branchError } = await supabase
        .from('timetable')
        .select('branch')
        .order('branch');

      if (branchError) {
        console.error('Branch fetch error:', branchError);
        throw branchError;
      }

      console.log('Year data:', yearData);
      console.log('Branch data:', branchData);

      const uniqueYears = [...new Set(yearData.map(item => item.year))].filter(Boolean);
      const uniqueBranches = [...new Set(branchData.map(item => item.branch))].filter(Boolean);

      console.log('Unique years:', uniqueYears);
      console.log('Unique branches:', uniqueBranches);

      setYears(uniqueYears);
      setBranches(uniqueBranches);

      // Set default selections if available
      if (uniqueYears.length > 0 && !selectedYear) {
        setSelectedYear(uniqueYears[0]);
      }

      if (uniqueBranches.length > 0 && !selectedBranch) {
        setSelectedBranch(uniqueBranches[0]);
      }

    } catch (error) {
      console.error('Error fetching years and branches:', error);

      // If table doesn't exist, provide fallback data
      console.log('Using fallback data...');
      setYears(['2024', '2025']);
      setBranches(['AI', 'CS', 'ECE']);
      setSelectedYear('2024');
      setSelectedBranch('AI');

      toast({
        title: 'Database Setup Required',
        description: 'Please run the timetable_setup.sql file in your Supabase SQL editor to create the timetable table.',
        variant: 'destructive',
      });
    }
  };

  // Function to fetch sections based on selected year and branch
  const fetchSections = async () => {
    if (!selectedYear || !selectedBranch) {
      setSections([]);
      setSelectedSection("");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('timetable')
        .select('class_id')
        .eq('year', selectedYear)
        .eq('branch', selectedBranch);
      
      if (error) throw error;
      
      // Extract unique sections from class_id
      const uniqueSections = [...new Set(
        data.map(item => extractSection(item.class_id))
      )].filter(Boolean).sort();
      
      setSections(uniqueSections);
      
      // Reset selected section when year/branch changes
      setSelectedSection("");
      
    } catch (error) {
      console.error('Error fetching sections:', error);

      // Provide fallback sections
      console.log('Using fallback sections...');
      setSections(['A', 'B', 'C']);
      setSelectedSection('A');
    }
  };

  // Function to fetch timetable data
  const fetchTimetableData = async () => {
    if (!selectedYear || !selectedBranch || !selectedSection) {
      setTimetableData([]);
      setSubjectColorMap({});
      return;
    }

    setLoading(true);
    try {
      // Construct the class_id pattern (e.g., "AI-" + "A" = "AI-A")
      const classIdPattern = `${selectedBranch}-${selectedSection}`;
      
      const { data, error } = await supabase
        .from('timetable')
        .select('*')
        .eq('year', selectedYear)
        .eq('branch', selectedBranch)
        .eq('class_id', classIdPattern)
        .order('day_of_week', { ascending: true })
        .order('period_number', { ascending: true });
      
      if (error) throw error;
      
      // Set timetable data
      setTimetableData(data || []);
      
      // Generate dynamic color mapping for unique subjects
      const uniqueSubjects = [...new Set((data || []).map(entry => entry.subject))];
      const colorMapping = generateSubjectColors(uniqueSubjects);
      setSubjectColorMap(colorMapping);
      
    } catch (error) {
      console.error('Error fetching timetable data:', error);
      setTimetableData([]);
      setSubjectColorMap({});
      toast({
        title: 'Error',
        description: 'Failed to load timetable data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial load of years and branches
  useEffect(() => {
    console.log('Component mounted, fetching data...');
    fetchYearsAndBranches();
  }, []);

  // Fetch sections when year or branch changes
  useEffect(() => {
    fetchSections();
  }, [selectedYear, selectedBranch]);

  // Fetch timetable when section changes
  useEffect(() => {
    fetchTimetableData();
  }, [selectedYear, selectedBranch, selectedSection]);

  // Set up real-time subscription
  useEffect(() => {
    if (!selectedYear || !selectedBranch || !selectedSection) return;

    const channel = supabase
      .channel('timetable_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'timetable'
      }, () => {
        console.log('Real-time timetable update received');
        fetchTimetableData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedYear, selectedBranch, selectedSection]);

  // Group timetable data by day
  const getTimetableForDay = (day: string) => {
    return timetableData.filter(
      entry => entry.day_of_week === day
    ).sort((a, b) => a.period_number - b.period_number);
  };

  return (
    <DashboardLayout title="Class Timetable">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6 space-y-8">
        {/* Professional Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 via-cyan-700 to-teal-700 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <Calendar className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2">Class Timetable</h1>
                    <p className="text-cyan-100 text-lg">Academic schedule management system</p>
                  </div>
                </div>

                {/* Professional Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-white" />
                      <span className="text-sm font-medium">Academic Year</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{selectedYear || '---'}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-emerald-300" />
                      <span className="text-sm font-medium">Branch</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-emerald-300">{selectedBranch || '---'}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-300" />
                      <span className="text-sm font-medium">Section</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-blue-300">{selectedSection || '---'}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-orange-300" />
                      <span className="text-sm font-medium">Total Classes</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-orange-300">{timetableData.length}</p>
                  </div>
                </div>
              </div>
              <div className="hidden lg:flex flex-col items-center gap-4">
                <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Clock className="h-16 w-16 text-white/80" />
                </div>
                {canEditTimetable && (
                  <Button
                    onClick={openCreateDialog}
                    className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm flex items-center gap-2"
                    disabled={!selectedYear || !selectedBranch || !selectedSection}
                  >
                    <Plus className="h-4 w-4" />
                    Add Entry
                  </Button>
                )}
              </div>
            </div>
          </div>
          {/* Subtle decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-20 translate-x-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16"></div>
        </div>

        {/* Filters and Mobile Add Button */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="year-select" className="text-slate-700 dark:text-slate-300 font-medium">Academic Year</Label>
              <Select
                value={selectedYear}
                onValueChange={setSelectedYear}
              >
                <SelectTrigger id="year-select" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-cyan-500 dark:focus:border-cyan-400">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="branch-select" className="text-slate-700 dark:text-slate-300 font-medium">Branch</Label>
              <Select
                value={selectedBranch}
                onValueChange={setSelectedBranch}
              >
                <SelectTrigger id="branch-select" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-cyan-500 dark:focus:border-cyan-400">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(branch => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="section-select" className="text-slate-700 dark:text-slate-300 font-medium">Section</Label>
              <Select
                value={selectedSection}
                onValueChange={setSelectedSection}
                disabled={!selectedYear || !selectedBranch}
              >
                <SelectTrigger id="section-select" className="disabled:opacity-50 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-cyan-500 dark:focus:border-cyan-400">
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(section => (
                    <SelectItem key={section} value={section}>
                      Section {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile Add Button */}
          {canEditTimetable && (
            <div className="lg:hidden">
              <Button
                onClick={openCreateDialog}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center gap-2"
                disabled={!selectedYear || !selectedBranch || !selectedSection}
              >
                <Plus className="h-4 w-4" />
                Add Timetable Entry
              </Button>
            </div>
          )}
        </div>

        {!selectedYear || !selectedBranch || !selectedSection ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <BookOpen className="h-16 w-16 mx-auto mb-6 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Select Filters</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Please select Year, Branch, and Section to view the timetable.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-64 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-cyan-50 dark:from-slate-700 dark:to-slate-600 p-6 border-b border-slate-200 dark:border-slate-600">
              <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
                <Clock className="h-6 w-6 text-cyan-600" />
                {selectedYear} {selectedBranch}-{selectedSection} Timetable
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                Weekly class schedule and timings
              </p>
            </div>
            <div className="p-6">
              {timetableData.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 mx-auto mb-6 text-slate-400 dark:text-slate-500" />
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Timetable Data</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    No timetable entries found for {selectedYear} {selectedBranch} Section {selectedSection}.
                  </p>
                  {canEditTimetable && (
                    <Button
                      onClick={openCreateDialog}
                      className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Entry
                    </Button>
                  )}
                </div>
              ) : (
                <div className="w-full">
                  <table className="w-full border-collapse border-2 border-gray-400 shadow-lg table-fixed text-xs sm:text-sm">
                    <thead>
                      <tr>
                        <th className="border-2 border-gray-400 p-2 bg-gray-700 text-white font-bold w-20">
                          Day
                        </th>
                        {periods.map(period => (
                          <th key={period.number} className="border-2 border-gray-400 p-1 bg-gray-700 text-white text-center">
                            <div className="font-bold text-xs">P{period.number}</div>
                            <div className="text-[10px] text-gray-300 leading-tight">{period.time}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map(day => (
                        <tr key={day} className="h-14">
                          <td className="border-2 border-gray-400 p-2 font-bold bg-gray-600 text-white text-xs">
                            {day.substring(0, 3)}
                          </td>
                          {periods.map(period => {
                            const entry = getTimetableForDay(day).find(
                              e => e.period_number === period.number
                            );
                            return (
                              <td
                                key={period.number}
                                className={`border-2 border-gray-400 p-1 text-center ${entry ? getSubjectColor(entry.subject, subjectColorMap) : 'bg-gray-100 text-gray-500'}`}
                              >
                                {entry ? (
                                  <div className="space-y-0.5 px-1 group relative">
                                    <div className="font-bold text-[11px] leading-tight break-words">{entry.subject}</div>
                                    {entry.classroom_id && (
                                      <div className="text-[9px] flex items-center justify-center gap-0.5 opacity-90">
                                        <MapPin className="h-2 w-2" />
                                        {entry.classroom_id}
                                      </div>
                                    )}
                                    {canEditTimetable && (
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          className="h-6 w-6 p-0"
                                          onClick={() => openEditDialog(entry)}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="h-6 w-6 p-0"
                                          onClick={() => handleDeleteEntry(entry.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  canEditTimetable ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-full w-full text-gray-400 hover:text-gray-600"
                                      onClick={() => {
                                        form.setValue('day_of_week', day);
                                        form.setValue('period_number', period.number);
                                        openCreateDialog();
                                      }}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <span className="text-gray-400 font-medium text-xs">-</span>
                                  )
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Management Dialog */}
        {canEditTimetable && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? 'Edit Timetable Entry' : 'Add Timetable Entry'}
                </DialogTitle>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="2024" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="branch"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="AI" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="class_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="AI-A" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="day_of_week"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select day" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {days.map(day => (
                                <SelectItem key={day} value={day}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="period_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Period</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select period" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {periods.map(period => (
                                <SelectItem key={period.number} value={period.number.toString()}>
                                  Period {period.number} ({period.time})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Machine Learning" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="classroom_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Classroom (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="AI-101" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : (editingEntry ? 'Update' : 'Create')}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Timetable;
