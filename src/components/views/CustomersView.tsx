import React, { useState } from 'react';
import {
  Users,
  Search,
  Building2,
  Mail,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  FilterX,
} from 'lucide-react';
import { CustomerProfile } from '../../types';
import { formatINR, formatPercentage } from '../../utils/formatters';

interface CustomersViewProps {
  customers: CustomerProfile[];
  onSelectCustomerCases: (customerName: string) => void;
  onInspectCustomer?: (customer: CustomerProfile) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onSelectCustomerCases,
  onInspectCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  const filteredCustomers = customers.filter((c) => {
    const matchesTier =
      tierFilter === 'all' || c.tier.toLowerCase() === tierFilter.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setTierFilter('all');
  };

  return (
    <div className="space-y-6 pb-12 text-slate-300 max-w-[1440px] mx-auto w-full">
      {/* Header Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0b0f19] p-5 rounded-lg border border-[#1e293b]">
          <span className="text-xs font-medium text-slate-400">
            Tracked Merchant Accounts
          </span>
          <div className="text-2xl font-bold text-white mt-1 font-mono">
            {customers.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Active Razorpay customer profiles
          </span>
        </div>

        <div className="bg-[#0b0f19] p-5 rounded-lg border border-[#1e293b]">
          <span className="text-xs font-medium text-slate-400">
            Aggregate Recovered Value
          </span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
            {formatINR(customers.reduce((acc, c) => acc + c.totalRecovered, 0))}
          </div>
          <span className="text-[11px] text-emerald-500 mt-1 block">
            Across all dunning & retry sequences
          </span>
        </div>

        <div className="bg-[#0b0f19] p-5 rounded-lg border border-[#1e293b]">
          <span className="text-xs font-medium text-slate-400">
            Contact Quota Health
          </span>
          <div className="text-2xl font-bold text-slate-200 mt-1 font-mono">
            {customers.filter((c) => c.contactCountLast7Days >= c.contactLimit).length} Guarded
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Protected by 2 contacts / 7 days circuit breaker
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-[#0b0f19] rounded-lg border border-[#1e293b] overflow-hidden">
        <div className="p-4 border-b border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer by name, email, or customer ID..."
              className="w-full pl-9 pr-4 py-1.5 bg-[#0f172a] border border-[#1e293b] rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Tier:</span>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-[#0f172a] border border-[#1e293b] rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Tiers</option>
              <option value="enterprise">Enterprise</option>
              <option value="growth">Growth</option>
              <option value="starter">Starter</option>
            </select>
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center bg-[#0b0f19]">
            <FilterX className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">No customers found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
              No merchant profiles match your search criteria.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 px-3.5 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-xs font-medium text-white rounded-md transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1e293b] bg-[#0f172a] text-slate-400 font-mono text-[11px]">
                  <th className="py-3 px-5 text-slate-300 font-medium">Customer</th>
                  <th className="py-3 px-5 font-medium">Tier</th>
                  <th className="py-3 px-5 text-right font-medium">Total Recovered</th>
                  <th className="py-3 px-5 text-right font-medium">Failure Count</th>
                  <th className="py-3 px-5 text-center font-medium">Contact Quota (7D)</th>
                  <th className="py-3 px-5 text-right font-medium">Profile & Cases</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {filteredCustomers.map((c) => {
                  const isCapped = c.contactCountLast7Days >= c.contactLimit;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => onInspectCustomer?.(c)}
                      className="hover:bg-[#131b2e] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {c.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#1e293b] text-slate-300">
                          {c.tier}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-400">
                        {formatINR(c.totalRecovered)}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-slate-300">
                        {c.failureCount}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span
                          className={`font-mono text-[11px] px-2 py-0.5 rounded ${
                            isCapped
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {c.contactCountLast7Days} / {c.contactLimit} max
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCustomerCases(c.name);
                            }}
                            className="text-slate-400 hover:text-white font-medium text-xs cursor-pointer"
                          >
                            Cases ({c.failureCount})
                          </button>
                          <span className="text-slate-600">•</span>
                          <span className="text-blue-400 group-hover:text-blue-300 font-medium text-xs inline-flex items-center gap-0.5">
                            Inspect
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
