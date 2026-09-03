import React, { useState } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { AuditLogEntry } from '../../types';
import { formatINR } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Drawer } from '../common/Drawer';

interface AuditLogViewProps {
  logs: AuditLogEntry[];
  onSelectCaseById: (caseId: string) => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  logs,
  onSelectCaseById,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesResult =
      resultFilter === 'all' || log.result.toLowerCase().includes(resultFilter.toLowerCase());
    const matchesSearch =
      log.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.trigger.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.blockedReason && log.blockedReason.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesResult && matchesSearch;
  });

  const exportAuditCSV = () => {
    const headers = ['Timestamp', 'Case ID', 'Customer', 'Action', 'Amount', 'Trigger', 'Result', 'Policy Evaluated', 'Actor'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      l.caseId,
      `"${l.customerName}"`,
      l.action,
      l.amount,
      `"${l.trigger}"`,
      `"${l.result}"`,
      `"${l.policyEvaluated}"`,
      `"${l.actor}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `recover_compliance_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Compliance Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <ScrollText className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Compliance & Safety Audit Log
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Immutable log of all automated recovery triggers, rule evaluations, permitted actions, and blocked transactions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block font-mono">
              SOC-2 / ISO 27001 Ready
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">100% Policy Traced</span>
          </div>
          <Button variant="secondary" size="sm" onClick={exportAuditCSV} className="text-slate-700 dark:text-slate-200">
            <Download className="w-3.5 h-3.5 mr-1 text-slate-500 dark:text-slate-400" />
            Export Audit Trail
          </Button>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by case ID, customer, trigger, or policy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Result:</label>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="all">All Audit Results</option>
            <option value="successful">Successful</option>
            <option value="delivered">Delivered</option>
            <option value="blocked">Blocked by policy</option>
            <option value="escalated">Escalated to Ops</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 font-medium">
                <th className="py-3 px-6 text-slate-700 dark:text-slate-300 font-bold">Timestamp</th>
                <th className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">Case</th>
                <th className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">Action</th>
                <th className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">Amount</th>
                <th className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">Trigger</th>
                <th className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">Result</th>
                <th className="py-3 px-6 text-slate-700 dark:text-slate-300 font-bold text-right">Policy Rule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300 font-mono">
              {filteredLogs.map((log) => {
                const isBlocked = log.result === 'Blocked by policy';
                const isSuccessful = log.result === 'Successful';
                const isDelivered = log.result === 'Delivered';

                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`transition-colors cursor-pointer group ${
                      isBlocked
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/80 dark:hover:bg-rose-950/40'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-6 text-slate-500 dark:text-slate-400 font-medium">
                      {log.timestamp}
                    </td>

                    {/* Case */}
                    <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                      {log.caseId}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 font-sans font-medium text-slate-900 dark:text-slate-100">
                      {log.action}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatINR(log.amount)}
                    </td>

                    {/* Trigger */}
                    <td className="py-3.5 px-4 font-sans text-slate-600 dark:text-slate-400">
                      {log.trigger}
                    </td>

                    {/* Result */}
                    <td className="py-3.5 px-4 font-sans">
                      {isBlocked && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-950/70 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800">
                          <ShieldAlert className="w-3 h-3" />
                          Blocked by policy
                        </span>
                      )}
                      {isSuccessful && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Successful
                        </span>
                      )}
                      {isDelivered && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                          Delivered
                        </span>
                      )}
                      {!isBlocked && !isSuccessful && !isDelivered && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                          {log.result}
                        </span>
                      )}
                    </td>

                    {/* Policy Rule */}
                    <td className="py-3.5 px-6 text-right font-sans text-xs text-slate-500 dark:text-slate-400 truncate max-w-[260px]" title={log.policyEvaluated}>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="truncate">{log.policyEvaluated}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-300 shrink-0" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Detail Inspector Drawer */}
      <Drawer
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Record #${selectedLog?.id || ''}`}
        subtitle={`Logged at ${selectedLog?.timestamp} • ${selectedLog?.actor}`}
        width="max-w-xl"
        footer={
          <div className="w-full flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedLog) {
                  onSelectCaseById(selectedLog.caseId);
                  setSelectedLog(null);
                }
              }}
              className="text-slate-700 dark:text-slate-200"
            >
              Open Recovery Case #{selectedLog?.caseId} →
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)} className="text-slate-700 dark:text-slate-200">
              Close Inspector
            </Button>
          </div>
        }
      >
        {selectedLog && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {selectedLog.action} • {formatINR(selectedLog.amount)}
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Channel: {selectedLog.executionChannel}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Customer: <strong>{selectedLog.customerName}</strong> (Case: {selectedLog.caseId})
              </p>
            </div>

            {/* Blocked Reason Callout */}
            {selectedLog.result === 'Blocked by policy' && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg space-y-1.5">
                <div className="flex items-center gap-2 text-rose-900 dark:text-rose-300 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Execution Prohibited by Safety Boundary</span>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                  {selectedLog.blockedReason}
                </p>
              </div>
            )}

            {/* Policy Evaluation Detail */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Policy Rule Evaluated
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                {selectedLog.policyEvaluated}
              </p>
            </div>

            {/* Raw JSON Trace Payload */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-slate-500" />
                Raw Machine Audit Trace (JSON)
              </h4>
              <pre className="text-[11px] font-mono bg-slate-950 text-slate-200 p-3.5 rounded-md border border-slate-800 overflow-x-auto">
                {JSON.stringify(
                  {
                    audit_id: selectedLog.id,
                    timestamp: selectedLog.timestamp,
                    case_id: selectedLog.caseId,
                    customer: selectedLog.customerName,
                    action: selectedLog.action,
                    amount_inr: selectedLog.amount,
                    trigger_event: selectedLog.trigger,
                    evaluation_result: selectedLog.result,
                    rule_matched: selectedLog.policyEvaluated,
                    safety_reason: selectedLog.blockedReason || 'POLICY_AUTHORIZED',
                    actor: selectedLog.actor,
                    channel: selectedLog.executionChannel,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
