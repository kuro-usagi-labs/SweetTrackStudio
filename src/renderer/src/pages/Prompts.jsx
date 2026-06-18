import React, { useState, useEffect } from 'react';
import { Copy, Check, Plus, X, Trash2 } from 'lucide-react';
import { useDialog } from '../components/DialogContext';

export default function Prompts() {
  const { showConfirm } = useDialog();
  const [prompts, setPrompts] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ title: '', category: 'Script Writing', content: '' });

  const loadPrompts = () => {
    if (window.api) {
      window.api.getPrompts().then(data => {
        // Provide some defaults if DB is completely empty for the first time
        if (data.length === 0) {
           const defaults = [
             { title: 'YouTube Script Hook Generator', category: 'Script Writing', content: 'I am creating a YouTube video about [TOPIC]. Generate 5 highly engaging, pattern-interrupting 15-second hooks that will guarantee a 70%+ retention rate.' },
             { title: 'Clickable Title Variations', category: 'Optimization', content: 'Generate 10 clickable, high-CTR YouTube titles about [TOPIC]. Keep them under 60 characters.' }
           ];
           defaults.forEach(d => window.api.addPrompt(d));
           setTimeout(loadPrompts, 500); // reload after defaults added
        } else {
           setPrompts(data);
        }
      }).catch(() => {});
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (window.api) {
      await window.api.addPrompt(newPrompt);
      setIsAdding(false);
      setNewPrompt({ title: '', category: 'Script Writing', content: '' });
      loadPrompts();
    }
  };

  const handleDelete = async (id) => {
    if (!window.api) return;
    const confirmed = await showConfirm('Delete Prompt?', 'Delete this prompt template?', true);
    if (confirmed) {
      await window.api.deletePrompt(id);
      loadPrompts();
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col pb-10">
      <div className="flex justify-between items-end mb-8 px-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 mb-1 tracking-tight">Prompt Library</h1>
          <p className="text-sm text-ink-500">Reusable AI templates to accelerate production.</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className="btn-primary flex items-center space-x-2">
          <Plus size={16} /><span>New Template</span>
        </button>
      </div>

      {isAdding && (
        <div className="card p-6 mb-8 bg-gray-50 border-gray-200">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wider">Create Template</h2>
             <button onClick={() => setIsAdding(false)} className="text-ink-300 hover:text-ink-900"><X size={18} /></button>
          </div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">Template Title</label>
                 <input type="text" required value={newPrompt.title} onChange={e => setNewPrompt({...newPrompt, title: e.target.value})} className="input-field bg-surface" placeholder="e.g. Viral Hook Generator" />
               </div>
               <div>
                 <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">Category</label>
                 <select value={newPrompt.category} onChange={e => setNewPrompt({...newPrompt, category: e.target.value})} className="input-field bg-surface">
                   <option>Script Writing</option>
                   <option>Production</option>
                   <option>Optimization</option>
                   <option>Repurposing</option>
                 </select>
               </div>
            </div>
            <div>
               <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">Prompt Content</label>
               <textarea required rows={4} value={newPrompt.content} onChange={e => setNewPrompt({...newPrompt, content: e.target.value})} className="input-field bg-surface custom-scrollbar resize-none" placeholder="Write your AI prompt here... Use [BRACKETS] for variables."></textarea>
            </div>
            <button type="submit" className="btn-primary">Save Template</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 content-start px-1">
        {prompts.map((prompt, i) => (
          <div key={prompt.id} className="card p-6 flex flex-col bg-surface group hover:border-gray-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-gray-100 text-ink-500 rounded">
                {prompt.category}
              </span>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleDelete(prompt.id)}
                  className="text-ink-300 hover:text-red-500 p-1 transition-colors md:opacity-0 md:group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  onClick={() => copyToClipboard(prompt.content, i)}
                  className="text-ink-300 hover:text-ink-900 p-1 transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedIndex === i ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-ink-900 mb-3">{prompt.title}</h3>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-[13px] text-ink-500 leading-relaxed font-mono flex-1 whitespace-pre-wrap">
              {prompt.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
