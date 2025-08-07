import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Calendar, DollarSign, Settings, AlertCircle,
  CheckCircle, Clock, RefreshCw, Download, Eye, MoreVertical,
  Plus, Trash2, Edit3, Shield, Crown, Zap, TrendingUp,
  Receipt, FileText, Bell, X, Loader2, User, Building
} from 'lucide-react';
import { SubscriptionService } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';

const BillingPage: React.FC = () => {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  const { user, restaurant } = useAuth();

  useEffect(() => {
    if (user) {
      loadBillingData();
    }
  }, [user]);

  const loadBillingData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      // Load subscription data
      const subscriptionData = await SubscriptionService.checkSubscriptionAccess(user.id);
      setSubscription(subscriptionData);

    } catch (err: any) {
      console.error('Error loading billing data:', err);
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.subscription?.stripe_subscription_id) return;

    try {
      setActionLoading('cancel');
      
      // For demo purposes, just update the status locally
      // In production, you would call your backend to cancel the Stripe subscription
      await SubscriptionService.updateSubscriptionStatus(
        subscription.subscription.id,
        'cancelled'
      );

      await loadBillingData();
      setShowCancelModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPlanDisplayName = (planType: string) => {
    switch (planType) {
      case 'monthly': return 'Monthly Plan';
      case 'semiannual': return '6-Month Plan';
      case 'annual': return 'Annual Plan';
      case 'trial': return 'Free Trial';
      default: return 'Unknown Plan';
    }
  };

  const getPlanPrice = (planType: string) => {
    switch (planType) {
      case 'monthly': return '$2.99/month';
      case 'semiannual': return '$9.99 (6 months)';
      case 'annual': return '$19.99 (1 year)';
      case 'trial': return 'Free';
      default: return 'N/A';
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-1">Manage your subscription and view billing details</p>
        </div>
        <button
          onClick={loadBillingData}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Subscription */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Crown className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
              <p className="text-sm text-gray-600">Your active subscription details</p>
            </div>
          </div>

          {subscription?.subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Plan</span>
                <span className="font-semibold text-gray-900">
                  {getPlanDisplayName(subscription.subscription.plan_type)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Price</span>
                <span className="font-semibold text-gray-900">
                  {getPlanPrice(subscription.subscription.plan_type)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.subscription.status)}`}>
                  {subscription.subscription.status.charAt(0).toUpperCase() + subscription.subscription.status.slice(1)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Started</span>
                <span className="font-semibold text-gray-900">
                  {formatDate(subscription.subscription.current_period_start)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  {subscription.subscription.plan_type === 'trial' ? 'Trial Ends' : 'Next Billing'}
                </span>
                <span className="font-semibold text-gray-900">
                  {formatDate(subscription.subscription.current_period_end)}
                </span>
              </div>

              {subscription.daysRemaining !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Days Remaining</span>
                  <span className={`font-semibold ${subscription.daysRemaining <= 7 ? 'text-red-600' : 'text-gray-900'}`}>
                    {subscription.daysRemaining} days
                  </span>
                </div>
              )}

              {subscription.subscription.stripe_customer_id && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Customer ID</span>
                  <span className="font-mono text-sm text-gray-900">
                    {subscription.subscription.stripe_customer_id.slice(-8)}
                  </span>
                </div>
              )}

              {subscription.subscription.plan_type !== 'trial' && subscription.subscription.status === 'active' && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full py-2 px-4 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                  >
                    Cancel Subscription
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Crown className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No active subscription</p>
              <button
                onClick={() => window.location.href = '/upgrade'}
                className="px-4 py-2 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Choose a Plan
              </button>
            </div>
          )}
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <User className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
              <p className="text-sm text-gray-600">Your account and restaurant details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Email</span>
              <span className="font-semibold text-gray-900">{user?.email}</span>
            </div>

            {restaurant && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Restaurant</span>
                  <span className="font-semibold text-gray-900">{restaurant.name}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Restaurant ID</span>
                  <span className="font-mono text-sm text-gray-900">{restaurant.id.slice(-8)}</span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Member Since</span>
              <span className="font-semibold text-gray-900">
                {user?.created_at ? formatDate(user.created_at) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage & Limits */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Usage & Limits</h3>
            <p className="text-sm text-gray-600">Current usage against your plan limits</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Customers</span>
                <span className="text-sm font-medium text-gray-900">
                  {subscription?.features?.maxCustomers === -1 ? 'Unlimited' : `0 / ${subscription?.features?.maxCustomers || 100}`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-[#E6A85C] to-[#E85A9B] h-2 rounded-full" style={{ width: '25%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Branches</span>
                <span className="text-sm font-medium text-gray-900">
                  {subscription?.features?.maxBranches === -1 ? 'Unlimited' : `0 / ${subscription?.features?.maxBranches || 1}`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-[#E6A85C] to-[#E85A9B] h-2 rounded-full" style={{ width: '10%' }} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${subscription?.features?.advancedAnalytics ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-700">Advanced Analytics</span>
              {!subscription?.features?.advancedAnalytics && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Upgrade Required</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${subscription?.features?.prioritySupport ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-700">Priority Support</span>
              {!subscription?.features?.prioritySupport && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Upgrade Required</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${subscription?.features?.apiAccess ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-700">API Access</span>
              {!subscription?.features?.apiAccess && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Upgrade Required</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${subscription?.features?.customBranding ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-700">Custom Branding</span>
              {!subscription?.features?.customBranding && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Upgrade Required</span>
              )}
            </div>
          </div>
        </div>

        {subscription?.subscription?.plan_type === 'trial' && (
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-900">Trial Period</p>
                <p className="text-sm text-yellow-700">
                  {subscription.daysRemaining > 0 
                    ? `${subscription.daysRemaining} days remaining in your free trial`
                    : 'Your trial has expired'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/upgrade'}
              className="mt-3 w-full py-2 px-4 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
            >
              Upgrade Now
            </button>
          </div>
        )}
      </div>

      {/* Billing Summary */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Receipt className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Billing Summary</h3>
            <p className="text-sm text-gray-600">Overview of your subscription costs</p>
          </div>
        </div>

        {subscription?.subscription ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-green-700 mb-1">Current Plan Cost</p>
              <p className="text-2xl font-bold text-green-900">
                {getPlanPrice(subscription.subscription.plan_type)}
              </p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm text-blue-700 mb-1">Billing Cycle</p>
              <p className="text-2xl font-bold text-blue-900">
                {subscription.subscription.plan_type === 'monthly' ? '30' :
                 subscription.subscription.plan_type === 'semiannual' ? '180' :
                 subscription.subscription.plan_type === 'annual' ? '365' : '30'} days
              </p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm text-purple-700 mb-1">Days Remaining</p>
              <p className="text-2xl font-bold text-purple-900">
                {subscription.daysRemaining || 0}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No billing information available</p>
          </div>
        )}
      </div>

      {/* Payment Information */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payment Information</h3>
            <p className="text-sm text-gray-600">Secure payment processing via Stripe</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Secure Payment Processing</p>
              <p className="text-sm text-blue-700">
                All payments are processed securely through Stripe. We never store your payment information.
              </p>
            </div>
          </div>
        </div>

        {subscription?.subscription?.stripe_customer_id && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Stripe Customer</p>
                <p className="text-sm text-gray-600">Your secure payment profile</p>
              </div>
              <span className="font-mono text-sm text-gray-700">
                {subscription.subscription.stripe_customer_id}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Cancel Subscription</h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900 mb-1">Are you sure?</p>
                    <p className="text-red-700 text-sm">
                      Cancelling your subscription will:
                    </p>
                    <ul className="text-red-700 text-sm mt-2 space-y-1 list-disc list-inside">
                      <li>End access to premium features</li>
                      <li>Stop automatic billing</li>
                      <li>Limit customer capacity to 100</li>
                    </ul>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 text-sm">
                Your subscription will remain active until the end of your current billing period.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={actionLoading === 'cancel'}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === 'cancel' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Cancel Subscription'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;