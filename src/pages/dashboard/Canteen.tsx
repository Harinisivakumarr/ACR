import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { ThumbsUp, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth, useRoleCheck } from '@/contexts/AuthContext';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  votes: number;
  image_url: string | null;
  is_vegetarian: boolean;
}

interface UserVote {
  menu_item_id: string;
}

const categories = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages'];

const Canteen: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [votedItems, setVotedItems] = useState<Record<string, boolean>>({});
  const [confirmReset, setConfirmReset] = useState(false);

  const { profile } = useAuth();
  const isCanteenStaff = useRoleCheck(['admin', 'canteen_staff']);

  useEffect(() => {
    const fetchMenuItems = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from<MenuItem>('canteen_menu')
          .select('*')
          .order('votes', { ascending: false });
        if (error) throw error;

        setMenuItems(data ?? []);
        setFilteredItems(data ?? []);

        if (profile) {
          const { data: votes, error: voteError } = await supabase
            .from<UserVote>('user_menu_votes')
            .select('menu_item_id')
            .eq('user_id', profile.id);
          if (voteError) throw voteError;

          const votedMap: Record<string, boolean> = {};
          votes?.forEach((vote) => {
            votedMap[vote.menu_item_id] = true;
          });
          setVotedItems(votedMap);
        }
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to load canteen menu data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();

    // Setup realtime subscription
    const channel = supabase
      .channel('public:canteen_menu')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'canteen_menu' },
        (payload) => {
          const updated = payload.new as MenuItem;
          const deletedId = payload.old?.id;

          if (payload.eventType === 'UPDATE') {
            setMenuItems((curr) =>
              curr.map((i) => (i.id === updated.id ? updated : i))
            );
          } else if (payload.eventType === 'INSERT') {
            setMenuItems((curr) => [...curr, updated]);
          } else if (payload.eventType === 'DELETE') {
            setMenuItems((curr) => curr.filter((i) => i.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile]);

  useEffect(() => {
    setFilteredItems(
      activeCategory === 'All'
        ? menuItems
        : menuItems.filter((item) => item.category === activeCategory)
    );
  }, [activeCategory, menuItems]);

  const handleVote = async (itemId: string) => {
    if (!profile) {
      toast({
        title: 'Sign in required',
        description: 'Please log in to vote for items.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (votedItems[itemId]) {
        await supabase
          .from('user_menu_votes')
          .delete()
          .match({ user_id: profile.id, menu_item_id: itemId });
        await supabase.rpc('decrement_votes', { item_id: itemId });

        setMenuItems((curr) =>
          curr.map((i) =>
            i.id === itemId ? { ...i, votes: Math.max(0, i.votes - 1) } : i
          )
        );
        const updated = { ...votedItems };
        delete updated[itemId];
        setVotedItems(updated);
      } else {
        await supabase.from('user_menu_votes').insert([{ user_id: profile.id, menu_item_id: itemId }]);
        await supabase.rpc('increment_votes', { item_id: itemId });

        setMenuItems((curr) =>
          curr.map((i) => (i.id === itemId ? { ...i, votes: i.votes + 1 } : i))
        );
        setVotedItems((curr) => ({ ...curr, [itemId]: true }));
      }
    } catch {
      toast({
        title: 'Vote Error',
        description: 'Something went wrong while voting.',
        variant: 'destructive',
      });
    }
  };

  const confirmResetVotes = () => {
    setConfirmReset(true);
    toast({
      title: 'Confirm Reset Votes',
      description: 'Are you sure you want to reset all votes?',
      action: (
        <Button
          variant="destructive"
          size="sm"
          onClick={handleResetVotes}
          className="ml-2 text-xs px-2 py-1"
        >
          Confirm Reset
        </Button>
      ),
    });
  };

  const handleResetVotes = async () => {
    try {
      const { error } = await supabase.rpc('reset_votes');
      if (error) throw error;

      toast({
        title: 'Votes Reset',
        description: 'All votes have been successfully reset.',
      });

      const { data, error: reloadError } = await supabase
        .from<MenuItem>('canteen_menu')
        .select('*')
        .order('votes', { ascending: false });

      if (reloadError) {
        toast({
          title: 'Reload Failed',
          description: 'Votes reset, but failed to reload menu data.',
          variant: 'destructive',
        });
        return;
      }

      setMenuItems(data ?? []);
      setFilteredItems(data ?? []);
      setVotedItems({});
      setConfirmReset(false);
    } catch {
      toast({
        title: 'Reset Failed',
        description: 'An error occurred while resetting votes.',
        variant: 'destructive',
      });
    }
  };

  const resetButton = isCanteenStaff && (
    <Button
      variant="ghost"
      size="sm"
      onClick={confirmResetVotes}
      className="text-amber-600 hover:text-amber-700 px-2"
      title="Reset all votes (Admin only)"
    >
      <RotateCcw className="w-4 h-4 mr-1" />
      Reset Votes
    </Button>
  );

  const formatPrice = (price: number) => `₹${price.toFixed(2)}`;

  const formatTodayHeader = () => {
    const today = new Date();
    const date = today.getDate();
    const weekday = today.toLocaleString('en-US', { weekday: 'long' });

    let suffix = 'th';
    if (date % 10 === 1 && date !== 11) suffix = 'st';
    else if (date % 10 === 2 && date !== 12) suffix = 'nd';
    else if (date % 10 === 3 && date !== 13) suffix = 'rd';

    return `${date}${suffix} ${weekday}'s Menu`;
  };

  return (
    <DashboardLayout title="Canteen Menu" headerActions={resetButton}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2 text-amber-600">{formatTodayHeader()}</h2>
          <p className="text-muted-foreground text-sm">
            Vote for your favorite dishes — your opinion matters!
          </p>
        </div>

        <Tabs
          defaultValue="All"
          onValueChange={setActiveCategory}
          className="mb-6"
        >
          <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category} value={category}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <Card
                      key={index}
                      className="animate-pulse border border-gray-200 dark:border-gray-700"
                    >
                      <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-3/4 rounded-md" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-1/4 mb-2 rounded-md" />
                        <Skeleton className="h-4 w-2/3 mb-4 rounded-md" />
                        <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-md" />
                      </CardContent>
                    </Card>
                  ))
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <Card
                      key={item.id}
                      className="hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                    >
                      {item.image_url && (
                        <div
                          className="h-32 bg-center bg-cover rounded-t-md"
                          style={{ backgroundImage: `url(${item.image_url})` }}
                        />
                      )}
                      <CardHeader className="pb-1">
                        <CardTitle className="flex items-center justify-between text-base font-semibold">
                          <span>{item.name}</span>
                          <Badge
                            variant={item.is_vegetarian ? 'success' : 'destructive'}
                            className="text-xs"
                          >
                            {item.is_vegetarian ? 'Veg' : 'Non-Veg'}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-amber-600 font-semibold">
                          {formatPrice(item.price)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {item.description || 'No description provided.'}
                        </p>
                        <div className="flex items-center justify-between">
                          <Button
                            variant={votedItems[item.id] ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => handleVote(item.id)}
                            className="flex items-center gap-1"
                            aria-label={
                              votedItems[item.id]
                                ? `Remove vote for ${item.name}`
                                : `Vote for ${item.name}`
                            }
                          >
                            <ThumbsUp className="w-4 h-4" />
                            {item.votes}
                          </Button>
                          {item.votes > 10 && (
                            <Badge variant="secondary" className="text-xs px-2 py-1">
                              Popular
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground col-span-full">
                    No menu items available in this category.
                  </p>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Canteen;