import { useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import Button from '../components/common/Button';

const Home = () => {
  const navigate = useNavigate();
  const { student, isAuthenticated, loading } = useStudent();

  const features = [
    {
      icon: '🎯',
      title: 'AI-Powered Questions',
      description: 'Questions generated specifically for your weak areas'
    },
    {
      icon: '⏱️',
      title: 'Real Exam Simulation',
      description: 'Full timed test experience with all 4 sections'
    },
    {
      icon: '📊',
      title: 'Instant Feedback',
      description: 'Get explanations immediately after each answer'
    },
    {
      icon: '📈',
      title: 'Progress Tracking',
      description: 'Monitor your improvement over time'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            ICAN IELTS AI Simulator
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Practice smarter with AI-powered questions targeting your weaknesses.
            Get instant feedback and track your progress.
          </p>

          {/* Different buttons based on auth state */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <>
                <Button
                  onClick={() => navigate('/simulation')}
                  size="lg"
                  variant="primary"
                >
                  Start Practice
                </Button>
                <Button
                  onClick={() => navigate('/dashboard')}
                  size="lg"
                  variant="outline"
                >
                  View Progress
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/auth')}
                  size="lg"
                  variant="primary"
                  loading={loading}
                >
                  Sign In / Register
                </Button>
                <Button
                  onClick={() => navigate('/auth')}
                  size="lg"
                  variant="outline"
                >
                  Learn More
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* IELTS Sections Overview */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">
            Complete IELTS Experience
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Listening', time: '30 min', questions: 40, color: 'border-purple-500', icon: '🎧' },
              { name: 'Reading', time: '60 min', questions: 40, color: 'border-blue-500', icon: '📖' },
              { name: 'Writing', time: '60 min', questions: 2, color: 'border-green-500', icon: '✍️' },
              { name: 'Speaking', time: '14 min', questions: 3, color: 'border-orange-500', icon: '🎤' }
            ].map((section) => (
              <div
                key={section.name}
                className={`bg-white rounded-xl p-6 border-l-4 ${section.color} shadow-sm`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{section.icon}</span>
                  <h3 className="text-xl font-semibold text-gray-800">{section.name}</h3>
                </div>
                <div className="space-y-2 text-gray-600">
                  <p>Duration: {section.time}</p>
                  <p>{section.questions} {section.name === 'Writing' ? 'tasks' : section.name === 'Speaking' ? 'parts' : 'questions'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Profile Summary - Only show when logged in */}
        {isAuthenticated && student && (
          <div className="mt-16 bg-white rounded-xl p-6 shadow-sm max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Welcome back, {student.name}!
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{student.targetBand || 7}</p>
                <p className="text-sm text-gray-500">Target Band</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {student.weaknesses?.length || 0}
                </p>
                <p className="text-sm text-gray-500">Focus Areas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {student.previousScores?.reading || '-'}
                </p>
                <p className="text-sm text-gray-500">Last Reading</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {student.previousScores?.speaking || '-'}
                </p>
                <p className="text-sm text-gray-500">Last Speaking</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
              <Button
                onClick={() => navigate('/setup')}
                variant="ghost"
                size="sm"
              >
                Update Profile
              </Button>
            </div>
          </div>
        )}

        {/* Call to action for non-logged in users */}
        {!isAuthenticated && (
          <div className="mt-16 bg-white rounded-xl p-8 shadow-sm max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-3">
              Ready to Improve Your IELTS Score?
            </h3>
            <p className="text-gray-600 mb-6">
              Create a free account to start practicing with AI-powered questions, track your progress, and access your data from any device.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate('/auth')}
                size="lg"
                variant="primary"
              >
                Create Free Account
              </Button>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              Already have an account? <a href="/auth" className="text-blue-600 hover:underline">Sign in</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
