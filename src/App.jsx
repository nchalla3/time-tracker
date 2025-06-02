import React, { useState, useEffect } from 'react';
import { PlusCircle, Clock, BarChart3, Calendar, Download, Upload, Trash2, Play, Square } from 'lucide-react';

const TimeTracker = () => {
  const [entries, setEntries] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Form states
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('');
  
  const tags = ['Sleep', 'Productive', 'Self-Care', 'Unproductive', 'Social', 'Transit', 'Class (Blocked)'];

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedEntries = localStorage.getItem('timeTrackerEntries');
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }
  }, []);

  // Save to localStorage whenever entries change
  useEffect(() => {
    localStorage.setItem('timeTrackerEntries', JSON.stringify(entries));
  }, [entries]);

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

  const addEntry = () => {
    if (!startTime || !endTime || !description || !tag) {
      alert('Please fill in all fields');
      return;
    }

    const duration = calculateDuration(startTime, endTime);
    const newEntry = {
      id: Date.now(),
      date: selectedDate,
      start: startTime,
      end: endTime,
      duration,
      description,
      tag
    };

    setEntries(prev => [...prev, newEntry].sort((a, b) => 
      new Date(`${a.date}T${a.start}`) - new Date(`${b.date}T${b.start}`)
    ));

    // Reset form
    setStartTime('');
    setEndTime('');
    setDescription('');
    setTag('');
  };

  const startTracking = () => {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    setCurrentActivity({
      start: timeString,
      description: description || 'Current Activity',
      tag: tag || 'Unproductive'
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
      setTag(currentActivity.tag);
      setIsTracking(false);
      setCurrentActivity(null);
    }
  };

  const deleteEntry = (id) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const getEntriesForDate = (date) => {
    return entries.filter(entry => entry.date === date);
  };

  const getTotalsByTag = (date) => {
    const dayEntries = getEntriesForDate(date);
    const totals = {};
    dayEntries.forEach(entry => {
      totals[entry.tag] = (totals[entry.tag] || 0) + entry.duration;
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
      const dayTotals = getTotalsByTag(date);
      Object.entries(dayTotals).forEach(([tag, minutes]) => {
        weeklyTotals[tag] = (weeklyTotals[tag] || 0) + minutes;
      });
    });

    const averages = {};
    Object.entries(weeklyTotals).forEach(([tag, total]) => {
      averages[tag] = Math.round(total / 7);
    });

    return averages;
  };

  const exportData = () => {
    const csv = [
      ['Date', 'Start', 'End', 'Duration (min)', 'Description', 'Tag'],
      ...entries.map(entry => [
        entry.date,
        entry.start,
        entry.end,
        entry.duration,
        entry.description,
        entry.tag
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

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target.result;
      const lines = csv.split('\n').slice(1); // Skip header
      const importedEntries = lines
        .filter(line => line.trim())
        .map((line, index) => {
          const [date, start, end, duration, description, tag] = line.split(',');
          return {
            id: Date.now() + index,
            date: date?.trim(),
            start: start?.trim(),
            end: end?.trim(),
            duration: parseInt(duration?.trim()) || 0,
            description: description?.trim() || '',
            tag: tag?.trim() || 'Unproductive'
          };
        });

      setEntries(prev => [...prev, ...importedEntries]);
    };
    reader.readAsText(file);
  };

  const todayEntries = getEntriesForDate(selectedDate);
  const todayTotals = getTotalsByTag(selectedDate);
  const weeklyAverages = getWeeklyAverages();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">The Time Tracker</h1>
          <p className="text-blue-200"> To finally uncover where all your time goes</p>
        </div>

        {/* Current Activity Banner */}
        {isTracking && (
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="animate-pulse bg-red-500 rounded-full w-3 h-3"></div>
              <span className="text-white font-semibold">
                Tracking: {currentActivity?.description} ({currentActivity?.tag})
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
                <label className="block text-blue-200 mb-2">Tag</label>
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  <option value="">Select a tag</option>
                  {tags.map(tagOption => (
                    <option key={tagOption} value={tagOption} className="bg-gray-800">
                      {tagOption}
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
                {Object.entries(todayTotals).map(([tag, minutes]) => (
                  <div key={tag} className="flex justify-between text-white">
                    <span className="capitalize">{tag}</span>
                    <span className="font-mono">{formatTime(minutes)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">7-Day Average</h3>
              <div className="space-y-2">
                {Object.entries(weeklyAverages).map(([tag, minutes]) => (
                  <div key={tag} className="flex justify-between text-blue-200">
                    <span className="capitalize">{tag}</span>
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
              {todayEntries.map(entry => (
                <div
                  key={entry.id}
                  className="bg-white/5 rounded-lg p-4 flex items-center justify-between hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-white font-mono">
                      {entry.start} - {entry.end}
                    </div>
                    <div className="text-blue-200">
                      {entry.description}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      entry.tag === 'Productive' ? 'bg-green-500/20 text-green-300' :
                      entry.tag === 'Sleep' ? 'bg-purple-500/20 text-purple-300' :
                      entry.tag === 'Self-Care' ? 'bg-blue-500/20 text-blue-300' :
                      entry.tag === 'Social' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {entry.tag}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-mono">
                      {formatTime(entry.duration)}
                    </span>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeTracker;