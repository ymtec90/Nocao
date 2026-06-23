import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  Settings, 
  CornerDownLeft, 
  CheckSquare, 
  Heading1, 
  Heading2, 
  Heading3, 
  AlignLeft, 
  Quote, 
  Code, 
  Table, 
  CloudSun,
  Flame,
  Globe,
  ArrowUp,
  ArrowDown,
  Sparkles
} from "lucide-react";
import { Block, BlockType, Page } from "../types";
import Markdown from "react-markdown";

const customMarkdownComponents: any = {
  strong: ({ children }: any) => <strong className="font-bold text-neutral-100">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-neutral-300">{children}</em>,
  a: ({ href, children }: any) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  ),
  code: ({ children }: any) => <code className="bg-neutral-900 border border-neutral-850 text-rose-400 px-1 py-0.5 rounded font-mono text-[11px]">{children}</code>,
  p: ({ children }: any) => <p className="text-neutral-300 text-sm leading-relaxed mb-1 last:mb-0">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 mb-2 text-neutral-300 text-sm">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-2 text-neutral-300 text-sm">{children}</ol>,
  li: ({ children }: any) => <li className="mb-0.5">{children}</li>,
  h1: ({ children }: any) => <h1 className="text-xl font-bold text-neutral-100 mt-2 mb-1">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-lg font-bold text-neutral-100 mt-2 mb-1">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-md font-semibold text-neutral-100 mt-1.5 mb-1">{children}</h3>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-indigo-500 pl-4 py-1.5 my-1 bg-indigo-950/25 rounded-r-lg text-indigo-200 italic">
      {children}
    </blockquote>
  )
};

interface EditorProps {
  page: Page | null;
  blocks: Block[];
  onUpdatePage: (updated: Partial<Page>) => void;
  onAddBlock: (type: BlockType, content: string, sortOrder: number) => void;
  onUpdateBlock: (id: string, updated: Partial<Block>) => void;
  onDeleteBlock: (id: string) => void;
  onReorderBlocks: (newBlocks: Block[]) => void;
  onExecutePluginOnBlock: (blockId: string) => void;
  pluginsActive: boolean;
}

// Pre-defined color presets for Page Covers
const coverPresets = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1615715757401-f30e7b27b912?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85"
];

const emojiPresets = ["📄", "🚀", "💻", "🎯", "🌟", "🔥", "💡", "💰", "🗺️", "📦", "🌦️", "🧠", "💼", "🧘", "🎨"];

