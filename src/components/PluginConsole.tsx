import React, { useState } from "react";
import { Cpu, Play, Save, Plus, Trash2, Power, Terminal, Settings2 } from "lucide-react";
import { Plugin } from "../types";

interface PluginConsoleProps {
  plugins: Plugin[];
  onAddPlugin: (name: string, description: string, code: string) => void;
  onUpdatePlugin: (id: string, updated: Partial<Plugin>) => void;
  onDeletePlugin: (id: string) => void;
  pluginLogs: string[];
  onClearLogs: () => void;
}

const blankPluginBoilerplate = `// Template básico de Plugin JavaScript para o Noção
const run = async (context) => {
  context.log("Iniciando execução do plugin customizado...");
  
  // 1. Obter informações de blocos ou página atual
  const blocks = context.blocks || [];
  context.log(\`Total de blocos carregados neste documento: \${blocks.length}\`);
  
  // 2. Localizar bloco selecionado
  const selectedBlockId = context.selectedBlockId;
  const block = blocks.find(b => b.id === selectedBlockId);
  
  if (block) {
    context.log(\`Bloco ativo localizado: tipo="\${block.type}" | conteúdo="\${block.content}"\`);
    
    // 3. Modificar conteúdo do bloco de forma imediata
    const newContent = block.content.toUpperCase();
    await context.updateBlockContent(selectedBlockId, newContent);
    context.log("Conteúdo convertido para maiúsculas!");
  } else {
    context.log("Dica: Clique em algum bloco no Editor antes de rodar este plugin!");
  }
  
  return { status: "success" };
};

export default { run };`;

