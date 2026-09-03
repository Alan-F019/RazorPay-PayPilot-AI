import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import {
  createRazorpayOrder,
  simulateRazorpayWebhook,
  fetchRazorpayConfig,
  loadRazorpayScript,
} from '../../services/recoveryService';
import { formatINR } from '../../utils/formatters';

interface TestPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentProcessed: (caseId?: string) => void;
  onInspectCase: (caseId: string) => void;
}

type SimulationOutcome =
  | 'captured'
  | 'INSUFFICIENT_FUNDS'
  | 'ONLINE_LIMIT_EXCEEDED'
  | 'GATEWAY_DECLINE_POLICY';

export const TestPlaygroundModal: React.FC<TestPlaygroundModalProps> = ({
  isOpen,
  onClose,
  onPaymentProcessed,
  onInspectCase,
}) => {
  // Form States
  const [amount, setAmount] = useState<number>(500);
  const [currency, setCurrency] = useState<string>('INR');
  const [customerName, setCustomerName] = useState<string>('Ananya Sharma');
  const [customerEmail, setCustomerEmail] = useState<string>('ananya.sharma@startupindia.in');
  const [customerPhone, setCustomerPhone] = useState<string>('+91 98112 34567');

  // Execution Mode: 'simulator' (PayPilot Test Simulation) | 'live_checkout' (Live Razorpay Test Checkout)
  const [activeMode, setActiveMode] = useState<'simulator' | 'live_checkout'>('simulator');
  const [selectedOutcome, setSelectedOutcome] = useState<SimulationOutcome>('INSUFFICIENT_FUNDS');

  // Async & Execution Results
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [result, setResult] = useState<{
    success: boolean;
    paymentId: string;
    orderId: string;
    event: string;
    amount: number;
    caseId?: string;
    status?: string;
    mode: 'live' | 'simulation';
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const PRESET_AMOUNTS = [100, 500, 1000, 5000, 10000, 50000];

  // 1. Run Outcome Simulator (PayPilot Test Simulation via Backend Webhook)
  const handleRunSimulation = async () => {
    if (!amount || amount <= 0) {
      setErrorMessage('Please enter a valid amount.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Step A: Create real Razorpay order on backend
      const order = await createRazorpayOrder({
        amount: Math.round(amount * 100), // paise
        currency,
        receipt: `rcpt_sim_${Date.now()}`,
        notes: { customerName, customerEmail, mode: 'test_simulation' },
      });
      setCreatedOrder(order);

      // Step B: Dispatch server-side signed simulated webhook
      const isFailed = selectedOutcome !== 'captured';
      const declineReasons: Record<string, string> = {
        INSUFFICIENT_FUNDS: 'Card issuer reported insufficient funds for transaction.',
        ONLINE_LIMIT_EXCEEDED: 'Cardholder daily per-transaction online authorization limit exceeded.',
        GATEWAY_DECLINE_POLICY: 'Transaction declined by bank policy due to security risk guardrail.',
      };

      const simRes = await simulateRazorpayWebhook({
        amount,
        currency,
        customerName,
        customerEmail,
        customerPhone,
        outcome: isFailed ? 'failed' : 'captured',
        declineCode: isFailed ? selectedOutcome : undefined,
        declineReason: isFailed ? declineReasons[selectedOutcome] : undefined,
        orderId: order.id,
      });

      setResult({
        success: true,
        paymentId: simRes.paymentId,
        orderId: simRes.orderId || order.id,
        event: simRes.event,
        amount,
        caseId: simRes.caseId,
        status: isFailed ? 'failed' : 'captured',
        mode: 'simulation',
      });

      onPaymentProcessed(simRes.caseId);
    } catch (err: any) {
      console.error('Simulation error:', err);
      setErrorMessage(err.message || 'Failed to process test simulation.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Launch Live Razorpay Standard Checkout SDK Modal
  const handleLaunchRazorpayCheckout = async () => {
    if (!amount || amount <= 0) {
      setErrorMessage('Please enter a valid amount.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Step A: Create real Razorpay order on backend
      const order = await createRazorpayOrder({
        amount: Math.round(amount * 100),
        currency,
        receipt: `rcpt_live_${Date.now()}`,
        notes: { customerName, customerEmail, mode: 'live_test_checkout' },
      });
      setCreatedOrder(order);

      // Step B: Fetch safe public client configuration
      const config = await fetchRazorpayConfig();
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !(window as any).Razorpay) {
        throw new Error('Razorpay Checkout SDK failed to load. Please check network connection.');
      }

      // Step C: Initialize Razorpay Checkout Modal
      const options = {
        key: config.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'PayPilot AI',
        description: `Test Payment — ${formatINR(amount)}`,
        order_id: order.id,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: '#2563eb',
        },
        modal: {
          ondismiss: () => {
            console.log('[Checkout] Modal dismissed by user');
          },
        },
        handler: async (response: any) => {
          console.log('[Checkout] Payment Successful:', response);
          setIsLoading(true);
          try {
            // Trigger payment.captured via backend webhook engine to settle transaction
            const simRes = await simulateRazorpayWebhook({
              amount,
              currency,
              customerName,
              customerEmail,
              customerPhone,
              outcome: 'captured',
              orderId: order.id,
              paymentId: response.razorpay_payment_id,
            });

            setResult({
              success: true,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id || order.id,
              event: 'payment.captured',
              amount,
              status: 'captured',
              mode: 'live',
            });

            onPaymentProcessed(simRes.caseId);
          } catch (e: any) {
            setErrorMessage(e.message || 'Error synchronizing payment status');
          } finally {
            setIsLoading(false);
          }
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);

      rzpInstance.on('payment.failed', async (response: any) => {
        console.warn('[Checkout] Payment Failed:', response.error);
        setIsLoading(true);
        try {
          const simRes = await simulateRazorpayWebhook({
            amount,
            currency,
            customerName,
            customerEmail,
            customerPhone,
            outcome: 'failed',
            declineCode: response.error?.code || 'INSUFFICIENT_FUNDS',
            declineReason: response.error?.description || 'Payment failed during test checkout',
            orderId: order.id,
            paymentId: response.error?.metadata?.payment_id,
          });

          setResult({
            success: true,
            paymentId: response.error?.metadata?.payment_id || `pay_${Date.now()}`,
            orderId: order.id,
            event: 'payment.failed',
            amount,
            caseId: simRes.caseId,
            status: 'failed',
            mode: 'live',
          });

          onPaymentProcessed(simRes.caseId);
        } catch (e: any) {
          setErrorMessage(e.message || 'Error creating recovery case');
        } finally {
          setIsLoading(false);
        }
      });

      rzpInstance.open();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err.message || 'Failed to launch Razorpay Checkout.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-2xl bg-[#0b0f19] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
              🧪
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Razorpay Test Payment Playground
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold">
                  Sandbox Only
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate test payments to observe automated revenue recovery in real time.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e293b] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-lg flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Amount Selection Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              1. Select Test Amount (INR)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className={`py-2 px-1 rounded-md text-xs font-mono font-medium text-center border transition-all cursor-pointer ${
                    amount === amt
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold shadow-xs'
                      : 'bg-[#0f172a] border-[#1e293b] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  ₹{amt.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Custom Amount & Currency Input */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2 relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-mono">₹</span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Enter custom amount"
                  className="w-full pl-8 pr-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-md text-sm font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-md text-sm font-mono text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer Profile Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              2. Test Customer Details
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name"
                className="px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-md text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Email Address"
                className="px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-md text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone Number"
                className="px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-md text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Execution Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              3. Execution Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActiveMode('simulator')}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  activeMode === 'simulator'
                    ? 'bg-blue-950/40 border-blue-500/60 shadow-xs ring-1 ring-blue-500/30'
                    : 'bg-[#0f172a] border-[#1e293b] hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      SIMULATED WEBHOOK ENGINE
                    </span>
                    {activeMode === 'simulator' && (
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    PayPilot Test Simulation
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug mt-2">
                  Triggers backend HMAC-signed webhook ingestion to test automated revenue recovery workflows.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('live_checkout')}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  activeMode === 'live_checkout'
                    ? 'bg-amber-950/40 border-amber-500/60 shadow-xs ring-1 ring-amber-500/30'
                    : 'bg-[#0f172a] border-[#1e293b] hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      LIVE RAZORPAY TEST MODE
                    </span>
                    {activeMode === 'live_checkout' && (
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5 mt-1">
                    <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    Live Razorpay Checkout SDK
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug mt-2">
                  Launches the official Razorpay Standard Checkout popup using active sandbox API keys.
                </p>
              </button>
            </div>
          </div>

          {/* Outcome Selector (For Simulation Mode) */}
          {activeMode === 'simulator' && (
            <div className="space-y-2 p-3.5 bg-[#0f172a] border border-[#1e293b] rounded-lg">
              <label className="text-xs font-semibold text-slate-300 block">
                Choose Simulated Payment Outcome:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOutcome('captured')}
                  className={`p-2.5 rounded-md border text-left text-xs transition-all cursor-pointer flex items-center gap-2 ${
                    selectedOutcome === 'captured'
                      ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                      : 'bg-[#0b0f19] border-[#1e293b] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">Successful Payment</span>
                    <span className="text-[10px] text-slate-400">payment.captured → Status: Captured</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOutcome('INSUFFICIENT_FUNDS')}
                  className={`p-2.5 rounded-md border text-left text-xs transition-all cursor-pointer flex items-center gap-2 ${
                    selectedOutcome === 'INSUFFICIENT_FUNDS'
                      ? 'bg-rose-950/50 border-rose-500/60 text-rose-200'
                      : 'bg-[#0b0f19] border-[#1e293b] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">Card Decline (Funds)</span>
                    <span className="text-[10px] text-slate-400">INSUFFICIENT_FUNDS → AI UPI Link</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOutcome('ONLINE_LIMIT_EXCEEDED')}
                  className={`p-2.5 rounded-md border text-left text-xs transition-all cursor-pointer flex items-center gap-2 ${
                    selectedOutcome === 'ONLINE_LIMIT_EXCEEDED'
                      ? 'bg-rose-950/50 border-rose-500/60 text-rose-200'
                      : 'bg-[#0b0f19] border-[#1e293b] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">Online Limit Exceeded</span>
                    <span className="text-[10px] text-slate-400">ONLINE_LIMIT_EXCEEDED → Split Card</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOutcome('GATEWAY_DECLINE_POLICY')}
                  className={`p-2.5 rounded-md border text-left text-xs transition-all cursor-pointer flex items-center gap-2 ${
                    selectedOutcome === 'GATEWAY_DECLINE_POLICY'
                      ? 'bg-rose-950/50 border-rose-500/60 text-rose-200'
                      : 'bg-[#0b0f19] border-[#1e293b] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">Gateway Policy Decline</span>
                    <span className="text-[10px] text-slate-400">GATEWAY_DECLINE → Safety Guardrail</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Action Trigger Button */}
          <div className="pt-2">
            {activeMode === 'simulator' ? (
              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Test Simulation...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Process {formatINR(amount)} Test Simulation</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLaunchRazorpayCheckout}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Initializing Test Checkout...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Open Razorpay Test Checkout ({formatINR(amount)})</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Interactive Result Card */}
          {result && (
            <div className="p-4 bg-[#0f172a] border border-[#1e293b] rounded-lg space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      result.status === 'captured' ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    {result.mode === 'live' ? 'Razorpay Test Result' : 'PayPilot Test Simulation Result'}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                    result.status === 'captured'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {result.status === 'captured' ? 'Captured / Succeeded' : 'Payment Failed'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 bg-[#0b0f19] rounded border border-[#1e293b]">
                  <span className="text-[10px] text-slate-500 block">Amount</span>
                  <span className="font-bold text-white">{formatINR(result.amount)}</span>
                </div>
                <div className="p-2 bg-[#0b0f19] rounded border border-[#1e293b]">
                  <span className="text-[10px] text-slate-500 block">Payment ID</span>
                  <span className="text-slate-300 truncate block">{result.paymentId}</span>
                </div>
                <div className="p-2 bg-[#0b0f19] rounded border border-[#1e293b]">
                  <span className="text-[10px] text-slate-500 block">Order ID</span>
                  <span className="text-slate-300 truncate block">{result.orderId}</span>
                </div>
                <div className="p-2 bg-[#0b0f19] rounded border border-[#1e293b]">
                  <span className="text-[10px] text-slate-500 block">Recovery Case</span>
                  <span className="font-bold text-blue-400">{result.caseId || 'N/A'}</span>
                </div>
              </div>

              {/* Navigation CTAs */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {result.caseId ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onInspectCase(result.caseId!);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>View Recovery Case ({result.caseId})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Transaction recorded as settled in database.
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setCreatedOrder(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-[#0b0f19] hover:bg-[#131b2e] border border-[#1e293b] rounded transition-colors cursor-pointer"
                >
                  Test Another Payment
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1e293b] bg-[#090d16] flex items-center justify-between text-xs text-slate-500">
          <span>⚠ Test Mode only. No real bank accounts or money are charged.</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
