import React, { useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
} from "chart.js";
import { saveAs } from "file-saver";
import type { Feature, Polygon } from "geojson";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip);

const getRandomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16);

type WeatherDataPoint = {
  time: string;
  [variable: string]: number | string;
};

interface WeatherViewerProps {
  selectedFeature: Feature<Polygon>;
}

const WeatherViewer: React.FC<WeatherViewerProps> = ({ selectedFeature }) => {
  const fieldId = selectedFeature.properties?.id?.toString();
  const [data, setData] = useState<WeatherDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);

  const fetchWeatherData = async () => {
    setLoading(true);
    try {
      console.log("Fetching weather data for field ID:", fieldId);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/weather/${fieldId}`);
      const raw = await res.json();
      console.log(raw)

      const keys = Object.keys(raw).filter(k => Array.isArray(raw[k]) && k !== "time");
      const transformed = raw.time.map((t: string, idx: number) => {
        const row: any = { time: t };
        keys.forEach(key => {
          row[key] = raw[key][idx];
        });
        return row;
      });

      setData(transformed);
      setShowChartModal(true);
    } catch (err) {
      console.error("Error fetching weather data", err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const header = Object.keys(data[0] || {}).join(",");
    const rows = data.map(d => Object.values(d).join(",")).join("\n");
    const blob = new Blob([header + "\n" + rows], { type: "text/csv;charset=utf-8" });
    saveAs(blob, "weather_data.csv");
  };

  const variables = data.length > 0 ? Object.keys(data[0]).filter(k => k !== "time") : [];

  const chartData = {
    labels: data.map(d => d.time),
    datasets: variables.map(v => ({
      label: v,
      data: data.map(d => d[v] as number),
      borderColor: getRandomColor(),
      fill: false,
    })),
  };

  return (
    <div className="w-full space-y-2">
      {/* Top full-width button */}
      <button
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={fetchWeatherData}
        disabled={loading}
      >
        {loading ? "Loading..." : "Load Weather Data"}
      </button>

      {/* Bottom row of buttons */}
      {data.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowChartModal(true)}
            className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
          >
            Chart
          </button>
          <button
            onClick={() => setShowTableModal(true)}
            className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Table
          </button>
          <button
            onClick={exportCSV}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
          >
            CSV
          </button>
        </div>
      )}

      {/* Chart Modal */}
      {showChartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Weather Chart</h2>
              <button
                onClick={() => setShowChartModal(false)}
                className="text-red-600 hover:text-red-800 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="p-4">
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      onClick: (e, legendItem, legend) => {
                        const index = legendItem.datasetIndex;
                        const ci = legend.chart;
                        const meta = ci.getDatasetMeta(index!);
                        meta.hidden = meta.hidden === null ? !ci.data.datasets[index!].hidden : null;
                        ci.update();
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Weather Table</h2>
              <button
                onClick={() => setShowTableModal(false)}
                className="text-red-600 hover:text-red-800 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-900 border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(data[0]).map((key) => (
                        <th key={key} className="px-4 py-2 border-b font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        {Object.values(row).map((val, i) => (
                          <td key={i} className="px-4 py-2">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherViewer;