import React, { useState } from 'react';
import { StoreProvider, useStore } from './hooks/useStore';
import { analyzeImageForTags, suggestConnections } from './services/geminiService';
import NetworkGraph from './components/NetworkGraph';
import EntityModal from './components/EntityModal';
import { 
  Search, Plus, Image as ImageIcon, Upload, Mic, Settings, 
  LayoutGrid, Network, Layers, Sparkles 
} from 'lucide-react';
import { Entity, EntityType } from './types';
import { v4 as uuidv4 } from 'uuid';

const MainLayout = () => {
  const { entities, addEntity, searchEntities, linkEntities } = useStore();
  const [view, setView] = useState<'grid' | 'graph' | 'projects'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filtered Data
  const filteredData = searchQuery ? searchEntities(searchQuery) : entities;
  
  // Group by Project for Project View
  const projects = entities.filter(e => e.type === 'project');

  // Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        // 1. Analyze with Gemini
        let analysis;
        try {
            analysis = await analyzeImageForTags(base64);
        } catch (err) {
            console.error(err);
            analysis = { title: file.name, tags: ['image'], description: '' };
        }

        const newId = uuidv4();
        
        // 2. Create Entity
        const newEntity: Entity = {
          id: newId,
          type: 'image',
          title: analysis.title || file.name,
          content: analysis.description,
          mediaUrl: base64, // In a real app, upload to storage and get URL
          tags: analysis.tags || [],
          createdAt: new Date().toISOString(),
          relatedIds: []
        };
        addEntity(newEntity);

        // 3. Auto-connect suggestions
        try {
            const allTitles = entities.map(e => e.title);
            const relatedTitles = await suggestConnections(newEntity.title, newEntity.content || '', allTitles);
            
            relatedTitles.forEach(title => {
                const target = entities.find(e => e.title === title);
                if (target) linkEntities(newId, target.id);
            });
        } catch(err) { console.error("Auto-link failed", err); }

      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert("Error processing image");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreatePrompt = () => {
      const title = prompt("Enter Prompt Title:");
      if(!title) return;
      const content = prompt("Enter Prompt Text:");
      if(!content) return;
      
      const newEntity: Entity = {
          id: uuidv4(),
          type: 'prompt',
          title,
          content,
          tags: ['manual'],
          createdAt: new Date().toISOString(),
          relatedIds: []
      };
      addEntity(newEntity);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col items-center md:items-stretch py-6 px-0 md:px-4 space-y-2">
        <div className="flex items-center gap-3 px-2 mb-8 text-blue-500">
           <Layers className="w-8 h-8" />
           <span className="hidden md:inline font-bold text-xl tracking-tight">NEXUS</span>
        </div>

        <button 
          onClick={() => setView('grid')}
          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${view === 'grid' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          <LayoutGrid size={20} /> <span className="hidden md:inline">Library</span>
        </button>
        
        <button 
          onClick={() => setView('projects')}
          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${view === 'projects' ? 'bg-purple-600/20 text-purple-400' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          <Layers size={20} /> <span className="hidden md:inline">Projects</span>
        </button>

        <button 
          onClick={() => setView('graph')}
          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${view === 'graph' ? 'bg-emerald-600/20 text-emerald-400' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          <Network size={20} /> <span className="hidden md:inline">Connections</span>
        </button>

        <div className="mt-auto pt-6 border-t border-slate-800">
             <div className="relative group w-full">
                <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                />
                <button className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium transition-colors ${isProcessing ? 'bg-slate-700 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                    {isProcessing ? <Sparkles className="animate-spin" size={20} /> : <Upload size={20} />}
                    <span className="hidden md:inline">{isProcessing ? 'Analyzing...' : 'Import Asset'}</span>
                </button>
             </div>
             <button onClick={handleCreatePrompt} className="mt-2 flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                 <Plus size={20} />
                 <span className="hidden md:inline">New Prompt</span>
             </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center px-6 justify-between bg-slate-900/50 backdrop-blur">
             <div className="flex items-center bg-slate-800 rounded-full px-4 py-2 w-96 border border-slate-700 focus-within:border-blue-500 transition-colors">
                <Search size={18} className="text-slate-500 mr-2" />
                <input 
                    type="text" 
                    placeholder="Search prompts, characters, tags..." 
                    className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-slate-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
             <div className="flex items-center gap-4">
                 <div className="text-right hidden sm:block">
                     <p className="text-xs text-slate-500">Local Environment</p>
                     <p className="text-sm font-bold text-slate-300">Workspace Alpha</p>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500"></div>
             </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-y-auto p-6 relative">
            
            {/* GRID VIEW */}
            {view === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredData.map(entity => (
                        <div 
                            key={entity.id} 
                            onClick={() => setSelectedEntityId(entity.id)}
                            className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-all cursor-pointer group hover:shadow-lg hover:shadow-blue-900/20"
                        >
                            <div className="aspect-square bg-slate-900 relative flex items-center justify-center overflow-hidden">
                                {entity.mediaUrl ? (
                                    <img src={entity.mediaUrl} alt={entity.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                ) : (
                                    <div className="text-slate-600 flex flex-col items-center">
                                        {entity.type === 'prompt' ? <FileTextIcon size={48} /> : <UserIcon size={48} />}
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] uppercase font-bold text-white tracking-wider border border-white/10">
                                    {entity.type}
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-white truncate mb-1">{entity.title}</h3>
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {entity.tags.slice(0, 3).map(t => (
                                        <span key={t} className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{t}</span>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500 mt-2 border-t border-slate-700 pt-2">
                                    <span>{new Date(entity.createdAt).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1"><Network size={12}/> {entity.relatedIds.length}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* PROJECT VIEW */}
            {view === 'projects' && (
                <div className="space-y-8">
                    {projects.map(proj => {
                        // Find children (brute force for demo)
                        const children = entities.filter(e => proj.relatedIds.includes(e.id));
                        const chars = children.filter(c => c.type === 'character');
                        const assets = children.filter(c => c.type === 'image' || c.type === 'video');
                        const prompts = children.filter(c => c.type === 'prompt');

                        return (
                            <div key={proj.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{proj.title}</h2>
                                        <p className="text-slate-400 mt-1 max-w-2xl">{proj.content}</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedEntityId(proj.id)}
                                        className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                                    >
                                        View Details
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <ProjectColumn title="Characters" items={chars} icon={<UserIcon size={16}/>} onSelect={setSelectedEntityId} />
                                    <ProjectColumn title="Prompts & Scripts" items={prompts} icon={<FileTextIcon size={16}/>} onSelect={setSelectedEntityId} />
                                    <ProjectColumn title="Visual Assets" items={assets} icon={<ImageIcon size={16}/>} onSelect={setSelectedEntityId} />
                                </div>
                            </div>
                        );
                    })}
                     {projects.length === 0 && (
                        <div className="text-center py-20 text-slate-500">
                            <Layers size={48} className="mx-auto mb-4 opacity-50"/>
                            <p>No projects found. Create a project entity to start grouping assets.</p>
                        </div>
                    )}
                </div>
            )}

            {/* GRAPH VIEW */}
            {view === 'graph' && (
                <div className="h-full flex flex-col">
                    <div className="bg-slate-800/80 rounded-lg p-4 mb-4 border border-blue-900/50">
                        <h2 className="text-lg font-semibold text-blue-100 mb-1">Knowledge Graph</h2>
                        <p className="text-sm text-slate-400">Visualizing relationships between prompts, assets, and concepts.</p>
                    </div>
                    <div className="flex-1 min-h-[500px]">
                        <NetworkGraph 
                            data={entities} 
                            activeId={selectedEntityId || undefined} 
                            onNodeClick={setSelectedEntityId} 
                        />
                    </div>
                </div>
            )}

        </div>
      </main>

      <EntityModal entityId={selectedEntityId} onClose={() => setSelectedEntityId(null)} />
    </div>
  );
};

// Simple Icon Wrappers for cleaner code above
const FileTextIcon = ({size}: {size:number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;
const UserIcon = ({size}: {size:number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

const ProjectColumn = ({ title, items, icon, onSelect }: { title: string, items: Entity[], icon: React.ReactNode, onSelect: (id:string)=>void }) => (
    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
        <h3 className="text-xs uppercase font-bold text-slate-500 mb-3 flex items-center gap-2">
            {icon} {title} <span className="ml-auto bg-slate-800 px-2 rounded text-slate-300">{items.length}</span>
        </h3>
        <div className="space-y-2">
            {items.map(item => (
                <div 
                    key={item.id} 
                    onClick={() => onSelect(item.id)}
                    className="p-2 bg-slate-800 rounded border border-slate-700 hover:border-slate-500 cursor-pointer transition-colors flex gap-3 items-center"
                >
                    {item.mediaUrl && (
                        <img src={item.mediaUrl} className="w-8 h-8 rounded object-cover bg-black" alt="" />
                    )}
                    <span className="text-sm truncate text-slate-300">{item.title}</span>
                </div>
            ))}
            {items.length === 0 && <div className="text-xs text-slate-600 italic py-2">No items</div>}
        </div>
    </div>
);

const App = () => (
  <StoreProvider>
    <MainLayout />
  </StoreProvider>
);

export default App;