export default function Editor({
  page,
  blocks,
  onUpdatePage,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onReorderBlocks,
  onExecutePluginOnBlock,
  pluginsActive
}: EditorProps) {
  const [activeSlashBlockId, setActiveSlashBlockId] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState("");
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [globalPreview, setGlobalPreview] = useState(false);
  const slashMenuRef = useRef<HTMLDivElement>(null);

  // Close slash command list when clicking outside
  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
        setActiveSlashBlockId(null);
      }
    }
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  if (!page) {
    return (
      <div className="flex-1 bg-neutral-950 flex flex-col items-center justify-center p-8 text-neutral-400">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto text-neutral-600 border border-neutral-800">
            <Table className="w-8 h-8 text-neutral-500" />
          </div>
          <h2 className="text-xl font-medium text-neutral-200">Nenhuma página aberta</h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Selecione uma das páginas de demonstração na barra lateral ou clique no botão <span className="font-semibold text-neutral-300">+</span> para criar uma nova pasta de banco de dados SQL.
          </p>
        </div>
      </div>
    );
  }

  // Handle slash commands popup trigger
  const handleBlockChange = (blockId: string, value: string) => {
    onUpdateBlock(blockId, { content: value });

    // Detect slash key (/) trigger
    const lines = value.split("\n");
    const lastLine = lines[lines.length - 1];
    if (lastLine.includes("/")) {
      const slashIndex = lastLine.lastIndexOf("/");
      const query = lastLine.substring(slashIndex + 1);
      setActiveSlashBlockId(blockId);
      setSlashQuery(query);
    } else {
      setActiveSlashBlockId(null);
    }
  };

  const selectSlashType = (blockId: string, type: BlockType) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    // Strip out the last slash command text from block value
    let newContent = block.content;
    const lastIndex = newContent.lastIndexOf("/");
    if (lastIndex !== -1) {
      newContent = newContent.substring(0, lastIndex);
    }

    let defaultContent = newContent.trim() || "";
    let defaultProperties = block.properties ? { ...block.properties } : {};

    if (type === "table") {
      defaultContent = JSON.stringify([
        { Coluna1: "Dado 1", Coluna2: "Dado 2" },
        { Coluna1: "Dado 3", Coluna2: "Dado 4" }
      ]);
    } else if (type === "todo") {
      defaultProperties.checked = false;
    } else if (type === "code") {
      defaultProperties.language = "javascript";
    }

    onUpdateBlock(blockId, {
      type,
      content: defaultContent,
      properties: defaultProperties
    });

    setActiveSlashBlockId(null);
  };

  // Move blocks up/down in UI sort order list
  const moveBlock = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === blocks.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...blocks];
    
    // Swap sorting index numbers
    const tempSort = reordered[index].sortOrder;
    reordered[index].sortOrder = reordered[targetIndex].sortOrder;
    reordered[targetIndex].sortOrder = tempSort;

    // Swap position in code array and submit reorder
    const tempObj = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = tempObj;

    onReorderBlocks(reordered);
  };

  // Convert types to elegant user interface labels
  const blockTypesMeta = [
    { type: "text", label: "Texto Simples", icon: <AlignLeft className="w-4 h-4 text-blue-400" />, desc: "Texto regular básico do Noção" },
    { type: "heading1", label: "Título 1", icon: <Heading1 className="w-4 h-4 text-emerald-400" />, desc: "Título principal grande" },
    { type: "heading2", label: "Título 2", icon: <Heading2 className="w-4 h-4 text-sky-400" />, desc: "Subtítulo médio de seção" },
    { type: "heading3", label: "Título 3", icon: <Heading3 className="w-4 h-4 text-indigo-400" />, desc: "Título pequeno complementar" },
    { type: "todo", label: "Checklist / Tarefa", icon: <CheckSquare className="w-4 h-4 text-rose-400" />, desc: "Item de tarefa interativa com checkbox" },
    { type: "bullet", label: "Lista com Marcador", icon: <span className="font-bold text-amber-400 text-sm leading-none">•</span>, desc: "Lista simples organizada" },
    { type: "quote", label: "Citação", icon: <Quote className="w-4 h-4 text-amber-500" />, desc: "Destaque de texto importante" },
    { type: "code", label: "Bloco de Código", icon: <Code className="w-4 h-4 text-purple-400" />, desc: "Bloco de programação com realce" },
    { type: "table", label: "Tabela de Dados", icon: <Table className="w-4 h-4 text-teal-400" />, desc: "Grade de informações em formato JSON" }
  ];

  const filteredBlockTypes = blockTypesMeta.filter(meta => 
    meta.label.toLowerCase().includes(slashQuery.toLowerCase()) ||
    meta.type.toLowerCase().includes(slashQuery.toLowerCase())
  );

  return (
    <div className="flex-1 bg-[#121212] overflow-y-auto h-screen flex flex-col relative text-neutral-200">
      
      {/* 1. Header Banner Image with Cover Changer */}
      <div className="h-48 w-full bg-neutral-800 relative group overflow-hidden shrink-0">
        <img 
          src={page.cover || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"} 
          alt="Page Cover" 
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-neutral-950/20" />
        
        {/* Banner Cover Control Bar */}
        <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/95 border border-neutral-700/60 p-1.5 rounded-lg flex space-x-1 shadow-lg backdrop-blur-sm z-10">
          {coverPresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => onUpdatePage({ cover: preset })}
              className="w-6 h-6 rounded-md overflow-hidden border border-neutral-700 hover:border-indigo-400 transition-all cursor-pointer"
            >
              <img src={preset} className="w-full h-full object-cover" alt="Preset" referrerPolicy="no-referrer" />
            </button>
          ))}
        </div>
      </div>

      {/* 2. Page Meta Grid Header: Title & Emojis */}
      <div className="max-w-3xl mx-auto w-full px-12 pt-8 pb-4 relative -mt-12 space-y-3 z-10">
        
        {/* Floating Page Emoji Icon Triggers */}
        <div className="relative group/emoji inline-block">
          <div className="w-20 h-20 rounded-2xl bg-neutral-900 border-2 border-[#121212] flex items-center justify-center text-4xl shadow-xl selection:bg-transparent">
            {page.icon || "📄"}
          </div>
          
          {/* Emoji Selection Bar */}
          <div className="absolute left-0 top-22 hidden group-hover/emoji:flex bg-neutral-900 border border-neutral-800 rounded-xl p-2 shadow-2xl space-x-1.5 backdrop-blur-md z-30 flex-wrap w-64">
            {emojiPresets.map((em, idx) => (
              <button
                key={idx}
                onClick={() => onUpdatePage({ icon: em })}
                className="hover:scale-125 transition-transform p-1 rounded-md text-xl cursor-pointer"
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Title Input and Mode Toggle */}
        <div className="flex items-center justify-between gap-4 py-1">
          <input
            id={`page-title-input-${page.id}`}
            type="text"
            value={page.title}
            placeholder="Página Sem Título"
            onChange={(e) => onUpdatePage({ title: e.target.value })}
            className="flex-1 bg-transparent text-3xl font-bold font-sans tracking-tight text-neutral-100 border-none outline-none focus:ring-0 placeholder-neutral-700 leading-tight block py-1"
            disabled={globalPreview}
          />
          
          <button
            onClick={() => setGlobalPreview(!globalPreview)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all shrink-0 ${
              globalPreview 
                ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/30" 
                : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
            }`}
            title={globalPreview ? "Mudar para modo de edição" : "Visualizar em Markdown"}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{globalPreview ? "Modo Leitura" : "Visualizar Markdown"}</span>
          </button>
        </div>
        <div className="border-b border-neutral-800/80 w-full pt-1" />
      </div>

      {/* 3. Interactive Blocks Listing */}
      <div className="max-w-3xl mx-auto w-full px-12 pb-32 space-y-4">
        {blocks.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/10">
            <p className="text-sm text-neutral-500">Sem conteúdo. Aperte no botão abaixo para criar o primeiro bloco.</p>
          </div>
        ) : (
          blocks.map((block, idx) => {
            const isEditing = editingBlockId === block.id && !globalPreview;

            return (
              <div 
                key={block.id} 
                id={`block-wrapper-${block.id}`}
                className={`group/block relative flex items-start space-x-2.5 py-1 px-1.5 rounded-lg border border-transparent transition-all duration-150 ${
                  globalPreview ? "" : "hover:border-neutral-800/40 hover:bg-neutral-900/20"
                }`}
              >
                {/* Visual Dragger / Modifier Control panel */}
                {!globalPreview && (
                  <div className="absolute -left-12 top-1 opacity-0 group-hover/block:opacity-100 transition-opacity flex items-center space-x-1 bg-neutral-900 border border-neutral-800/80 p-1 rounded-md shadow-md">
                    <button
                      onClick={() => moveBlock(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-indigo-400 disabled:opacity-30 cursor-pointer"
                      title="Mover para Cima"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveBlock(idx, "down")}
                      disabled={idx === blocks.length - 1}
                      className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-indigo-400 disabled:opacity-30 cursor-pointer"
                      title="Mover para Baixo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteBlock(block.id)}
                      className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-rose-400 cursor-pointer"
                      title="Excluir Bloco"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {pluginsActive && (
                      <button
                        onClick={() => onExecutePluginOnBlock(block.id)}
                        className="p-1 hover:bg-neutral-800 rounded text-amber-500 hover:text-amber-300 cursor-pointer"
                        title="Rodar Plugins neste bloco"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Main Content Area based on block type */}
                <div className="flex-1 min-w-0" id={`block-content-area-${block.id}`}>
                  {block.type === "heading1" && (
                    isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        value={block.content}
                        onChange={(e) => handleBlockChange(block.id, e.target.value)}
                        onBlur={() => setEditingBlockId(null)}
                        placeholder="Título 1 (Digite / para comandos)"
                        className="w-full bg-transparent text-2xl font-bold text-neutral-100 border-none outline-none focus:ring-0 py-1"
                      />
                    ) : (
                      <div 
                        onClick={() => !globalPreview && setEditingBlockId(block.id)}
                        className={`w-full text-2xl font-bold text-neutral-100 py-1 min-h-[2rem] ${!globalPreview ? "cursor-text hover:bg-neutral-900/5 rounded px-1 -mx-1" : ""}`}
                      >
                        {block.content || <span className="text-neutral-700 italic">Título 1...</span>}
                      </div>
                    )
                  )}

                  {block.type === "heading2" && (
                    isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        value={block.content}
                        onChange={(e) => handleBlockChange(block.id, e.target.value)}
                        onBlur={() => setEditingBlockId(null)}
                        placeholder="Título 2 (Digite / para comandos)"
                        className="w-full bg-transparent text-xl font-semibold text-neutral-200 border-none outline-none focus:ring-0 py-1"
                      />
                    ) : (
                      <div 
                        onClick={() => !globalPreview && setEditingBlockId(block.id)}
                        className={`w-full text-xl font-semibold text-neutral-200 py-1 min-h-[1.75rem] ${!globalPreview ? "cursor-text hover:bg-neutral-900/5 rounded px-1 -mx-1" : ""}`}
                      >
                        {block.content || <span className="text-neutral-700 italic">Título 2...</span>}
                      </div>
                    )
                  )}

                  {block.type === "heading3" && (
                    isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        value={block.content}
                        onChange={(e) => handleBlockChange(block.id, e.target.value)}
                        onBlur={() => setEditingBlockId(null)}
                        placeholder="Título 3 (Digite / para comandos)"
                        className="w-full bg-transparent text-lg font-medium text-neutral-300 border-none outline-none focus:ring-0 py-1"
                      />
                    ) : (
                      <div 
                        onClick={() => !globalPreview && setEditingBlockId(block.id)}
                        className={`w-full text-lg font-medium text-neutral-300 py-1 min-h-[1.5rem] ${!globalPreview ? "cursor-text hover:bg-neutral-900/5 rounded px-1 -mx-1" : ""}`}
                      >
                        {block.content || <span className="text-neutral-700 italic">Título 3...</span>}
                      </div>
                    )
                  )}

                  {block.type === "text" && (
                    isEditing ? (
                      <textarea
                        autoFocus
                        value={block.content}
                        onChange={(e) => handleBlockChange(block.id, e.target.value)}
                        onBlur={() => setEditingBlockId(null)}
                        placeholder="Comece a escrever... Digite '/' para comandos"
                        rows={block.content.split("\n").length || 1}
                        className="w-full bg-transparent text-sm text-neutral-300 border-none outline-none focus:ring-0 resize-none font-sans leading-relaxed py-1"
                      />
                    ) : (
                      <div 
                        onClick={() => !globalPreview && setEditingBlockId(block.id)}
                        className={`w-full text-sm text-neutral-300 leading-relaxed py-1 min-h-[1.5rem] ${!globalPreview ? "cursor-text hover:bg-neutral-900/5 rounded px-1 -mx-1" : ""}`}
                      >
                        {block.content ? (
                          <div className="markdown-body">
                            <Markdown components={customMarkdownComponents}>
                              {block.content}
                            </Markdown>
                          </div>
                        ) : (
                          <span className="text-neutral-700 italic">Comece a escrever... Digite '/' para comandos</span>
                        )}
                      </div>
                    )
                  )}

                  {block.type === "quote" && (
                    isEditing ? (
                      <div className="border-l-4 border-indigo-500 pl-4 py-1.5 my-1 bg-indigo-950/25 rounded-r-lg">
                        <textarea
                          autoFocus
                          value={block.content}
                          onChange={(e) => handleBlockChange(block.id, e.target.value)}
                          onBlur={() => setEditingBlockId(null)}
                          placeholder="Citação (Digite / para comandos)"
                          rows={block.content.split("\n").length || 1}
                          className="w-full bg-transparent text-sm text-indigo-200 italic border-none outline-none focus:ring-0 resize-none leading-relaxed py-1"
                        />
                      </div>
                    ) : (
                      <div 
                        onClick={() => !globalPreview && setEditingBlockId(block.id)}
                        className={`border-l-4 border-indigo-500 pl-4 py-1.5 my-1 bg-indigo-950/25 rounded-r-lg min-h-[1.5rem] ${!globalPreview ? "cursor-text hover:bg-indigo-950/15" : ""}`}
                      >
                        {block.content ? (
                          <div className="markdown-body text-indigo-200 italic">
                            <Markdown components={customMarkdownComponents}>
                              {block.content}
                            </Markdown>
                          </div>
                        ) : (
                          <span className="text-neutral-700 italic px-1">Citação (Digite / para comandos)</span>
                        )}
                      </div>
                    )
                  )}

                  {block.type === "todo" && (
                    <div className="flex items-start space-x-2.5 py-1">
                      <input
                        type="checkbox"
                        disabled={globalPreview}
                        checked={block.properties?.checked || false}
                        onChange={(e) => onUpdateBlock(block.id, { 
                          properties: { ...(block.properties || {}), checked: e.target.checked } 
                        })}
                        className="mt-1 w-4.5 h-4.5 accent-indigo-600 cursor-pointer bg-neutral-900 border-neutral-700 rounded text-indigo-500"
                      />
                      {isEditing ? (
                        <input
                          autoFocus
                          type="text"
                          value={block.content}
                          onChange={(e) => handleBlockChange(block.id, e.target.value)}
                          onBlur={() => setEditingBlockId(null)}
                          placeholder="Tarefa..."
                          className={`flex-1 bg-transparent text-sm border-none outline-none focus:ring-0 ${
                            block.properties?.checked ? "line-through text-neutral-500" : "text-neutral-300"
                          }`}
                        />
                      ) : (
                        <div 
                          onClick={() => !globalPreview && setEditingBlockId(block.id)}
                          className={`flex-1 text-sm leading-relaxed py-0.5 min-h-[1.5rem] ${!globalPreview ? "cursor-text hover:bg-neutral-900/5 rounded px-1 -mx-1" : ""} ${
                            block.properties?.checked ? "line-through text-neutral-500" : "text-neutral-300"
                          }`}
                        >
                          {block.content ? (
                            <div className="markdown-body">
                              <Markdown components={customMarkdownComponents}>
                                {block.content}
                              </Markdown>
                            </div>
                          ) : (
                            <span className="text-neutral-700 italic">Tarefa...</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {block.type === "bullet" && (
                    isEditing ? (
                      <div className="flex items-start space-x-2 py-1">
                        <span className="text-amber-500 text-lg leading-none shrink-0">•</span>
                        <textarea
                          autoFocus
                          value={block.content}
                          onChange={(e) => handleBlockChange(block.id, e.target.value)}
                          onBlur={() => setEditingBlockId(null)}
                          placeholder="Lista..."
                          rows={block.content.split("\n").length || 1}
                          className="w-full bg-transparent text-sm text-neutral-300 border-none outline-none focus:ring-0 resize-none leading-relaxed py-0.5"
                        />
                      </div>
                    ) : (
                      <div 
                        onClick={() => !globalPreview && setEditingBlockId(block.id)}
                        className={`flex items-start space-x-2 py-1 min-h-[1.5rem] ${!globalPreview ? "cursor-text hover:bg-neutral-900/5 rounded px-1 -mx-1" : ""}`}
                      >
                        <span className="text-amber-500 text-lg leading-none shrink-0">•</span>
                        <div className="flex-1">
                          {block.content ? (
                            <div className="markdown-body">
                              <Markdown components={customMarkdownComponents}>
                                {block.content}
                              </Markdown>
                            </div>
                          ) : (
                            <span className="text-neutral-700 italic">Lista...</span>
                          )}
                        </div>
                      </div>
                    )
                  )}

                  {block.type === "code" && (
                    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 my-1 font-mono text-xs">
                      <div className="flex justify-between items-center mb-2 border-b border-neutral-900 pb-2 text-neutral-500 header-bar">
                        <select
                          disabled={globalPreview}
                          value={block.properties?.language || "javascript"}
                          onChange={(e) => onUpdateBlock(block.id, {
                            properties: { ...(block.properties || {}), language: e.target.value }
                          })}
                          className="bg-neutral-900 text-neutral-400 border border-neutral-800 p-0.5 px-1.5 rounded outline-none"
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="sql">SQL Query</option>
                          <option value="json">JSON format</option>
                        </select>
                        <span className="text-[10px] uppercase">Código Editor</span>
                      </div>
                      <textarea
                        disabled={globalPreview}
                        value={block.content}
                        onChange={(e) => onUpdateBlock(block.id, { content: e.target.value })}
                        placeholder="// Escreva seu código aqui..."
                        rows={Math.max(3, block.content.split("\n").length) || 3}
                        className="w-full bg-transparent font-mono text-neutral-300 border-none outline-none focus:ring-0 resize-none select-text"
                      />
                    </div>
                  )}

                  {block.type === "table" && (
                    <EditableTableBlock 
                      content={block.content}
                      onChange={(newData) => onUpdateBlock(block.id, { content: newData })}
                      disabled={globalPreview}
                    />
                  )}

                  {/* Rendering widget outputs if a plugin matches this custom block type */}
                  {!["heading1", "heading2", "heading3", "text", "quote", "todo", "bullet", "code", "table"].includes(block.type) && (
                    <div className="bg-neutral-900/40 border border-dashed border-neutral-700/60 p-4 rounded-xl my-1 relative">
                      <div className="absolute right-3 top-3 bg-indigo-950 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded border border-indigo-700/30">
                        Plugin Block: {block.type}
                      </div>
                      <textarea
                        disabled={globalPreview}
                        value={block.content}
                        onChange={(e) => onUpdateBlock(block.id, { content: e.target.value })}
                        placeholder="Dados ou conteúdo customizado do plugin..."
                        className="w-full bg-transparent text-sm text-neutral-300 border-none outline-none focus:ring-0 resize-none"
                        rows={2}
                      />
                    </div>
                  )}
                </div>

                {/* 4. SLASH COMMAND INTERACTIVE POPUP PORTAL */}
                {activeSlashBlockId === block.id && (
                  <div 
                    ref={slashMenuRef}
                    className="absolute left-6 top-7 bg-neutral-900 border border-neutral-800/90 rounded-xl w-64 shadow-2xl z-50 p-1.5 backdrop-blur-md max-h-72 overflow-y-auto"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-1.5 mb-1.5">
                      Blocos Básicos
                    </div>
                    
                    {filteredBlockTypes.length === 0 ? (
                      <div className="p-2 text-xs text-neutral-600 text-center">
                        Nenhum tipo de bloco encontrado
                      </div>
                    ) : (
                      filteredBlockTypes.map((meta, metaIdx) => (
                        <button
                          key={metaIdx}
                          onClick={() => selectSlashType(block.id, meta.type)}
                          className="w-full flex items-center space-x-3 px-2.5 py-2 rounded-lg text-left hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 transition-colors cursor-pointer group/item"
                        >
                          <div className="w-8 h-8 rounded-lg bg-neutral-950 flex items-center justify-center border border-neutral-800 group-hover/item:border-neutral-700">
                            {meta.icon}
                          </div>
                          <div>
                            <div className="text-xs font-semibold leading-none mb-0.5">{meta.label}</div>
                            <span className="text-[10px] text-neutral-500 leading-none">{meta.desc}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* 5. bottom Addition Options */}
        <div className="flex items-center justify-center pt-8 border-t border-neutral-900/60">
          <button
            id="add-block-bottom"
            onClick={() => onAddBlock("text", "", blocks.length)}
            className="flex items-center space-x-2 px-5 py-2 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white rounded-xl shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Novo Bloco (/)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Editable spreadsheet table renderer for the table block
function EditableTableBlock({ content, onChange, disabled }: { content: string, onChange: (newData: string) => void, disabled?: boolean }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        setData(parsed);
      }
    } catch (e) {
      // Setup initial empty structures if parser crashed
      setData([{ "A": "Dados", "B": "Dados" }]);
    }
  }, [content]);

  const updateCell = (rowIndex: number, columnKey: string, value: string) => {
    const updated = [...data];
    updated[rowIndex][columnKey] = value;
    setData(updated);
    onChange(JSON.stringify(updated));
  };

  const addRow = () => {
    if (data.length === 0) return;
    const newRow = { ...data[0] };
    Object.keys(newRow).forEach(k => newRow[k] = "");
    const updated = [...data, newRow];
    setData(updated);
    onChange(JSON.stringify(updated));
  };

  const addColumn = () => {
    if (data.length === 0) return;
    const currentCols = Object.keys(data[0]);
    const newColName = `Coluna_${currentCols.length + 1}`;
    const updated = data.map(row => ({
      ...row,
      [newColName]: ""
    }));
    setData(updated);
    onChange(JSON.stringify(updated));
  };

  if (data.length === 0) return null;

  const columns = Object.keys(data[0] || {});

  return (
    <div className="overflow-x-auto min-w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 my-2 font-mono scrollbar-none">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] text-teal-400 font-bold tracking-wider uppercase">Tabela de Clientes Integrada (JSON SQL)</span>
        {!disabled && (
          <div className="flex space-x-2">
            <button 
              onClick={addRow}
              className="text-[10px] hover:bg-neutral-900 text-neutral-400 hover:text-teal-300 border border-neutral-800 px-2 py-1 rounded transition-colors cursor-pointer"
            >
              + Linha
            </button>
            <button 
              onClick={addColumn}
              className="text-[10px] hover:bg-neutral-900 text-neutral-400 hover:text-teal-300 border border-neutral-800 px-2 py-1 rounded transition-colors cursor-pointer"
            >
              + Coluna
            </button>
          </div>
        )}
      </div>
      <table className="w-full text-xs text-left border-collapse border border-neutral-900">
        <thead>
          <tr className="bg-neutral-900/60 text-neutral-400 border-b border-neutral-950">
            {columns.map((col, idx) => (
              <th key={idx} className="p-2 border border-neutral-900 text-[11px] font-semibold truncate capitalize max-w-24">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-neutral-900/20 border-b border-neutral-900/45">
              {columns.map((col, cIdx) => (
                <td key={cIdx} className="p-1 border border-neutral-900">
                  <input
                    disabled={disabled}
                    type="text"
                    value={row[col] || ""}
                    onChange={(e) => updateCell(rIdx, col, e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-neutral-300 focus:ring-1 focus:ring-teal-500 rounded p-1"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
