import { useState } from 'react';
import Button from '../common/Button';
import WeaknessInput from './WeaknessInput';

const ProfileForm = ({ student, onSave, loading }) => {
  const [formData, setFormData] = useState({
    name: student?.name || '',
    email: student?.email || '',
    targetBand: student?.targetBand || 7,
    testDate: student?.testDate ? new Date(student.testDate).toISOString().split('T')[0] : '',
    previousScores: {
      listening: student?.previousScores?.listening || '',
      reading: student?.previousScores?.reading || '',
      writing: student?.previousScores?.writing || '',
      speaking: student?.previousScores?.speaking || ''
    },
    weaknesses: student?.weaknesses || [],
    customWeaknessNotes: student?.customWeaknessNotes || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScoreChange = (section, value) => {
    setFormData(prev => ({
      ...prev,
      previousScores: {
        ...prev.previousScores,
        [section]: value ? parseFloat(value) : ''
      }
    }));
  };

  const handleWeaknessChange = (weaknesses) => {
    setFormData(prev => ({ ...prev, weaknesses }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Band Score *
            </label>
            <select
              name="targetBand"
              value={formData.targetBand}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map(band => (
                <option key={band} value={band}>Band {band}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Date
            </label>
            <input
              type="date"
              name="testDate"
              value={formData.testDate}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Previous Scores */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Previous Scores</h3>
        <p className="text-sm text-gray-500 mb-4">
          Enter your previous IELTS scores if available. This helps ICAN customize your practice.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['listening', 'reading', 'writing', 'speaking'].map(section => (
            <div key={section}>
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                {section}
              </label>
              <select
                value={formData.previousScores[section]}
                onChange={(e) => handleScoreChange(section, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">N/A</option>
                {[4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map(score => (
                  <option key={score} value={score}>{score}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Weaknesses Selection */}
      <WeaknessInput
        selectedWeaknesses={formData.weaknesses}
        onChange={handleWeaknessChange}
      />

      {/* Custom Weakness Notes */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Additional Findings</h3>
        <p className="text-sm text-gray-500 mb-4">
          Paste any additional feedback, test reports, teacher comments, or personal notes about your weaknesses.
          The AI will analyze this to provide more accurate, personalized recommendations.
        </p>
        <textarea
          name="customWeaknessNotes"
          value={formData.customWeaknessNotes}
          onChange={handleChange}
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          placeholder="Examples you can paste here:

• Previous IELTS score report feedback
• Teacher's comments on your essays
• Speaking test examiner feedback
• Notes about specific mistakes you keep making
• Areas where you feel least confident
• Any diagnostic test results..."
        />
        <p className="text-xs text-gray-400 mt-2">
          {formData.customWeaknessNotes.length}/5000 characters
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
        >
          Save Profile & Continue
        </Button>
      </div>
    </form>
  );
};

export default ProfileForm;
