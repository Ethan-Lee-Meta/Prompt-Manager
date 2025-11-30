import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Entity, EntityType } from '../types';

// Seed data to make the app look populated on first load
const SEED_DATA: Entity[] = [
  {
    id: 'proj-1',
    type: 'project',
    title: 'Neon Tokyo 2099',
    content: 'A cyberpunk short film regarding a rogue AI.',
    tags: ['cyberpunk', 'sci-fi', 'movie'],
    createdAt: new Date().toISOString(),
    relatedIds: ['char-1', 'vid-1', 'prompt-1']
  },
  {
    id: 'char-1',
    type: 'character',
    title: 'Kaelen (Protagonist)',
    content: 'A gritty detective with a robotic arm.',
    tags: ['protagonist', 'male', 'cyborg'],
    createdAt: new Date().toISOString(),
    relatedIds: ['proj-1', 'img-1']
  },
  {
    id: 'prompt-1',
    type: 'prompt',
    title: 'Kaelen Portrait Prompt',
    content: 'Cinematic portrait of a cyberpunk detective, neon rain, bioluminescent tattoos, 8k, unreal engine 5 render --ar 16:9',
    tags: ['midjourney', 'v6', 'portrait'],
    createdAt: new Date().toISOString(),
    relatedIds: ['proj-1', 'img-1']
  },
  {
    id: 'img-1',
    type: 'image',
    title: 'Kaelen Concept Art',
    mediaUrl: 'https://picsum.photos/800/600',
    tags: ['concept', 'art', 'dark'],
    createdAt: new Date().toISOString(),
    relatedIds: ['char-1', 'prompt-1'],
    metadata: { model: 'Midjourney v6', dimensions: '1024x1024' }
  },
  {
      id: 'vid-1',
      type: 'video',
      title: 'Opening Scene Animatic',
      mediaUrl: 'https://picsum.photos/800/450', // Placeholder
      tags: ['animatic', 'intro'],
      createdAt: new Date().toISOString(),
      relatedIds: ['proj-1'],
      metadata: { duration: '00:45' }
  }
];

interface StoreContextType {
  entities: Entity[];
  addEntity: (entity: Entity) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  deleteEntity: (id: string) => void;
  getEntity: (id: string) => Entity | undefined;
  searchEntities: (query: string) => Entity[];
  linkEntities: (idA: string, idB: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entities, setEntities] = useState<Entity[]>(() => {
    const saved = localStorage.getItem('nexus_data');
    return saved ? JSON.parse(saved) : SEED_DATA;
  });

  useEffect(() => {
    localStorage.setItem('nexus_data', JSON.stringify(entities));
  }, [entities]);

  const addEntity = useCallback((entity: Entity) => {
    setEntities(prev => [entity, ...prev]);
  }, []);

  const updateEntity = useCallback((id: string, updates: Partial<Entity>) => {
    setEntities(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteEntity = useCallback((id: string) => {
    setEntities(prev => prev.filter(e => e.id !== id));
  }, []);

  const getEntity = useCallback((id: string) => {
    return entities.find(e => e.id === id);
  }, [entities]);

  const searchEntities = useCallback((query: string) => {
    const lowerQ = query.toLowerCase();
    return entities.filter(e => 
      e.title.toLowerCase().includes(lowerQ) ||
      e.tags.some(t => t.toLowerCase().includes(lowerQ)) ||
      (e.content && e.content.toLowerCase().includes(lowerQ))
    );
  }, [entities]);

  const linkEntities = useCallback((idA: string, idB: string) => {
    setEntities(prev => prev.map(e => {
      if (e.id === idA && !e.relatedIds.includes(idB)) {
        return { ...e, relatedIds: [...e.relatedIds, idB] };
      }
      if (e.id === idB && !e.relatedIds.includes(idA)) {
        return { ...e, relatedIds: [...e.relatedIds, idA] };
      }
      return e;
    }));
  }, []);

  return (
    <StoreContext.Provider value={{ entities, addEntity, updateEntity, deleteEntity, getEntity, searchEntities, linkEntities }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
