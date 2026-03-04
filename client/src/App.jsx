import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StudentProvider, useStudent } from './context/StudentContext';
import { SimulationProvider } from './context/SimulationContext';

// Pages
import Home from './pages/Home';
import StudentSetup from './pages/StudentSetup';
import Analysis from './pages/Analysis';
import Simulation from './pages/Simulation';
import Results from './pages/Results';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';

// Navigation component that uses auth context
const Navigation = () => {
  const { isAuthenticated, user, logout, loading } = useStudent();

  // Debug log - remove after testing
  console.log('Nav Auth State:', { isAuthenticated, hasUser: !!user, loading, token: !!localStorage.getItem('ican_auth_token') });

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <span className="font-bold text-xl text-gray-800">ICAN IELTS AI</span>
          </a>
          <div className="flex items-center gap-4">
            {/* Show loading state */}
            {loading && (
              <span className="text-sm text-gray-400">Loading...</span>
            )}

            {/* Only show auth UI after loading is complete */}
            {!loading && isAuthenticated && (
              <>
                <a href="/dashboard" className="text-gray-600 hover:text-gray-800 transition">
                  Dashboard
                </a>
                <a href="/simulation" className="text-gray-600 hover:text-gray-800 transition">
                  Practice
                </a>
                <a href="/setup" className="text-gray-600 hover:text-gray-800 transition">
                  Profile
                </a>
                <span className="text-sm text-gray-500 border-l pl-4 ml-2">{user?.name}</span>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition"
                >
                  Logout
                </button>
              </>
            )}
            {!loading && !isAuthenticated && (
              <a
                href="/auth"
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Sign In
              </a>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <StudentProvider>
        <SimulationProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Navigation Header */}
            <Navigation />

            {/* Main Content */}
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/setup" element={<StudentSetup />} />
                <Route path="/analysis" element={<Analysis />} />
                <Route path="/simulation" element={<Simulation />} />
                <Route path="/results/:id" element={<Results />} />
                <Route path="/dashboard" element={<Dashboard />} />
              </Routes>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-6">
              <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
                <p>ICAN IELTS AI Simulator - Practice smarter with AI-powered questions</p>
                <p className="mt-1">
                  This is a practice tool and not affiliated with the official IELTS test.
                </p>
              </div>
            </footer>
          </div>
        </SimulationProvider>
      </StudentProvider>
    </Router>
  );
}

export default App;
