import React, { useState, useEffect } from 'react';
import { 
  Users, Building, CreditCard, TrendingUp, DollarSign, 
  Search, Filter, MoreVertical, Eye, Edit3, Trash2,
  Crown, Award, ChefHat, AlertCircle, CheckCircle,
  RefreshCw, Download, Calendar, BarChart3, PieChart,
  MessageSquare, Settings, LogOut, Shield, Target,
  Clock, Mail, Phone, MapPin, Star, Gift, Zap
} from 'lucide-react';
import { SubscriptionService } from '../services/subscriptionService';
import { SupportService } from '../services/supportService';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  settings: any;
}

interface SubscriptionWithUser {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  created_at: string;
  current_period_end: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
}

interface SupportTicketWithRestaurant {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  restaurant_id: string;
  restaurant_name?: string;
}

const SuperAdminUI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'restaurants' | 'subscriptions' | 'support'>('overview');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicketWithRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('super_admin_authenticated');
    const loginTime = localStorage.getItem('super_admin_login_time');
    
    if (!isAuthenticated || !loginTime) {
      navigate('/super-admin-login');
      return;
    }

    // Check if session is still valid (24 hours)
    const loginDate = new Date(loginTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      localStorage.removeItem('super_admin_authenticated');
      localStorage.removeItem('super_admin_login_time');
      navigate('/super-admin-login');
      return;
    }

    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [restaurantsData, subscriptionsData, supportData] = await Promise.all([
        fetchRestaurants(),
        fetchSubscriptions(),
        fetchSupportTickets()
      ]);

      setRestaurants(restaurantsData);
      setSubscriptions(subscriptionsData);
      setSupportTickets(supportData);
    } catch (err: any) {
      console.error('Error loading super admin data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurants = async (): Promise<Restaurant[]> => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      return [];
    }
  };

  const fetchSubscriptions = async (): Promise<SubscriptionWithUser[]> => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  };

  const fetchSupportTickets = async (): Promise<SupportTicketWithRestaurant[]> => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          id,
          title,
          status,
          priority,
          created_at,
          restaurant_id
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get restaurant names for tickets
      const ticketsWithRestaurants = await Promise.all(
        (data || []).map(async (ticket) => {
          const { data: restaurant } = await supabase
            .from('restaurants')
            .select('name')
            .eq('id', ticket.restaurant_id)
            .single();
          
          return {
            ...ticket,
            restaurant_name: restaurant?.name || 'Unknown Restaurant'
          };
        })
      );

      return ticketsWithRestaurants;
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      return [];
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('super_admin_authenticated');
    localStorage.removeItem('super_admin_login_time');
    navigate('/super-admin-login');
  };

  const getSubscriptionStats = () => {
    const total = subscriptions.length;
    const active = subscriptions.filter(s => s.status === 'active').length;
    const trial = subscriptions.filter(s => s.plan_type === 'trial').length;
    const paid = subscriptions.filter(s => s.plan_type !== 'trial').length;
    
    const revenue = subscriptions.reduce((sum, sub) => {
      if (sub.plan_type === 'monthly') return sum + 2.99;
      if (sub.plan_type === 'semiannual') return sum + 9.99;
      if (sub.plan_type === 'annual') return sum + 19.99;
      return sum;
    }, 0);

    return { total, active, trial, paid, revenue };
  };

  const getSupportStats = () => {
    const total = supportTickets.length;
    const open = supportTickets.filter(t => t.status === 'open').length;
    const inProgress = supportTickets.filter(t => t.status === 'in_progress').length;
    const resolved = supportTickets.filter(t => t.status === 'resolved').length;

    return { total, open, inProgress, resolved };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading super admin dashboard...</p>
        </div>
      </div>
    );
  }

  const subscriptionStats = getSubscriptionStats();
  const supportStats = getSupportStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-sm text-gray-500">System-wide oversight and control</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </header>

      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'restaurants', label: 'Restaurants', icon: Building },
              { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
              { id: 'support', label: 'Support', icon: MessageSquare }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-red-500 to-red-700 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Restaurants</p>
                    <p className="text-2xl font-bold text-gray-900">{restaurants.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Subscriptions</p>
                    <p className="text-2xl font-bold text-gray-900">{subscriptionStats.active}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">${subscriptionStats.revenue.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Open Tickets</p>
                    <p className="text-2xl font-bold text-gray-900">{supportStats.open}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Restaurants</h3>
                <div className="space-y-3">
                  {restaurants.slice(0, 5).map((restaurant) => (
                    <div key={restaurant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{restaurant.name}</p>
                        <p className="text-sm text-gray-500">{formatDate(restaurant.created_at)}</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Support Tickets</h3>
                <div className="space-y-3">
                  {supportTickets.slice(0, 5).map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{ticket.title}</p>
                        <p className="text-sm text-gray-500">{ticket.restaurant_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restaurants Tab */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Restaurant Management</h2>
              <button
                onClick={loadData}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex gap-4 mb-6">
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
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Restaurant</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Owner</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants
                      .filter(restaurant => 
                        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        restaurant.slug.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((restaurant) => (
                        <tr key={restaurant.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-900">{restaurant.name}</p>
                              <p className="text-sm text-gray-500">{restaurant.slug}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {restaurant.owner_id.slice(0, 8)}...
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {formatDate(restaurant.created_at)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Active
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Subscription Management</h2>
              <div className="flex items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  onClick={loadData}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Subscription Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-xl font-bold text-gray-900">{subscriptionStats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active</p>
                    <p className="text-xl font-bold text-gray-900">{subscriptionStats.active}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Trial</p>
                    <p className="text-xl font-bold text-gray-900">{subscriptionStats.trial}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Revenue</p>
                    <p className="text-xl font-bold text-gray-900">${subscriptionStats.revenue.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Plan</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Period End</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions
                      .filter(sub => filterStatus === 'all' || sub.status === filterStatus)
                      .map((subscription) => (
                        <tr key={subscription.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900">{subscription.user_id.slice(0, 8)}...</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {subscription.plan_type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(subscription.status)}`}>
                              {subscription.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {formatDate(subscription.current_period_end)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Support Tickets</h2>
              <button
                onClick={loadData}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>

            {/* Support Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-xl font-bold text-gray-900">{supportStats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Open</p>
                    <p className="text-xl font-bold text-gray-900">{supportStats.open}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-xl font-bold text-gray-900">{supportStats.inProgress}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Resolved</p>
                    <p className="text-xl font-bold text-gray-900">{supportStats.resolved}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Tickets Table */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Restaurant</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Priority</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportTickets.map((ticket) => (
                      <tr key={ticket.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{ticket.title}</p>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {ticket.restaurant_name}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatDate(ticket.created_at)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminUI;