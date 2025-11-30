import React, { useState, useRef } from 'react';
import { StoreProvider, useStore } from './hooks/useStore';
import { analyzeImageForTags, suggestConnections, isAiEnabled } from './services/geminiService';
import NetworkGraph from './components/NetworkGraph';
import EntityModal from './components/EntityModal';
import { 
  Search, Plus, Image as ImageIcon, Upload, Settings, 
  LayoutGrid, Network, Layers, Sparkles, Camera, WifiOff, Zap, FileText as FileTextIcon, User as UserIcon
} from 'lucide-react';
import { Entity } from './types';
import { v4 as uuidv4 } from 'uuid';

const MainLayout = () => {
  const { entities, addEntity, searchEntities, linkEntities } = useStore();
  const [view, setView] = useState<'grid' | 'graph' | 'projects'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImageSearching, setIsImageSearching] = useState(false);
  
  const aiAvailable = isAiEnabled();
  const imageSearchInputRef = useRef<HTMLInputElement>(null);

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
        
        let analysis = { title: file.name, tags: [] as string[], description: '' };
        
        // Only attempt AI analysis if available
        if (aiAvailable) {
            try {
                analysis = await analyzeImageForTags(base64);
            } catch (err) {
                console.warn("Analysis failed, using default", err);
            }
        } else {
            // Local fallback
            analysis.title = file.name.split('.')[0];
            analysis.tags = ['imported'];
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

        // 3. Auto-connect suggestions (Only if AI available)
        if (aiAvailable) {
             try {
                const allTitles = entities.map(e => e.title);
                const relatedTitles = await suggestConnections(newEntity.title, newEntity.content || '', allTitles);
                
                relatedTitles.forEach(title => {
                    const target = entities.find(e => e.title === title);
                    if (target) linkEntities(newId, target.id);
                });
            } catch(err) { console.error("Auto-link failed", err); }
        }

        // Open modal immediately for user to review/edit
        setSelectedEntityId(newId);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert("Error processing image");
    } finally {
      setIsProcessing(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  };

  const handleImageSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!aiAvailable) {
          alert("Image search requires an API Key (Online Mode).");
          return;
      }

      setIsImageSearching(true);
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
             const base64 = reader.result as string;
             // We reuse analyzeImageForTags to get keywords from the uploaded search image
             const analysis = await analyzeImageForTags(base64);
             
             // Construct a search query from tags and title
             // Limit to first 3 tags to avoid overly specific queries that yield no results
             const queryParts = [ ...analysis.tags.slice(0, 3)];
             const query = queryParts.join(' ');
             setSearchQuery(query);
             setIsImageSearching(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
          console.error(err);
          setIsImageSearching(false);
      }
  };

  const handleCreatePrompt = () => {
      const newId = uuidv4();
      const newEntity: Entity = {
          id: newId,
          type: 'prompt',
          title: 'New Prompt',
          content: '',
          tags: ['draft'],
          createdAt: new Date().toISOString(),
          relatedIds: []
      };
      addEntity(newEntity);
      setSelectedEntityId(newId);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* Sidebar */}
      <aside className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col items-center md:items-stretch py-6 px-0 md:px-4 space-y-2 z-20">
        <div className="flex items-center gap-3 px-2 mb-8 text-blue-500">
           <Layers className="w-8 h-8" />
           <span className="hidden md:inline font-bold text-xl tracking-tight">NEXUS</span>
        </div>

        <button 
          onClick={() => setView('grid')}
          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${view === 'grid' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          <LayoutGrid size={20} /> <span className="hidden md:inline font-medium">Library</span>
        </button>
        
        <button 
          onClick={() => setView('projects')}
          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${view === 'projects' ? 'bg-purple-600/20 text-purple-400' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          <Layers size={20} /> <span className="hidden md:inline font-medium">Projects</span>
        </button>

        <button 
          onClick={() => setView('graph')}
          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${view === 'graph' ? 'bg-emerald-600/20 text-emerald-400' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          <Network size={20} /> <span className="hidden md:inline font-medium">Connections</span>
        </button>

        <div className="mt-auto pt-6 border-t border-slate-800 space-y-3">
             <div className="relative group w-full">
                <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                />
                <button className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium transition-colors shadow-lg ${isProcessing ? 'bg-slate-700 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'}`}>
                    {isProcessing ? <Sparkles className="animate-spin" size={20} /> : <Upload size={20} />}
                    <span className="hidden md:inline">{isProcessing ? (aiAvailable ? 'Analyzing...' : 'Importing...') : 'Import Asset'}</span>
                </button>
             </div>
             <button onClick={handleCreatePrompt} className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700">
                 <Plus size={20} />
                 <span className="hidden md:inline">New Prompt</span>
             </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
        
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

        {/* Header */}
        <header className="h-20 border-b border-slate-800 flex items-center px-6 justify-between bg-slate-950/80 backdrop-blur z-10">
             <div className="flex items-center gap-2 flex-1 max-w-xl">
                 <div className="flex items-center bg-slate-900 rounded-full px-4 py-3 w-full border border-slate-800 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all relative">
                    <Search size={18} className="text-slate-500 mr-2" />
                    <input 
                        type="text" 
                        placeholder={isImageSearching ? "Analyzing image..." : "Search prompts, characters..."}
                        className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-slate-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={isImageSearching}
                    />
                    
                    {/* Image Search Button */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <input 
                            ref={imageSearchInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageSearch}
                        />
                         {aiAvailable && (
                             <span className="text-[10px] text-slate-600 font-medium px-2 py-0.5 rounded bg-slate-800/50 border border-slate-700">IMG SEARCH</span>
                         )}
                        <button 
                            onClick={() => {
                                if (!aiAvailable) {
                                    alert("Enable AI (API Key) to search by image. Currently in Local Mode.");
                                    return;
                                }
                                imageSearchInputRef.current?.click();
                            }}
                            className={`p-2 rounded-full transition-colors ${
                                isImageSearching ? 'text-blue-400 animate-pulse bg-blue-400/10' : 
                                aiAvailable ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-700 cursor-not-allowed'
                            }`}
                            title={aiAvailable ? "Search by Image" : "Image Search requires API Key"}
                        >
                            <Camera size={18} />
                        </button>
                    </div>
                 </div>
             </div>

             <div className="flex items-center gap-4 ml-4">
                 <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${aiAvailable ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-green-900/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {aiAvailable ? <Zap size={12} fill="currentColor" /> : <WifiOff size={12} />}
                    {aiAvailable ? 'AI ENABLED' : 'LOCAL MODE'}
                 </div>
                 <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 border-2 border-slate-800 shadow-lg"></div>
             </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-y-auto p-6 relative z-0 custom-scrollbar">
            
            {/* GRID VIEW */}
            {view === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredData.map(entity => (
                        <div 
                            key={entity.id} 
                            onClick={() => setSelectedEntityId(entity.id)}
                            className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/10 transition-all cursor-pointer group flex flex-col h-full"
                        >
                            <div className="aspect-square bg-slate-950 relative flex items-center justify-center overflow-hidden border-b border-slate-800">
                                {entity.mediaUrl ? (
                                    <img src={entity.mediaUrl} alt={entity.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                ) : (
                                    <div className="text-slate-700 flex flex-col items-center">
                                        {entity.type === 'prompt' ? <FileTextIcon size={48} /> : <UserIcon size={48} />}
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-300 tracking-wider border border-white/5 shadow-sm">
                                    {entity.type}
                                </div>
                            </div>
                            <div className="p-4 flex flex-col flex-1">
                                <h3 className="font-semibold text-slate-200 truncate mb-1 text-sm group-hover:text-blue-400 transition-colors">{entity.title}</h3>
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {entity.tags.slice(0, 3).map(t => (
                                        <span key={t} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{t}</span>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-auto pt-3 border-t border-slate-800/50">
                                    <span>{new Date(entity.createdAt).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded-full"><Network size={10}/> {entity.relatedIds.length}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredData.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center h-64 text-slate-500">
                             <div className="bg-slate-900 p-4 rounded-full mb-4">
                                <Search size={32} className="opacity-50" />
                             </div>
                             <p className="text-lg font-medium text-slate-400">No assets found</p>
                             <p className="text-sm opacity-50">Try searching for "{searchQuery}" or import new assets</p>
                        </div>
                    )}
                </div>
            )}

            {/* PROJECT VIEW */}
            {view === 'projects' && (
                <div className="space-y-8 max-w-6xl mx-auto">
                    {projects.map(proj => {
                        const children = entities.filter(e => proj.relatedIds.includes(e.id));
                        const chars = children.filter(c => c.type === 'character');
                        const assets = children.filter(c => c.type === 'image' || c.type === 'video');
                        const prompts = children.filter(c => c.type === 'prompt');

                        return (
                            <div key={proj.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                                <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-800">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">PROJECT</span>
                                            <span className="text-xs text-slate-500">{new Date(proj.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <h2 className="text-2xl font-bold text-white tracking-tight">{proj.title}</h2>
                                        <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">{proj.content}</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedEntityId(proj.id)}
                                        className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors border border-slate-700 font-medium"
                                    >
                                        Edit Project
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <ProjectColumn title="Characters" items={chars} icon={<UserIcon size={14}/>} onSelect={setSelectedEntityId} />
                                    <ProjectColumn title="Prompts & Scripts" items={prompts} icon={<FileTextIcon size={14}/>} onSelect={setSelectedEntityId} />
                                    <ProjectColumn title="Visual Assets" items={assets} icon={<ImageIcon size={14}/>} onSelect={setSelectedEntityId} />
                                </div>
                            </div>
                        );
                    })}
                     {projects.length === 0 && (
                        <div className="text-center py-20 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                            <Layers size={48} className="mx-auto mb-4 opacity-50"/>
                            <p className="text-lg text-slate-300">No projects found</p>
                            <p className="text-sm mb-6">Create a project entity to start grouping assets.</p>
                            <button onClick={handleCreatePrompt} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors">Create New Project</button>
                        </div>
                    )}
                </div>
            )}

            {/* GRAPH VIEW */}
            {view === 'graph' && (
                <div className="h-full flex flex-col">
                    <div className="bg-slate-900/80 rounded-lg p-4 mb-4 border border-blue-900/30 flex justify-between items-center backdrop-blur-sm">
                        <div>
                            <h2 className="text-lg font-semibold text-blue-100 mb-1">Knowledge Graph</h2>
                            <p className="text-sm text-slate-400">Interactive visualization of your creative universe.</p>
                        </div>
                        <div className="text-xs text-slate-500 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
                            {entities.length} Nodes · {entities.reduce((acc, e) => acc + e.relatedIds.length, 0) / 2} Links
                        </div>
                    </div>
                    <div className="flex-1 min-h-[500px] bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden relative">
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

const ProjectColumn = ({ title, items, icon, onSelect }: { title: string, items: Entity[], icon: React.ReactNode, onSelect: (id:string)=>void }) => (
    <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
        <h3 className="text-[10px] uppercase font-bold text-slate-500 mb-3 flex items-center gap-2 tracking-wider">
            {icon} {title} <span className="ml-auto bg-slate-900 px-1.5 rounded text-slate-400 border border-slate-800">{items.length}</span>
        </h3>
        <div className="space-y-2">
            {items.map(item => (
                <div 
                    key={item.id} 
                    onClick={() => onSelect(item.id)}
                    className="p-2 bg-slate-900/80 rounded border border-slate-800 hover:border-slate-600 hover:bg-slate-800 cursor-pointer transition-all flex gap-3 items-center group"
                >
                    {item.mediaUrl && (
                        <img src={item.mediaUrl} className="w-8 h-8 rounded object-cover bg-black border border-slate-800" alt="" />
                    )}
                    <span className="text-xs truncate text-slate-400 group-hover:text-slate-200">{item.title}</span>
                </div>
            ))}
            {items.length === 0 && <div className="text-[10px] text-slate-700 italic py-2 text-center border border-dashed border-slate-800 rounded">No items</div>}
        </div>
    </div>
);

const App = () => (
  <StoreProvider>
    <MainLayout />
  </StoreProvider>
);

export default App;