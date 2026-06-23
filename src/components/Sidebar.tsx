import React from "react";
import { 
  FileText, 
  Database, 
  Cpu, 
  Plus, 
  Trash2, 
  Activity, 
  Download, 
  Sparkles,
  RefreshCw
} from "lucide-react";
import { Page, Plugin } from "../types";

interface SidebarProps {
  pages: Page[];
  activePageId: string | null;
  onPageSelect: (id: string | null) => void;
  onAddPage: () => void;
  onDeletePage: (id: string) => void;
  currentTab: "editor" | "sql" | "plugins" | "export";
  onTabChange: (tab: "editor" | "sql" | "plugins" | "export") => void;
  syncStatus: "connected" | "syncing" | "error";
  onTriggerManualSync: () => void;
  plugins: Plugin[];
}

export default function Sidebar({
  pages,
  activePageId,
  onPageSelect,
  onAddPage,
  onDeletePage,
  currentTab,
  onTabChange,
  syncStatus,
  onTriggerManualSync,
  plugins
}: SidebarProps) {
  const activePlugins = plugins.filter(p => p.isActive);

  return (
    <div 
      id="app-sidebar" 
      className="w-68 min-w-68 bg-neutral-900 border-r border-neutral-800 flex flex-col h-screen text-neutral-300"
    >
      {/* Brand Workspace Header */}
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-900/30">
            N
          </div>
          <div>
            <h1 className="font-semibold text-neutral-100 text-sm tracking-tight leading-tight">
              Noção
            </h1>
            <span className="text-xs text-indigo-400 font-mono">v1.3.0 Engine</span>
          </div>
        </div>

        {/* Sync Status Badge */}
        <button
          id="manual-sync-btn"
          onClick={onTriggerManualSync}
          title="Sincronizar dados agora"
          className="flex items-center space-x-1 hover:bg-neutral-800 p-1.5 rounded-md transition-colors"
        >
          <span className={`w-2.5 h-2.5 rounded-full transition-all ${
            syncStatus === "connected" ? "bg-emerald-500 animate-pulse" :
            syncStatus === "syncing" ? "bg-amber-500 animate-spin" : "bg-rose-500"
          }`} />
          <RefreshCw className={`w-3.5 h-3.5 text-neutral-400 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs / Primary Modules */}
      <div className="p-2 space-y-1">
        <span className="px-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-widest block py-1">
          Módulos Hub
        </span>
        <button
          id="btn-nav-editor"
          onClick={() => onTabChange("editor")}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
            currentTab === "editor" 
              ? "bg-neutral-800 text-neutral-100 border border-neutral-700/50" 
              : "hover:bg-neutral-800/50 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>Editor de Páginas</span>
        </button>

        <button
          id="btn-nav-sql"
          onClick={() => onTabChange("sql")}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
            currentTab === "sql" 
              ? "bg-neutral-800 text-neutral-100 border border-neutral-700/50" 
              : "hover:bg-neutral-800/50 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Database className="w-4 h-4 text-amber-500" />
          <span>Console de SQL</span>
        </button>

        <button
          id="btn-nav-plugins"
          onClick={() => onTabChange("plugins")}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
            currentTab === "plugins" 
              ? "bg-neutral-800 text-neutral-100 border border-neutral-700/50" 
              : "hover:bg-neutral-800/50 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Cpu className="w-4 h-4 text-sky-400" />
          <div className="flex items-center justify-between w-full">
            <span>Plugins JS</span>
            {activePlugins.length > 0 && (
              <span className="text-[9px] bg-indigo-900/40 text-indigo-300 px-1.5 py-0.5 rounded-full font-mono border border-indigo-700/30">
                {activePlugins.length}
              </span>
            )}
          </div>
        </button>

        <button
          id="btn-nav-export"
          onClick={() => onTabChange("export")}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
            currentTab === "export" 
              ? "bg-neutral-800 text-neutral-100 border border-neutral-700/50" 
              : "hover:bg-neutral-800/50 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Exportação JSON</span>
        </button>
      </div>

      {/* Pages Section */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1.5">
        <div className="flex items-center justify-between px-2 py-1 select-none">
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
            Documentos Integrados
          </span>
          <button
            id="add-page-btn"
            onClick={onAddPage}
            title="Criar nova página"
            className="text-neutral-400 hover:text-neutral-100 p-0.5 hover:bg-neutral-800 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-0.5" id="sidebar-pages-list">
          {pages.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-neutral-600">
              Nenhuma página criada
            </div>
          ) : (
            pages.map(page => {
              const isActive = currentTab === "editor" && activePageId === page.id;
              return (
                <div
                  key={page.id}
                  id={`page-nav-${page.id}`}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    isActive 
                      ? "bg-neutral-800 text-neutral-100 font-semibold" 
                      : "hover:bg-neutral-800/40 text-neutral-400 hover:text-neutral-200"
                  }`}
                  onClick={() => {
                    onTabChange("editor");
                    onPageSelect(page.id);
                  }}
                >
                  <div className="flex items-center space-x-2 overflow-hidden mr-2">
                    <span className="text-sm select-none shrink-0">{page.icon || "📄"}</span>
                    <span className="truncate">{page.title || "Untitled"}</span>
                  </div>
                  <button
                    id={`delete-page-btn-${page.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(page.id);
                    }}
                    title="Excluir página"
                    className="opacity-0 group-hover:opacity-100 hover:bg-neutral-700 p-0.5 rounded text-neutral-500 hover:text-rose-400 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Client Synchronization Health Footer */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-950 flex flex-col space-y-1.5 text-[10px] text-neutral-500 font-mono">
        <div className="flex items-center justify-between">
          <span>Servidor SQL:</span>
          <span className="text-emerald-400">ATIVO (Porta 3000)</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Sincronização:</span>
          <span className={syncStatus === "error" ? "text-rose-400" : "text-neutral-400"}>
            {syncStatus === "connected" ? "Sincronizado" : syncStatus === "syncing" ? "Sincronizando..." : "Conexão perdida"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Tabelas Express:</span>
          <span>pages, blocks, plugins</span>
        </div>
      </div>
    </div>
  );
}
