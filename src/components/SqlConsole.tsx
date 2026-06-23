import React, { useState } from "react";
import { Database, Play, Trash2, HelpCircle, Table, CheckSquare, ListFilter, History, Sparkles } from "lucide-react";
import { SqlQueryResult } from "../types";

interface SqlConsoleProps {
  onRunQuery: (query: string) => Promise<SqlQueryResult>;
  queryHistory: string[];
  onClearHistory: () => void;
  syncDatabase: () => void;
}

const queryPresets = [
  {
    label: "Selecione todas as páginas",
    sql: "SELECT id, title, icon, cover, isArchived FROM pages"
  },
  {
    label: "Blocos de Metas Trimestrais",
    sql: "SELECT id, type, content, checked FROM blocks WHERE pageId = 'p3' ORDER BY sortOrder ASC"
  },
  {
    label: "Contar blocos por categoria",
    sql: "SELECT type, COUNT(id) AS total FROM blocks GROUP BY type"
  },
  {
    label: "Alterar título via SQL",
    sql: "UPDATE pages SET title = '🏆 Workspace Atualizado via SQL' WHERE id = 'p1'"
  },
  {
    label: "Ver todos os plugins",
    sql: "SELECT name, version, isActive FROM plugins"
  }
];

export default function SqlConsole({
  onRunQuery,
  queryHistory,
  onClearHistory,
  syncDatabase
}: SqlConsoleProps) {
  const [query, setQuery] = useState("SELECT * FROM pages WHERE isArchived = false");
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const handleExecute = async (sqlText: string) => {
    setIsRunning(true);
    const start = performance.now();
    try {
      const res = await onRunQuery(sqlText);
      const end = performance.now();
      setExecutionTime(Math.round((end - start) * 100) / 100);
      setResult(res);
      
      // If write query was success, trigger list update
      const lowerText = sqlText.toLowerCase();
      if (res.success && (lowerText.includes("update") || lowerText.includes("insert") || lowerText.includes("delete"))) {
        setTimeout(() => syncDatabase(), 300); // Let server persist first
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message });
      setExecutionTime(null);
    } finally {
      setIsRunning(false);
    }
  };

  const handlePresetSelect = (presetSql: string) => {
    setQuery(presetSql);
    handleExecute(presetSql);
  };

  return (
    <div id="sql-console-tab" className="flex-1 bg-neutral-950 p-6 flex flex-col h-screen overflow-y-auto space-y-6 text-neutral-200">
      
      {/* Visual Workspace Database Model Dashboard */}
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Database className="w-6 h-6 text-amber-500" />
          <h2 className="text-xl font-bold font-sans tracking-tight text-neutral-100">Console do Banco de Dados SQL</h2>
        </div>
        <p className="text-xs text-neutral-500 max-w-2xl leading-relaxed">
          O Noção e Plugins conta com um banco relacional integrado na API Express. Qualquer mudança no texto de suas notas atualiza instantaneamente a tabela relacional de blocos, permitindo que você escreva consultas reais-time SQL.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Editor Control */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
            <div className="px-4 py-2.5 bg-neutral-900/40 border-b border-neutral-800 flex justify-between items-center header-bar">
              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 font-bold">SQL Editor Shell</span>
              <span className="text-[9px] bg-amber-950/40 border border-amber-900/30 text-amber-500 rounded px-1.5 py-0.5">AlaSQL Parser</span>
            </div>
            
            <textarea
              id="sql-shell-editor"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-32 bg-neutral-950 p-4 font-mono text-xs focus:outline-none focus:ring-0 text-neutral-300 resize-none font-medium leading-relaxed"
              placeholder="Digite sua consulta SQL aqui (ex: SELECT * FROM pages)"
            />

            <div className="px-4 py-2.5 bg-neutral-900/70 border-t border-neutral-800 flex justify-between items-center footer-bar">
              <div className="flex items-center space-x-1">
                <HelpCircle className="w-3.5 h-3.5 text-neutral-600" />
                <span className="text-[10px] text-neutral-500">Aperte em Executar para aplicar</span>
              </div>
              <button
                id="execute-query-btn"
                onClick={() => handleExecute(query)}
                disabled={isRunning}
                className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs px-4 py-1.5 rounded-lg shadow-md hover:shadow-amber-900/20 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isRunning ? "Rodando..." : "Executar"}</span>
              </button>
            </div>
          </div>

          {/* Preset templates options */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Templates sugeridos de Aprendizado</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="sql-presets-grid">
              {queryPresets.map((preset, idx) => (
                <button
                  key={idx}
                  id={`sql-preset-${idx}`}
                  onClick={() => handlePresetSelect(preset.sql)}
                  className="p-3 text-left bg-neutral-900 border border-neutral-800/80 hover:border-amber-500 rounded-xl transition-all hover:bg-neutral-900/40 cursor-pointer flex flex-col justify-between h-20 group"
                >
                  <span className="text-[11px] font-semibold text-neutral-300 group-hover:text-amber-400 transition-colors leading-normal">{preset.label}</span>
                  <span className="text-[9px] font-mono text-neutral-600 group-hover:text-neutral-500 truncate w-full">{preset.sql}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Relational Table Schema Diagram Visualizer */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-widest flex items-center mb-2">
            <Table className="w-4 h-4 text-neutral-400 mr-2" />
            Modelagem do Banco de Dados
          </h3>
          
          <div className="space-y-3.5 text-xs">
            {/* Table Pages */}
            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
              <div className="font-mono font-semibold text-amber-400 text-[11px] border-b border-neutral-900 pb-1 mb-1.5">
                📁 Table: pages
              </div>
              <ul className="space-y-1 font-mono text-[10px] text-neutral-500">
                <li><strong className="text-neutral-400">id</strong> (primary key, STRING)</li>
                <li><strong className="text-neutral-400">title</strong> (STRING)</li>
                <li><strong className="text-neutral-400">icon</strong> (emoji character, STRING)</li>
                <li><strong className="text-neutral-400">cover</strong> (image cover URL, STRING)</li>
                <li><strong className="text-neutral-400">isArchived</strong> (BOOLEAN)</li>
                <li><strong className="text-neutral-400">updatedAt</strong> (timestamp, INT)</li>
              </ul>
            </div>

            {/* Table Blocks */}
            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
              <div className="font-mono font-semibold text-sky-400 text-[11px] border-b border-neutral-900 pb-1 mb-1.5">
                🧱 Table: blocks
              </div>
              <ul className="space-y-1 font-mono text-[10px] text-neutral-500">
                <li><strong className="text-neutral-400">id</strong> (primary key, STRING)</li>
                <li><strong className="text-neutral-400">pageId</strong> (foreign key reference, STRING)</li>
                <li><strong className="text-neutral-400">type</strong> (text, heading1... STRING)</li>
                <li><strong className="text-neutral-400">content</strong> (text / tables JSON, STRING)</li>
                <li><strong className="text-neutral-400">checked</strong> (checked boolean status, BOOLEAN)</li>
                <li><strong className="text-neutral-400">language</strong> (code block language, STRING)</li>
                <li><strong className="text-neutral-400">sortOrder</strong> (sort index, INT)</li>
                <li><strong className="text-neutral-400">updatedAt</strong> (timestamp, INT)</li>
              </ul>
            </div>

            {/* Table Plugins */}
            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
              <div className="font-mono font-semibold text-purple-400 text-[11px] border-b border-neutral-900 pb-1 mb-1.5">
                🔌 Table: plugins
              </div>
              <ul className="space-y-1 font-mono text-[10px] text-neutral-500">
                <li><strong className="text-neutral-400">id</strong> (primary key, STRING)</li>
                <li><strong className="text-neutral-400">name</strong> (STRING)</li>
                <li><strong className="text-neutral-400">description</strong> (STRING)</li>
                <li><strong className="text-neutral-400">version</strong> (STRING)</li>
                <li><strong className="text-neutral-400">isActive</strong> (BOOLEAN)</li>
                <li><strong className="text-neutral-400">code</strong> (JS source script, STRING)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Query ResultSet Grid Display */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-4 py-3 bg-neutral-900/60 border-b border-neutral-800 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <ListFilter className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-neutral-300 text-xs uppercase">Resultado da Consulta</span>
          </div>
          {executionTime !== null && (
            <span className="text-[10px] font-mono text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
              ⚡ Execução: {executionTime}ms
            </span>
          )}
        </div>

        <div className="p-4" id="sql-result-display">
          {!result ? (
            <div className="text-center py-10 text-xs text-neutral-600">
              Nenhuma instrução SQL realizada nesta sessão. Insira sua consulta e aperte Executar.
            </div>
          ) : !result.success ? (
            <div className="p-3 bg-rose-950/20 border border-rose-800/40 text-rose-400 rounded-lg text-xs font-mono font-medium leading-relaxed">
              ❌ Erro de Sintaxe SQL: {result.error}
            </div>
          ) : result.rows && result.rows.length === 0 && (result.affectedRows || 0) > 0 ? (
            <div className="p-3 bg-indigo-950/20 border border-indigo-800/40 text-indigo-400 rounded-lg text-xs font-mono">
              ✔️ Query executada com sucesso. Linhas afetadas: {result.affectedRows}
            </div>
          ) : result.rows && result.rows.length === 0 ? (
            <div className="text-center py-10 text-xs text-neutral-500 font-mono">
              ✔️ Consulta realizada com sucesso, porém retornou 0 linhas.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left text-neutral-300 border-collapse border border-neutral-950">
                <thead>
                  <tr className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 font-mono text-[10px]">
                    {result.columns?.map((col, idx) => (
                      <th key={idx} className="p-2 border border-neutral-800 select-all font-semibold capitalize max-w-44 truncate">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono text-[11px]">
                  {result.rows?.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-neutral-800/30 border-b border-neutral-800/50">
                      {result.columns?.map((col, cIdx) => {
                        const val = row[col];
                        const stringValue = typeof val === "object" ? JSON.stringify(val) : String(val ?? "");
                        return (
                          <td key={cIdx} className="p-2 border border-neutral-800/70 truncate max-w-xs group relative selection:bg-amber-800/30" title={stringValue}>
                            {stringValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* History panel */}
      {queryHistory.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-3">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center">
              <History className="w-4 h-4 text-neutral-500 mr-2" />
              Histórico de Consultas
            </span>
            <button
              onClick={onClearHistory}
              className="text-[10px] text-rose-500 hover:text-rose-400 flex items-center shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpar
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[10px] text-neutral-500" id="sql-history-list">
            {queryHistory.map((h, idx) => (
              <div 
                key={idx} 
                onClick={() => setQuery(h)}
                className="p-1 px-2.5 bg-neutral-950 rounded border border-neutral-800 cursor-pointer hover:border-amber-600 hover:text-neutral-300 truncate"
                title="Clique para carregar no editor"
              >
                {h}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
