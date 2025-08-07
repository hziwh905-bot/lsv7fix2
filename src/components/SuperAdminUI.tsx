import React, { useState, useEffect } from 'react';
import { 
  Users, Building, CreditCard, TrendingUp, DollarSign, 
  Crown, AlertCircle, CheckCircle, Clock, RefreshCw,
  Search, Filter, MoreVertical, Eye, Edit3, Trash2,
  Calendar, Mail, Phone, MapPin, Settings, BarChart3,
  PieChart, LineChart, Target, Zap, Gift, Star,
  ChefHat, LogOut, Shield, Database, Activity
} from 'lucide-react';
import { SubscriptionService } from '../services/subscriptionService';
import { SupportService } from '../services/supportService';
import { supabase } from '../lib/supabase';

interface SuperAdminStats {
  totalRestaurants: number;
  totalCustomers: number;
  totalSubscriptions: number;
  totalRevenue: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  paidSubscriptions: number;
  churnRate: number;
}

interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  customer_count: number;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  last_activity: string;
}

const SuperAdminUI: React.FC = () => {
  const [stats, setStats] = useState<SuperAdminStats>({
    totalRestaurants: 0,
    totalCustomers: 0,
    totalSubscriptions: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    trialSubscriptions: 0,
    paidSubscriptions: 0,
    churnRate: 0
  });
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'restaurants' | 'subscriptions' | 'support'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    // Check super admin authentication
    const isAuthenticated = localStorage.getItem('super_admin_authenticated');
    const loginTime = localStorage.getItem('super_admin_login_time');
    
    if (!isAuthenticated || !loginTime) {
      window.location.href = '/super-admin-login';
      return;
    }

    // Check if session is still valid (24 hours)
    const loginDate = new Date(loginTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      localStorage.removeItem('super_admin_authenticated');
      localStorage.removeItem('super_admin_login_time');
      window.location.href = '/super-admin-login';
      return;
    }

    loadSuperAdminData();
  }, []);

  const loadSuperAdminData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load all data in parallel
      const [
        restaurantsData,
        subscriptionsData,
        supportTicketsData,
        statsData
      ] = await Promise.all([
        loadRestaurants(),
        loadSubscriptions(),
        loadSupportTickets(),
        loadStats()
      ]);

      setRestaurants(restaurantsData);
      setSubscriptions(subscriptionsData);
      setSupportTickets(supportTicketsData);
      setStats(statsData);

    } catch (err: any) {
      console.error('Error loading super admin data:', err);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const loadRestaurants = async (): Promise<RestaurantData[]> => {
    try {
      // Get restaurants with owner information and customer counts
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select(`
          id,
          name,
          slug,
          created_at,
          owner_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user emails for restaurant owners
      const ownerIds = restaurants?.map(r => r.owner_id) || [];
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.warn('Could not fetch user emails:', usersError);
      }

      // Get customer counts for each restaurant
      const restaurantData: RestaurantData[] = [];
      
      for (const restaurant of restaurants || []) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id')
          .eq('restaurant_id', restaurant.id);

        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plan_type, status')
          .eq('user_id', restaurant.owner_id)
          .single();

        const ownerUser = users?.users.find(u => u.id === restaurant.owner_id);

        restaurantData.push({
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          owner_email: ownerUser?.email || 'Unknown',
          customer_count: customers?.length || 0,
          subscription_plan: subscription?.plan_type || 'trial',
          subscription_status: subscription?.status || 'active',
          created_at: restaurant.created_at,
          last_activity: restaurant.created_at // Simplified for now
        });
      }

      return restaurantData;
    } catch (error) {
      console.error('Error loading restaurants:', error);
      return [];
    }
  };

  const loadSubscriptions = async () => {
    try {
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user emails for each subscription
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.warn('Could not fetch user emails:', usersError);
        return subscriptions || [];
      }

      // Enhance subscriptions with user emails and restaurant names
      const enhancedSubscriptions = [];
      
      for (const subscription of subscriptions || []) {
        const user = users?.users.find(u => u.id === subscription.user_id);
        
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('name')
          .eq('owner_id', subscription.user_id)
          .single();

        enhancedSubscriptions.push({
          ...subscription,
          user_email: user?.email || 'Unknown',
          restaurant_name: restaurant?.name || 'Unknown'
        });
      }

      return enhancedSubscriptions;
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      return [];
    }
  };

  const loadSupportTickets = async () => {
    try {
      const tickets = await SupportService.getAllTickets();
      return tickets;
    } catch (error) {
      console.error('Error loading support tickets:', error);
      return [];
    }
  };

  const loadStats = async (): Promise<SuperAdminStats> => {
    try {
      // Get restaurant count
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id');

      // Get total customers across all restaurants
      const { data: customers } = await supabase
        .from('customers')
        .select('id');

      // Get subscription stats
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('plan_type, status');

      const totalRestaurants = restaurants?.length || 0;
      const totalCustomers = customers?.length || 0;
      const totalSubscriptions = subscriptions?.length || 0;
      const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;
      const trialSubscriptions = subscriptions?.filter(s => s.plan_type === 'trial').length || 0;
      const paidSubscriptions = subscriptions?.filter(s => s.plan_type !== 'trial').length || 0;
      const cancelledSubscriptions = subscriptions?.filter(s => s.status === 'cancelled').length || 0;
      const churnRate = totalSubscriptions > 0 ? (cancelledSubscriptions / totalSubscriptions) * 100 : 0;

      // Calculate estimated revenue
      const totalRevenue = subscriptions?.reduce((sum, sub) => {
        if (sub.plan_type === 'monthly') return sum + 2.99;
        if (sub.plan_type === 'semiannual') return sum + 9.99;
        if (sub.plan_type === 'annual') return sum + 19.99;
        return sum;
      }, 0) || 0;

      return {
        totalRestaurants,
        totalCustomers,
        totalSubscriptions,
        totalRevenue,
        activeSubscriptions,
        trialSubscriptions,
        paidSubscriptions,
        churnRate
      };
    } catch (error) {
      console.error('Error loading stats:', error);
      return {
        totalRestaurants: 0,
        totalCustomers: 0,
        totalSubscriptions: 0,
        totalRevenue: 0,
        activeSubscriptions: 0,
        trialSubscriptions: 0,
        paidSubscriptions: 0,
        churnRate: 0
      };
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('super_admin_authenticated');
    localStorage.removeItem('super_admin_login_time');
    window.location.href = '/super-admin-login';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getPlanDisplayName = (planType: string) => {
    switch (planType) {
      case 'monthly': return 'Monthly';
      case 'semiannual': return '6 Months';
      case 'annual': return 'Annual';
      case 'trial': return 'Trial';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         restaurant.owner_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || restaurant.subscription_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = subscription.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         subscription.restaurant_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || subscription.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-sm text-gray-600">System-wide oversight and control</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadSuperAdminData}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Restaurants</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRestaurants}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Crown className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Subscriptions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeSubscriptions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'restaurants', label: 'Restaurants', icon: Building },
              { id: 'subscriptions', label: 'Subscriptions', icon: Crown },
              { id: 'support', label: 'Support', icon: Shield }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-4">Subscription Breakdown</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Trial:</span>
                        <span className="font-bold text-blue-900">{stats.trialSubscriptions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Paid:</span>
                        <span className="font-bold text-blue-900">{stats.paidSubscriptions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Active:</span>
                        <span className="font-bold text-blue-900">{stats.activeSubscriptions}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-4">Revenue Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-green-700">Total Revenue:</span>
                        <span className="font-bold text-green-900">{formatCurrency(stats.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Avg per Restaurant:</span>
                        <span className="font-bold text-green-900">
                          {formatCurrency(stats.totalRestaurants > 0 ? stats.totalRevenue / stats.totalRestaurants : 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Conversion Rate:</span>
                        <span className="font-bold text-green-900">
                          {stats.totalSubscriptions > 0 ? ((stats.paidSubscriptions / stats.totalSubscriptions) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
                    <h4 className="font-semibold text-red-900 mb-4">Health Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-red-700">Churn Rate:</span>
                        <span className="font-bold text-red-900">{stats.churnRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-700">Avg Customers:</span>
                        <span className="font-bold text-red-900">
                          {stats.totalRestaurants > 0 ? Math.round(stats.totalCustomers / stats.totalRestaurants) : 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-700">Growth Rate:</span>
                        <span className="font-bold text-red-900">+12.5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Restaurants Tab */}
            {activeTab === 'restaurants' && (
              <div className="space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search restaurants..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Restaurant</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Owner</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Customers</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Plan</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRestaurants.map((restaurant) => (
                        <tr key={restaurant.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-semibold text-gray-900">{restaurant.name}</p>
                              <p className="text-sm text-gray-500">{restaurant.slug}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-900">{restaurant.owner_email}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900">{restaurant.customer_count}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {getPlanDisplayName(restaurant.subscription_plan)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(restaurant.subscription_status)}`}>
                              {restaurant.subscription_status.charAt(0).toUpperCase() + restaurant.subscription_status.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 text-sm">
                            {formatDate(restaurant.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Subscriptions Tab */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search subscriptions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past Due</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Restaurant</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Plan</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Period End</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubscriptions.map((subscription) => (
                        <tr key={subscription.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-900">{subscription.user_email}</td>
                          <td className="py-3 px-4 text-gray-900">{subscription.restaurant_name}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {getPlanDisplayName(subscription.plan_type)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 text-sm">
                            {formatDate(subscription.current_period_end)}
                          </td>
                          <td className="py-3 px-4 text-gray-600 text-sm">
                            {formatDate(subscription.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Support Tab */}
            {activeTab === 'support' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Open Tickets</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">
                      {supportTickets.filter(t => t.status === 'open').length}
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-900">In Progress</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-900">
                      {supportTickets.filter(t => t.status === 'in_progress').length}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Resolved</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">
                      {supportTickets.filter(t => t.status === 'resolved').length}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <X className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Closed</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {supportTickets.filter(t => t.status === 'closed').length}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Restaurant</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Priority</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supportTickets.slice(0, 10).map((ticket) => (
                        <tr key={ticket.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900">{ticket.title}</p>
                            <p className="text-sm text-gray-500 line-clamp-1">{ticket.description}</p>
                          </td>
                          <td className="py-3 px-4 text-gray-900">
                            {ticket.restaurant?.name || 'Unknown'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                              ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                              ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 text-sm">
                            {formatDate(ticket.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUI;