import React from 'react';
import { Wind, Lightbulb, Fan } from 'lucide-react';
import { DeviceState } from '../../types';

export interface DeviceStateIndicatorProps {
  deviceState?: DeviceState;
  onToggleDevice?: (device: 'ac_on' | 'fan_on' | 'lights_on', newValue: boolean) => void;
  interactive?: boolean;
}

export const DeviceStateIndicator: React.FC<DeviceStateIndicatorProps> = ({
  deviceState,
  onToggleDevice,
  interactive = false,
}) => {
  const acOn = !!deviceState?.ac_on;
  const fanOn = !!deviceState?.fan_on;
  const lightsOn = !!deviceState?.lights_on;

  // Connected load estimation
  // AC: 3.5 kW, Fan: 0.4 kW, Lights: 0.6 kW
  let currentLoadKw = 0;
  if (acOn) currentLoadKw += 3.5;
  if (fanOn) currentLoadKw += 0.4;
  if (lightsOn) currentLoadKw += 0.6;

  const devices = [
    {
      key: 'ac_on' as const,
      name: 'HVAC / AC',
      isOn: acOn,
      icon: Wind,
      load: '3.5 kW',
      activeColor: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/40 shadow-cyan-500/20',
    },
    {
      key: 'fan_on' as const,
      name: 'Ceiling Fans',
      isOn: fanOn,
      icon: Fan,
      load: '0.4 kW',
      activeColor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40 shadow-emerald-500/20',
    },
    {
      key: 'lights_on' as const,
      name: 'LED Lighting',
      isOn: lightsOn,
      icon: Lightbulb,
      load: '0.6 kW',
      activeColor: 'text-amber-300 bg-amber-500/15 border-amber-500/40 shadow-amber-500/20',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {devices.map(dev => {
          const Icon = dev.icon;
          const isButton = interactive && !!onToggleDevice;
          const Component = isButton ? 'button' : 'div';

          return (
            <Component
              key={dev.key}
              type={isButton ? 'button' : undefined}
              onClick={() => isButton && onToggleDevice(dev.key, !dev.isOn)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                dev.isOn
                  ? `${dev.activeColor} shadow-md`
                  : 'bg-slate-900/60 text-slate-500 border-slate-800'
              } ${isButton ? 'hover:scale-105 active:scale-95 cursor-pointer' : ''}`}
              title={`${dev.name}: ${dev.isOn ? 'ON (' + dev.load + ')' : 'OFF'}`}
            >
              <Icon
                className={`w-5 h-5 mb-1 ${
                  dev.isOn && dev.key === 'fan_on' ? 'animate-spin' : ''
                }`}
                style={dev.isOn && dev.key === 'fan_on' ? { animationDuration: '3s' } : undefined}
              />
              <span className="text-[11px] font-medium leading-none">{dev.name}</span>
              <span
                className={`text-[10px] font-mono mt-1 font-semibold ${
                  dev.isOn ? 'opacity-90' : 'opacity-40'
                }`}
              >
                {dev.isOn ? 'ON' : 'OFF'}
              </span>
            </Component>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-slate-400">Current Load Draw:</span>
        <span
          className={`font-mono font-semibold ${
            currentLoadKw > 0 ? 'text-cyan-300' : 'text-slate-500'
          }`}
        >
          {currentLoadKw.toFixed(1)} kW
        </span>
      </div>
    </div>
  );
};
