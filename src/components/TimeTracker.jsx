import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthWrapper';
import { timeTrackingAPI } from '../lib/supabase';
import { PlusCircle, Clock, BarChart3, Calendar, Download, Upload, Trash2, Play, Square } from 'lucide-react';

const TimeTracker = () => {
  const { user, signOut } = useAuth();
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form states
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Default categories/tags - we'll create these in Supabase
  const defaultCategories = [
    { name: 'Sleep', color: '#8B5CF6' },
    { name: 'Productive', color: '#10B981' },
    { name: 'Self-Care', color: '#3B82F6' },
    { name: 'Unproductive', color: '#EF4444' },
    { name: 'Social', color: '#F59E0B' },
    { name: 'Transit', color: '#6B7280' },
    { name: 'Class (Blocked)', color: '#EC4899' }
  ];

  // Load data from Supabase on component mount
  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      setLoading(true);
      
      // Load categories first
      const { data: categoriesData, error: categoriesError } = await timeTrackingAPI.getProjects();
      if (categoriesError) throw categoriesError;
      
      // Create default categories if none exist
      if (!categoriesData || categoriesData.length === 0) {
        for (const category of defaultCategories) {
          await timeTrackingAPI.createProject(category.name, category.color);
        }
        // Reload categories after creation
        const { data: newCategoriesData } = await timeTrackingAPI.getProjects();
        setCategories(newCategoriesData || []);
      } else {
        setCategories(categoriesData);
      }
      
      // Load time entries
      await loadEntries();
      
    } catch (err) {
      setError('Failed to load data: ' + err.message);
      console.error('Error initializing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async (startDate = null, endDate = null) => {
    try {
      const { data, error } = await timeTrackingAPI.getTimeEntries(startDate, endDate);
      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      setError('Failed to load entries: ' + err.message);
      console.error('Error loading entries:', err);
    }
  };

  const calculateDuration = (start, end) => {
    const startDate = new Date(`${selectedDate}T${start}`);
    const endDate = new Date(`${selectedDate}T${end}`);
    
    // Handle overnight activities
    if (endDate < startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    return Math.round((endDate - startDate) / (1000 * 60)); // minutes
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const addEntry = async () => {
    if (!startTime || !endTime || !description || !selectedCategory) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const startDateTime = new Date(`${selectedDate}T${startTime}`).toISOString();
      let endDateTime = new Date(`${selectedDate}T${endTime}`).toISOString();
      
      // Handle overnight activities
      if (endTime < startTime) {
        const endDate = new Date(`${selectedDate}T${endTime}`);
        endDate.setDate(endDate.getDate() + 1);
        endDateTime = endDate.toISOString();
      }

      const { data, error } = await timeTrackingAPI.createTimeEntry(
        selectedCategory,
        description,
        startDateTime,
        endDateTime
      );

      if (error) throw error;
      
      // Add new entry to local state
      if (data && data[0]) {
        setEntries(prev => [...prev, data[0]].sort((a, b) => 
          new Date(a.start_time) - new Date(b.start_time)
        ));
      }

      // Reset form
      setStartTime('');
      setEndTime('');
      setDescription('');
      setSelectedCategory('');
      
    } catch (err) {
      setError('Failed to add entry: ' + err.message);
      console.error('Error adding entry:', err);
    }
  };

  const startTracking = () => {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    setCurrentActivity({
      start: timeString,
      description: description || 'Current Activity',
      category: selectedCategory || categories[0]?.id
    });
    setIsTracking(true);
    setStartTime(timeString);
  };

  const stopTracking = () => {
    if (currentActivity) {
      const now = new Date();
      const timeString = now.toTimeString().slice(0, 5);
      setEndTime(timeString);
      setDescription(currentActivity.description);
      setSelectedCategory(currentActivity.category);
      setIsTracking(false);
      setCurrentActivity(null);
    }
  };

  const deleteEntry = async (id) => {
    try {
      const { error } = await timeTrackingAPI.deleteTimeEntry(id);
      if (error) throw error;
      
      setEntries(prev => prev.filter(entry => entry.id !== id));
    } catch (err) {
      setError('Failed to delete entry: ' + err.message);
      console.error('Error deleting entry:', err);
    }
  };

  const getEntriesForDate = (date) => {
    return entries.filter(entry => {
      const entryDate = new Date(entry.start_time).toISOString().split('T')[0];
      return entryDate === date;
    });
  };

  const getTotalsByCategory = (date) => {
    const dayEntries = getEntriesForDate(date);
    const totals = {};
    dayEntries.forEach(entry => {
      const categoryName = entry.projects?.name || 'Unknown';
      totals[categoryName] = (totals[categoryName] || 0) + (entry.duration_minutes || 0);
    });
    return totals;
  };

  const getWeeklyAverages = () => {
    const today = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    const weeklyTotals = {};
    last7Days.forEach(date => {
      const dayTotals = getTotalsByCategory(date);
      Object.entries(dayTotals).forEach(([category, minutes]) => {
        weeklyTotals[category] = (weeklyTotals[category] || 0) + minutes;
      });
    });

    const averages = {};
    Object.entries(weeklyTotals).forEach(([category, total]) => {
      averages[category] = Math.round(total / 7);
    });

    return averages;
  };

  const exportData = () => {
    const csv = [
      ['Date', 'Start', 'End', 'Duration (min)', 'Description', 'Category'],
      ...entries.map(entry => [
        new Date(entry.start_time).toISOString().split('T')[0],
        new Date(entry.start_time).toTimeString().slice(0, 5),
        entry.end_time ? new Date(entry.end_time).toTimeString().slice(0, 5) : '',
        entry.duration_minutes || 0,
        entry.description || '',
        entry.projects?.name || 'Unknown'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'time-tracker-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n').slice(1); // Skip header
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const [date, start, end, duration, description, categoryName] = line.split(',');
          
          // Find or create category
          let category = categories.find(c => c.name === categoryName?.trim());
          if (!category) {
            const { data: newCategory } = await timeTrackingAPI.createProject(
              categoryName?.trim() || 'Imported',
              '#6B7280'
            );
            if (newCategory && newCategory[0]) {
              category = newCategory[0];
              setCategories(prev => [...prev, category]);
            }
          }
          
          if (category && date && start && end) {
            const startDateTime = new Date(`${date.trim()}T${start.trim()}`).toISOString();
            const endDateTime = new Date(`${date.trim()}T${end.trim()}`).toISOString();
            
            await timeTrackingAPI.createTimeEntry(
              category.id,
              description?.trim() || '',
              startDateTime,
              endDateTime
            );
          }
        }
        
        // Reload entries after import
        await loadEntries();
        
      } catch (err) {
        setError('Failed to import data: ' + err.message);
        console.error('Error importing data:', err);
      }
    };
    reader.readAsText(file);
  };

  const getCategoryByName = (name) => {
    return categories.find(c => c.name === name);
  };

  const getCurrentActivityCategory = () => {
    return categories.find(c => c.id === currentActivity?.category);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const todayEntries = getEntriesForDate(selectedDate);
  const todayTotals = getTotalsByCategory(selectedDate);
  const weeklyAverages = getWeeklyAverages();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Sign Out */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-white mb-2">The Time Tracker</h1>
            <p className="text-blue-200">To finally uncover where all your time goes</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-white">Welcome, {user?.email}</span>
            <button
              onClick={signOut}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg p-4 mb-6">
            {error}
            <button 
              onClick={() => setError('')}
              className="ml-4 text-red-300 hover:text-red-100"
            >
              ×
            </button>
          </div>
        )}

        {/* Current Activity Banner */}
        {isTracking && (
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="animate-pulse bg-red-500 rounded-full w-3 h-3"></div>
              <span className="text-white font-semibold">
                Tracking: {currentActivity?.description} ({getCurrentActivityCategory()?.name})
              </span>
              <span className="text-white/80">Started at {currentActivity?.start}</span>
            </div>
            <button
              onClick={stopTracking}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all"
            >
              <Square size={16} />
              <span>Stop</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Entry Form */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center space-x-2">
              <PlusCircle size={24} />
              <span>Add Time Entry</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-blue-200 mb-2">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-blue-200 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-blue-200 mb-2">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-blue-200 mb-2">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., lock-in factory, brunch, clash"
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-300"
                />
              </div>

              <div>
                <label className="block text-blue-200 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id} className="bg-gray-800">
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={addEntry}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
                >
                  Add Entry
                </button>
                
                {!isTracking ? (
                  <button
                    onClick={startTracking}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all"
                  >
                    <Play size={16} />
                    <span>Start</span>
                  </button>
                ) : (
                  <button
                    onClick={stopTracking}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all"
                  >
                    <Square size={16} />
                    <span>Stop</span>
                  </button>
                )}
              </div>
            </div>

            {/* Import/Export */}
            <div className="mt-6 flex space-x-3">
              <button
                onClick={exportData}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg flex items-center justify-center space-x-2 transition-all"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
              <label className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer">
                <Upload size={16} />
                <span>Import CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={importData}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Daily Summary */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center space-x-2">
              <BarChart3 size={24} />
              <span>Daily Summary</span>
            </h2>

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">
                {selectedDate} ({todayEntries.length} entries)
              </h3>
              
              <div className="space-y-2">
                {Object.entries(todayTotals).map(([category, minutes]) => (
                  <div key={category} className="flex justify-between text-white">
                    <span className="capitalize">{category}</span>
                    <span className="font-mono">{formatTime(minutes)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">7-Day Average</h3>
              <div className="space-y-2">
                {Object.entries(weeklyAverages).map(([category, minutes]) => (
                  <div key={category} className="flex justify-between text-blue-200">
                    <span className="capitalize">{category}</span>
                    <span className="font-mono">{formatTime(minutes)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Today's Entries */}
        <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-2xl font-semibold text-white mb-4 flex items-center space-x-2">
            <Calendar size={24} />
            <span>Entries for {selectedDate}</span>
          </h2>

          {todayEntries.length === 0 ? (
            <p className="text-blue-200 text-center py-8">No entries for this date</p>
          ) : (
            <div className="space-y-3">
              {todayEntries.map(entry => {
                const startTime = new Date(entry.start_time).toTimeString().slice(0, 5);
                const endTime = entry.end_time ? new Date(entry.end_time).toTimeString().slice(0, 5) : 'In Progress';
                const categoryName = entry.projects?.name || 'Unknown';
                const categoryColor = entry.projects?.color || '#6B7280';
                
                return (
                  <div
                    key={entry.id}
                    className="bg-white/5 rounded-lg p-4 flex items-center justify-between hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-white font-mono">
                        {startTime} - {endTime}
                      </div>
                      <div className="text-blue-200">
                        {entry.description}
                      </div>
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-semibold"
                        style={{ 
                          backgroundColor: `${categoryColor}20`, 
                          color: categoryColor 
                        }}
                      >
                        {categoryName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-white font-mono">
                        {entry.duration_minutes ? formatTime(entry.duration_minutes) : 'In Progress'}
                      </span>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeTracker;