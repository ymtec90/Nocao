import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import SqlConsole from "./components/SqlConsole";
import PluginConsole from "./components/PluginConsole";
import ExportImport from "./components/ExportImport";
import { Block, Page, Plugin, SqlQueryResult } from "./types";

export default function App() {
  const [pages, setPages] = useState<Page[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  
  // Tabs: "editor" | "sql" | "plugins" | "export"
  const [currentTab, setCurrentTab] = useState<"editor" | "sql" | "plugins" | "export">("editor");
  
  // Real-time Sync state tracking
  const [syncStatus, setSyncStatus] = useState<"connected" | "syncing" | "error">("connected");
  const [lastCheckpoints, setLastCheckpoints] = useState({
    pagesCheckpoint: 0,
    blocksCheckpoint: 0,
    pluginsCheckpoint: 0
  });

  // Logs terminal output
  const [pluginLogs, setPluginLogs] = useState<string[]>([]);
  const [queryHistory, setQueryHistory] = useState<string[]>([
    "SELECT * FROM pages WHERE isArchived = false",
    "SELECT id, type, content FROM blocks ORDER BY updatedAt DESC LIMIT 5",
    "SELECT type, COUNT(id) AS total FROM blocks GROUP BY type"
  ]);

  // Custom non-blocking Dialogs and modals state
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: "alert" | "confirm" | "selectPlugin";
    title: string;
    message: string;
    options?: { id: string; name: string }[];
    onConfirm: (value?: any) => void;
    onCancel?: () => void;
  } | null>(null);

  const triggerAlert = (title: string, message: string) => {
    return new Promise<void>((resolve) => {
      setModal({
        isOpen: true,
        type: "alert",
        title,
        message,
        onConfirm: () => {
          setModal(null);
          resolve();
        }
      });
    });
  };

  const triggerConfirm = (title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setModal({
        isOpen: true,
        type: "confirm",
        title,
        message,
        onConfirm: () => {
          setModal(null);
          resolve(true);
        },
        onCancel: () => {
          setModal(null);
          resolve(false);
        }
      });
    });
  };

  const triggerSelectPlugin = (title: string, message: string, options: { id: string; name: string }[]) => {
    return new Promise<string | null>((resolve) => {
      setModal({
        isOpen: true,
        type: "selectPlugin",
        title,
        message,
        options,
        onConfirm: (pluginId: string) => {
          setModal(null);
          resolve(pluginId);
        },
        onCancel: () => {
          setModal(null);
          resolve(null);
        }
      });
    });
  };

  // Handle Initial Application Boots
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch initial collections
  const fetchInitialData = async () => {
    setSyncStatus("syncing");
    try {
      const pageRes = await fetch("/api/pages");
      const pagesData = await pageRes.json();
      setPages(pagesData);

      const pluginRes = await fetch("/api/plugins");
      const pluginsData = await pluginRes.json();
      setPlugins(pluginsData);

      if (pagesData.length > 0) {
        setActivePageId(pagesData[0].id);
        fetchBlocksForPage(pagesData[0].id);
      }

      // Fetch current server checkpoints to prevent redundant refetches on first interval tick
      try {
        const checkRes = await fetch("/api/sync/checkpoint");
        if (checkRes.ok) {
          const check = await checkRes.json();
          setLastCheckpoints(check);
        }
      } catch (checkErr) {
        console.warn("Could not load initial checkpoints:", checkErr);
      }

      setSyncStatus("connected");
    } catch (e) {
      console.warn("Failed to fetch initial data:", e);
      setSyncStatus("error");
    }
  };

  const fetchBlocksForPage = async (pageId: string) => {
    try {
      const blockRes = await fetch(`/api/pages/${pageId}/blocks`);
      const blockData = await blockRes.json();
      setBlocks(blockData);
    } catch (e) {
      console.warn("Failed to load blocks for page:", pageId, e);
    }
  };

  // Watch selected page change to load blocks
  useEffect(() => {
    if (activePageId) {
      fetchBlocksForPage(activePageId);
    } else {
      setBlocks([]);
    }
  }, [activePageId]);

  // Keep a ref of checkpoints to avoid tearing down/recreating the interval on every single checkpoint update
  const checkpointsRef = React.useRef(lastCheckpoints);
  useEffect(() => {
    checkpointsRef.current = lastCheckpoints;
  }, [lastCheckpoints]);

  // Real-time Polling Synchronization Loop
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/sync/checkpoint");
        if (!res.ok) throw new Error("Sync server unresponsive");
        const check = await res.json();

        // Check if server database timestamp differs from local checkpoints
        let needsRefetch = false;
        const currentCheckpoints = checkpointsRef.current;

        if (check.pagesCheckpoint > currentCheckpoints.pagesCheckpoint) {
          const pageRes = await fetch("/api/pages");
          const pagesData = await pageRes.json();
          setPages(pagesData);
          setLastCheckpoints(prev => ({ ...prev, pagesCheckpoint: check.pagesCheckpoint }));
          needsRefetch = true;
        }

        if (check.pluginsCheckpoint > currentCheckpoints.pluginsCheckpoint) {
          const pluginRes = await fetch("/api/plugins");
          const pluginsData = await pluginRes.json();
          setPlugins(pluginsData);
          setLastCheckpoints(prev => ({ ...prev, pluginsCheckpoint: check.pluginsCheckpoint }));
          needsRefetch = true;
        }

        if (check.blocksCheckpoint > currentCheckpoints.blocksCheckpoint) {
          if (activePageId) {
            await fetchBlocksForPage(activePageId);
          }
          setLastCheckpoints(prev => ({ ...prev, blocksCheckpoint: check.blocksCheckpoint }));
          needsRefetch = true;
        }

        if (needsRefetch) {
          setSyncStatus("syncing");
          setTimeout(() => setSyncStatus("connected"), 300);
        } else {
          setSyncStatus("connected");
        }
      } catch (e) {
        // Handle transient sync/fetch failures completely silently
        setSyncStatus("error");
      }
    }, 3500);

    return () => clearInterval(syncInterval);
  }, [activePageId]);

  const triggerManualSync = async () => {
    setSyncStatus("syncing");
    await fetchInitialData();
  };

  // --- 1. Pages Actions ---
  const handleAddPage = async () => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const newPage = await res.json();
      setPages(prev => [newPage, ...prev]);
      setActivePageId(newPage.id);
      setSyncStatus("connected");
    } catch (e) {
      setSyncStatus("error");
    }
  };

  const handleUpdatePage = async (updated: Partial<Page>) => {
    if (!activePageId) return;
    
    // Optimistic Update
    setPages(prev => prev.map(p => p.id === activePageId ? { ...p, ...updated } : p));

    try {
      await fetch(`/api/pages/${activePageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      setSyncStatus("error");
    }
  };

  const handleDeletePage = async (id: string) => {
    const confirmDelete = await triggerConfirm("Confirmar Exclusão", "Deseja excluir esta página e todos os seus blocos permanentemente?");
    if (!confirmDelete) return;

    setSyncStatus("syncing");
    try {
      await fetch(`/api/pages/${id}`, { method: "DELETE" });
      setPages(prev => prev.filter(p => p.id !== id));
      if (activePageId === id) {
        setActivePageId(pages[0]?.id || null);
      }
      setSyncStatus("connected");
    } catch (e) {
      setSyncStatus("error");
    }
  };

  // --- 2. Blocks Actions ---
  const handleAddBlock = async (type: string, content: string, sortOrder: number) => {
    if (!activePageId) return;

    try {
      const res = await fetch(`/api/pages/${activePageId}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content, sortOrder })
      });
      const newBlock = await res.json();
      setBlocks(prev => [...prev].concat(newBlock).sort((a,b) => a.sortOrder - b.sortOrder));
    } catch (e) {
      setSyncStatus("error");
    }
  };

  const handleUpdateBlock = async (id: string, updated: Partial<Block>) => {
    // Optimistic Update
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updated } as Block : b));

    try {
      await fetch(`/api/blocks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error("Update block failure:", id, e);
      setSyncStatus("error");
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      await fetch(`/api/blocks/${id}`, { method: "DELETE" });
      setBlocks(prev => prev.filter(b => b.id !== id));
    } catch (e) {
      setSyncStatus("error");
    }
  };

  const handleReorderBlocks = async (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    try {
      const orderList = newBlocks.map((b, idx) => ({ id: b.id, sortOrder: idx }));
      await fetch("/api/blocks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderList })
      });
    } catch (e) {
      setSyncStatus("error");
    }
  };

  // --- 3. Custom JS Plugins Actions ---
  const handleAddPlugin = async (name: string, description: string, code: string) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, code, version: "1.0.0", isActive: true })
      });
      const newPlugin = await res.json();
      setPlugins(prev => [...prev].concat(newPlugin));
      setSyncStatus("connected");
    } catch (e) {
      setSyncStatus("error");
    }
  };

  const handleUpdatePlugin = async (id: string, updated: Partial<Plugin>) => {
    // Optimistic Update
    setPlugins(prev => prev.map(p => p.id === id ? { ...p, ...updated } as Plugin : p));

    try {
      await fetch(`/api/plugins/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      setSyncStatus("error");
    }
  };
  const handleDeletePlugin = async (id: string) => {
    const confirmDelete = await triggerConfirm("Confirmar Exclusão", "Deseja excluir este plugin permanentemente?");
    if (!confirmDelete) return;

    setSyncStatus("syncing");
    try {
      await fetch(`/api/plugins/${id}`, { method: "DELETE" });
      setPlugins(prev => prev.filter(p => p.id !== id));
      setSyncStatus("connected");
    } catch (e) {
      setSyncStatus("error");
    }
  };

  // --- Dynamic Sandbox Runner for active custom plugins text modifications ---
  const executePluginOnBlock = async (blockId: string) => {
    const activePlugins = plugins.filter(p => p.isActive);
    if (activePlugins.length === 0) {
      await triggerAlert("Nenhum plugin ativo", "Acesse a aba 'Plugins JS' para ativar ou criar um plugin.");
      return;
    }

    const selectedPluginId = await triggerSelectPlugin(
      "Executar Plugin",
      "Escolha qual plugin deseja executar no bloco selecionado:",
      activePlugins.map(p => ({ id: p.id, name: p.name }))
    );
    if (!selectedPluginId) return;

    const selectedPlugin = activePlugins.find(p => p.id === selectedPluginId);
    if (!selectedPlugin) {
      await triggerAlert("Seleção Inválida", "O plugin selecionado não é válido.");
      return;
    }

    setPluginLogs(prev => [...prev, `[Event] Iniciando plugin "${selectedPlugin.name}"...`]);

    // Build the sandbox context environment
    const context = {
      blocks: blocks,
      selectedBlockId: blockId,
      log: (message: string) => {
        const timeStamp = new Date().toLocaleTimeString();
        setPluginLogs(prev => [...prev, `[${timeStamp}] [${selectedPlugin.name}]: ${message}`]);
      },
      updateBlockContent: async (id: string, content: string) => {
        // Direct React-update
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
        
        // backend update callback
        await fetch(`/api/blocks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content })
        });
      },
      api: {
        // Cors-bypass fetch wrapper proxy for plugins
        fetch: async (url: string, options?: any) => {
          context.log(`Consultando API Externa: ${url}`);
          const res = await fetch("/api/proxy/fetch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, options })
          });
          return res;
        },
        // OpenAI / Gemini intelligent prompt call
        geminiPrompt: async (prompt: string) => {
          context.log(`Invocando inteligência artificial (Gemini) com prompt.`);
          const res = await fetch("/api/proxy/gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt })
          });
          return await res.json();
        }
      }
    };

    try {
      // Compile script modules using isolated Javascript evaluator
      const sourceCode = selectedPlugin.code;
      
      // Transform ESM exports statement to function return statement
      const executableCode = sourceCode
        .replace(/export\s+default\s+/, "return ")
        .replace(/export\s+const\s+run\s*=/, "const run =");

      const compiledModule = new Function(executableCode)();
      
      if (compiledModule && typeof compiledModule.run === "function") {
        const result = await compiledModule.run(context);
        context.log(`Execução concluída com sucesso! Resultado: ${JSON.stringify(result || {})}`);
      } else {
        context.log(`[Error] O script do plugin não exporta uma função 'run' válida.`);
      }

    } catch (err: any) {
      const timeStamp = new Date().toLocaleTimeString();
      setPluginLogs(prev => [...prev, `[${timeStamp}] [Error] [${selectedPlugin.name}]: ${err.message}`]);
      await triggerAlert("Erro na execução", `Erro na execução do script do plugin: ${err.message}`);
    }
  };

  // --- 4. Remote SQL Query Executor panel callbacks ---
  const handleExecuteSql = async (sqlString: string): Promise<SqlQueryResult> => {
    // Add to state query history list
    if (sqlString && !queryHistory.includes(sqlString)) {
      setQueryHistory(prev => [sqlString].concat(prev.slice(0, 15)));
    }

    try {
      const res = await fetch("/api/sql/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sqlString })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  // --- 5. Modular JSON Backup Exporters ---
  const handleExportWorkspace = async () => {
    try {
      const res = await fetch("/api/workspace/backup");
      return await res.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleImportWorkspace = async (backupData: any): Promise<boolean> => {
    try {
      const res = await fetch("/api/workspace/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupData)
      });
      const data = await res.json();
      return data.success || false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const activePage = pages.find(p => p.id === activePageId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 font-sans antialiased text-neutral-300">
      
      {/* Notion Sidebar Navigator */}
      <Sidebar
        pages={pages}
        activePageId={activePageId}
        onPageSelect={setActivePageId}
        onAddPage={handleAddPage}
        onDeletePage={handleDeletePage}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        syncStatus={syncStatus}
        onTriggerManualSync={triggerManualSync}
        plugins={plugins}
      />

      {/* Main Container Sandbox Workspace */}
      <div className="flex-1 h-full flex flex-col relative overflow-hidden bg-[#121212]" id="main-root-workspace">
        
        {currentTab === "editor" && (
          <Editor
            page={activePage}
            blocks={blocks}
            onUpdatePage={handleUpdatePage}
            onAddBlock={handleAddBlock}
            onUpdateBlock={handleUpdateBlock}
            onDeleteBlock={handleDeleteBlock}
            onReorderBlocks={handleReorderBlocks}
            onExecutePluginOnBlock={executePluginOnBlock}
            pluginsActive={plugins.some(p => p.isActive)}
          />
        )}

        {currentTab === "sql" && (
          <SqlConsole
            onRunQuery={handleExecuteSql}
            queryHistory={queryHistory}
            onClearHistory={() => setQueryHistory([])}
            syncDatabase={triggerManualSync}
          />
        )}

        {currentTab === "plugins" && (
          <PluginConsole
            plugins={plugins}
            onAddPlugin={handleAddPlugin}
            onUpdatePlugin={handleUpdatePlugin}
            onDeletePlugin={handleDeletePlugin}
            pluginLogs={pluginLogs}
            onClearLogs={() => setPluginLogs([])}
          />
        )}

        {currentTab === "export" && (
          <ExportImport
            onExport={handleExportWorkspace}
            onImport={handleImportWorkspace}
            syncDatabase={triggerManualSync}
          />
        )}

      </div>

      {/* Custom Modal Overlay */}
      {modal && modal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider border-b border-neutral-800 pb-2 flex items-center">
              <span>{modal.title}</span>
            </h3>
            
            <p className="text-xs text-neutral-400 leading-relaxed">
              {modal.message}
            </p>

            {modal.type === "selectPlugin" && modal.options && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
                {modal.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => modal.onConfirm(opt.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium bg-neutral-950 hover:bg-neutral-800 border border-neutral-850 hover:border-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer"
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-800/60">
              {modal.type !== "selectPlugin" && modal.onCancel && (
                <button
                  onClick={modal.onCancel}
                  className="px-3.5 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-850 rounded-lg text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              {modal.type !== "selectPlugin" && (
                <button
                  onClick={() => modal.onConfirm()}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer ${
                    modal.type === "confirm" ? "bg-rose-600 hover:bg-rose-500 shadow-md hover:shadow-rose-950/20" : "bg-indigo-600 hover:bg-indigo-500 shadow-md hover:shadow-indigo-950/20"
                  }`}
                >
                  Confirmar
                </button>
              )}
              {modal.type === "selectPlugin" && modal.onCancel && (
                <button
                  onClick={modal.onCancel}
                  className="px-3.5 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-850 rounded-lg text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
