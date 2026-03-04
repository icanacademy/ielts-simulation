import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const ChartDisplay = ({ chartType, chartData, chartTitle }) => {
  if (!chartData || !chartData.data) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
        <p>Chart data not available</p>
      </div>
    );
  }

  const renderBarChart = () => {
    const series = chartData.series || [{ key: 'value', name: 'Value', color: '#4F46E5' }];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            label={{ value: chartData.xAxisLabel, position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            label={{ value: chartData.yAxisLabel, angle: -90, position: 'insideLeft' }}
          />
          <Tooltip />
          <Legend />
          {series.map((s, index) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color || COLORS[index % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderLineChart = () => {
    const series = chartData.series || [{ key: 'value', name: 'Value', color: '#4F46E5' }];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            label={{ value: chartData.xAxisLabel, position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            label={{ value: chartData.yAxisLabel, angle: -90, position: 'insideLeft' }}
          />
          <Tooltip />
          <Legend />
          {series.map((s, index) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color || COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={{ fill: s.color || COLORS[index % COLORS.length] }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderPieChart = () => {
    const data = chartData.data.map((item, index) => ({
      ...item,
      color: item.color || COLORS[index % COLORS.length]
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, value }) => `${name}: ${value}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderChart = () => {
    switch (chartType?.toLowerCase()) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'pie':
        return renderPieChart();
      default:
        return renderBarChart();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {chartTitle && (
        <h4 className="text-center font-semibold text-gray-800 mb-4">
          {chartTitle}
        </h4>
      )}
      {renderChart()}
      {chartData.description && (
        <p className="text-xs text-gray-500 text-center mt-2 italic">
          {chartData.description}
        </p>
      )}
    </div>
  );
};

export default ChartDisplay;
