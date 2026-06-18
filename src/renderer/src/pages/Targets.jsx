import React, { useState, useEffect } from 'react';
import { Target, CheckCircle, CheckSquare, Square, Plus, X, Trash2 } from 'lucide-react';
import { useDialog } from '../components/DialogContext';

export default function Targets() {
  const { showToast, showConfirm } = useDialog();
  const [targets, setTargets] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '', has_number: 1, target_value: '', suffix: ''
  });

  const loadTargets = () => {
    if (window.api && window.api.getCustomTargets) {
      window.api.getCustomTargets().then(data => {
        setTargets(data || []);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    loadTargets();
  }, []);

  const toggleCompleted = async (target, e) => {
    e.stopPropagation(); // Prevent opening edit modal
    const updated = { ...target, is_completed: target.is_completed ? 0 : 1 };
    setTargets(targets.map(t => t.id === target.id ? updated : t));
    if (window.api && window.api.updateCustomTarget) {
      await window.api.updateCustomTarget(updated);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!window.api) return;
    try {
      const newTarget = {
        id: 'tgt_' + Date.now(),
        title: formData.title,
        has_number: formData.has_number,
        target_value: parseFloat(formData.target_value) || 0,
        suffix: formData.suffix,
        is_completed: 0
      };
      await window.api.addCustomTarget(newTarget);
      setIsAdding(false);
      setFormData({ title: '', has_number: 1, target_value: '', suffix: '' });
      loadTargets();
      showToast('Target created!', 'success');
    } catch (err) {
      showToast('Failed to create target: ' + err.message, 'error');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!window.api) return;
    try {
      const updatedTarget = {
        ...editingTarget,
        title: formData.title,
        has_number: formData.has_number,
        target_value: parseFloat(formData.target_value) || 0,
        suffix: formData.suffix
      };
      await window.api.updateCustomTarget(updatedTarget);
      setEditingTarget(null);
      loadTargets();
      showToast('Target updated!', 'success');
    } catch (err) {
      showToast('Failed to update target: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.api) return;
    const confirmed = await showConfirm('Delete Target?', 'Are you sure you want to delete this target?', true);
    if (confirmed) {
      try {
        await window.api.deleteCustomTarget(id);
        setEditingTarget(null);
        loadTargets();
        showToast('Target deleted!', 'success');
      } catch (err) {
        showToast('Failed to delete target: ' + err.message, 'error');
      }
    }
  };

  const openAddModal = () => {
    setFormData({ title: '', has_number: 1, target_value: '', suffix: '' });
    setIsAdding(true);
  };

  const openEditModal = (target) => {
    setFormData({
      title: target.title,
      has_number: target.has_number,
      target_value: target.target_value,
      suffix: target.suffix
    });
    setEditingTarget(target);
  };

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col pb-10 relative">
      <div className="flex justify-between items-end mb-8 px-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 mb-1 tracking-tight">Targets</h1>
          <p className="text-sm text-ink-500">Set and track the benchmarks for your growth.</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center space-x-2">
          <Plus size={16} /><span>Add Target</span>
        </button>
      </div>

      <div className="card p-4 md:p-10 relative bg-transparent md:bg-surface border-0 md:border">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {targets.map(target => {
            const isCompleted = target.is_completed === 1;
            return (
              <div 
                key={target.id} 
                onClick={() => openEditModal(target)}
                className={`p-6 rounded-2xl border transition-all relative overflow-hidden cursor-pointer group hover:shadow-md ${
                  isCompleted ? 'border-green-300 bg-green-50 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]' : 
                  'border-gray-200 hover:border-ink-300'
                }`}
              >
                {isCompleted && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-l-[40px] border-t-green-500 border-l-transparent pointer-events-none">
                    <CheckCircle className="absolute -top-[35px] -left-[18px] text-white" size={14} />
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={`p-2 rounded-xl transition-colors ${isCompleted ? 'bg-green-100/50 text-green-600' : 'bg-gray-50 text-ink-500 group-hover:bg-ink-50 group-hover:text-ink-600'}`}>
                    <Target size={20} />
                  </div>
                  <button 
                    onClick={(e) => toggleCompleted(target, e)}
                    className="text-ink-400 hover:text-ink-900 transition-colors p-1"
                  >
                    {isCompleted ? <CheckSquare size={20} className="text-green-600" /> : <Square size={20} />}
                  </button>
                </div>
                
                <div className="relative z-10">
                  <h3 className="text-sm font-bold text-ink-500 mb-1 leading-tight">{target.title}</h3>
                  {target.has_number === 1 ? (
                    <div className="flex items-baseline space-x-1">
                      <span className={`text-2xl font-black tracking-tight ${isCompleted ? 'text-green-700' : 'text-ink-900'}`}>
                        {target.target_value.toLocaleString()}
                      </span>
                      {target.suffix && <span className="text-xs font-bold text-ink-400 uppercase tracking-wider">{target.suffix}</span>}
                    </div>
                  ) : (
                    <div className="flex items-baseline h-8">
                       <span className={`text-sm font-bold tracking-tight ${isCompleted ? 'text-green-700' : 'text-ink-900'}`}>
                         {isCompleted ? 'Goal Reached!' : 'In Progress'}
                       </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {targets.length === 0 && (
            <div className="col-span-full py-10 flex flex-col items-center justify-center text-ink-400">
               <Target size={48} className="mb-4 opacity-20" />
               <p className="font-medium">No targets set yet.</p>
               <button onClick={openAddModal} className="text-sm text-blue-500 hover:underline mt-2 font-semibold">Create your first target</button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(isAdding || editingTarget) && (
        <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
           <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-ink-900">
                  {isAdding ? 'Add Custom Target' : 'Edit Target'}
                </h3>
                <button onClick={() => { setIsAdding(false); setEditingTarget(null); }} className="text-ink-400 hover:text-ink-900 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={isAdding ? handleAddSubmit : handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">Target Title</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="input-field bg-gray-50" 
                    placeholder="e.g. Total Subscribers" 
                  />
                </div>

                <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <input 
                    type="checkbox" 
                    id="hasNumber" 
                    checked={formData.has_number === 1}
                    onChange={e => setFormData({...formData, has_number: e.target.checked ? 1 : 0})}
                    className="w-4 h-4 rounded text-ink-900 focus:ring-ink-900 cursor-pointer"
                  />
                  <label htmlFor="hasNumber" className="text-sm font-semibold text-ink-900 cursor-pointer select-none">
                    Requires a number/value
                  </label>
                </div>

                {formData.has_number === 1 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">Target Value</label>
                      <input 
                        type="number" 
                        step="any"
                        required 
                        value={formData.target_value} 
                        onChange={e => setFormData({...formData, target_value: e.target.value})} 
                        className="input-field bg-gray-50" 
                        placeholder="e.g. 1000" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">Suffix / Unit <span className="text-gray-400 lowercase normal-case text-[10px]">(Optional)</span></label>
                      <input 
                        type="text" 
                        value={formData.suffix} 
                        onChange={e => setFormData({...formData, suffix: e.target.value})} 
                        className="input-field bg-gray-50" 
                        placeholder="e.g. subs, %, hrs" 
                      />
                    </div>
                  </div>
                )}

                <div className="pt-6 flex items-center justify-between">
                  {editingTarget ? (
                    <button 
                      type="button" 
                      onClick={() => handleDelete(editingTarget.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center text-sm font-semibold"
                    >
                      <Trash2 size={16} className="mr-1.5" /> Delete
                    </button>
                  ) : <div></div>}
                  
                  <div className="flex space-x-3">
                    <button 
                      type="button" 
                      onClick={() => { setIsAdding(false); setEditingTarget(null); }}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn-primary"
                    >
                      {isAdding ? 'Add Target' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
