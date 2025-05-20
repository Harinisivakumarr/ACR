
import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/lib/supabase';
import { useAuth, useRoleCheck } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ThumbsUp } from 'lucide-react';

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

const categories = [
  'All',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snacks',
  'Beverages',
];

const Canteen: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [votedItems, setVotedItems] = useState<Record<string, boolean>>({});

  const { profile } = useAuth();
  const isCanteenStaff = useRoleCheck(['Admin', 'Canteen Staff']);
  
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const { data, error } = await supabase
          .from('canteen_menu')
          .select('*')
          .order('votes', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        setMenuItems(data as MenuItem[]);
        setFilteredItems(data as MenuItem[]);
        
        // Fetch user votes
        if (profile) {
          const { data: votes } = await supabase
            .from('user_menu_votes')
            .select('menu_item_id')
            .eq('user_id', profile.id);
            
          if (votes) {
            const votedItemsMap: Record<string, boolean> = {};
            votes.forEach((vote) => {
              votedItemsMap[vote.menu_item_id] = true;
            });
            setVotedItems(votedItemsMap);
          }
        }
      } catch (error) {
        console.error('Error fetching menu data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load canteen menu data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchMenuItems();
    
    // Set up realtime subscription
    const subscription = supabase
      .channel('public:canteen_menu')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'canteen_menu' 
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setMenuItems(current => 
            current.map(item => 
              item.id === payload.new.id ? payload.new as MenuItem : item
            )
          );
          
          // Update filtered items if needed
          if (activeCategory === 'All' || payload.new.category === activeCategory) {
            setFilteredItems(current => 
              current.map(item => 
                item.id === payload.new.id ? payload.new as MenuItem : item
              )
            );
          }
        } else if (payload.eventType === 'INSERT') {
          const newItem = payload.new as MenuItem;
          setMenuItems(current => [...current, newItem]);
          
          // Add to filtered items if it matches the current category
          if (activeCategory === 'All' || newItem.category === activeCategory) {
            setFilteredItems(current => [...current, newItem]);
          }
        } else if (payload.eventType === 'DELETE') {
          setMenuItems(current => 
            current.filter(item => item.id !== payload.old.id)
          );
          setFilteredItems(current => 
            current.filter(item => item.id !== payload.old.id)
          );
        }
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [profile]);

  // Filter menu items by category
  useEffect(() => {
    if (activeCategory === 'All') {
      setFilteredItems(menuItems);
    } else {
      setFilteredItems(menuItems.filter(item => item.category === activeCategory));
    }
  }, [activeCategory, menuItems]);

  const handleVote = async (itemId: string) => {
    if (!profile) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to vote for menu items',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Check if user already voted
      if (votedItems[itemId]) {
        // Remove vote
        await supabase
          .from('user_menu_votes')
          .delete()
          .eq('user_id', profile.id)
          .eq('menu_item_id', itemId);
          
        // Update menu item votes
        await supabase.rpc('decrement_votes', { item_id: itemId });
        
        setVotedItems(current => {
          const updated = { ...current };
          delete updated[itemId];
          return updated;
        });
      } else {
        // Add vote
        await supabase
          .from('user_menu_votes')
          .insert([{ user_id: profile.id, menu_item_id: itemId }]);
          
        // Update menu item votes
        await supabase.rpc('increment_votes', { item_id: itemId });
        
        setVotedItems(current => ({
          ...current,
          [itemId]: true,
        }));
      }
    } catch (error) {
      console.error('Error voting for menu item:', error);
      toast({
        title: 'Voting Failed',
        description: 'Could not register your vote',
        variant: 'destructive',
      });
    }
  };

  const formatPrice = (price: number) => {
    return `₹${price.toFixed(2)}`;
  };

  return (
    <DashboardLayout title="Canteen Menu">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">
            Today's Menu
          </h2>
          <p className="text-muted-foreground">
            Browse today's selection and vote for your favorite items
          </p>
        </div>
        
        <Tabs defaultValue="All" onValueChange={setActiveCategory}>
          <TabsList className="mb-6">
            {categories.map(category => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map(category => (
            <TabsContent key={category} value={category}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-3/4" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-2/3" />
                          <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-md" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      {item.image_url && (
                        <div 
                          className="h-32 bg-center bg-cover" 
                          style={{ backgroundImage: `url(${item.image_url})` }} 
                        />
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          <Badge>{formatPrice(item.price)}</Badge>
                        </div>
                        <CardDescription>
                          {item.category}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        {item.description && (
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {item.is_vegetarian && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Vegetarian
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <div className="flex items-center gap-2">
                          <ThumbsUp className="h-4 w-4" />
                          <span className="text-sm">{item.votes} votes</span>
                        </div>
                        <Button 
                          size="sm"
                          variant={votedItems[item.id] ? "default" : "outline"}
                          onClick={() => handleVote(item.id)}
                        >
                          {votedItems[item.id] ? "Voted" : "Vote"}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-10">
                    <p className="text-muted-foreground">No items available in this category</p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
        
        {isCanteenStaff && (
          <div className="mt-8 text-center">
            <Button onClick={() => window.location.href = "/dashboard/menu-management"}>
              Manage Menu
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Canteen;
