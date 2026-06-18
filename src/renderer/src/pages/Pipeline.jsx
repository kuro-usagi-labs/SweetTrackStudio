import React, { useState, useEffect } from 'react';
import { Calendar, Paperclip, MoreVertical, Plus, X, ChevronLeft, Save, FileText, Printer, RefreshCw } from 'lucide-react';
import { useDialog } from '../components/DialogContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';

const KanbanColumn = ({ title, count, children }) => {
  return (
    <div className="flex-shrink-0 w-80 flex flex-col h-full">
      <div className={`py-4 flex justify-between items-center mb-2`}>
        <h3 className="font-medium text-[15px] text-ink-900">{title}</h3>
        <span className="bg-surface border border-gray-200 text-xs px-2.5 py-1 rounded text-ink-500 font-medium flex items-center space-x-1">
          <span>{count}</span>
          <span className="text-[10px]">↑↓</span>
        </span>
      </div>
      <Droppable droppableId={title}>
        {(provided, snapshot) => (
          <div 
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="overflow-y-auto flex-1 custom-scrollbar pb-10 pt-2 px-1 -mx-1"
          >
            {children}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

const KanbanCard = ({ item, index, onMove, onClick, onDelete }) => {
  const inverted = item.priority === 'High';
  const attachments = (() => {
    try { return JSON.parse(item.attachments || '[]'); } catch(e) { return []; }
  })();

  return (
    <Draggable draggableId={item.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div 
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(item)} 
          style={{...provided.draggableProps.style}}
          className={`${inverted ? 'card-inverted' : 'card'} p-5 mb-4 cursor-pointer group ${snapshot.isDragging ? 'shadow-2xl z-50 ring-2 ring-ink-900 opacity-90' : ''}`}
        >
          <div className="flex justify-between items-start mb-3">
            <h4 className={`font-semibold text-sm ${inverted ? 'text-white' : 'text-ink-900'}`}>{item.title}</h4>
            <div className="relative group/menu">
               <button onClick={e => e.stopPropagation()} className={`${inverted ? 'text-gray-400 hover:text-white' : 'text-ink-300 hover:text-ink-900'}`}>
                 <MoreVertical size={16} />
               </button>
               <div className="absolute right-0 top-6 w-32 bg-surface border border-gray-200 shadow-lg rounded-xl opacity-0 group-hover/menu:opacity-100 pointer-events-none group-hover/menu:pointer-events-auto transition-opacity z-10 flex flex-col overflow-hidden">
                  <button onClick={(e) => { e.stopPropagation(); onClick(item); }} className="text-left px-4 py-2 text-xs font-bold text-ink-900 hover:bg-gray-50 border-b border-gray-100">
                     Edit Details
                  </button>
                  {['Research', 'Scripting', 'Production', 'Ready'].map(s => (
                     item.status !== s && (
                       <button key={s} onClick={(e) => { e.stopPropagation(); onMove(item.id, s); }} className="text-left px-4 py-2 text-xs font-medium text-ink-500 hover:bg-gray-50 hover:text-ink-900">
                         Move to {s}
                       </button>
                     )
                  ))}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                     <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="w-full text-left px-4 py-2 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-700">
                       Delete
                     </button>
                  </div>
               </div>
            </div>
          </div>
          
          <p className={`text-xs leading-relaxed mb-6 ${inverted ? 'text-gray-300' : 'text-ink-500'}`}>
            {item.topic_cluster} • {item.type}
          </p>

          <div className={`flex items-center justify-between text-[11px] font-medium ${inverted ? 'text-gray-400' : 'text-ink-500'}`}>
            <div className={`flex items-center space-x-1 border px-2 py-1 rounded ${inverted ? 'border-gray-700' : 'border-gray-200 bg-surface'}`}>
              <Calendar size={12} />
              <span>{item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : 'TBD'}</span>
            </div>
            {attachments.length > 0 && (
              <div className="flex items-center space-x-1">
                <Paperclip size={12} />
                <span>{attachments.length}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

const ItemDetailsModal = ({ item, onClose, onUpdate }) => {
  const { showToast } = useDialog();
  const [localItem, setLocalItem] = useState({ ...item });
  
  const attachments = (() => {
    try { return JSON.parse(localItem.attachments || '[]'); } catch(e) { return []; }
  })();

  const scriptBlocks = (() => {
    try { 
      const parsed = JSON.parse(localItem.script_blocks || '[]'); 
      return parsed.length > 0 ? parsed : [{ id: Date.now(), a_roll: '', b_roll: '' }];
    } catch(e) { return [{ id: Date.now(), a_roll: '', b_roll: '' }]; }
  })();

  const [blocks, setBlocks] = useState(scriptBlocks);

  useEffect(() => {
    setLocalItem(prev => ({ ...prev, script_blocks: JSON.stringify(blocks) }));
  }, [blocks]);

  const addBlock = (index) => {
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, { id: Date.now() + Math.random(), a_roll: '', b_roll: '' });
    setBlocks(newBlocks);
  };

  const updateBlock = (id, field, value) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const removeBlock = (id) => {
    if (blocks.length <= 1) return;
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const handleAttachFiles = (e) => {
    const files = Array.from(e.target.files).map(f => f.path).filter(Boolean);
    if (files.length > 0) {
      setLocalItem({ ...localItem, attachments: JSON.stringify([...attachments, ...files]) });
    }
    e.target.value = '';
  };

  const removeAttachment = (pathToRemove) => {
    setLocalItem({ ...localItem, attachments: JSON.stringify(attachments.filter(p => p !== pathToRemove)) });
  };

  const openAttachment = async (path) => {
    try {
      await window.api.openFile(path);
    } catch (e) {
      showToast("Failed to open file. It may have been moved or deleted.\nPath: " + path, "error");
    }
  };

  const [saveStatus, setSaveStatus] = useState('Saved');

  useEffect(() => {
    setSaveStatus('Saving...');
    const timer = setTimeout(() => {
      onUpdate(localItem, false).then(() => {
        setSaveStatus('Saved');
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [localItem]);

  const handleSaveAndClose = () => {
    onUpdate(localItem, true);
  };

  const handlePrint = () => {
    window.print();
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const handleSync = async () => {
    if (!localItem.youtube_id) {
      showToast('Please enter a YouTube Video ID first', 'error');
      return;
    }
    setIsSyncing(true);
    try {
      const data = await window.api.syncYoutubeVideo({ id: localItem.id, youtube_id: localItem.youtube_id });
      setLocalItem(prev => ({ ...prev, kpi_views: data.kpi_views, kpi_ctr: data.kpi_ctr, kpi_retention: data.kpi_retention }));
      showToast('YouTube metrics synced successfully!', 'success');
    } catch(e) {
      showToast('Failed to sync: ' + e.message, 'error');
    }
    setIsSyncing(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-[100] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="h-16 shrink-0 bg-surface border-b border-gray-200 px-6 flex justify-between items-center shadow-[0_1px_3px_rgba(0,0,0,0.02)] z-10">
         <div className="flex items-center space-x-4">
           <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-ink-500 hover:text-ink-900"><ChevronLeft size={20} /></button>
           <h2 className="text-lg font-bold text-ink-900 tracking-tight truncate max-w-md">{localItem.title || 'Untitled Video'}</h2>
           <span className="px-2.5 py-1 bg-gray-100 text-[10px] uppercase tracking-wider font-bold text-ink-500 rounded">{localItem.status}</span>
         </div>
         <div className="flex items-center space-x-4">
           <div className="flex items-center space-x-2 text-xs font-medium text-ink-400">
             {saveStatus === 'Saving...' && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>}
             {saveStatus === 'Saved' && <span className="w-2 h-2 rounded-full bg-green-400"></span>}
             <span>{saveStatus}</span>
           </div>
           <button onClick={handleSaveAndClose} className="btn-primary text-sm px-5 py-2 rounded-xl bg-ink-900 hover:bg-ink-500 shadow-sm flex items-center space-x-2">
              <Save size={16} /> <span>Close Editor</span>
           </button>
         </div>
      </div>
      
      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden">
         {/* Left Panel: Metadata (30%) */}
         <div className="w-[30%] min-w-[320px] max-w-[400px] bg-surface border-r border-gray-200 overflow-y-auto custom-scrollbar p-8">
            <h3 className="text-[11px] font-bold text-ink-400 uppercase tracking-widest mb-6 pb-2 border-b border-gray-100">Project Strategy</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-ink-900 uppercase tracking-wider mb-2">Video Title</label>
                <input type="text" value={localItem.title} onChange={e => setLocalItem({...localItem, title: e.target.value})} className="input-field bg-gray-50 border-gray-200 font-semibold" placeholder="Title..." />
              </div>
              
              <div>
                 <label className="block text-[11px] font-bold text-ink-900 uppercase tracking-wider mb-2">Hook (First 5 Seconds)</label>
                 <textarea rows="3" value={localItem.hook || ''} onChange={e => setLocalItem({...localItem, hook: e.target.value})} className="input-field bg-gray-50 border-gray-200 resize-none text-sm leading-relaxed" placeholder="Write a killer hook..." />
              </div>
              
              <div>
                 <label className="block text-[11px] font-bold text-ink-900 uppercase tracking-wider mb-2">Thumbnail Concept</label>
                 <textarea rows="2" value={localItem.thumbnail_text || ''} onChange={e => setLocalItem({...localItem, thumbnail_text: e.target.value})} className="input-field bg-gray-50 border-gray-200 resize-none text-sm leading-relaxed" placeholder="Visual idea..." />
              </div>
              
              {/* YouTube Integration (Only for Ready or Published) */}
              {(localItem.status === 'Ready' || localItem.status === 'Published') && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[11px] font-bold text-red-500 uppercase tracking-wider">YouTube Data Sync</label>
                  </div>
                  <div className="flex space-x-2 mb-3">
                    <input 
                      type="text" 
                      value={localItem.youtube_id || ''} 
                      onChange={e => setLocalItem({...localItem, youtube_id: e.target.value})} 
                      className="input-field bg-gray-50 border-gray-200 flex-1 text-sm font-mono" 
                      placeholder="Video ID (e.g. dQw4w9WgXcQ)" 
                    />
                    <button 
                      onClick={handleSync} 
                      disabled={isSyncing}
                      className="bg-red-50 hover:bg-red-100 text-red-600 px-3 rounded-xl transition-colors disabled:opacity-50"
                      title="Sync YouTube Data"
                    >
                      <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                    </button>
                  </div>
                  {(localItem.kpi_views > 0 || localItem.kpi_ctr > 0) && (
                    <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <div>
                        <div className="text-[10px] text-ink-500 uppercase font-bold">Views</div>
                        <div className="text-sm font-bold text-ink-900">{localItem.kpi_views.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-ink-500 uppercase font-bold">CTR</div>
                        <div className="text-sm font-bold text-ink-900">{localItem.kpi_ctr}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-ink-500 uppercase font-bold">Retention</div>
                        <div className="text-sm font-bold text-ink-900">{localItem.kpi_retention}%</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Attachments Section */}
              <div className="pt-4 border-t border-gray-100">
                 <div className="flex justify-between items-center mb-4">
                   <label className="block text-[11px] font-bold text-ink-900 uppercase tracking-wider">Project Files</label>
                   <label className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-gray-100 hover:bg-gray-200 text-ink-500 rounded cursor-pointer transition-colors flex items-center space-x-1">
                     <Paperclip size={10} /><span>Attach</span>
                     <input type="file" multiple onChange={handleAttachFiles} className="hidden" />
                   </label>
                 </div>
                 
                 <div className="space-y-2">
                    {attachments.length === 0 ? (
                      <div className="p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-center text-xs text-ink-400 font-medium">
                        No files attached.
                      </div>
                    ) : (
                      attachments.map((path, idx) => {
                        const filename = path.split('\\').pop().split('/').pop();
                        return (
                          <div key={idx} className="flex justify-between items-center p-2.5 bg-gray-50 border border-gray-200 rounded-xl group hover:border-ink-300 transition-colors">
                            <button onClick={() => openAttachment(path)} className="flex items-center space-x-3 text-xs text-ink-900 font-medium flex-1 text-left truncate">
                              <div className="p-1 bg-surface border border-gray-200 rounded-md shrink-0 text-ink-500"><Paperclip size={12} /></div>
                              <span className="truncate hover:underline">{filename}</span>
                            </button>
                            <button onClick={() => removeAttachment(path)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 transition-all shrink-0 ml-2">
                              <X size={14} />
                            </button>
                          </div>
                        )
                      })
                    )}
                 </div>
              </div>
            </div>
         </div>
         
         {/* Right Panel: Script Editor (70%) */}
         <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50 pb-20">
            <div className="max-w-4xl mx-auto py-10 pl-16 pr-8">
               <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-4 sticky top-0 bg-gray-50/90 backdrop-blur-md z-10 -mt-10 pt-10">
                 <h2 className="text-xl font-bold text-ink-900 tracking-tight flex items-center">
                   <FileText size={20} className="mr-2 text-ink-500" /> Script Editor
                   <button onClick={handlePrint} className="ml-4 flex items-center space-x-1.5 text-xs font-bold bg-surface border border-gray-200 px-3 py-1.5 rounded-lg text-ink-500 hover:text-ink-900 hover:border-ink-300 transition-colors shadow-sm no-print">
                     <Printer size={14} /> <span>Print</span>
                   </button>
                 </h2>
                 <div className="flex items-center space-x-4 w-2/3">
                   <div className="w-1/2 text-xs font-bold text-ink-500 uppercase tracking-widest pl-4 border-l-4 border-ink-900">A-Roll (Audio)</div>
                   <div className="w-1/2 text-xs font-bold text-ink-500 uppercase tracking-widest pl-4 border-l-4 border-blue-500">B-Roll (Visuals)</div>
                 </div>
               </div>
               
               <div className="space-y-6">
                 {blocks.map((block, index) => (
                   <div key={block.id} className="group relative flex space-x-4 items-start">
                     {/* Line Controls */}
                     <div className="absolute -left-10 top-0 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity bg-surface border border-gray-200 rounded-lg shadow-sm overflow-hidden py-1">
                        <span className="text-[9px] font-bold text-gray-400 px-2 pb-1 border-b border-gray-100">{index + 1}</span>
                        <button onClick={() => addBlock(index)} className="p-1.5 text-gray-400 hover:text-ink-900 hover:bg-gray-50"><Plus size={12} /></button>
                        <button onClick={() => removeBlock(block.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-50"><X size={12} /></button>
                     </div>
                     
                     <div className="flex-1 grid grid-cols-2 gap-6">
                        <textarea 
                          value={block.a_roll} 
                          onChange={(e) => updateBlock(block.id, 'a_roll', e.target.value)}
                          placeholder="What you'll say..."
                          className="w-full bg-surface border border-gray-200 rounded-xl p-5 text-[15px] text-ink-900 focus:ring-2 focus:ring-ink-900 focus:border-transparent outline-none min-h-[120px] leading-relaxed shadow-sm transition-shadow hover:shadow-md resize-y"
                        />
                        <textarea 
                          value={block.b_roll} 
                          onChange={(e) => updateBlock(block.id, 'b_roll', e.target.value)}
                          placeholder="What the viewer sees (b-roll, text, SFX)..."
                          className="w-full bg-blue-50/30 border border-blue-100 rounded-xl p-5 text-[14px] text-ink-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[120px] leading-relaxed shadow-sm transition-shadow hover:shadow-md resize-y"
                        />
                     </div>
                   </div>
                 ))}
                 
                 <div className="pt-6">
                   <button onClick={() => addBlock(blocks.length - 1)} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-ink-400 font-bold text-sm uppercase tracking-wider hover:border-ink-900 hover:text-ink-900 transition-colors flex justify-center items-center hover:bg-gray-50">
                     <Plus size={16} className="mr-2" /> Add Script Block
                   </button>
                 </div>
               </div>
            </div>
         </div>
      </div>
      
      {/* Hidden Print Container */}
      <div id="script-print-container" className="no-print">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{localItem.title || 'Untitled Video'}</h1>
          <p style={{ color: '#666' }}>{localItem.topic_cluster} • {localItem.type}</p>
        </div>
        
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '50%' }}>A-Roll (Audio)</th>
              <th style={{ width: '50%' }}>B-Roll (Visuals)</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block, index) => (
              <tr key={block.id}>
                <td style={{ whiteSpace: 'pre-wrap' }}>{block.a_roll}</td>
                <td style={{ whiteSpace: 'pre-wrap', color: '#555' }}>{block.b_roll}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


export default function Pipeline() {
  const { showConfirm, showToast } = useDialog();
  const [items, setItems] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', type: 'Actionable Advice', priority: 'Medium', cluster: '' });
  const [selectedItem, setSelectedItem] = useState(null);

  const loadPipeline = () => {
    if (window.api && window.api.getPipeline) {
      window.api.getPipeline().then(setItems).catch(() => {});
    }
  };

  useEffect(() => {
    loadPipeline();
  }, []);

  const moveItem = async (id, newStatus) => {
    if (window.api) {
       await window.api.updatePipelineStatus({ id, status: newStatus });
       loadPipeline();
    }
  };

  const handleUpdateItem = async (updatedItem, close = true) => {
    try {
      if (window.api) {
         await window.api.updatePipelineItem(updatedItem);
         if (close) {
           setSelectedItem(null);
         }
         loadPipeline();
      }
    } catch (e) {
      
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('Delete Video?', 'Are you sure you want to permanently delete this video from the pipeline?', true);
    if (confirmed && window.api) {
       try {
         await window.api.deletePipelineItem(id);
         showToast('Video deleted', 'success');
         loadPipeline();
       } catch (err) {
         showToast('Failed to delete video', 'error');
       }
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (window.api) {
       await window.api.addPipelineItem({
          title: newItem.title,
          type: newItem.type,
          status: 'Research',
          priority: newItem.priority,
          topic_cluster: newItem.cluster
       });
       setIsAdding(false);
       setNewItem({ title: '', type: 'Actionable Advice', priority: 'Medium', cluster: '' });
       loadPipeline();
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    const id = parseInt(draggableId, 10);
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
       return; // No movement
    }

    const newItems = Array.from(items);
    const movedItemIndex = newItems.findIndex(i => i.id === id);
    const movedItem = newItems[movedItemIndex];
    
    if (source.droppableId !== destination.droppableId) {
       movedItem.status = destination.droppableId;
       if (window.api) window.api.updatePipelineStatus({ id, status: destination.droppableId });
    }

    newItems.splice(movedItemIndex, 1);

    const destColItems = newItems.filter(i => i.status === destination.droppableId);
    
    if (destination.index >= destColItems.length) {
       const lastItem = destColItems[destColItems.length - 1];
       if (lastItem) {
          const lastGlobalIndex = newItems.findIndex(i => i.id === lastItem.id);
          newItems.splice(lastGlobalIndex + 1, 0, movedItem);
       } else {
          newItems.push(movedItem);
       }
    } else {
       const itemAtDest = destColItems[destination.index];
       const destGlobalIndex = newItems.findIndex(i => i.id === itemAtDest.id);
       newItems.splice(destGlobalIndex, 0, movedItem);
    }
    
    setItems(newItems);

    if (window.api && window.api.reorderPipeline) {
       const orderedIds = newItems.map(i => i.id);
       await window.api.reorderPipeline(orderedIds);
    }
  };

  const getCol = (statusName) => items.filter(i => i.status === statusName);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-end mb-6 px-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 mb-1 tracking-tight">Pipeline</h1>
          <p className="text-sm text-ink-500">Track videos through the production stages.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center space-x-2">
          <Plus size={16} /><span>Add Video</span>
        </button>
      </div>

      {selectedItem && (
        <ItemDetailsModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          onUpdate={handleUpdateItem} 
        />
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface p-8 flex flex-col rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
               <h2 className="text-lg font-bold text-ink-900">Direct Pipeline Entry</h2>
               <button onClick={() => setIsAdding(false)} className="text-ink-400 hover:text-ink-900 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
               <div>
                 <label className="block text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-2">Video Title</label>
                 <input type="text" required value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} className="input-field bg-gray-50 border-gray-200" placeholder="e.g. My Next Big Video" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-2">Topic Cluster</label>
                   <input type="text" required value={newItem.cluster} onChange={e => setNewItem({...newItem, cluster: e.target.value})} className="input-field bg-gray-50 border-gray-200" placeholder="e.g. Finance" />
                 </div>
                 <div>
                   <label className="block text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-2">Priority</label>
                   <select value={newItem.priority} onChange={e => setNewItem({...newItem, priority: e.target.value})} className="input-field bg-gray-50 border-gray-200">
                     <option>High</option>
                     <option>Medium</option>
                     <option>Low</option>
                   </select>
                 </div>
               </div>
               <div>
                   <label className="block text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-2">Content Pillar</label>
                   <select value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})} className="input-field bg-gray-50 border-gray-200">
                     <option>Actionable Advice</option>
                     <option>Education</option>
                     <option>Opinion/Story</option>
                     <option>Trend Jacking</option>
                   </select>
               </div>
               <div className="pt-2">
                 <button type="submit" className="w-full btn-primary bg-ink-900 hover:bg-ink-500 py-3 mt-4">Create in Research</button>
               </div>
            </form>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-6 -mx-4 px-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex space-x-6 min-w-max items-start h-full">
            {['Research', 'Scripting', 'Production', 'Ready'].map(col => {
              const colItems = getCol(col);
              return (
                <KanbanColumn key={col} title={col} count={colItems.length}>
                  {colItems.map((item, idx) => (
                    <KanbanCard key={item.id} item={item} index={idx} onMove={moveItem} onClick={setSelectedItem} onDelete={handleDelete} />
                  ))}
                  {colItems.length === 0 && (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl h-28 flex items-center justify-center text-xs font-bold text-ink-300 pointer-events-none select-none">
                      Drop items here
                    </div>
                  )}
                </KanbanColumn>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
