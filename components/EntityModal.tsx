import React, { useState } from 'react';
import { Entity } from '../types';
import { useStore } from '../hooks/useStore';
import { X, Link, Image as ImageIcon, Film, FileText, User } from 'lucide-react';

interface EntityModalProps {
  entityId: string | null;
  onClose: () => void;
}

const EntityModal: React.FC<EntityModalProps> = ({ entityId, onClose }) => {
  const { getEntity, entities, linkEntities } = useStore();
  const [linkSearch, setLinkSearch] = useState('');

  if (!entityId) return null;
  const entity = getEntity(entityId);
  if (!entity) return null;

  const relatedEntities = entity.relatedIds.map(id => getEntity(id)).filter(Boolean) as Entity[];
  const potentialLinks = entities.filter(e => 
    e.id !== entity.id && 
    !entity.relatedIds.includes(e.id) && 
    e.title.toLowerCase().includes(linkSearch.toLowerCase())
  );

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
        <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-700">
           <div className="flex justify-between items-start mb-4">
             <div className="flex items-center gap-2 text-blue-400">
                {getIcon(entity.type)}
                <span className="uppercase text-xs font-bold tracking-wider">{entity.type}</span>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
           </div>
           
           <h2 className="text-3xl font-bold text-white mb-4">{entity.title}</h2>
           
           {entity.mediaUrl && (
               <div className="mb-6 rounded-lg overflow-hidden border border-slate-600 bg-black">
                   {entity.type === 'video' ? (
                       <img src={entity.mediaUrl} alt="Video Thumbnail" className="w-full h-auto opacity-80" />
                   ) : (
                       <img src={entity.mediaUrl} alt={entity.title} className="w-full h-auto" />
                   )}
               </div>
           )}
           
           <div className="space-y-4">
               {entity.content && (
                   <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                       <h3 className="text-sm font-semibold text-slate-400 mb-2">Content / Prompt</h3>
                       <p className="text-slate-200 whitespace-pre-wrap">{entity.content}</p>
                   </div>
               )}
               
               <div className="flex flex-wrap gap-2">
                   {entity.tags.map(tag => (
                       <span key={tag} className="px-3 py-1 bg-slate-700 rounded-full text-xs text-slate-300">#{tag}</span>
                   ))}
               </div>

                {entity.metadata && (
                    <div className="bg-slate-900/50 p-4 rounded-lg text-sm text-slate-400">
                        <pre>{JSON.stringify(entity.metadata, null, 2)}</pre>
                    </div>
                )}
           </div>
        </div>

        {/* Right Side: Relationships */}
        <div className="w-full md:w-80 bg-slate-900/50 p-6 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Link size={18} /> Connections
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 mb-6">
                {relatedEntities.length === 0 && <p className="text-slate-500 italic">No connections yet.</p>}
                {relatedEntities.map(rel => (
                    <div key={rel.id} className="flex items-center gap-3 p-2 bg-slate-800 rounded border border-slate-700 hover:border-blue-500 transition-colors cursor-pointer">
                        <div className="text-slate-400">{getIcon(rel.type)}</div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-slate-200 truncate">{rel.title}</p>
                            <p className="text-xs text-slate-500 capitalize">{rel.type}</p>
                        </div>
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
                <div className="max-h-32 overflow-y-auto space-y-1">
                    {linkSearch && potentialLinks.map(target => (
                        <button 
                            key={target.id}
                            onClick={() => {
                                linkEntities(entity.id, target.id);
                                setLinkSearch('');
                            }}
                            className="w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 rounded flex justify-between"
                        >
                            <span className="truncate">{target.title}</span>
                            <span className="opacity-50 ml-2">{target.type}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default EntityModal;
