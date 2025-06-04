import React from 'react';
import { AuthProvider, ProtectedRoute } from './components/AuthWrapper.jsx';
import TimeTracker from './components/TimeTracker.jsx'; // Adjust path as needed

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <ProtectedRoute>
          <TimeTracker />
        </ProtectedRoute>
      </div>
    </AuthProvider>
  );
}

export default App;