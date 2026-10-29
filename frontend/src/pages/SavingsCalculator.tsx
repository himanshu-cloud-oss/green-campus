import React, { useState } from 'react';
import { SavingsCalculator as SavingsCalcComponent } from '../components/savings/SavingsCalculator';
import { WhatIfAnalysis } from '../components/savings/WhatIfAnalysis';
import { Calculator, Sparkles, TrendingUp } from 'lucide-react';

export const SavingsCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'estimate' | 'whatif'>('estimate');

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Calculator className="w-6 h-6 text-cyan-400" />
            <span>Energy & Financial Savings Modeler</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Quantify kilowatt-hours, utility expenditure in INR, and carbon abatement achieved by automated classroom cutoffs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('estimate')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'estimate'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Classroom Estimate Model</span>
          </button>

          <button
            onClick={() => setActiveTab('whatif')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'whatif'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>What-If Campus Scale</span>
          </button>
        </div>
      </div>

      {/* Render Active Tab */}
      {activeTab === 'estimate' ? <SavingsCalcComponent /> : <WhatIfAnalysis />}
    </div>
  );
};
