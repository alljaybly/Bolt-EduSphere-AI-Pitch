import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Crown, 
  Check, 
  Star, 
  Zap, 
  Shield, 
  Credit,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { 
  initializePayPal, 
  createSubscription, 
  createOneTimePayment,
  hasActiveSubscription
} from '../lib/paypal.js';
import { getCurrentUserId } from '../lib/authUtils';
import confetti from 'canvas-confetti';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  popular?: boolean;
  paypalPlanId?: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  // Pricing plans
  const plans: PricingPlan[] = [
    {
      id: 'monthly',
      name: 'Monthly Premium',
      price: 9.99,
      period: 'month',
      paypalPlanId: 'P-MONTHLY-PREMIUM-PLAN',
      features: [
        'Unlimited AI-generated content',
        'Advanced voice recognition',
        'AR learning experiences',
        'Real-time collaboration',
        'Premium story mode',
        'Priority support',
        'Offline access'
      ]
    },
    {
      id: 'yearly',
      name: 'Yearly Premium',
      price: 99.99,
      period: 'year',
      popular: true,
      paypalPlanId: 'P-YEARLY-PREMIUM-PLAN',
      features: [
        'All monthly features',
        '2 months free (save 17%)',
        'Advanced analytics',
        'Custom learning paths',
        'Family sharing (up to 5 users)',
        'Early access to new features',
        'Dedicated account manager'
      ]
    },
    {
      id: 'lifetime',
      name: 'Lifetime Access',
      price: 299.99,
      period: 'lifetime',
      features: [
        'All premium features forever',
        'No recurring payments',
        'Lifetime updates',
        'VIP support',
        'Beta feature access',
        'Educational institution license',
        'Commercial usage rights'
      ]
    }
  ];

  /**
   * Initialize PayPal and check subscription status
   */
  useEffect(() => {
    if (isOpen) {
      initializePayPalSDK();
      checkCurrentSubscription();
    }
  }, [isOpen]);

  /**
   * Initialize PayPal SDK
   */
  const initializePayPalSDK = async () => {
    try {
      await initializePayPal();
      setPaypalLoaded(true);
    } catch (error) {
      console.error('Failed to initialize PayPal:', error);
      setError('Failed to load payment system. Please try again.');
    }
  };

  /**
   * Check current subscription status
   */
  const checkCurrentSubscription = async () => {
    try {
      const hasSubscription = await hasActiveSubscription();
      if (hasSubscription) {
        // Fetch subscription details if needed
        setCurrentSubscription({ active: true });
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  /**
   * Handle subscription purchase
   */
  const handleSubscriptionPurchase = async (plan: PricingPlan) => {
    if (!paypalLoaded) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const userId = getCurrentUserId();
      
      if (plan.id === 'lifetime') {
        // Handle one-time payment for lifetime access
        const result = await createOneTimePayment({
          amount: plan.price,
          currency: 'USD',
          description: `EduSphere AI - ${plan.name}`,
          userId: userId,
          planType: 'lifetime'
        });

        if (result.success) {
          setSuccess('Lifetime access purchased successfully!');
          showSuccessConfetti();
          
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 2000);
        } else {
          throw new Error(result.error || 'Payment failed');
        }
      } else {
        // Handle subscription
        const result = await createSubscription({
          planId: plan.paypalPlanId || plan.id,
          userId: userId,
          planType: plan.id
        });

        if (result.success) {
          setSuccess(`${plan.name} subscription activated successfully!`);
          showSuccessConfetti();
          
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 2000);
        } else {
          throw new Error(result.error || 'Subscription creation failed');
        }
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      setError(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Show success confetti animation
   */
  const showSuccessConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  /**
   * Get plan savings text
   */
  const getPlanSavings = (plan: PricingPlan) => {
    if (plan.id === 'yearly') {
      const monthlyCost = 9.99 * 12;
      const savings = monthlyCost - plan.price;
      return `Save $${savings.toFixed(2)} per year`;
    }
    return null;
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
          className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="text-center">
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Crown size={32} />
              </motion.div>
              <h2 className="text-3xl font-bold mb-2">Upgrade to Premium</h2>
              <p className="text-blue-100">Unlock the full potential of EduSphere AI</p>
            </div>
          </div>

          {/* Error/Success Messages */}
          <div className="p-6">
            <AnimatePresence>
              {error && (
                <motion.div
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <AlertCircle className="text-red-500 mr-3 flex-shrink-0" size={20} />
                  <p className="text-red-700">{error}</p>
                </motion.div>
              )}

              {success && (
                <motion.div
                  className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CheckCircle className="text-green-500 mr-3 flex-shrink-0" size={20} />
                  <p className="text-green-700">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Current Subscription Status */}
            {currentSubscription?.active && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <Crown className="text-blue-500 mr-3" size={20} />
                  <div>
                    <p className="font-semibold text-blue-800">You already have an active subscription!</p>
                    <p className="text-blue-600 text-sm">Enjoy all premium features.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  className={`relative p-6 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedPlan === plan.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${plan.popular ? 'ring-2 ring-purple-500' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                    <div className="mb-2">
                      <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                      {plan.period !== 'lifetime' && (
                        <span className="text-gray-600">/{plan.period}</span>
                      )}
                    </div>
                    {getPlanSavings(plan) && (
                      <p className="text-green-600 text-sm font-medium">{getPlanSavings(plan)}</p>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm">
                        <Check className="text-green-500 mr-2 flex-shrink-0" size={16} />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <motion.button
                    onClick={() => handleSubscriptionPurchase(plan)}
                    disabled={isProcessing || !paypalLoaded}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedPlan === plan.id
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                    whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                  >
                    {isProcessing && selectedPlan === plan.id ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="animate-spin mr-2" size={16} />
                        Processing...
                      </div>
                    ) : (
                      `Choose ${plan.name}`
                    )}
                  </motion.button>
                </motion.div>
              ))}
            </div>

            {/* Features Highlight */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
                Why Choose Premium?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                    <Zap className="text-blue-600" size={24} />
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">AI-Powered Learning</h4>
                  <p className="text-gray-600 text-sm">
                    Advanced AI generates personalized content and adapts to your learning style
                  </p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
                    <Star className="text-purple-600" size={24} />
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">Premium Features</h4>
                  <p className="text-gray-600 text-sm">
                    Access AR experiences, voice recognition, and collaborative tools
                  </p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                    <Shield className="text-green-600" size={24} />
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">Secure & Reliable</h4>
                  <p className="text-gray-600 text-sm">
                    Enterprise-grade security with 99.9% uptime guarantee
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Security */}
            <div className="text-center text-gray-600 text-sm">
              <div className="flex items-center justify-center mb-2">
                <Shield className="mr-2" size={16} />
                <span>Secure payment powered by PayPal</span>
              </div>
              <p>Your payment information is encrypted and secure. Cancel anytime.</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentModal;