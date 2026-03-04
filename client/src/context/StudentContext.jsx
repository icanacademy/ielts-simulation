import { createContext, useContext, useState, useEffect } from 'react';
import { studentAPI, authAPI } from '../services/api';

const StudentContext = createContext();

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};

export const StudentProvider = ({ children }) => {
  const [student, setStudent] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [progress, setProgress] = useState([]);

  // Debug logging disabled in production
  // useEffect(() => {
  //   console.log('=== AUTH DEBUG ON MOUNT ===');
  // }, []);

  // Check auth status and fetch student on mount
  useEffect(() => {
    checkAuthAndFetchStudent();
  }, []);

  const checkAuthAndFetchStudent = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      // Always start with not authenticated
      setIsAuthenticated(false);
      setUser(null);

      const hasToken = authAPI.isAuthenticated();

      // Check if we have a token
      if (hasToken) {
        try {
          // Verify token and get user info
          const { data: userData } = await authAPI.getMe();
          // Extract the user object from response (API returns { user: {...}, student: {...} })
          setUser(userData.user || userData);
          // Also set student if returned
          if (userData.student) {
            setStudent(userData.student);
          }
          setIsAuthenticated(true);
        } catch (err) {
          // Token invalid, clear it
          authAPI.removeToken();
          setIsAuthenticated(false);
          setUser(null);
        }
      }

      // Fetch student (works for both authenticated and guest users)
      await fetchStudent();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initialize');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const { data } = await studentAPI.getCurrent();
      setStudent(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch student');
    } finally {
      setLoading(false);
    }
  };

  const saveStudent = async (studentData) => {
    try {
      setLoading(true);
      const { data } = await studentAPI.create(studentData);
      setStudent(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save student');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateStudent = async (updates) => {
    if (!student?._id) return;
    try {
      const { data } = await studentAPI.update(student._id, updates);
      setStudent(data);
      setError(null); // Clear any previous errors
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update student');
      throw err;
    }
  };

  const fetchHistory = async () => {
    if (!student?._id) return;
    try {
      const { data } = await studentAPI.getHistory(student._id);
      setHistory(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const fetchProgress = async () => {
    if (!student?._id) return;
    try {
      const { data } = await studentAPI.getProgress(student._id);
      setProgress(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    }
  };

  const analyzeWeaknesses = async () => {
    if (!student?._id) return;
    try {
      const { data } = await studentAPI.analyze(student._id);
      setStudent(prev => ({
        ...prev,
        analysisResults: { ...data, analyzedAt: new Date() }
      }));
      setError(null); // Clear any previous errors
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze');
      throw err;
    }
  };

  const logout = () => {
    authAPI.removeToken();
    setUser(null);
    setIsAuthenticated(false);
    setStudent(null);
    setHistory([]);
    setProgress([]);
    setError(null); // Clear errors on logout
    // Refetch as guest
    fetchStudent();
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    student,
    user,
    isAuthenticated,
    loading,
    error,
    history,
    progress,
    fetchStudent,
    saveStudent,
    updateStudent,
    fetchHistory,
    fetchProgress,
    analyzeWeaknesses,
    logout,
    clearError
  };

  return (
    <StudentContext.Provider value={value}>
      {children}
    </StudentContext.Provider>
  );
};

export default StudentContext;
