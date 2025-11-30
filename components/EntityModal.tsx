import React, { useState, useEffect } from 'react';
import { Entity } from '../types';
import { useStore } from '../hooks/useStore';
import { X, Link, Image as ImageIcon, Film, FileText, User, Edit2, Save, Trash2 } from 'lucide-react';

interface EntityModalProps {
  entityId: string | null;
  onClose: () => void;
}

const EntityModal: React.FC<EntityModalProps> = ({ entityId, onClose }) => {
  const { getEntity, entities, linkEntities, updateEntity, deleteEntity } = useStore();
  const [linkSearch, setLinkSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Local edit state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');

  // Sync state when entityId changes
  useEffect(() => {
      if (entityId) {
          const e = getEntity(entityId);
          if (e) {
              setEditTitle(e.title);
              setEditContent(e.content || '');
              setEditTags(e.tags.join(', '));
              setIsEditing(false);
          }
      }
  }, [entityId, getEntity]);

  if (!entityId) return null;
  const entity = getEntity(entityId);
  if (!entity) return null;

  const relatedEntities = entity.relatedIds.map(id => getEntity(id)).filter(Boolean) as Entity[];
  const potentialLinks = entities.filter(e => 
    e.id !== entity.id && 
    !entity.relatedIds.includes(e.id) && 
    e.title.toLowerCase().includes(linkSearch.toLowerCase())
  );

  const handleSave = () => {
      updateEntity(entity.id, {
          title: editTitle,
          content: editContent,
          tags: editTags.split(',').map(t => t.trim()).filter(Boolean)
      });
      setIsEditing(false);
  };

  const handleDelete = () => {
      if(confirm("Are you sure you want to delete this asset?")) {
          deleteEntity(entity.id);
          onClose();
      }
  };

  const getIcon = (type: string) => {
    switch (type) {
        case 'image': return <ImageIcon size={20} />;
        case 'video': return <Film size={20} />;
        case 'project': return <Link size={20} />;
        case 'character': return <User size={20} />;
        default: return <FileText size={20} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row">
        
        {/* Left Side: Content */}
        <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col">
           <div className="flex justify-between items-start mb-4">
             <div className="flex items-center gap-2 text-blue-400">
                {getIcon(entity.type)}
                <span className="uppercase text-xs font-bold tracking-wider">{entity.type}</span>
             </div>
             <div className="flex gap-2">
                 <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-green-600 text-white hover:bg-green-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                     {isEditing ? <Save size={18} /> : <Edit2 size={18} />}
                 </button>
                 {!isEditing && (
                     <button onClick={handleDelete} className="p-2 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors">
                        <Trash2 size={18} />
                     </button>
                 )}
                 <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                     <X size={18} />
                 </button>
             </div>
           </div>
           
           {isEditing ? (
               <input 
                 type="text" 
                 value={editTitle} 
                 onChange={e => setEditTitle(e.target.value)}
                 className="text-3xl font-bold text-white mb-4 bg-slate-900 border border-slate-600 rounded px-2 py-1 w-full focus:border-blue-500 outline-none"
               />
           ) : (
               <h2 className="text-3xl font-bold text-white mb-4">{entity.title}</h2>
           )}
           
           
           {entity.mediaUrl && (
               <div className="mb-6 rounded-lg overflow-hidden border border-slate-600 bg-black max-h-[400px] flex items-center justify-center">
                   {entity.type === 'video' ? (
                       <img src={entity.mediaUrl} alt="Video Thumbnail" className="max-h-full max-w-full opacity-80" />
                   ) : (
                       <img src={entity.mediaUrl} alt={entity.title} className="max-h-full max-w-full object-contain" />
                   )}
               </div>
           )}
           
           <div className="space-y-4 flex-1">
               <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                   <h3 className="text-sm font-semibold text-slate-400 mb-2">Content / Description</h3>
                   {isEditing ? (
                       <textarea 
                         value={editContent}
                         onChange={e => setEditContent(e.target.value)}
                         className="w-full h-32 bg-slate-800 text-slate-200 border border-slate-600 rounded p-2 text-sm focus:border-blue-500 outline-none"
                       />
                   ) : (
                       <p className="text-slate-200 whitespace-pre-wrap">{entity.content || <span className="italic text-slate-600">No content added.</span>}</p>
                   )}
               </div>
               
               <div>
                   <h3 className="text-sm font-semibold text-slate-400 mb-2">Tags</h3>
                   {isEditing ? (
                       <input 
                         type="text"
                         value={editTags}
                         onChange={e => setEditTags(e.target.value)}
                         placeholder="Comma separated tags..."
                         className="w-full bg-slate-800 text-slate-200 border border-slate-600 rounded p-2 text-sm focus:border-blue-500 outline-none"
                       />
                   ) : (
                       <div className="flex flex-wrap gap-2">
                           {entity.tags.map(tag => (
                               <span key={tag} className="px-3 py-1 bg-slate-700 rounded-full text-xs text-slate-300">#{tag}</span>
                           ))}
                           {entity.tags.length === 0 && <span className="text-slate-600 text-sm italic">No tags.</span>}
                       </div>
                   )}
               </div>

                {entity.metadata && !isEditing && (
                    <div className="bg-slate-900/50 p-4 rounded-lg text-sm text-slate-400 mt-auto">
                        <pre>{JSON.stringify(entity.metadata, null, 2)}</pre>
                    </div>
                )}
           </div>
        </div>

        {/* Right Side: Relationships */}
        <div className="w-full md:w-80 bg-slate-900/50 p-6 flex flex-col border-t md:border-t-0 border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Link size={18} /> Connections
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2 custom-scrollbar">
                {relatedEntities.length === 0 && <p className="text-slate-500 italic text-sm">No connections yet.</p>}
                {relatedEntities.map(rel => (
                    <div key={rel.id} className="group flex items-center gap-3 p-2 bg-slate-800 rounded border border-slate-700 hover:border-blue-500 transition-colors cursor-pointer relative">
                        <div className="text-slate-400">{getIcon(rel.type)}</div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-medium text-slate-200 truncate">{rel.title}</p>
                            <p className="text-xs text-slate-500 capitalize">{rel.type}</p>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); linkEntities(entity.id, rel.id); }} // toggle link (removes if exists)
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded transition-all"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="border-t border-slate-700 pt-4">
                <h4 className="text-sm font-bold text-slate-400 mb-2">Add Connection</h4>
                <input 
                    type="text" 
                    placeholder="Search to link..." 
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.target.value)}
                />
                <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                    {linkSearch && potentialLinks.map(target => (
                        <button 
                            key={target.id}
                            onClick={() => {
                                linkEntities(entity.id, target.id);
                                setLinkSearch('');
                            }}
                            className="w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 rounded flex justify-between items-center group"
                        >
                            <span className="truncate flex-1">{target.title}</span>
                            <span className="opacity-50 text-[10px] bg-slate-800 px-1 rounded ml-2">{target.type}</span>
                            <PlusIcon className="opacity-0 group-hover:opacity-100 ml-1 text-blue-400" size={12} />
                        </button>
                    ))}
                    {linkSearch && potentialLinks.length === 0 && (
                        <div className="text-xs text-slate-500 italic p-1">No matches found.</div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

const PlusIcon = ({size, className}: {size: number, className?: string}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

export default EntityModal;