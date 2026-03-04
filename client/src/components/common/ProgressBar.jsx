const ProgressBar = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = 'blue',
  size = 'md',
  animated = false
}) => {
  const percentage = Math.round((value / max) * 100);

  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500'
  };

  const sizes = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-sm font-medium text-gray-500">{percentage}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizes[size]}`}>
        <div
          className={`${sizes[size]} ${colors[color]} rounded-full transition-all duration-500 ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const MultiProgressBar = ({ segments }) => {
  // segments: [{ value, color, label }]
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="w-full">
      <div className="flex h-4 rounded-full overflow-hidden bg-gray-200">
        {segments.map((segment, index) => {
          const width = (segment.value / total) * 100;
          return (
            <div
              key={index}
              className={`${segment.color} transition-all duration-500`}
              style={{ width: `${width}%` }}
              title={`${segment.label}: ${segment.value}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-600">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${segment.color}`} />
            <span>{segment.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressBar;
