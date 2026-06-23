export type BlockType = 
  | 'text' 
  | 'heading1' 
  | 'heading2' 
  | 'heading3' 
  | 'todo' 
  | 'bullet' 
  | 'quote' 
  | 'code' 
  | 'table' 
  | 'image'
  | string; // Plugin defined blocks

export interface Block {
  id: string;
  pageId: string;
  type: BlockType;
  content: string; // Dynamic text or serialized JSON for tables/images
  properties: {
    checked?: boolean;
    language?: string;
    caption?: string;
    colWidths?: number[];
    customProps?: string; // Serialized string for custom plugins
    [key: string]: any;
  };
  sortOrder: number;
  updatedAt: number;
}

export interface Page {
  id: string;
  title: string;
  icon: string; // Emoji character
  cover: string; // Image URL/color code
  isArchived: boolean;
  updatedAt: number;
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  code: string; // JavaScript source code executed inside sandboxed eval
  isActive: boolean;
  author?: string;
  updatedAt: number;
}

export interface SyncMessage {
  type: 'upsert_page' | 'delete_page' | 'upsert_block' | 'delete_block' | 'upsert_plugin' | 'delete_plugin';
  payload: any;
  timestamp: number;
  clientId: string;
}

export interface SqlQueryResult {
  success: boolean;
  columns?: string[];
  rows?: any[];
  error?: string;
  affectedRows?: number;
}

export interface ThirdPartyApiConfig {
  id: string;
  name: string;
  description: string;
  endpointUrl: string;
  apiKey: string;
  isActive: boolean;
}
