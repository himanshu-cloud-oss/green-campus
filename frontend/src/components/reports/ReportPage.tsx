import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { ExportButtons } from './ExportButtons';
import { EnergyStackedBar } from '../charts/EnergyStackedBar';
import { HISTORICAL_ENERGY_DATA } from '../../utils/energyUtils';
import { api } from '../../services/api';
import { AuditEntry, ExtraClassBooking } from '../../types';
import { formatNumberWithCommas, formatDateTime } from '../../utils/formatters';
import { FileBarChart, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';

export const ReportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'energy' | 'savings' | 'bookings' | 'audit'>('energy');
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState<number>(0);
  const [auditPage, setAuditPage] = useState<number>(1);
  const [bookings, setBookings] = useState<ExtraClassBooking[]>([]);

  useEffect(() => {
    const loadReportData = async () => {
      try {
        const [auditRes, bookRes] = await Promise.all([
          api.getAuditLog(auditPage, 10),
          api.getBookings(),
        ]);
        setAuditLogs(auditRes.items);
        setAuditTotal(auditRes.total);
        setBookings(bookRes);
      } catch (err) {
        console.error('Failed to load report data', err);
      }
    };
    loadReportData();
  }, [auditPage]);

  // Historical energy export format
  const energyExportData = HISTORICAL_ENERGY_DATA.map(r => ({
    Month: r.month_label,
    'Grid (kWh)': r.grid_kwh,
    'Generator (kWh)': r.generator_kwh,
    'Solar (kWh)': r.solar_kwh,
    'Total (kWh)': r.total_kwh,
    'MoM Change (%)': r.mom_change_pct ?? 0,
  }));

  // Savings audit format
  const savingsExportData = [
    { Period: 'Nov 2024 - Dec 2024', 'Hours Avoided': 140, 'kWh Saved': 2100, 'INR Saved': 17850, 'CO2 Abated (kg)': 1722 },
    { Period: 'Jan 2025 - Feb 2025', 'Hours Avoided': 165, 'kWh Saved': 2475, 'INR Saved': 21037, 'CO2 Abated (kg)': 2029 },
    { Period: 'Mar 2025 - Apr 2025', 'Hours Avoided': 190, 'kWh Saved': 2850, 'INR Saved': 24225, 'CO2 Abated (kg)': 2337 },
    { Period: 'May 2025 - Jun 2025', 'Hours Avoided': 210, 'kWh Saved': 3150, 'INR Saved': 26775, 'CO2 Abated (kg)': 2583 },
  ];

  return (
    <div className="space-y-6">
      {/* Report Section Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <FileBarChart className="w-5 h-5 text-cyan-400" />
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'energy', label: '1. Historical Energy Records' },
              { id: 'savings', label: '2. Savings Audit History' },
              { id: 'bookings', label: '3. Extra Class Logs' },
              { id: 'audit', label: '4. System Compliance Audit' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'energy' | 'savings' | 'bookings' | 'audit')}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Manav Rachna University BMS Archives
        </div>
      </div>

      {/* TAB 1: Historical Energy Records */}
      {activeTab === 'energy' && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Annual Energy Breakdown (Jul 2024 — Jun 2025)
                </h3>
                <p className="text-xs text-slate-400">
                  Exact campus metered consumption from Main Substation and 100 kWp Solar Rooftop
                </p>
              </div>
              <ExportButtons
                data={energyExportData}
                filename="green_campus_monthly_energy_jul24_jun25"
                showPrint
              />
            </div>

            <EnergyStackedBar data={HISTORICAL_ENERGY_DATA} height={320} />
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center">
              <span className="text-sm font-semibold text-white">Historical Monthly Dataset</span>
              <span className="text-xs text-slate-400 font-mono">12 Monthly Records Verified</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Billing Month</th>
                    <th className="py-2.5 px-4 text-right">Grid Power (kWh)</th>
                    <th className="py-2.5 px-4 text-right">Diesel Gen (kWh)</th>
                    <th className="py-2.5 px-4 text-right">Solar Gen (kWh)</th>
                    <th className="py-2.5 px-4 text-right">Total (kWh)</th>
                    <th className="py-2.5 px-4 text-right">MoM Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {HISTORICAL_ENERGY_DATA.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                        {rec.month_label}
                      </td>
                      <td className="py-2.5 px-4 text-right text-cyan-300">
                        {formatNumberWithCommas(rec.grid_kwh)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-purple-300">
                        {formatNumberWithCommas(rec.generator_kwh)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-emerald-400">
                        {formatNumberWithCommas(rec.solar_kwh)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-white font-bold">
                        {formatNumberWithCommas(rec.total_kwh)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {rec.mom_change_pct !== undefined ? (
                          <span
                            className={
                              rec.mom_change_pct > 0
                                ? 'text-amber-400'
                                : rec.mom_change_pct < 0
                                ? 'text-emerald-400'
                                : 'text-slate-400'
                            }
                          >
                            {rec.mom_change_pct > 0 ? `+${rec.mom_change_pct}%` : `${rec.mom_change_pct}%`}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Savings Audit History */}
      {activeTab === 'savings' && (
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-white">Automated BMS Savings Log</h3>
              <p className="text-xs text-slate-400">Energy cutoffs tracked via timetable integration</p>
            </div>
            <ExportButtons
              data={savingsExportData}
              filename="green_campus_savings_audit_log"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Vacant Hours Avoided</th>
                  <th className="py-3 px-4 text-right">Energy Saved (kWh)</th>
                  <th className="py-3 px-4 text-right">Cost Saved (₹)</th>
                  <th className="py-3 px-4 text-right">CO₂ Abated (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {savingsExportData.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-sans font-medium text-slate-200">{s.Period}</td>
                    <td className="py-3 px-4 text-right text-slate-300">{s['Hours Avoided']} hrs</td>
                    <td className="py-3 px-4 text-right text-cyan-300 font-semibold">
                      {formatNumberWithCommas(s['kWh Saved'])} kWh
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                      ₹{formatNumberWithCommas(s['INR Saved'])}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-300">
                      {formatNumberWithCommas(s['CO2 Abated (kg)'])} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: Extra Class Bookings */}
      {activeTab === 'bookings' && (
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-white">Extra Class Reservation Ledger</h3>
              <p className="text-xs text-slate-400">Recorded faculty override requests for automated HVAC</p>
            </div>
            <ExportButtons
              data={bookings.map(b => ({
                Room: b.classroom_name,
                Date: b.date,
                'Start Time': b.start_time,
                'End Time': b.end_time,
                Subject: b.subject,
                Students: b.expected_students,
                Status: b.status,
                'Created At': b.created_at,
              }))}
              filename="green_campus_extra_class_bookings"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Time Slot</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4 text-right">Students</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Booked At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-cyan-300 font-mono">
                      {b.classroom_name || `Room ${b.classroom_id}`}
                    </td>
                    <td className="py-3 px-4 text-slate-200">{b.date}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {b.start_time} - {b.end_time}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-100">{b.subject || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      {b.expected_students || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          b.status === 'ACTIVE'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {formatDateTime(b.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: Audit Log Viewer */}
      {activeTab === 'audit' && (
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Security & Compliance Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-400">Immutable ledger of all automated and manual actions</p>
            </div>
            <ExportButtons
              data={auditLogs.map(a => ({
                ID: a.id,
                Entity: a.entity_type,
                'Entity ID': a.entity_id,
                Action: a.action,
                Actor: a.actor,
                Timestamp: a.created_at,
              }))}
              filename="green_campus_system_audit_log"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Payload Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="py-3 px-4 text-cyan-400">{log.entity_type}</td>
                    <td className="py-3 px-4 text-slate-200 font-bold">{log.entity_id}</td>
                    <td className="py-3 px-4 text-amber-300">{log.action}</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">{log.actor}</td>
                    <td className="py-3 px-4 text-slate-400 text-[10px] max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing Page {auditPage} • Total {auditTotal} Logged Events
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={auditPage <= 1}
                onClick={() => setAuditPage(p => p - 1)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={auditPage * 10 >= auditTotal}
                onClick={() => setAuditPage(p => p + 1)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
