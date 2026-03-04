import { useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import ProfileForm from '../components/student/ProfileForm';

const StudentSetup = () => {
  const navigate = useNavigate();
  const { student, saveStudent, loading } = useStudent();

  const handleProfileSave = async (profileData) => {
    try {
      await saveStudent(profileData);
      navigate('/analysis');
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Set Up Your Profile
          </h1>
          <p className="text-gray-600">
            Tell us about yourself so we can customize your ICAN IELTS practice experience.
          </p>
        </div>

        <ProfileForm
          student={student}
          onSave={handleProfileSave}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default StudentSetup;
