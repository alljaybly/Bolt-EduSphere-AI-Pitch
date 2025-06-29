import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Crown, 
  X, 
  Check, 
  Star, 
  Zap, 
  Shield, 
  Gift,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { 
  createPayPalPaymentButton, 
  createPayPalSubscriptionButton,
  createPayPalSubscriptionPlan,
  hasActiveSubscription,
  getPaymentHistory
} from '../lib/paypal.js';
import { getCurrentUserId } from '../lib/revenuecat.js';
import confetti from 'canvas-confetti';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
  defaultTab?: 'one-time' | 'subscription';
}

/**
 * Payment Modal Component
 * Handles both PayPal one-time payments and subscriptions
 */
const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  defaultTab = 'subscription'
}) => {
  const [activeTab, setActiveTab] = useState<'one-time' | 'subscription'>(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasActiveSubscriptionState, setHasActiveSubscriptionState] = useState(false);
  
  // PayPal button container refs
  const oneTimePaymentRef = useRef<HTMLDivElement>(null);
  const subscriptionPaymentRef = useRef<HTMLDivElement>(null);

  // Payment/subscription options
  const oneTimeOptions = [
    {
      id: 'premium_day',
      name: '1 Day Premium',
      price: 2.99,
      description: 'Full access for 24 hours',
      features: ['AR Problems', 'Live Code', 'Premium Stories', 'Voice Recognition']
    },
    {
      id: 'premium_week',
      name: '1 Week Premium',
      price: 9.99,
      description: 'Full access for 7 days',
      features: ['AR Problems', 'Live Code', 'Premium Stories', 'Voice Recognition', 'Priority Support']
    },
    {
      id: 'premium_month',
      name: '1 Month Premium',
      price: 19.99,
      description: 'Full access for 30 days',
      features: ['AR Problems', 'Live Code', 'Premium Stories', 'Voice Recognition', 'Priority Support', 'Advanced Analytics']
    }
  ];

  const subscriptionOptions = [
    {
      id: 'monthly',
      name: 'Monthly Premium',
      price: 14.99,
      interval: 'month',
      description: 'Billed monthly, cancel anytime',
      features: ['All Premium Features', 'Unlimited Access', 'Priority Support', 'New Features First'],
      popular: true
    },
    {
      id: 'yearly',
      name: 'Yearly Premium',
      price: 149.99,
      interval: 'year',
      description: 'Save 17% with annual billing',
      features: ['All Premium Features', 'Unlimited Access', 'Priority Support', 'New Features First', '2 Months Free'],
      savings: '17% OFF'
    }
  ];

  const [selectedOneTime, setSelectedOneTime] = useState(oneTimeOptions[1]);
  const [selectedSubscription, setSelectedSubscription] = useState(subscriptionOptions[0]);

  /**
   * Check subscription status on mount
   */
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const isActive = await hasActiveSubscription();
        setHasActiveSubscriptionState(isActive);
      } catch (error) {
        console.error('Failed to check subscription status:', error);
      }
    };

    if (isOpen) {
      checkSubscription();
    }
  }, [isOpen]);

  /**
   * Initialize PayPal buttons when modal opens
   */
  useEffect(() => {
    if (isOpen && !hasActiveSubscriptionState) {
      initializePayPalButtons();
    }
  }, [isOpen, activeTab, selectedOneTime, selectedSubscription, hasActiveSubscriptionState]);

  /**
   * Initialize PayPal payment buttons
   */
  const initializePayPalButtons = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const userId = getCurrentUserId();

      // Clear existing buttons
      if (oneTimePaymentRef.current) {
        oneTimePaymentRef.current.innerHTML = '';
      }
      if (subscriptionPaymentRef.current) {
        subscriptionPaymentRef.current.innerHTML = '';
      }

      if (activeTab === 'one-time' && oneTimePaymentRef.current) {
        // Create one-time payment button
        await createPayPalPaymentButton('one-time-payment-container', {
          amount: selectedOneTime.price,
          currency: 'USD',
          description: selectedOneTime.description,
          user_id: userId,
          reference_id: `${selectedOneTime.id}_${userId}_${Date.now()}`,
          onSuccess: handlePaymentSuccess,
          onError: handlePaymentError,
          onCancel: handlePaymentCancel
        });
      } else if (activeTab === 'subscription' && subscriptionPaymentRef.current) {
        // Create subscription plan first, then button
        const planData = {
          name: selectedSubscription.name,
          description: selectedSubscription.description,
          amount: selectedSubscription.price,
          currency: 'USD',
          interval_unit: selectedSubscription.interval === 'year' ? 'YEAR' : 'MONTH',
          interval_count: 1
        };

        // For demo purposes, we'll use a pre-created plan ID
        // In production, you'd create the plan via your backend
        const planId = selectedSubscription.interval === 'year' 
          ? 'P-YEARLY-PREMIUM-PLAN' 
          : 'P-MONTHLY-PREMIUM-PLAN';

        await createPayPalSubscriptionButton('subscription-payment-container', {
          plan_id: planId,
          currency: 'USD',
          user_id: userId,
          subscriber: {
            first_name: 'EduSphere',
            last_name: 'User',
            email: 'user@edusphere.ai'
          },
          onSuccess: handleSubscriptionSuccess,
          onError: handlePaymentError,
          onCancel: handlePaymentCancel
        });
      }
    } catch (error) {
      console.error('Failed to initialize PayPal buttons:', error);
      setError('Failed to load payment options. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle successful one-time payment
   */
  const handlePaymentSuccess = (result: any) => {
    console.log('Payment successful:', result);
    setSuccess('Payment completed successfully! You now have premium access.');
    
    // Show confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Call success callback
    if (onSuccess) {
      onSuccess(result);
    }

    // Close modal after delay
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  /**
   * Handle successful subscription
   */
  const handleSubscriptionSuccess = (result: any) => {
    console.log('Subscription successful:', result);
    setSuccess('Subscription activated successfully! Welcome to EduSphere AI Premium.');
    setHasActiveSubscriptionState(true);
    
    // Show confetti
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });

    // Call success callback
    if (onSuccess) {
      onSuccess(result);
    }

    // Close modal after delay
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  /**
   * Handle payment error
   */
  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    setError('Payment failed. Please try again or contact support.');
  };

  /**
   * Handle payment cancellation
   */
  const handlePaymentCancel = (data: any) => {
    console.log('Payment cancelled:', data);
    setError('Payment was cancelled. You can try again anytime.');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Crown className="text-yellow-500 mr-3" size={32} />
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {hasActiveSubscriptionState ? 'Premium Active' : 'Upgrade to Premium'}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {hasActiveSubscriptionState 
                    ? 'You already have an active premium subscription'
                    : 'Unlock all features with PayPal'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {hasActiveSubscriptionState ? (
              /* Active Subscription View */
              <div className="text-center py-8">
                <CheckCircle className="mx-auto mb-4 text-green-500" size={64} />
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  Premium Active!
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  You have full access to all EduSphere AI premium features.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                  {['AR Problems', 'Live Code', 'Premium Stories', 'Voice Recognition'].map((feature, index) => (
                    <div key={index} className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <Check className="mx-auto mb-2 text-green-500" size={20} />
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Error/Success Messages */}
                {error && (
                  <motion.div
                    className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <AlertCircle className="text-red-500 mr-3 flex-shrink-0" size={20} />
                    <p className="text-red-700 dark:text-red-300">{error}</p>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <CheckCircle className="text-green-500 mr-3 flex-shrink-0" size={20} />
                    <p className="text-green-700 dark:text-green-300">{success}</p>
                  </motion.div>
                )}

                {/* Tab Navigation */}
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
                  <button
                    onClick={() => setActiveTab('subscription')}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                      activeTab === 'subscription'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                    }`}
                  >
                    <Crown className="inline mr-2" size={16} />
                    Subscription
                  </button>
                  <button
                    onClick={() => setActiveTab('one-time')}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                      activeTab === 'one-time'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                    }`}
                  >
                    <CreditCard className="inline mr-2" size={16} />
                    One-time
                  </button>
                </div>

                {/* Subscription Tab */}
                {activeTab === 'subscription' && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                        Choose Your Subscription Plan
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        Continuous access to all premium features
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {subscriptionOptions.map((option) => (
                        <motion.div
                          key={option.id}
                          className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedSubscription.id === option.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                          } ${option.popular ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => setSelectedSubscription(option)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {option.popular && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                Most Popular
                              </span>
                            </div>
                          )}
                          
                          {option.savings && (
                            <div className="absolute -top-3 right-4">
                              <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                {option.savings}
                              </span>
                            </div>
                          )}

                          <div className="text-center mb-4">
                            <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                              {option.name}
                            </h4>
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                              ${option.price}
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                              {option.description}
                            </p>
                          </div>

                          <ul className="space-y-2">
                            {option.features.map((feature, index) => (
                              <li key={index} className="flex items-center text-sm">
                                <Check className="text-green-500 mr-2 flex-shrink-0" size={16} />
                                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      ))}
                    </div>

                    {/* PayPal Subscription Button */}
                    <div className="text-center">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="animate-spin mr-2" size={24} />
                          <span>Loading PayPal...</span>
                        </div>
                      ) : (
                        <div id="subscription-payment-container" ref={subscriptionPaymentRef}></div>
                      )}
                    </div>
                  </div>
                )}

                {/* One-time Tab */}
                {activeTab === 'one-time' && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                        Choose Your Premium Duration
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        One-time payment for temporary access
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {oneTimeOptions.map((option) => (
                        <motion.div
                          key={option.id}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedOneTime.id === option.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                          }`}
                          onClick={() => setSelectedOneTime(option)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="text-center mb-3">
                            <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
                              {option.name}
                            </h4>
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                              ${option.price}
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                              {option.description}
                            </p>
                          </div>

                          <ul className="space-y-1">
                            {option.features.map((feature, index) => (
                              <li key={index} className="flex items-center text-xs">
                                <Check className="text-green-500 mr-1 flex-shrink-0" size={12} />
                                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      ))}
                    </div>

                    {/* PayPal One-time Button */}
                    <div className="text-center">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="animate-spin mr-2" size={24} />
                          <span>Loading PayPal...</span>
                        </div>
                      ) : (
                        <div id="one-time-payment-container" ref={oneTimePaymentRef}></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Security Notice */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start">
                    <Shield className="text-blue-500 mr-3 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-white mb-1">
                        Secure Payment with PayPal
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Your payment information is processed securely by PayPal. We never store your payment details.
                        You can cancel your subscription anytime from your PayPal account.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentModal;