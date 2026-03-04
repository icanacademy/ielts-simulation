import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import Button from '../components/common/Button';

const Dashboard = () => {
  const navigate = useNavigate();
  const { student, history, progress, fetchHistory, fetchProgress, loading } = useStudent();
  const [activeView, setActiveView] = useState('progress');

  useEffect(() => {
    if (student?._id) {
      fetchHistory();
      fetchProgress();
    }
  }, [student?._id]);

  // Process progress data for charts
  const chartData = progress.map((p, index) => ({
    name: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overall: p.overall,
    listening: p.listening,
    reading: p.reading,
    writing: p.writing,
    speaking: p.speaking
  }));

  // Calculate averages for radar chart
  const calculateAverage = (key) => {
    const values = progress.filter(p => p[key]).map(p => p[key]);
    return values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 0;
  };

  const radarData = [
    { skill: 'Listening', score: parseFloat(calculateAverage('listening')), fullMark: 9 },
    { skill: 'Reading', score: parseFloat(calculateAverage('reading')), fullMark: 9 },
    { skill: 'Writing', score: parseFloat(calculateAverage('writing')), fullMark: 9 },
    { skill: 'Speaking', score: parseFloat(calculateAverage('speaking')), fullMark: 9 }
  ];

  // Get latest scores
  const latestScores = progress.length > 0 ? progress[progress.length - 1] : null;
  const previousScores = progress.length > 1 ? progress[progress.length - 2] : null;

  const getScoreChange = (section) => {
    if (!latestScores || !previousScores) return null;
    const change = (latestScores[section] || 0) - (previousScores[section] || 0);
    return change;
  };

  const getBandColor = (score) => {
    if (score >= 7) return 'text-green-600';
    if (score >= 6) return 'text-blue-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Progress Dashboard
            </h1>
            <p className="text-gray-600">
              Track your ICAN IELTS preparation progress over time
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button onClick={() => navigate('/simulation')} variant="primary">
              Start New Simulation
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Target Band</p>
            <p className="text-2xl font-bold text-blue-600">{student?.targetBand || '-'}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Tests Taken</p>
            <p className="text-2xl font-bold text-gray-800">{history.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Latest Score</p>
            <p className={`text-2xl font-bold ${getBandColor(latestScores?.overall)}`}>
              {latestScores?.overall || '-'}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Best Score</p>
            <p className="text-2xl font-bold text-green-600">
              {progress.length > 0 ? Math.max(...progress.map(p => p.overall || 0)) : '-'}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Days to Test</p>
            <p className="text-2xl font-bold text-orange-600">
              {student?.testDate
                ? Math.max(0, Math.ceil((new Date(student.testDate) - new Date()) / (1000 * 60 * 60 * 24)))
                : '-'}
            </p>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mb-6">
          {['progress', 'breakdown', 'history'].map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-4 py-2 rounded-lg font-medium capitalize ${
                activeView === view
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        {/* Progress View */}
        {activeView === 'progress' && (
          <div className="space-y-6">
            {/* Progress Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Score Trend</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 9]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="overall" stroke="#3B82F6" strokeWidth={3} name="Overall" />
                    <Line type="monotone" dataKey="listening" stroke="#8B5CF6" strokeWidth={2} name="Listening" />
                    <Line type="monotone" dataKey="reading" stroke="#10B981" strokeWidth={2} name="Reading" />
                    <Line type="monotone" dataKey="writing" stroke="#F59E0B" strokeWidth={2} name="Writing" />
                    <Line type="monotone" dataKey="speaking" stroke="#EF4444" strokeWidth={2} name="Speaking" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No test data yet. Complete a simulation to see your progress.</p>
                </div>
              )}
            </div>

            {/* Section Progress */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['listening', 'reading', 'writing', 'speaking'].map(section => {
                const change = getScoreChange(section);
                const latest = latestScores?.[section];

                return (
                  <div key={section} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 capitalize mb-2">{section}</p>
                    <div className="flex items-end justify-between">
                      <p className={`text-3xl font-bold ${getBandColor(latest)}`}>
                        {latest || '-'}
                      </p>
                      {change !== null && change !== 0 && (
                        <span className={`text-sm font-medium ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {change > 0 ? '+' : ''}{change.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Breakdown View */}
        {activeView === 'breakdown' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Skills Balance</h3>
              {progress.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" />
                    <PolarRadiusAxis domain={[0, 9]} />
                    <Radar name="Average Score" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No data available</p>
                </div>
              )}
            </div>

            {/* Bar Chart Comparison */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Latest vs Target</h3>
              {latestScores ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { name: 'Listening', latest: latestScores.listening, target: student?.targetBand },
                      { name: 'Reading', latest: latestScores.reading, target: student?.targetBand },
                      { name: 'Writing', latest: latestScores.writing, target: student?.targetBand },
                      { name: 'Speaking', latest: latestScores.speaking, target: student?.targetBand }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 9]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="latest" fill="#3B82F6" name="Latest Score" />
                    <Bar dataKey="target" fill="#10B981" name="Target" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No data available</p>
                </div>
              )}
            </div>

            {/* Weaknesses */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Focus Areas</h3>
              {student?.weaknesses?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {student.weaknesses.map((weakness, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                    >
                      {weakness}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No specific weaknesses identified</p>
              )}
            </div>
          </div>
        )}

        {/* History View */}
        {activeView === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Test History</h3>
            </div>

            {history.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {history.map((sim) => {
                  const isCompleted = sim.status === 'completed';
                  const displayDate = sim.completedAt || sim.updatedAt || sim.createdAt;

                  // Count completed sections
                  const completedSections = [];
                  if (sim.sections?.listening?.completed || sim.sections?.listening?.answers?.length > 0) completedSections.push('L');
                  if (sim.sections?.reading?.completed || sim.sections?.reading?.answers?.length > 0) completedSections.push('R');
                  if (sim.sections?.writing?.task1 || sim.sections?.writing?.task2) completedSections.push('W');
                  if (sim.sections?.speaking?.parts?.length > 0) completedSections.push('S');

                  return (
                    <div
                      key={sim._id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${!isCompleted ? 'bg-yellow-50' : ''}`}
                      onClick={() => navigate(`/results/${sim._id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800">
                              {sim.type === 'full' ? 'Full Simulation' : 'Practice Test'}
                            </p>
                            {!isCompleted && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-yellow-200 text-yellow-800 rounded-full">
                                In Progress
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(displayDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {!isCompleted && completedSections.length > 0 && (
                            <p className="text-xs text-yellow-600 mt-1">
                              Completed: {completedSections.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className={`text-2xl font-bold ${sim.overallBand > 0 ? getBandColor(sim.overallBand) : 'text-gray-400'}`}>
                              {sim.overallBand > 0 ? sim.overallBand : '-'}
                            </p>
                            <p className="text-xs text-gray-500">Overall</p>
                          </div>
                          <div className="flex gap-3 text-sm">
                            <span className={sim.sections?.listening?.score ? 'text-purple-600' : 'text-gray-300'}>
                              L: {sim.sections?.listening?.score || '-'}
                            </span>
                            <span className={sim.sections?.reading?.score ? 'text-blue-600' : 'text-gray-300'}>
                              R: {sim.sections?.reading?.score || '-'}
                            </span>
                            <span className={sim.sections?.writing?.score ? 'text-green-600' : 'text-gray-300'}>
                              W: {sim.sections?.writing?.score || '-'}
                            </span>
                            <span className={sim.sections?.speaking?.score ? 'text-orange-600' : 'text-gray-300'}>
                              S: {sim.sections?.speaking?.score || '-'}
                            </span>
                          </div>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <div className="text-4xl mb-4">📝</div>
                <p>No tests taken yet</p>
                <Button onClick={() => navigate('/simulation')} variant="primary" className="mt-4">
                  Take Your First Test
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
