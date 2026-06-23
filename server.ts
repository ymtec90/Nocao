import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import alasql from "alasql";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "notion_data.json");

app.use(express.json());

// Initialize Google GenAI if key is present
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// Ensure tables exist in alasql
function initDatabase() {
  try {
    alasql('CREATE TABLE IF NOT EXISTS pages (id STRING, title STRING, icon STRING, cover STRING, isArchived BOOLEAN, updatedAt INT)');
    alasql('CREATE TABLE IF NOT EXISTS blocks (id STRING, pageId STRING, type STRING, content STRING, checked BOOLEAN, language STRING, sortOrder INT, updatedAt INT)');
    alasql('CREATE TABLE IF NOT EXISTS plugins (id STRING, name STRING, description STRING, version STRING, isActive BOOLEAN, code STRING, updatedAt INT)');
    console.log("SQL Database schemas loaded.");
  } catch (err) {
    console.error("Failed to init database schemas", err);
  }
}

// Load seed data if no data file exists
function loadInitialData() {
  initDatabase();

  if (fs.existsSync(DATA_FILE)) {
    try {
      const runData = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      
      // Clear tables
      alasql('DELETE FROM pages');
      alasql('DELETE FROM blocks');
      alasql('DELETE FROM plugins');

      // Populate tables from JSON
      if (runData.pages && Array.isArray(runData.pages)) {
        runData.pages.forEach((p: any) => {
          alasql('INSERT INTO pages VALUES (?, ?, ?, ?, ?, ?)', [p.id, p.title, p.icon, p.cover, p.isArchived, p.updatedAt]);
        });
      }
      if (runData.blocks && Array.isArray(runData.blocks)) {
        runData.blocks.forEach((b: any) => {
          alasql('INSERT INTO blocks VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
            b.id, b.pageId, b.type, b.content, b.checked || false, b.language || "", b.sortOrder, b.updatedAt
          ]);
        });
      }
      if (runData.plugins && Array.isArray(runData.plugins)) {
        runData.plugins.forEach((pl: any) => {
          alasql('INSERT INTO plugins VALUES (?, ?, ?, ?, ?, ?, ?)', [
            pl.id, pl.name, pl.description, pl.version, pl.isActive, pl.code, pl.updatedAt
          ]);
        });
      }
      console.log(`Loaded existing workspace with ${runData.pages?.length || 0} pages.`);
      return;
    } catch (err) {
      console.error("Error reading persistence file, falling back to seeds...", err);
    }
  }

  // Seed Data: Pages
  const seedPages = [
    { id: "p1", title: "Primeiros Passos", icon: "🚀", cover: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe", isArchived: false, updatedAt: Date.now() },
    { id: "p2", title: "Console de Desenvolvimento", icon: "💻", cover: "https://images.unsplash.com/photo-1542831371-29b0f74f9713", isArchived: false, updatedAt: Date.now() },
    { id: "p3", title: "Metas Trimestrais", icon: "🎯", cover: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173", isArchived: false, updatedAt: Date.now() }
  ];

  // Seed Data: Blocks
  const seedBlocks = [
    // Page p1 (Primeiros Passos)
    { id: "b1_1", pageId: "p1", type: "heading1", content: "Bem-vindo ao Notion Avançado SQL & Plugins!", checked: false, language: "", sortOrder: 0, updatedAt: Date.now() },
    { id: "b1_2", pageId: "p1", type: "text", content: "Esta é uma ferramenta experimental que une o melhor dos documentos flexíveis do Notion com um banco de dados SQL real-time e um Sandbox para expansão via Plugins JavaScript.", checked: false, language: "", sortOrder: 1, updatedAt: Date.now() },
    { id: "b1_3", pageId: "p1", type: "heading2", content: "📋 Guia Rápido de Experiência:", checked: false, language: "", sortOrder: 2, updatedAt: Date.now() },
    { id: "b1_4", pageId: "p1", type: "todo", content: "Abra a aba 'SQL Editor' na barra lateral e digite: SELECT * FROM blocks WHERE pageId = 'p1'", checked: true, language: "", sortOrder: 3, updatedAt: Date.now() },
    { id: "b1_5", pageId: "p1", type: "todo", content: "Modifique um bloco de texto aqui e observe a atualização instantânea no DB.", checked: false, language: "", sortOrder: 4, updatedAt: Date.now() },
    { id: "b1_6", pageId: "p1", type: "todo", content: "Execute um script customizado no painel de 'Plugins JS' para analisar ou enriquecer este texto.", checked: false, language: "", sortOrder: 5, updatedAt: Date.now() },
    { id: "b1_7", pageId: "p1", type: "heading2", content: "⚡ Demonstração de Tabela de Vendas Integrada (Modelo JSON)", checked: false, language: "", sortOrder: 6, updatedAt: Date.now() },
    { id: "b1_8", pageId: "p1", type: "table", content: '[{"Produto":"Mentoria Web3","Valor":"R$ 2.400","Qtd":"5"},{"Produto":"Plugin SQL Pro","Valor":"R$ 180","Qtd":"42"},{"Produto":"Suporte Anual","Valor":"R$ 1.200","Qtd":"12"}]', checked: false, language: "", sortOrder: 7, updatedAt: Date.now() },
    { id: "b1_9", pageId: "p1", type: "quote", content: "A criatividade consiste em conectar coisas. Quando você pergunta a pessoas criativas como elas fizeram algo, elas se sentem culpadas porque não fizeram nada, elas apenas enxergaram algo. - Steve Jobs", checked: false, language: "", sortOrder: 8, updatedAt: Date.now() },

    // Page p2 (Console de Desenvolvimento)
    { id: "b2_1", pageId: "p2", type: "heading1", content: "Desenvolvimento de Plugins Customizados", checked: false, language: "", sortOrder: 0, updatedAt: Date.now() },
    { id: "b2_2", pageId: "p2", type: "text", content: "O sistema analisa de forma segura os scripts JavaScript fornecidos pelos usuários e os executa contra a API ativa do Notion. Veja um rascunho de código padrão de um Plugin do Litor:", checked: false, language: "", sortOrder: 1, updatedAt: Date.now() },
    { id: "b2_3", pageId: "p2", type: "code", content: `// Plugin de Exemplo: Analisador de Texto
export async function run(context) {
  const text = context.getActivePageText();
  const words = text.split(/\\s+/).filter(w => w.length > 0).length;
  const chars = text.length;
  
  context.log(\`[Análise] Total de palavras: \${words} | Caracteres: \${chars}\`);
  context.updateStatus(\`Total: \${words} pal. / \${chars} car.\`);
  
  // Retorna dados para o widget renderizar
  return { words, chars };
}`, checked: false, language: "javascript", sortOrder: 2, updatedAt: Date.now() },
    { id: "b2_4", pageId: "p2", type: "heading2", content: "APIs de Terceiros Prontas para Uso", checked: false, language: "", sortOrder: 3, updatedAt: Date.now() },
    { id: "b2_5", pageId: "p2", type: "text", content: "Oferecemos proxy para APIs do Clima (OpenWeather), Tradução, Taxas de Câmbio Financeiras e assistência opcional com Gemini AI para impulsionar sua automação de conteúdo.", checked: false, language: "", sortOrder: 4, updatedAt: Date.now() },

    // Page p3 (Metas Trimestrais)
    { id: "b3_1", pageId: "p3", type: "heading1", content: "🎯 Planejamento Estratégico & Metas", checked: false, language: "", sortOrder: 0, updatedAt: Date.now() },
    { id: "b3_2", pageId: "p3", type: "text", content: "Acompanhamento detalhado das principais iniciativas para este trimestre de 2026.", checked: false, language: "", sortOrder: 1, updatedAt: Date.now() },
    { id: "b3_3", pageId: "p3", type: "todo", content: "Finalizar especificação do motor SQL-JSON integrado", checked: true, language: "", sortOrder: 2, updatedAt: Date.now() },
    { id: "b3_4", pageId: "p3", type: "todo", content: "Lançar SDK cliente para os plugins customizados", checked: false, language: "", sortOrder: 3, updatedAt: Date.now() },
    { id: "b3_5", pageId: "p3", type: "todo", content: "Criar suporte a tabelas relacionais cruzadas no SQLite", checked: false, language: "", sortOrder: 4, updatedAt: Date.now() }
  ];

  // Seed Data: Plugins
  const seedPlugins = [
    {
      id: "pl1",
      name: "Analisador Métrico",
      description: "Analisa a contagem de caracteres, palavras e legibilidade do documento em tempo real utilizando javascript.",
      version: "1.0.0",
      isActive: true,
      code: `// Plugin que analisa o conteúdo de texto da página
const run = async (context) => {
  const blocks = context.blocks || [];
  let fullText = "";
  
  blocks.forEach(b => {
    if (b.type === 'text' || b.type.startsWith('heading') || b.type === 'quote') {
      fullText += " " + b.content;
    }
  });
  
  const charCount = fullText.length;
  const wordCount = fullText.trim().split(/\\s+/).filter(w => w.length > 0).length;
  const paragraphCount = blocks.filter(b => b.type === 'text').length;
  
  context.log(\`[Metric Analyzer] Caracterizados: \${charCount} caracteres, \${wordCount} palavras.\`);
  return {
    charCount,
    wordCount,
    paragraphCount,
    readTime: Math.ceil(wordCount / 200) + " min"
  };
};

export default { run };`,
      updatedAt: Date.now()
    },
    {
      id: "pl2",
      name: "Smart Translator (Translate API)",
      description: "Plugin que traduz o bloco selecionado para inglês/espanhol/português chamando uma API simulada ou serviço global.",
      version: "1.1.0",
      isActive: true,
      code: `// Plugin de Tradução Integrada de Bloco
const run = async (context) => {
  const targetId = context.selectedBlockId;
  const currentBlock = context.blocks.find(b => b.id === targetId);
  
  if (!currentBlock) {
    context.log("Nenhum bloco selecionado para tradução! Clique em um bloco primeiro.");
    return { error: "Selecione um bloco" };
  }
  
  const textToTranslate = currentBlock.content;
  context.log(\`Traduzindo: "\${textToTranslate}"...\`);
  
  // Chamada de API para serviço de tradução proxy
  const response = await context.api.fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(textToTranslate) + '&langpair=pt|en');
  const data = await response.json();
  const translation = data.responseData.translatedText;
  
  context.log(\`Tradução concluída: \${translation}\`);
  
  // Atualiza campo no Notion de forma imediata via callback
  await context.updateBlockContent(targetId, translation);
  
  return { original: textToTranslate, result: translation };
};

export default { run };`,
      updatedAt: Date.now()
    },
    {
      id: "pl3",
      name: "widget Clima Climático",
      description: "Injeta um boletim de previsão do tempo real-time em qualquer bloco selecionado do Notion.",
      version: "1.0.2",
      isActive: false,
      code: `// Widget de Clima Climático de Cidades
const run = async (context) => {
  context.log("Acessando boletim climático oficial...");
  
  // Consulta de API pública do clima de SP
  const res = await context.api.fetch('https://api.open-meteo.com/v1/forecast?latitude=-23.5475&longitude=-46.6361&current=temperature_2m,relative_humidity_2m');
  const weather = await res.json();
  const temp = weather.current.temperature_2m;
  const umid = weather.current.relative_humidity_2m;
  
  const blockTitle = \`🌦️ Clima de São Paulo: \${temp}°C, Umidade \${umid}% | (Atualizado via API)\`;
  
  if (context.selectedBlockId) {
    await context.updateBlockContent(context.selectedBlockId, blockTitle);
    context.log("Bloco selecionado atualizado com os dados do clima!");
  } else {
    context.log("Resultado: " + blockTitle);
  }
  
  return { temp, humidity: umid };
};

export default { run };`,
      updatedAt: Date.now()
    },
    {
      id: "pl4",
      name: "Assessor Inteligente Gemini AI",
      description: "Usa o modelo de IA Generativa Gemini para processar, formatar, expandir ou resumir o texto do bloco selecionado.",
      version: "2.0.0",
      isActive: true,
      code: `// Plugin Inteligente utilizando Gemini LLM Engine
const run = async (context) => {
  const blockId = context.selectedBlockId;
  const currentBlock = context.blocks.find(b => b.id === blockId);
  
  if (!currentBlock) {
    context.log("Por favor, selecione algum bloco de texto para o Assistente analisar.");
    return { error: "Sem bloco ativo" };
  }
  
  context.log(\`Solicitando processamento ao Gemini para: "\${currentBlock.content.substring(0, 50)}..."\`);
  
  // Chamada de API de IA Generativa segura
  const response = await context.api.geminiPrompt(
    "Resuma o seguinte texto de maneira elegante e curta em português: " + currentBlock.content
  );
  
  if (response.error) {
    context.log("Falha ao comunicar com a IA: " + response.error);
    return { error: response.error };
  }
  
  context.log("IA respondeu com sucesso!");
  
  // Cria um bloco de quote ou atualiza o bloco atual
  if (blockId) {
    await context.updateBlockContent(blockId, "🤖 [Resumo IA]: " + response.text);
  }
  
  return { promptInput: currentBlock.content, aiResult: response.text };
};

export default { run };`,
      updatedAt: Date.now()
    }
  ];

  // Batch insert to tables
  seedPages.forEach(p => {
    alasql('INSERT INTO pages VALUES (?, ?, ?, ?, ?, ?)', [p.id, p.title, p.icon, p.cover, p.isArchived, p.updatedAt]);
  });
  seedBlocks.forEach(b => {
    alasql('INSERT INTO blocks VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [b.id, b.pageId, b.type, b.content, b.checked, b.language, b.sortOrder, b.updatedAt]);
  });
  seedPlugins.forEach(pl => {
    alasql('INSERT INTO plugins VALUES (?, ?, ?, ?, ?, ?, ?)', [pl.id, pl.name, pl.description, pl.version, pl.isActive, pl.code, pl.updatedAt]);
  });

  saveDatabaseToFile();
  console.log("Seeded default tables in SQL/AlaSQL successfully.");
}

// Persist tables to JSON
function saveDatabaseToFile() {
  try {
    const pages = alasql('SELECT * FROM pages');
    const blocks = alasql('SELECT * FROM blocks');
    const plugins = alasql('SELECT * FROM plugins');
    fs.writeFileSync(DATA_FILE, JSON.stringify({ pages, blocks, plugins }, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to commit Database state to persistence file", err);
  }
}

// Synchronous load on launch
loadInitialData();

// REST API Endpoints

// 1. Pages Endpoints
app.get("/api/pages", (req, res) => {
  try {
    const pages = alasql('SELECT * FROM pages WHERE isArchived = false ORDER BY title ASC');
    res.json(pages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pages", (req, res) => {
  const { id, title, icon, cover } = req.body;
  const pageId = id || "p_" + Math.random().toString(36).substring(2, 9);
  const pageTitle = title || "Nova Página";
  const pageIcon = icon || "📄";
  const pageCover = cover || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe";
  const now = Date.now();

  try {
    alasql('INSERT INTO pages VALUES (?, ?, ?, ?, ?, ?)', [pageId, pageTitle, pageIcon, pageCover, false, now]);
    saveDatabaseToFile();
    
    // Auto insert an initial welcome block
    alasql('INSERT INTO blocks VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
      "b_" + Math.random().toString(36).substring(2, 9),
      pageId,
      "text",
      "Comece a escrever seu documento aqui... Use o atalho / para ver os blocos disponíveis.",
      false,
      "",
      0,
      now
    ]);
    saveDatabaseToFile();

    const createdPage = alasql('SELECT * FROM pages WHERE id = ?', [pageId])[0];
    res.status(201).json(createdPage);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/pages/:id", (req, res) => {
  const { id } = req.params;
  const { title, icon, cover, isArchived } = req.body;
  const now = Date.now();

  try {
    const existing = alasql('SELECT * FROM pages WHERE id = ?', [id]) as any[];
    if (existing.length === 0) {
      return res.status(404).json({ error: "Página não encontrada" });
    }

    if (title !== undefined) alasql('UPDATE pages SET title = ?, updatedAt = ? WHERE id = ?', [title, now, id]);
    if (icon !== undefined) alasql('UPDATE pages SET icon = ?, updatedAt = ? WHERE id = ?', [icon, now, id]);
    if (cover !== undefined) alasql('UPDATE pages SET cover = ?, updatedAt = ? WHERE id = ?', [cover, now, id]);
    if (isArchived !== undefined) alasql('UPDATE pages SET isArchived = ?, updatedAt = ? WHERE id = ?', [isArchived, now, id]);

    saveDatabaseToFile();
    const updated = alasql('SELECT * FROM pages WHERE id = ?', [id])[0];
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/pages/:id", (req, res) => {
  const { id } = req.params;
  try {
    alasql('DELETE FROM pages WHERE id = ?', [id]);
    alasql('DELETE FROM blocks WHERE pageId = ?', [id]);
    saveDatabaseToFile();
    res.json({ success: true, message: "Page and nested blocks deleted." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Blocks Endpoints
app.get("/api/pages/:pageId/blocks", (req, res) => {
  const { pageId } = req.params;
  try {
    const blocks = alasql('SELECT * FROM blocks WHERE pageId = ? ORDER BY sortOrder ASC', [pageId]) as any[];
    const mapped = blocks.map(b => ({
      ...b,
      properties: {
        checked: b.checked,
        language: b.language
      }
    }));
    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pages/:pageId/blocks", (req, res) => {
  const { pageId } = req.params;
  const { id, type, content, checked, language, properties, sortOrder } = req.body;
  const blockId = id || "b_" + Math.random().toString(36).substring(2, 9);
  const now = Date.now();

  const finalChecked = checked !== undefined ? checked : (properties?.checked || false);
  const finalLanguage = language !== undefined ? language : (properties?.language || "");

  try {
    alasql('INSERT INTO blocks VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
      blockId, pageId, type || "text", content || "", finalChecked, finalLanguage, sortOrder || 0, now
    ]);
    saveDatabaseToFile();
    const created = alasql('SELECT * FROM blocks WHERE id = ?', [blockId])[0] as any;
    res.status(201).json({
      ...created,
      properties: {
        checked: created.checked,
        language: created.language
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/blocks/:id", (req, res) => {
  const { id } = req.params;
  const { type, content, checked, language, properties, sortOrder } = req.body;
  const now = Date.now();

  const finalChecked = checked !== undefined ? checked : properties?.checked;
  const finalLanguage = language !== undefined ? language : properties?.language;

  try {
    const existing = alasql('SELECT * FROM blocks WHERE id = ?', [id]) as any[];
    if (existing.length === 0) {
      return res.status(404).json({ error: "Bloco não encontrado" });
    }

    if (type !== undefined) alasql('UPDATE blocks SET type = ?, updatedAt = ? WHERE id = ?', [type, now, id]);
    if (content !== undefined) alasql('UPDATE blocks SET content = ?, updatedAt = ? WHERE id = ?', [content, now, id]);
    if (finalChecked !== undefined) alasql('UPDATE blocks SET checked = ?, updatedAt = ? WHERE id = ?', [finalChecked, now, id]);
    if (finalLanguage !== undefined) alasql('UPDATE blocks SET language = ?, updatedAt = ? WHERE id = ?', [finalLanguage, now, id]);
    if (sortOrder !== undefined) alasql('UPDATE blocks SET sortOrder = ?, updatedAt = ? WHERE id = ?', [sortOrder, now, id]);

    saveDatabaseToFile();
    const updated = alasql('SELECT * FROM blocks WHERE id = ?', [id])[0] as any;
    res.json({
      ...updated,
      properties: {
        checked: updated.checked,
        language: updated.language
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/blocks/:id", (req, res) => {
  const { id } = req.params;
  try {
    alasql('DELETE FROM blocks WHERE id = ?', [id]);
    saveDatabaseToFile();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Batch update blocks sort orders during re-ordering saves
app.post("/api/blocks/reorder", (req, res) => {
  const { orderList } = req.body; // Array of { id: string, sortOrder: number }
  const now = Date.now();

  if (!Array.isArray(orderList)) {
    return res.status(400).json({ error: "Order list must be an array" });
  }

  try {
    orderList.forEach(item => {
      alasql('UPDATE blocks SET sortOrder = ?, updatedAt = ? WHERE id = ?', [item.sortOrder, now, item.id]);
    });
    saveDatabaseToFile();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Plugins Endpoints
app.get("/api/plugins", (req, res) => {
  try {
    const plugins = alasql('SELECT * FROM plugins ORDER BY name ASC');
    res.json(plugins);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/plugins", (req, res) => {
  const { name, description, version, code, isActive } = req.body;
  const id = "pl_" + Math.random().toString(36).substring(2, 9);
  const now = Date.now();

  try {
    alasql('INSERT INTO plugins VALUES (?, ?, ?, ?, ?, ?, ?)', [
      id, name || "Plugin", description || "", version || "1.0.0", isActive !== false, code || "", now
    ]);
    saveDatabaseToFile();
    const created = alasql('SELECT * FROM plugins WHERE id = ?', [id])[0];
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/plugins/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, version, code, isActive } = req.body;
  const now = Date.now();

  try {
    const existing = alasql('SELECT * FROM plugins WHERE id = ?', [id]) as any[];
    if (existing.length === 0) {
      return res.status(404).json({ error: "Plugin não encontrado" });
    }

    if (name !== undefined) alasql('UPDATE plugins SET name = ?, updatedAt = ? WHERE id = ?', [name, now, id]);
    if (description !== undefined) alasql('UPDATE plugins SET description = ?, updatedAt = ? WHERE id = ?', [description, now, id]);
    if (version !== undefined) alasql('UPDATE plugins SET version = ?, updatedAt = ? WHERE id = ?', [version, now, id]);
    if (code !== undefined) alasql('UPDATE plugins SET code = ?, updatedAt = ? WHERE id = ?', [code, now, id]);
    if (isActive !== undefined) alasql('UPDATE plugins SET isActive = ?, updatedAt = ? WHERE id = ?', [isActive, now, id]);

    saveDatabaseToFile();
    const updated = alasql('SELECT * FROM plugins WHERE id = ?', [id])[0];
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/plugins/:id", (req, res) => {
  const { id } = req.params;
  try {
    alasql('DELETE FROM plugins WHERE id = ?', [id]);
    saveDatabaseToFile();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Custom SQL Shell Execute Service (Alasql direct access server-side)
app.post("/api/sql/execute", (req, res) => {
  const { sqlString } = req.body;

  if (!sqlString || typeof sqlString !== "string") {
    return res.status(400).json({ success: false, error: "Query SQL inválida fornecida." });
  }

  try {
    console.log(`Executing SQL: ${sqlString}`);
    const results = alasql(sqlString);

    // If query modified tables, sync to file
    const lowerQuery = sqlString.toLowerCase();
    const isWriteQuery = lowerQuery.includes("insert") || 
                         lowerQuery.includes("update") || 
                         lowerQuery.includes("delete") || 
                         lowerQuery.includes("create") || 
                         lowerQuery.includes("drop");
    
    if (isWriteQuery) {
      saveDatabaseToFile();
    }

    if (Array.isArray(results)) {
      if (results.length === 0) {
        return res.json({ success: true, columns: [], rows: [], affectedRows: 0 });
      }
      // Deduce columns from the properties of the first row
      const columns = Object.keys(results[0] || {});
      return res.json({ success: true, columns, rows: results, affectedRows: results.length });
    } else {
      // Direct number or status output (e.g. DELETE returned record sizes)
      const affectedRows = typeof results === "number" ? results : 1;
      return res.json({ success: true, columns: [], rows: [], affectedRows });
    }
  } catch (err: any) {
    console.error(`SQL execute error: ${err.message}`);
    res.json({ success: false, error: err.message });
  }
});

// 5. Proxy APIs to handle API Integrations and avoid CORS issues
app.post("/api/proxy/fetch", async (req, res) => {
  const { url, options } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const fetchRes = await fetch(url, options || {});
    const contentType = fetchRes.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      const json = await fetchRes.json();
      res.status(fetchRes.status).send(json);
    } else {
      const text = await fetchRes.text();
      res.status(fetchRes.status).send(text);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Secure Gemini API Proxy for the dynamic AI assisting plugin
app.post("/api/proxy/gemini", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "No prompt provided" });

  if (!ai) {
    return res.json({ 
      error: "Ocorreu um erro: GEMINI_API_KEY não configurada no painel de Secrets da plataforma Google AI Studio.",
      text: "Por favor, defina a variável de ambiente GEMINI_API_KEY no arquivo .env ou no painel de Secrets para ativar inteligência artificial."
    });
  }

  try {
    const model = "gemini-2.5-flash";
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    res.json({ error: `Erro na API do Gemini: ${err.message}` });
  }
});

// 7. Complete Workspace JSON Import/Export API
app.get("/api/workspace/backup", (req, res) => {
  try {
    const pages = alasql('SELECT * FROM pages');
    const blocks = alasql('SELECT * FROM blocks');
    const plugins = alasql('SELECT * FROM plugins');
    
    res.json({
      exportedAt: Date.now(),
      version: "1.0.0",
      pages,
      blocks,
      plugins
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/workspace/restore", (req, res) => {
  const { pages, blocks, plugins } = req.body;

  if (!Array.isArray(pages) || !Array.isArray(blocks) || !Array.isArray(plugins)) {
    return res.status(400).json({ error: "Formato de backup JSON inválido para a restauração de dados." });
  }

  try {
    // Clear databases
    alasql('DELETE FROM pages');
    alasql('DELETE FROM blocks');
    alasql('DELETE FROM plugins');

    // Load new values
    pages.forEach((p: any) => {
      alasql('INSERT INTO pages VALUES (?, ?, ?, ?, ?, ?)', [p.id, p.title, p.icon, p.cover, p.isArchived || false, p.updatedAt || Date.now()]);
    });
    blocks.forEach((b: any) => {
      alasql('INSERT INTO blocks VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [b.id, b.pageId, b.type, b.content, b.checked || false, b.language || "", b.sortOrder || 0, b.updatedAt || Date.now()]);
    });
    plugins.forEach((pl: any) => {
      alasql('INSERT INTO plugins VALUES (?, ?, ?, ?, ?, ?, ?)', [pl.id, pl.name, pl.description, pl.version, pl.isActive || false, pl.code, pl.updatedAt || Date.now()]);
    });

    saveDatabaseToFile();
    res.json({ success: true, message: "Workspace restaurado do JSON com sucesso!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Live Sync check endpoint for detecting client-side state divergence
app.get("/api/sync/checkpoint", (req, res) => {
  try {
    const pagesUpdated = alasql('SELECT MAX(updatedAt) as maxPg FROM pages')[0]?.maxPg || 0;
    const blocksUpdated = alasql('SELECT MAX(updatedAt) as maxBl FROM blocks')[0]?.maxBl || 0;
    const pluginsUpdated = alasql('SELECT MAX(updatedAt) as maxPl FROM plugins')[0]?.maxPl || 0;
    
    res.json({
      pagesCheckpoint: pagesUpdated,
      blocksCheckpoint: blocksUpdated,
      pluginsCheckpoint: pluginsUpdated
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Configure Vite or Static Fallback
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server executing at: http://localhost:${PORT}`);
    console.log(`Port configuration locked to container ingress ingress-3000.`);
  });
}

startServer();
