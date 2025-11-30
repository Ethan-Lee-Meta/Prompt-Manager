export type EntityType = 'prompt' | 'image' | 'video' | 'character' | 'project' | 'tool';

export interface Entity {
  id: string;
  type: EntityType;
  title: string;
  content?: string; // For prompts or descriptions
  mediaUrl?: string; // For images/videos
  tags: string[];
  createdAt: string;
  metadata?: {
    model?: string;
    params?: string;
    seed?: number;
    dimensions?: string;
    duration?: string;
  };
  // The Knowledge Graph: IDs of related entities
  relatedIds: string[]; 
}

export interface GraphNode {
  id: string;
  group: number;
  label: string;
  type: EntityType;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}
