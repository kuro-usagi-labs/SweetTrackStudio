import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, Info, Trash2 } from 'lucide-react';

const DialogContext = createContext();

export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const toastIdRef = useRef(0);

  // showToast({ title, message, type: 'success' | 'error' | 'info' | 'warning', duration = 3000 })
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // showConfirm('Title', 'Message') returns a Promise that resolves to true or false
  const showConfirm = useCallback((title, message, isDestructive = false) => {
    return new Promise((resolve) => {
      setConfirmState({
        title,
        message,
        isDestructive,
        onConfirm: () => {
          setConfirmState(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(null);
          resolve(false);
        }
      });
    });
  }, []);

  return (
    <DialogContext.Provider value={{ showToast, showConfirm }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`pointer-events-auto flex items-center p-4 rounded-xl shadow-lg max-w-sm w-full animate-in slide-in-from-right-8 fade-in duration-300 ${
              toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-900' :
              toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-900' :
              toast.type === 'warning' ? 'bg-orange-50 border border-orange-200 text-orange-900' :
              'bg-surface border border-gray-200 text-ink-900'
            }`}
          >
            <div className="shrink-0 mr-3">
              {toast.type === 'success' && <CheckCircle className="text-green-500" size={20} />}
              {toast.type === 'error' && <AlertTriangle className="text-red-500" size={20} />}
              {toast.type === 'warning' && <AlertTriangle className="text-orange-500" size={20} />}
              {toast.type === 'info' && <Info className="text-blue-500" size={20} />}
            </div>
            <div className="flex-1 text-sm font-medium leading-relaxed pr-2">
              {toast.message}
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={confirmState.onCancel}></div>
          <div className="relative bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-ink-900 mb-2">{confirmState.title}</h3>
            <p className="text-sm text-ink-500 mb-8 leading-relaxed">
              {confirmState.message}
            </p>
            <div className="flex items-center space-x-3 justify-end">
              <button 
                onClick={confirmState.onCancel}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmState.onConfirm}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center ${
                  confirmState.isDestructive 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-ink-900 text-white hover:bg-ink-700'
                }`}
              >
                {confirmState.isDestructive && <Trash2 size={16} className="mr-2" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};
