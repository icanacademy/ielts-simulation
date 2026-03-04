import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import Button from '../components/common/Button';

const Analysis = () => {
  const navigate = useNavigate();
  const { student, analyzeWeaknesses, loading } = useStudent();
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if we have cached analysis with actual data
    if (student?.analysisResults?.focusAreas?.length > 0 || student?.analysisResults?.overallWeakness) {
      setAnalysis(student.analysisResults);
    }
  }, [student]);

  // Check if analysis has meaningful data
  const hasValidAnalysis = analysis && (
    analysis.overallWeakness ||
    (analysis.focusAreas && analysis.focusAreas.length > 0) ||
    (analysis.recommendations && analysis.recommendations.length > 0)
  );

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      const result = await analyzeWeaknesses();
      setAnalysis(result);
    } catch (err) {
      setError('Failed to analyze. Please check your API key and try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getPriorityColor = (index) => {
    const colors = ['bg-red-100 text-red-800', 'bg-orange-100 text-orange-800', 'bg-yellow-100 text-yellow-800', 'bg-blue-100 text-blue-800'];
    return colors[index] || colors[3];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Weakness Analysis
          </h1>
          <p className="text-gray-600">
            AI-powered analysis of your ICAN IELTS preparation needs
          </p>
        </div>

        {/* Student Summary Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{student?.name}</h3>
              <p className="text-gray-500">Target: Band {student?.targetBand}</p>
              {student?.customWeaknessNotes && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <span>✓</span> Custom findings included
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {student?.weaknesses?.slice(0, 5).map((weakness, index) => (
                <span key={index} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                  {weakness}
                </span>
              ))}
              {student?.weaknesses?.length > 5 && (
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                  +{student.weaknesses.length - 5} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Analysis Section */}
        {!hasValidAnalysis && (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="text-6xl mb-4">🧠</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {analysis ? 'Analysis Needs Refresh' : 'Ready to Analyze Your Profile'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {analysis
                ? 'Your previous analysis is incomplete or outdated. Run a new analysis to get personalized recommendations.'
                : 'Our AI will analyze your previous scores and selected weaknesses to create a personalized improvement plan.'
              }
            </p>
            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            <Button
              onClick={runAnalysis}
              loading={analyzing}
              size="lg"
            >
              {analysis ? 'Re-run AI Analysis' : 'Run AI Analysis'}
            </Button>
          </div>
        )}

        {/* Analysis Results */}
        {hasValidAnalysis && (
          <div className="space-y-6">
            {/* Overall Weakness */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-medium opacity-90 mb-2">Main Focus Area</h3>
              <p className="text-2xl font-bold">{analysis.overallWeakness}</p>
            </div>

            {/* Priority Areas */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Priority Order</h3>
              <div className="flex flex-wrap gap-3">
                {analysis.focusAreas?.map((area, index) => (
                  <div
                    key={index}
                    className={`px-4 py-2 rounded-lg font-medium ${getPriorityColor(index)}`}
                  >
                    <span className="opacity-60 mr-2">#{index + 1}</span>
                    {area}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recommendations</h3>
              <ul className="space-y-3">
                {analysis.recommendations?.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Gap Analysis */}
            {analysis.gapToTarget && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Gap to Target</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-400">
                      {analysis.estimatedCurrentBand || '-'}
                    </p>
                    <p className="text-sm text-gray-500">Current Est.</p>
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full relative">
                    <div
                      className="absolute left-0 top-0 h-full bg-blue-500 rounded-full"
                      style={{ width: `${((analysis.estimatedCurrentBand || 0) / 9) * 100}%` }}
                    />
                    <div
                      className="absolute top-0 h-full w-1 bg-green-500"
                      style={{ left: `${((student?.targetBand || 7) / 9) * 100}%` }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {student?.targetBand}
                    </p>
                    <p className="text-sm text-gray-500">Target</p>
                  </div>
                </div>
                <p className="text-gray-600">{analysis.gapToTarget}</p>
              </div>
            )}

            {/* Section Priority */}
            {analysis.priorityOrder && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Section Priority</h3>
                <div className="grid grid-cols-4 gap-4">
                  {analysis.priorityOrder.map((section, index) => (
                    <div
                      key={section}
                      className="text-center p-4 rounded-lg bg-gray-50"
                    >
                      <div className="text-2xl font-bold text-gray-800 mb-1">
                        {index + 1}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">{section}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Findings from Custom Notes */}
            {analysis.detailedFindings?.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Detailed Findings</h3>
                <div className="space-y-4">
                  {analysis.detailedFindings.map((finding, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                      <h4 className="font-medium text-gray-800">{finding.area}</h4>
                      <p className="text-sm text-gray-500 mt-1"><strong>Evidence:</strong> {finding.evidence}</p>
                      <p className="text-sm text-orange-600 mt-1"><strong>Impact:</strong> {finding.impact}</p>
                      <p className="text-sm text-green-600 mt-1"><strong>Action Plan:</strong> {finding.actionPlan}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Issues */}
            {analysis.extractedIssues?.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Issues Identified from Your Notes</h3>
                <ul className="space-y-2">
                  {analysis.extractedIssues.map((issue, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span className="text-gray-700">{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Practice Schedule */}
            {analysis.practiceSchedule && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Suggested Practice Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">📅</span>
                      Daily Practice
                    </h4>
                    <ul className="space-y-2">
                      {analysis.practiceSchedule.daily?.map((item, index) => (
                        <li key={index} className="text-gray-600 flex items-start gap-2">
                          <span className="text-green-500">✓</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">📆</span>
                      Weekly Focus
                    </h4>
                    <ul className="space-y-2">
                      {analysis.practiceSchedule.weekly?.map((item, index) => (
                        <li key={index} className="text-gray-600 flex items-start gap-2">
                          <span className="text-blue-500">✓</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Resource Suggestions */}
            {analysis.resourceSuggestions?.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Suggested Resources</h3>
                <div className="flex flex-wrap gap-3">
                  {analysis.resourceSuggestions.map((resource, index) => (
                    <span key={index} className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm">
                      {resource}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Ready to Practice?</h3>
                <p className="text-sm text-gray-500">All questions will target your identified weaknesses</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => navigate('/simulation')}
                  size="lg"
                  variant="primary"
                >
                  Start Practice →
                </Button>
                <Button
                  onClick={runAnalysis}
                  loading={analyzing}
                  variant="ghost"
                >
                  Re-analyze
                </Button>
              </div>

              <p className="text-xs text-gray-400 text-center mt-3">
                You'll choose which sections to take on the next screen
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analysis;
