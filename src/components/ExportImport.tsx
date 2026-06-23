import React, { useState } from "react";
import { Download, Upload, Copy, Check, FileCode, CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";

interface ExportImportProps {
  onExport: () => Promise<any>;
  onImport: (backupData: any) => Promise<boolean>;
  syncDatabase: () => void;
}

export default function ExportImport({
  onExport,
  onImport,
  syncDatabase
}: ExportImportProps) {
  const [jsonText, setJsonText] = useState("");
  const [importedStatus, setImportedStatus] = useState<"idle" | "success" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerExport = async () => {
    setIsExporting(true);
    try {
      const data = await onExport();
      setJsonText(JSON.stringify(data, null, 2));
    } catch (e) {
      console.error("Export failure", e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTriggerImport = async () => {
    if (!jsonText.trim()) return;
    try {
      const parsed = JSON.parse(jsonText);
      const success = await onImport(parsed);
      if (success) {
        setImportedStatus("success");
        setTimeout(() => {
          setImportedStatus("idle");
          syncDatabase();
        }, 1200);
      } else {
        setImportedStatus("error");
      }
    } catch (err) {
      setImportedStatus("error");
    }
  };

  return (
    <div id="export-import-tab" className="flex-1 bg-neutral-950 p-6 flex flex-col h-screen overflow-y-auto space-y-6 text-neutral-200">
      
      {/* Title Header */}
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Download className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-bold font-sans tracking-tight text-neutral-100">Exportação & Backup JSON</h2>
        </div>
        <p className="text-xs text-neutral-500 max-w-2xl leading-relaxed">
          Exporte toda a sua infraestrutura de documentos, blocos de tabelas, checkbox de metas trimestrais e o código de seus plugins customizados de maneira rápida e modular em um único arquivo JSON unificado e portable.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Left Option: Backup Exporter */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
            <div className="flex items-center space-x-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Exportar Workspace</span>
            </div>
            
            <button
              onClick={handleTriggerExport}
              disabled={isExporting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-1 rounded-md flex items-center space-x-1 shadow-md hover:shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isExporting ? 'animate-spin' : ''}`} />
              <span>{isExporting ? "Gerando..." : "Gerar JSON"}</span>
            </button>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed leading-normal">
            Clique no botão acima para consolidar todos os registros de tabelas do banco SQL e encapsular em um modelo compatível com migrações ou leitores NoSQL/JSON externos.
          </p>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-mono text-neutral-500 font-bold block">Consolidação JSON:</span>
            {jsonText ? (
              <div className="relative">
                <textarea
                  readOnly
                  value={jsonText}
                  className="w-full h-56 bg-neutral-950 p-3 font-mono text-[10px] text-neutral-400 border border-neutral-800 focus:outline-none rounded-lg resize-none"
                />
                <button
                  onClick={handleCopy}
                  className="absolute right-3 top-3 bg-neutral-900 hover:bg-neutral-850 p-1.5 rounded-md border border-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  title="Copiar JSON"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <div className="h-56 border border-dashed border-neutral-800 rounded-lg flex items-center justify-center text-xs text-neutral-600 font-mono">
                Aguardando clique para empacotamento...
              </div>
            )}
          </div>
        </div>

        {/* Right Option: Backup Restorer / Importer */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
            <div className="flex items-center space-x-2">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Restaurar Workspace</span>
            </div>

            <button
              id="restore-workspace-btn"
              onClick={handleTriggerImport}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-3.5 py-1 rounded-md flex items-center space-x-1 shadow-md hover:shadow-indigo-950 active:scale-95 transition-all cursor-pointer"
            >
              <span>Importar JSON</span>
            </button>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed leading-normal">
            Cole um texto ou arquivo de Backup JSON estruturado e clique no botão de importação acima para sobrescrever as tabelas SQL do servidor pelas novas definições.
          </p>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-mono text-neutral-500 font-bold block font-bold">Colar Backup JSON:</span>
            <textarea
              id="import-json-area"
              placeholder='Ex: { "pages": [], "blocks": [], "plugins": [] }'
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full h-56 bg-neutral-950 p-3 font-mono text-[10px] text-neutral-400 border border-neutral-800 focus:outline-none rounded-lg resize-none"
            />
          </div>

          {/* Import Status Indicator */}
          {importedStatus === "success" && (
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/50 text-emerald-400 rounded-lg text-xs flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              <span>Workspace restaurado e sincronizado com o servidor com sucesso!</span>
            </div>
          )}
          {importedStatus === "error" && (
            <div className="p-3.5 bg-rose-950/30 border border-rose-800/50 text-rose-400 rounded-lg text-xs leading-relaxed font-mono">
              ⚠️ Falha ao importar dados. Verifique a sintaxe JSON e tente novamente.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
