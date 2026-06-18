import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, X } from 'lucide-react';
import { useDialog } from '../components/DialogContext';
import { GlobalContext } from '../App';

export default function IdeaBank() {
  const { showToast, showConfirm } = useDialog();
  const [ideas, setIdeas] = useState([]);
  const { searchQuery } = React.useContext(GlobalContext);
  const [filterPillar, setFilterPillar] = useState('All Pillars');
  const [isAdding, setIsAdding] = useState(false);
  const [newIdea, setNewIdea] = useState({
    title: '', cluster: 'Investing Basics', pillar: 'Actionable Advice', search_score: 50, browse_score: 50, cpm_score: 50
  });

  const loadIdeas = () => {
    if (window.api) {
      window.api.getIdeas().then(data => {
        // Map the DB fields to the format used in UI
        const formatted = data.map(d => ({
           id: d.id,
           title: d.title,
           cluster: d.topic_cluster,
           pillar: d.content_pillar,
           total_score: d.search_score + d.browse_score + d.cpm_score
        }));
        setIdeas(formatted);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    loadIdeas();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (window.api) {
      await window.api.addIdea({
         title: newIdea.title,
         topic_cluster: newIdea.cluster,
         content_pillar: newIdea.pillar,
         search_score: parseInt(newIdea.search_score),
         browse_score: parseInt(newIdea.browse_score),
         cpm_score: parseInt(newIdea.cpm_score)
      });
      setIsAdding(false);
      setNewIdea({title: '', cluster: 'Investing Basics', pillar: 'Actionable Advice', search_score: 50, browse_score: 50, cpm_score: 50});
      loadIdeas();
    }
  };

  const handleDelete = async (id) => {
    if (!window.api) return;
    const confirmed = await showConfirm('Delete Idea?', 'Are you sure you want to delete this idea?', true);
    if (confirmed) {
      await window.api.deleteIdea(id);
      loadIdeas();
    }
  };

  const moveToPipeline = async (idea) => {
    if (window.api) {
       await window.api.addPipelineItem({
          title: idea.title,
          type: idea.pillar,
          status: 'Research',
          priority: idea.total_score > 200 ? 'High' : 'Medium',
          topic_cluster: idea.cluster
       });
       await window.api.deleteIdea(idea.id);
       loadIdeas();
       showToast('Moved to Pipeline!', 'success');
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col pb-10 relative">
      <div className="flex justify-between items-end mb-8 px-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 mb-1 tracking-tight">Idea Bank</h1>
          <p className="text-sm text-ink-500">Repository of video concepts ranked by potential.</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className="btn-primary flex items-center space-x-2">
          <Plus size={16} /><span>Add Idea</span>
        </button>
      </div>

      <div className="card flex flex-col relative overflow-hidden">
        {/* Add Modal Overlay */}
        {isAdding && (
          <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                 <h2 className="text-lg font-bold text-ink-900">Add New Concept</h2>
                 <button onClick={() => setIsAdding(false)} className="text-ink-400 hover:text-ink-900 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-4 w-full">
                 <div>
                   <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">Video Title/Concept</label>
                   <input type="text" required value={newIdea.title} onChange={e => setNewIdea({...newIdea, title: e.target.value})} className="input-field bg-gray-50" placeholder="e.g. How to Budget on $50k" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">Topic Cluster</label>
                     <input type="text" required value={newIdea.cluster} onChange={e => setNewIdea({...newIdea, cluster: e.target.value})} className="input-field bg-gray-50" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">Content Pillar</label>
                     <select value={newIdea.pillar} onChange={e => setNewIdea({...newIdea, pillar: e.target.value})} className="input-field bg-gray-50">
                       <option>Actionable Advice</option>
                       <option>Education</option>
                       <option>Opinion/Story</option>
                       <option>Trend Jacking</option>
                     </select>
                   </div>
                 </div>
                 <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4 mt-4">
                   <div>
                     <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">Search Pot. (0-100)</label>
                     <input type="number" min="0" max="100" required value={newIdea.search_score} onChange={e => setNewIdea({...newIdea, search_score: e.target.value})} className="input-field bg-gray-50" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">Browse Pot. (0-100)</label>
                     <input type="number" min="0" max="100" required value={newIdea.browse_score} onChange={e => setNewIdea({...newIdea, browse_score: e.target.value})} className="input-field bg-gray-50" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">CPM Value (0-100)</label>
                     <input type="number" min="0" max="100" required value={newIdea.cpm_score} onChange={e => setNewIdea({...newIdea, cpm_score: e.target.value})} className="input-field bg-gray-50" />
                   </div>
                 </div>
                 <div className="flex justify-end space-x-3 pt-6">
                    <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-gray-100 transition-colors">Cancel</button>
                    <button type="submit" className="btn-primary bg-ink-900 px-6">Save Idea to Bank</button>
                 </div>
              </form>
            </div>
          </div>
        )}

        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-300" size={16} />
            <select value={filterPillar} onChange={(e) => setFilterPillar(e.target.value)} className="input-field bg-surface text-sm">
  <option value="All Pillars">All Pillars</option>
  <option value="Evergreen">Evergreen</option>
  <option value="Trending">Trending</option>
  <option value="Vlog">Vlog</option>
</select>
          </div>
          <button className="btn-secondary flex items-center space-x-2">
            <Filter size={16} /><span>Filters</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface sticky top-0 z-10 border-b border-gray-200 shadow-sm">
              <tr>
                <th className="py-4 px-6 text-[11px] font-bold text-ink-500 uppercase tracking-wider">Video Title</th>
                <th className="py-4 px-6 text-[11px] font-bold text-ink-500 uppercase tracking-wider">Category</th>
                <th className="py-4 px-6 text-[11px] font-bold text-ink-500 uppercase tracking-wider text-center">Total Score</th>
                <th className="py-4 px-6 text-[11px] font-bold text-ink-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-surface">
              {ideas.length === 0 ? (
                 <tr>
                   <td colSpan="4" className="py-10 text-center text-ink-500 text-sm">No ideas saved yet. Click "Add Idea" to start brainstorming.</td>
                 </tr>
              ) : ideas.map(idea => (
                <tr key={idea.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="font-semibold text-sm text-ink-900">{idea.title}</div>
                    <div className="text-[11px] text-ink-500 mt-1">{idea.pillar}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="bg-gray-100 text-ink-500 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide">
                      {idea.cluster}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-ink-900 font-bold text-sm border border-gray-200">
                      {idea.total_score}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end space-x-2 transition-opacity">
                      <button onClick={() => moveToPipeline(idea)} className="text-xs font-bold btn-primary px-3 py-1.5 rounded-lg shadow-sm">
                        Push to Pipeline
                      </button>
                      <button onClick={() => handleDelete(idea.id)} className="text-ink-300 hover:text-red-500 p-1.5 bg-gray-100 rounded-lg hover:bg-red-50 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