export default function PluginConsole({
  plugins,
  onAddPlugin,
  onUpdatePlugin,
  onDeletePlugin,
  pluginLogs,
  onClearLogs
}: PluginConsoleProps) {
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(plugins[0]?.id || null);
  const [editingCode, setEditingCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const activePlugin = plugins.find(p => p.id === selectedPluginId) || plugins[0];

  // Sync editing script state when active plugin shifts
  React.useEffect(() => {
    if (activePlugin) {
      setEditingCode(activePlugin.code);
    } else {
      setEditingCode("");
    }
  }, [activePlugin?.id]);

  const handleCreatePlugin = () => {
    if (!newName.trim()) return;
    onAddPlugin(
      newName,
      newDesc || "Plugin customizado do usuário em JavaScript.",
      blankPluginBoilerplate
    );
    setNewName("");
    setNewDesc("");
  };

  const handleSavePlugin = () => {
    if (!activePlugin) return;
    onUpdatePlugin(activePlugin.id, { code: editingCode });
  };

  return (
    <div id="plugin-console-tab" className="flex-1 bg-neutral-950 p-6 flex flex-col h-screen overflow-y-auto space-y-6 text-neutral-200">
      
      {/* Title Header */}
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Cpu className="w-6 h-6 text-sky-400" />
          <h2 className="text-xl font-bold font-sans tracking-tight text-neutral-100">Expansão por Plugins JavaScript</h2>
        </div>
        <p className="text-xs text-neutral-500 max-w-2xl leading-relaxed">
          Escreva plugins personalizados utilizando ES6 Javascript para modificar blocos do editor, obter contagem métrica de palavras, ou comunicar-se com APIs externas de terceiros em tempo real. Os scripts são executados em um ambiente controlado de sandbox seguro.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* Left column: Plugins List & Creator */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-4 shadow-xl">
            <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 block border-b border-neutral-800 pb-2">Plugins Cadastrados</span>
            
            <div className="space-y-1.5 max-h-56 overflow-y-auto" id="plugins-list-accordion">
              {plugins.length === 0 ? (
                <div className="text-neutral-600 text-[11px] text-center py-4">Nenhum plugin criado.</div>
              ) : (
                plugins.map(p => {
                  const isSelected = activePlugin?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPluginId(p.id)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between h-20 relative overflow-hidden group/item ${
                        isSelected 
                          ? "bg-neutral-950 border-sky-500/80 shadow-md" 
                          : "bg-neutral-950/40 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950/20"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-neutral-200 truncate pr-6">{p.name}</span>
                        <div className="flex items-center space-x-2 shrink-0">
                          {p.isActive ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Ativo" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" title="Desativado" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-neutral-500 line-clamp-2 leading-relaxed pr-6">{p.description}</p>

                      {/* Power / Delete buttons inside panel */}
                      <div className="absolute right-2 bottom-2 flex items-center space-x-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdatePlugin(p.id, { isActive: !p.isActive });
                          }}
                          className={`p-1 rounded cursor-pointer ${p.isActive ? "text-emerald-400 hover:bg-emerald-950/40" : "text-neutral-500 hover:bg-neutral-800"}`}
                          title={p.isActive ? "Desativar Plugin" : "Ativar Plugin"}
                        >
                          <Power className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePlugin(p.id);
                          }}
                          className="p-1 rounded text-rose-500 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                          title="Excluir Plugin"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Create custom dynamic plugin block */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3.5 shadow-xl">
            <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 block border-b border-neutral-800 pb-2">Criar Novo Plugin</span>
            <div className="space-y-2">
              <input
                id="new-plugin-name"
                type="text"
                placeholder="Nome do Plugin e.g. Formatter"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs rounded-lg text-neutral-200 focus:outline-none focus:border-indigo-500"
              />
              <textarea
                id="new-plugin-desc"
                placeholder="Descrição resumida de funcionalidade"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs rounded-lg text-neutral-200 focus:outline-none focus:border-indigo-500 resize-none"
              />
              <button
                id="create-plugin-btn"
                onClick={handleCreatePlugin}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs py-2 rounded-lg flex items-center justify-center space-x-1 shadow-md hover:shadow-sky-900/10 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Salvar & Abrir Template</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center column - Editor with active code */}
        <div className="xl:col-span-3 space-y-4">
          {activePlugin ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="px-4 py-3 bg-neutral-100/5 border-b border-neutral-800 flex justify-between items-center header-bar">
                <div className="flex flex-col">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-semibold text-neutral-100">{activePlugin.name}</span>
                    <span className="text-[10px] bg-neutral-800 border border-neutral-700/60 text-neutral-400 font-mono rounded px-1.5">v{activePlugin.version}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 truncate mt-0.5">{activePlugin.description}</span>
                </div>

                <div className="flex items-center space-x-3.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs text-neutral-400">Status:</span>
                    <button
                      onClick={() => onUpdatePlugin(activePlugin.id, { isActive: !activePlugin.isActive })}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                        activePlugin.isActive 
                          ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-400" 
                          : "bg-neutral-950 border-neutral-800 text-neutral-500"
                      }`}
                    >
                      {activePlugin.isActive ? "Ativo" : "Inativo"}
                    </button>
                  </div>

                  <button
                    id="save-plugin-code-btn"
                    onClick={handleSavePlugin}
                    className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-md hover:shadow-indigo-950 cursor-pointer transition-all active:scale-95"
                    title="Compilar & Salvar Script"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Código</span>
                  </button>
                </div>
              </div>

              {/* Code IDE Area */}
              <div className="relative">
                <textarea
                  id="plugin-code-editor"
                  value={editingCode}
                  onChange={(e) => setEditingCode(e.target.value)}
                  className="w-full h-96 bg-neutral-950 p-4 font-mono text-xs focus:outline-none text-neutral-300 resize-none font-medium leading-relaxed"
                />
                <div className="absolute right-4 bottom-4 text-[10px] font-mono text-neutral-600 pointer-events-none">
                  eslint-ready JS Module
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl py-16 text-center text-neutral-500">
              Selecione ou crie um plugin na barra lateral para começar a programar.
            </div>
          )}

          {/* Plugin Terminal Console Logs Output (Extremely important for developers debugging) */}
          <div className="bg-neutral-900 border border-neutral-850 rounded-xl overflow-hidden shadow-xl">
            <div className="px-4 py-2 bg-neutral-950 border-b border-neutral-850 flex justify-between items-center header-bar">
              <span className="text-[10px] font-bold font-mono text-neutral-400 uppercase tracking-widest flex items-center">
                <Terminal className="w-3.5 h-3.5 text-indigo-400 mr-2" />
                Console do Motor de Plugins (Logs)
              </span>
              <button
                onClick={onClearLogs}
                className="text-[9px] hover:bg-neutral-900 text-neutral-500 hover:text-rose-400 border border-neutral-800 px-2 py-0.5 rounded cursor-pointer"
              >
                Limpar Terminal
              </button>
            </div>
            
            <div 
              id="plugin-terminal-logs" 
              className="bg-neutral-950 p-4 font-mono text-[11px] h-32 overflow-y-auto space-y-1 text-neutral-400 hover:text-neutral-300 select-text selection:bg-neutral-800"
            >
              {pluginLogs.length === 0 ? (
                <div className="text-neutral-700 italic">Nenhum evento registrado no console. Chame/execute um plugin ativo no editor de páginas para ver logs...</div>
              ) : (
                pluginLogs.map((log, idx) => {
                  let logColor = "text-neutral-400";
                  if (log.includes("[Error]") || log.includes("Falha") || log.includes("Error")) {
                    logColor = "text-rose-400 font-semibold";
                  } else if (log.includes("Tradução") || log.includes("sucesso") || log.includes("concluída")) {
                    logColor = "text-emerald-400";
                  } else if (log.includes("[Metric]")) {
                    logColor = "text-sky-400";
                  }

                  return (
                    <div key={idx} className={`${logColor} leading-relaxed`}>
                      {log}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
