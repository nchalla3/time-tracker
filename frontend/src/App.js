import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TimeTracker = () => {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({
    start_time: '',
    end_time: '',
    description: '',
    tag: 'Productive'
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyAnalytics, setDailyAnalytics] = useState(null);
  const [weeklyAnalytics, setWeeklyAnalytics] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Available tags (matching user's Google Sheets)
  const defaultTags = ["Sleep", "Self-Care", "Unproductive", "Transit", "Class (Blocked)", "Productive"];

  const validateTimeFormat = (timeStr) => {
    const timeRegex = /^(1[0-2]|0?[1-9]):([0-5][0-9])\s?(AM|PM)$/i;
    return timeRegex.test(timeStr.trim());
  };

  useEffect(() => {
    fetchEntries();
    fetchDailyAnalytics();
    fetchWeeklyAnalytics();
    fetchAvailableTags();
  }, [selectedDate]);

  const fetchEntries = async () => {
    try {
      const response = await axios.get(`${API}/time-entries?date=${selectedDate}`);
      setEntries(response.data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  const fetchDailyAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/daily/${selectedDate}`);
      setDailyAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching daily analytics:', error);
    }
  };

  const fetchWeeklyAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/weekly`);
      setWeeklyAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching weekly analytics:', error);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      const response = await axios.get(`${API}/tags`);
      setAvailableTags(response.data);
    } catch (error) {
      console.error('Error fetching tags:', error);
      setAvailableTags(defaultTags);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    
    // Validate time formats
    const newErrors = {};
    if (!validateTimeFormat(newEntry.start_time)) {
      newErrors.start_time = 'Please enter time in format "9:15 AM" or "2:30 PM"';
    }
    if (!validateTimeFormat(newEntry.end_time)) {
      newErrors.end_time = 'Please enter time in format "9:15 AM" or "2:30 PM"';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }
    
    try {
      await axios.post(`${API}/time-entries`, {
        ...newEntry,
        date: selectedDate
      });
      
      setNewEntry({
        start_time: '',
        end_time: '',
        description: '',
        tag: 'Productive'
      });
      
      fetchEntries();
      fetchDailyAnalytics();
      fetchWeeklyAnalytics();
    } catch (error) {
      console.error('Error creating entry:', error);
      setErrors({ submit: 'Failed to create entry. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    return timeStr || '--';
  };

  const getTagColor = (tag) => {
    const colors = {
      'Sleep': 'bg-gray-100 text-gray-800',
      'Self-Care': 'bg-orange-100 text-orange-800',
      'Unproductive': 'bg-red-100 text-red-800',
      'Transit': 'bg-yellow-100 text-yellow-800',
      'Class (Blocked)': 'bg-purple-100 text-purple-800',
      'Productive': 'bg-green-100 text-green-800'
    };
    return colors[tag] || 'bg-blue-100 text-blue-800';
  };

  const getTrendIcon = (trend) => {
    if (trend === 'increasing') return '📈';
    if (trend === 'decreasing') return '📉';
    return '➡️';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Time Tracker</h1>
            <p className="mt-1 text-sm text-gray-600">Track your daily activities and analyze your time</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Time Entry Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Add Time Entry</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                    <input
                      type="text"
                      placeholder="9:15 AM"
                      value={newEntry.start_time}
                      onChange={(e) => setNewEntry({ ...newEntry, start_time: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                    <input
                      type="text"
                      placeholder="10:53 AM"
                      value={newEntry.end_time}
                      onChange={(e) => setNewEntry({ ...newEntry, end_time: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    placeholder="business presentation"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tag</label>
                  <select
                    value={newEntry.tag}
                    onChange={(e) => setNewEntry({ ...newEntry, tag: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {(availableTags.length > 0 ? availableTags : defaultTags).map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Entry'}
                </button>
              </form>
            </div>

            {/* Daily Analytics */}
            {dailyAnalytics && (
              <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Summary</h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Total tracked: <span className="font-medium">{dailyAnalytics.total_tracked_hours}h</span>
                  </p>
                  <div className="space-y-1">
                    {Object.entries(dailyAnalytics.tag_totals).map(([tag, minutes]) => (
                      <div key={tag} className="flex justify-between text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${getTagColor(tag)}`}>
                          {tag}
                        </span>
                        <span className="font-medium">{Math.round(minutes / 60 * 10) / 10}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Daily Entries */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Entries for {new Date(selectedDate).toLocaleDateString()}
                </h2>
              </div>
              
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tag</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(entry.start_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(entry.end_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {entry.duration_minutes}m
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {entry.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getTagColor(entry.tag)}`}>
                            {entry.tag}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {entries.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                          No entries for this date
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weekly Analytics */}
            <div className="bg-white rounded-lg shadow mt-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Weekly Trends</h2>
                <p className="text-sm text-gray-600">Average daily time vs previous week</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {weeklyAnalytics.map((stat) => (
                    <div key={stat.tag} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getTagColor(stat.tag)}`}>
                          {stat.tag}
                        </span>
                        <span className="text-lg">{getTrendIcon(stat.trend)}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">This week:</span>
                          <span className="font-medium">{stat.current_week_avg}m/day</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Last week:</span>
                          <span className="font-medium">{stat.previous_week_avg}m/day</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Change:</span>
                          <span className={`font-medium ${stat.change_percentage > 0 ? 'text-green-600' : stat.change_percentage < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {stat.change_percentage > 0 ? '+' : ''}{stat.change_percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {weeklyAnalytics.length === 0 && (
                  <p className="text-center text-gray-500">
                    No data available for weekly comparison. Add more entries to see trends.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <TimeTracker />
    </div>
  );
}

export default App;