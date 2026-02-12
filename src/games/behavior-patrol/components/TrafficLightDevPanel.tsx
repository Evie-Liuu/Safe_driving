import { useState } from 'react';
import { TrafficLight, TrafficLightState } from '../types';

interface TrafficLightDevPanelProps {
  trafficLights: TrafficLight[];
  manualStates: Record<string, TrafficLightState>;
  onSetState: (lightId: string, state: TrafficLightState | null) => void;
  currentTime: number;
}

export function TrafficLightDevPanel({
  trafficLights,
  manualStates,
  onSetState,
  currentTime
}: TrafficLightDevPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (trafficLights.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 z-[100]">
      {/* 摺疊按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
      >
        🚦 紅綠燈控制 {isOpen ? '▼' : '▶'}
      </button>

      {/* 控制面板 */}
      {isOpen && (
        <div className="mt-2 bg-gray-800 text-white rounded-lg shadow-xl p-4 max-w-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg">紅綠燈控制面板</h3>
            <span className="text-sm text-gray-400">
              時間: {currentTime.toFixed(1)}s
            </span>
          </div>

          <div className="space-y-3">
            {trafficLights.map(light => {
              const isManual = light.id in manualStates;
              const currentState = manualStates[light.id];

              return (
                <div
                  key={light.id}
                  className="bg-gray-700 rounded p-3 space-y-2"
                >
                  {/* 紅綠燈名稱 */}
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{light.name}</span>
                    {isManual && (
                      <span className="text-xs bg-yellow-600 px-2 py-1 rounded">
                        手動
                      </span>
                    )}
                  </div>

                  {/* 燈號控制按鈕 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSetState(light.id, TrafficLightState.RED)}
                      className={`flex-1 py-2 rounded font-semibold transition-colors ${
                        currentState === TrafficLightState.RED
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-red-700'
                      }`}
                    >
                      🔴 紅燈
                    </button>
                    <button
                      onClick={() => onSetState(light.id, TrafficLightState.YELLOW)}
                      className={`flex-1 py-2 rounded font-semibold transition-colors ${
                        currentState === TrafficLightState.YELLOW
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-600 text-gray-300 hover:bg-yellow-600'
                      }`}
                    >
                      🟡 黃燈
                    </button>
                    <button
                      onClick={() => onSetState(light.id, TrafficLightState.GREEN)}
                      className={`flex-1 py-2 rounded font-semibold transition-colors ${
                        currentState === TrafficLightState.GREEN
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-green-700'
                      }`}
                    >
                      🟢 綠燈
                    </button>
                  </div>

                  {/* 重置按鈕 */}
                  {isManual && (
                    <button
                      onClick={() => onSetState(light.id, null)}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                    >
                      ↻ 恢復自動時間表
                    </button>
                  )}

                  {/* 時間表預覽 */}
                  {!isManual && light.lightSchedule.length > 0 && (
                    <div className="text-xs text-gray-400 mt-2">
                      時間表: {light.lightSchedule.map(s =>
                        `${s.time}s→${s.state}`
                      ).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 全部重置按鈕 */}
          {Object.keys(manualStates).length > 0 && (
            <button
              onClick={() => {
                trafficLights.forEach(light => onSetState(light.id, null));
              }}
              className="w-full mt-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-semibold transition-colors"
            >
              🔄 全部恢復自動
            </button>
          )}
        </div>
      )}
    </div>
  );
}
