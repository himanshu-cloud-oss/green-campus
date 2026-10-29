import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SourceDistribution } from '../components/charts/SourceDistribution';
import { EnergyTrendLine } from '../components/charts/EnergyTrendLine';
import { AlertCard } from '../components/alerts/AlertCard';
import { useEnergy } from '../hooks/useEnergy';
import { useClassrooms } from '../hooks/useClassrooms';
import { useAlerts } from '../hooks/useAlerts';
import { useSimulations } from '../hooks/useSimulations';
import { formatNumberWithCommas } from '../utils/formatters';
import {
  Zap,
  School,
  Bell,
  Sun,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const { records, summary } = useEnergy();
  const { classrooms } = useClassrooms();
  const { alerts, activeAlertsCount, acknowledgeAlert, resolveAlert } = useAlerts();
  const { triggerNoShow } = useSimulations();

  const [simMessage, setSimMessage] = useState<string | null>(null);

  // Latest month (Jun 2025 in dataset)
  const latestMonth = records[records.length - 1];
  // Last 6 months for sparkline / mini chart
  const recent6Months = records.slice(-6);

  // Active classrooms with scheduled occupancy
  const activeClassroomsCount = classrooms.filter(
    c => c.current_status?.occupancy_status === 'SCHEDULED_OCCUPIED' || c.current_status?.occupancy_status === 'EXTRA_CLASS'
  ).length;

  const totalCurrentKw = classrooms.reduce((acc, c) => {
    let kw = 0;
    if (c.device_state?.ac_on) kw += 3.5;
    if (c.device_state?.fan_on) kw += 0.4;
    if (c.device_state?.lights_on) kw += 0.6;
    return acc + kw;
  }, 0);

  const solarPct = summary.total_all > 0 ? ((summary.total_solar / summary.total_all) * 100).toFixed(1) : '6.3';

  // Quick Action: Simulate Empty on an occupied room
  const handleQuickSimulate = async () => {
    const occupiedRoom = classrooms.find(c => c.current_status?.occupancy_status === 'SCHEDULED_OCCUPIED');
    if (occupiedRoom) {
      await triggerNoShow(occupiedRoom.id, 'Current Period P3', 180);
      setSimMessage(`Triggered simulated empty class in ${occupiedRoom.name}. Cutoff timer active.`);
      setTimeout(() => setSimMessage(null), 5000);
    } else {
      setSimMessage('No classrooms are currently scheduled as occupied to simulate.');
      setTimeout(() => setSimMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Feedback Alert */}
      {simMessage && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between animate-fade-in shadow-lg shadow-amber-500/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-semibold">{simMessage}</span>
          </div>
          <Link to="/alerts" className="text-cyan-400 font-semibold hover:underline">
            View Live Timer →
          </Link>
        </div>
      )}

      {/* Hero Header with Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>Campus Energy & Building Management</span>
            <span className="text-xs font-mono font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-full">
              LIVE
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time HVAC automation, solar dispatching, and timetable-linked classroom telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleQuickSimulate}
            icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
          >
            Simulate Empty Class
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/timetable')}
            icon={<Calendar className="w-4 h-4" />}
          >
            View Timetable
          </Button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Monthly Total */}
        <Card glow="cyan" padding="md" className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Monthly Consumption</span>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">
              {latestMonth?.month_label || 'Latest'}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {latestMonth ? formatNumberWithCommas(latestMonth.total_kwh) : '220,703'} <span className="text-sm font-sans text-slate-400 font-normal">kWh</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Peak Academic Period</span>
            <span className="text-amber-400 font-mono font-semibold">+57.8% MoM</span>
          </div>
        </Card>

        {/* Metric 2: Solar Generation */}
        <Card glow="green" padding="md" className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Solar Contribution</span>
            <Sun className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatNumberWithCommas(summary.total_solar)} <span className="text-sm font-sans text-slate-400 font-normal">kWh/yr</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Clean Energy Share</span>
            <span className="text-emerald-400 font-mono font-semibold">{solarPct}% of total</span>
          </div>
        </Card>

        {/* Metric 3: Active Classrooms */}
        <Card glow="violet" padding="md" className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Active Classrooms</span>
            <School className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {activeClassroomsCount} <span className="text-sm font-sans text-slate-400 font-normal">/ {classrooms.length} Rooms</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Instantaneous Load</span>
            <span className="text-purple-300 font-mono font-semibold">{totalCurrentKw.toFixed(1)} kW</span>
          </div>
        </Card>

        {/* Metric 4: Pending Alerts */}
        <Card glow={activeAlertsCount > 0 ? 'amber' : 'none'} padding="md" className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">System Telemetry Alerts</span>
            <Bell className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {activeAlertsCount} <span className="text-sm font-sans text-slate-400 font-normal">Active</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Sensor & Cutoff Status</span>
            <Link to="/alerts" className="text-cyan-400 hover:underline flex items-center gap-0.5">
              <span>View all</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Visual Analytics Grid: Sparkline Trend + Source Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Line (6 Months) */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>Energy Trajectory (Recent 6 Months)</span>
                </h3>
                <p className="text-xs text-slate-400">Total campus consumption trend</p>
              </div>
              <Link to="/energy" className="text-xs text-cyan-400 hover:underline font-medium">
                Full 12M Analytics →
              </Link>
            </div>

            <EnergyTrendLine
              data={recent6Months}
              height={240}
              peakMonth={summary.peak_month}
              lowestMonth={summary.lowest_month}
            />

            <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Annual Average: {formatNumberWithCommas(summary.avg_monthly)} kWh/mo</span>
              <span className="text-slate-400">Peak: {summary.peak_month.month_label} ({formatNumberWithCommas(summary.peak_month.total_kwh)} kWh)</span>
            </div>
          </Card>
        </div>

        {/* Source Distribution Donut */}
        <div className="lg:col-span-5">
          <Card className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Annual Power Supply Mix</span>
                </h3>
                <p className="text-xs text-slate-400">Total: {formatNumberWithCommas(summary.total_all)} kWh</p>
              </div>
            </div>

            <SourceDistribution summary={summary} height={230} />

            <div className="pt-2 border-t border-slate-800 grid grid-cols-3 text-center text-xs">
              <div>
                <div className="text-[10px] text-slate-400">Grid</div>
                <div className="font-mono text-cyan-400 font-bold">{formatNumberWithCommas(summary.total_grid)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Generator</div>
                <div className="font-mono text-purple-400 font-bold">{formatNumberWithCommas(summary.total_generator)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Solar</div>
                <div className="font-mono text-emerald-400 font-bold">{formatNumberWithCommas(summary.total_solar)}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Grid: Recent Alerts List + System Status Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Alerts (Last 5) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span>Real-Time Events & Incident Feed</span>
            </h3>
            <Link to="/alerts" className="text-xs text-cyan-400 hover:underline">
              Console View →
            </Link>
          </div>

          <div className="space-y-2.5">
            {alerts.slice(0, 4).map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={acknowledgeAlert}
                onResolve={resolveAlert}
              />
            ))}
          </div>
        </div>

        {/* System Status Panel */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>System & Gateway Health</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-300">Timetable Scheduler Engine</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Synchronized
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-300">Classroom Sensor Hub (Zigbee/BACnet)</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  5/5 Online
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-300">Solar Inverter Influx Gateway</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  100 kWp Live
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-300">AI Cutoff Verification Logic</span>
                <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  Active (3m delay)
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">Campus BMS Gateway ID:</div>
              <div className="font-mono text-cyan-300">MRU-BMS-GATEWAY-BLK-A</div>
              <div>Firmware: v2.4.1-rc3 • Local Timezone: Asia/Kolkata</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
