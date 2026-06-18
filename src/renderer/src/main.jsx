import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './components/AuthProvider'
import { api } from './lib/api'
import './index.css'

// Inject Supabase API layer globally to replace Electron's IPC
window.api = api;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("REACT CRASH:", error.stack || error.message);
    console.error("COMPONENT STACK:", errorInfo.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{padding: 20, color: 'red'}}><h1>Something went wrong.</h1><pre>{this.state.error?.message}</pre></div>;
    }
    return this.props.children;
  }
}

console.log("REACT IS STARTING TO RENDER");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
