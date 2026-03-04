import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { simulationAPI } from '../services/api';
import Button from '../components/common/Button';
import ProgressBar from '../components/common/ProgressBar';

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchResults();
  }, [id]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const { data } = await simulationAPI.getResults(id);
      setResults(data);
    } catch (err) {
      setError('Failed to load results');
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBandColor = (score) => {
    if (score >= 7) return 'text-green-600';
    if (score >= 6) return 'text-blue-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBandBgColor = (score) => {
    if (score >= 7) return 'bg-green-100';
    if (score >= 6) return 'bg-blue-100';
    if (score >= 5) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 shadow-sm max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Results not found'}</p>
          <Button onClick={() => navigate('/')} variant="primary">Go Home</Button>
        </div>
      </div>
    );
  }

  const { simulation, summary } = results;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Simulation Results
          </h1>
          <p className="text-gray-600">
            Completed on {new Date(simulation.completedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Overall Score Card */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-8 text-white mb-8">
          <div className="text-center">
            <h2 className="text-lg opacity-90 mb-2">Overall Band Score</h2>
            <div className="text-6xl font-bold mb-4">{simulation.overallBand || '-'}</div>
            <div className="grid grid-cols-4 gap-4 max-w-lg mx-auto">
              {['listening', 'reading', 'writing', 'speaking'].map(section => (
                <div key={section} className="text-center">
                  <p className="text-3xl font-semibold">
                    {simulation.sections?.[section]?.score || '-'}
                  </p>
                  <p className="text-xs opacity-80 capitalize">{section}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['overview', 'listening', 'reading', 'writing', 'speaking', 'weaknesses'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Performance Overview</h3>

              {/* Section Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['listening', 'reading', 'writing', 'speaking'].map(section => {
                  const sectionData = simulation.sections?.[section];
                  const score = sectionData?.score || 0;

                  return (
                    <div
                      key={section}
                      className={`p-4 rounded-xl ${getBandBgColor(score)}`}
                    >
                      <p className="text-sm text-gray-600 capitalize mb-1">{section}</p>
                      <p className={`text-3xl font-bold ${getBandColor(score)}`}>
                        {score || '-'}
                      </p>
                      {sectionData?.rawScore !== undefined && (
                        <p className="text-sm text-gray-500">
                          {sectionData.rawScore}/{sectionData.answers?.length || 40} correct
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">
                    {Math.round((new Date(simulation.completedAt) - new Date(simulation.startedAt)) / 60000)} min
                  </p>
                  <p className="text-sm text-gray-500">Total Time</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">
                    {summary?.weaknesses?.length || 0}
                  </p>
                  <p className="text-sm text-gray-500">Weak Areas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">
                    {simulation.type === 'full' ? 'Full' : 'Practice'}
                  </p>
                  <p className="text-sm text-gray-500">Test Type</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'listening' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Listening Results</h3>
                <span className={`text-2xl font-bold ${getBandColor(summary?.listening?.bandScore)}`}>
                  Band {summary?.listening?.bandScore || '-'}
                </span>
              </div>

              {summary?.listening ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {summary.listening.rawScore}
                      </p>
                      <p className="text-sm text-gray-500">Correct</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {(summary.listening.totalQuestions || 40) - summary.listening.rawScore}
                      </p>
                      <p className="text-sm text-gray-500">Incorrect</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {summary.listening.accuracy}%
                      </p>
                      <p className="text-sm text-gray-500">Accuracy</p>
                    </div>
                  </div>

                  {summary.listening.weakAreas?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">Question Types to Practice:</h4>
                      <div className="space-y-2">
                        {summary.listening.weakAreas.map((area, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-gray-700">{area.type}</span>
                            <div className="flex-1">
                              <ProgressBar
                                value={100 - area.percentage}
                                color={area.percentage > 50 ? 'red' : area.percentage > 30 ? 'yellow' : 'green'}
                                showPercentage={false}
                                size="sm"
                              />
                            </div>
                            <span className="text-sm text-gray-500">
                              {area.count} wrong
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500">No listening data available</p>
              )}
            </div>
          )}

          {activeTab === 'reading' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Reading Results</h3>
                <span className={`text-2xl font-bold ${getBandColor(summary?.reading?.bandScore)}`}>
                  Band {summary?.reading?.bandScore || '-'}
                </span>
              </div>

              {summary?.reading ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {summary.reading.rawScore}
                      </p>
                      <p className="text-sm text-gray-500">Correct</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {(summary.reading.totalQuestions || 40) - summary.reading.rawScore}
                      </p>
                      <p className="text-sm text-gray-500">Incorrect</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {summary.reading.accuracy}%
                      </p>
                      <p className="text-sm text-gray-500">Accuracy</p>
                    </div>
                  </div>

                  {summary.reading.weakAreas?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">Question Types to Practice:</h4>
                      <div className="space-y-2">
                        {summary.reading.weakAreas.map((area, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-gray-700 min-w-[200px]">{area.type}</span>
                            <div className="flex-1">
                              <ProgressBar
                                value={100 - area.percentage}
                                color={area.percentage > 50 ? 'red' : area.percentage > 30 ? 'yellow' : 'green'}
                                showPercentage={false}
                                size="sm"
                              />
                            </div>
                            <span className="text-sm text-gray-500">
                              {area.count} wrong
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500">No reading data available</p>
              )}
            </div>
          )}

          {activeTab === 'writing' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Writing Results</h3>
                <span className={`text-2xl font-bold ${getBandColor(summary?.writing?.bandScore)}`}>
                  Band {summary?.writing?.bandScore || '-'}
                </span>
              </div>

              {summary?.writing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['task1', 'task2'].map((task, index) => {
                    const taskData = simulation.sections?.writing?.[task];
                    if (!taskData) return null;

                    return (
                      <div key={task} className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-3">
                          Task {index + 1} - Band {taskData.overallScore}
                        </h4>
                        <div className="space-y-2 mb-4">
                          {Object.entries(taskData.scores || {}).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-gray-600 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <span className={`font-medium ${getBandColor(value)}`}>{value}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-gray-600">{taskData.feedback}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500">No writing data available</p>
              )}
            </div>
          )}

          {activeTab === 'speaking' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Speaking Results</h3>
                <span className={`text-2xl font-bold ${getBandColor(summary?.speaking?.bandScore)}`}>
                  Band {summary?.speaking?.bandScore || '-'}
                </span>
              </div>

              {summary?.speaking?.partScores?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {summary.speaking.partScores.map(({ part, score }) => (
                    <div key={part} className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-sm text-gray-500 mb-1">Part {part}</p>
                      <p className={`text-2xl font-bold ${getBandColor(score)}`}>{score}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No speaking data available</p>
              )}
            </div>
          )}

          {activeTab === 'weaknesses' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Areas for Improvement</h3>

              {summary?.weaknesses?.length > 0 ? (
                <div className="space-y-3">
                  {summary.weaknesses.map((weakness, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-red-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-red-800">{weakness.type}</p>
                        <p className="text-sm text-red-600">
                          {weakness.count} incorrect ({weakness.percentage}% error rate)
                        </p>
                      </div>
                      <Button
                        onClick={() => navigate(`/simulation?mode=practice&focus=${weakness.type}`)}
                        variant="outline"
                        size="sm"
                      >
                        Practice
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-gray-600">Great job! No major weaknesses identified.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate('/simulation')} variant="primary" size="lg">
            Take Another Test
          </Button>
          <Button onClick={() => navigate('/dashboard')} variant="outline" size="lg">
            View Progress Dashboard
          </Button>
          <Button onClick={() => navigate('/')} variant="ghost" size="lg">
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
