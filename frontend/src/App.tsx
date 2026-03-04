import { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, FileText, Settings as SettingsIcon, Home, Folder, Loader2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

const API_BASE = 'http://localhost:8000';

function DirectoryPicker({ onSelect, onCancel }: { onSelect: (path: string) => void, onCancel: () => void }) {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string>('');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocs = async (path?: string) => {
    setIsLoading(true);
    try {
      const resp = await axios.get(`${API_BASE}/browse`, { params: { path } });
      setCurrentPath(resp.data.current_path);
      setParentPath(resp.data.parent_path);
      setItems(resp.data.items);
    } catch (err) {
      alert('Error browsing directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex items-center gap-2 mb-6 p-4 bg-black/5 rounded-2xl text-xs font-mono">
        <Folder size={16} className="text-primary-500 shrink-0" />
        <span className="truncate text-black/60">{currentPath}</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2 custom-scrollbar">
        {currentPath !== parentPath && (
          <button
            onClick={() => fetchDocs(parentPath)}
            className="w-full text-left p-3 hover:bg-black/5 rounded-xl flex items-center gap-3 text-sm text-black/40 font-bold"
          >
            ← Back
          </button>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" /></div>
        ) : (
          items.map((item, i) => (
            <div
              key={i}
              className={twMerge(
                "w-full flex items-center justify-between p-2 rounded-xl transition-all border border-transparent",
                item.is_directory ? "hover:bg-black/5" : "opacity-30"
              )}
            >
              <button
                onClick={() => item.is_directory ? fetchDocs(item.path) : null}
                className={twMerge(
                  "flex-1 text-left p-2 flex items-center gap-4 text-sm font-semibold",
                  item.is_directory ? "text-black/80" : "cursor-default"
                )}
              >
                <Folder size={20} className={item.is_directory ? "text-primary-500" : "text-black/20"} />
                <span className="truncate">{item.name}</span>
              </button>
              {item.is_directory && (
                <button
                  onClick={() => onSelect(item.path)}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20"
                >
                  Confirm
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-4 pt-6 border-t border-black/5">
        <button
          onClick={onCancel}
          className="flex-1 py-3 text-black/40 hover:text-black font-bold transition-all text-sm"
        >
          Cancel
        </button>
        <button
          onClick={() => onSelect(currentPath)}
          className="flex-1 py-3 bg-black/5 text-black rounded-xl font-black uppercase tracking-widest hover:bg-black/10 transition-all text-[10px]"
        >
          Index Root
        </button>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [isIndexModalOpen, setIndexModalOpen] = useState(false);
  const [isPickerMode, setIsPickerMode] = useState(false);
  const [manualPath, setManualPath] = useState('');
  const [indexStats, setIndexStats] = useState({ indexing: false, path: '' });
  const [activeDirectory, setActiveDirectory] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<any[]>([]);

  const fetchSessions = async (dir: string) => {
    try {
      const resp = await axios.get(`${API_BASE}/sessions`, { params: { directory_path: dir } });
      setSessions(resp.data.sessions);
      if (resp.data.sessions.length > 0) {
        if (!currentSessionId) setCurrentSessionId(resp.data.sessions[0].id);
      } else {
        createNewSession(dir);
      }
    } catch (err) {
      console.error("Error fetching sessions");
    }
  };

  const createNewSession = async (dir: string) => {
    try {
      const resp = await axios.post(`${API_BASE}/sessions`, { directory_path: dir });
      const newSid = resp.data.session_id;
      setCurrentSessionId(newSid);
      const sessionResp = await axios.get(`${API_BASE}/sessions/${newSid}`);
      setSessions(prev => [sessionResp.data, ...prev]);
    } catch (err) {
      alert("Error creating session");
    }
  };

  const handleIndex = async (path: string) => {
    if (!path.trim()) return;
    setIndexStats({ indexing: true, path });
    try {
      await axios.post(`${API_BASE}/index`, { directory_path: path });
      setActiveDirectory(path);
      fetchSessions(path);
      setIndexModalOpen(false);
      setIsPickerMode(false);
      setManualPath('');
      setActiveTab('chat');
    } catch (err) {
      alert('Error indexing directory');
    } finally {
      setIndexStats({ indexing: false, path: '' });
    }
  };

  return (
    <div className="flex h-screen bg-[#fcfcfc] text-black overflow-hidden font-sans selection:bg-primary-500 selection:text-white">
      {/* Index Modal */}
      <AnimatePresence>
        {isIndexModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white/90 backdrop-blur-2xl p-10 w-full max-w-lg border border-white rounded-[40px] shadow-2xl shadow-black/5"
            >
              <h3 className="text-2xl font-bold mb-2 tracking-tight">Index New Project</h3>
              <p className="text-black/40 text-sm mb-8 font-medium">Select a local directory to begin analyzing.</p>

              {!isPickerMode ? (
                <>
                  <div className="space-y-6 mb-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-black/30 px-1">Absolute Path</label>
                      <input
                        value={manualPath}
                        onChange={e => setManualPath(e.target.value)}
                        placeholder="/home/user/my-project"
                        className="w-full bg-black/5 border border-transparent rounded-[20px] px-6 py-4 focus:outline-none focus:bg-white focus:border-primary-500 transition-all font-medium"
                      />
                    </div>
                    <button
                      onClick={() => setIsPickerMode(true)}
                      className="w-full py-4 bg-white border border-black/5 hover:bg-black/5 rounded-[20px] flex items-center justify-center gap-3 text-sm font-bold transition-all shadow-sm"
                    >
                      <Folder size={18} className="text-primary-500" />
                      Browse PC Directories
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setIndexModalOpen(false)}
                      className="flex-1 py-4 text-black/40 hover:text-black font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleIndex(manualPath)}
                      className="flex-1 py-4 bg-primary-500 text-white rounded-[20px] font-bold shadow-xl shadow-primary-500/20 active:scale-95 transition-all"
                    >
                      Start Indexing
                    </button>
                  </div>
                </>
              ) : (
                <DirectoryPicker
                  onSelect={handleIndex}
                  onCancel={() => setIsPickerMode(false)}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="glass-morphism w-[320px] h-[calc(100vh-2.5rem)] m-5 flex flex-col py-10 z-20 relative px-8 shrink-0 transition-all">
        <div className="flex flex-col h-full">
          <div className="mb-12 px-2 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
              <span className="font-black text-xl">L</span>
            </div>
            <h2 className="text-2xl font-black tracking-tighter text-black flex items-center">
              Local<span className="text-primary-500 italic">Labs</span>
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            <NavItem
              icon={<Home size={22} />}
              label="Dashboard"
              active={activeTab === 'chat'}
              onClick={() => setActiveTab('chat')}
              expanded={true}
            />
            <NavItem
              icon={<Folder size={22} />}
              label="Workspace"
              active={activeTab === 'files'}
              onClick={() => setActiveTab('files')}
              expanded={true}
            />
          </div>
          <div className="mt-auto pt-8 border-t border-black/5">
            {activeTab === 'chat' && activeDirectory && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-5 px-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/20">Memory Bank</span>
                  <button onClick={() => createNewSession(activeDirectory)} className="p-2 hover:bg-primary-500/10 rounded-xl text-primary-500 transition-all group">
                    <Send size={14} className="-rotate-45 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar px-1">
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setCurrentSessionId(s.id)}
                      className={twMerge(
                        "w-full text-left p-3.5 rounded-2xl text-xs font-semibold truncate transition-all",
                        currentSessionId === s.id ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20" : "text-black/40 hover:bg-black/5 hover:text-black/60"
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <NavItem
              icon={<SettingsIcon size={22} />}
              label="Settings"
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              expanded={true}
            />
          </div>

          <div className="mt-12 pt-8 flex flex-col items-center border-t border-black/10 opacity-60 hover:opacity-100 transition-all duration-700">
            <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-black/60 mb-3 font-mono">Engineered By</span>
            <a
              href="#"
              className="text-[11px] font-black text-black tracking-tighter"
            >
              A-GENERATIVE-SLICE
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto p-12 relative flex flex-col">
        <header className="mb-14 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              <span className="text-[10px] font-bold text-primary-500 uppercase tracking-[0.3em]">Operational Intelligence</span>
            </div>
            <h1 className="text-6xl font-black tracking-tighter text-black leading-none mb-6">
              Neural Hub
            </h1>
            <AnimatePresence>
              {activeDirectory && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4 px-5 py-2.5 bg-black/5 rounded-2xl w-fit group cursor-default hover:bg-black/[0.08] transition-all"
                >
                  <Folder size={18} className="text-primary-500" />
                  <span className="text-sm font-bold text-black/80 truncate max-w-[300px]">{activeDirectory.split('/').pop()}</span>
                  <div className="h-4 w-[1px] bg-black/10 mx-1" />
                  <span className="text-[11px] text-black/50 font-mono hidden lg:inline">{activeDirectory}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setIndexModalOpen(true)}
              className="px-10 py-5 bg-primary-500 text-white hover:bg-primary-600 rounded-[28px] transition-all font-bold flex items-center gap-3 shadow-2xl shadow-primary-500/20 active:scale-95 text-sm tracking-tight"
            >
              <Folder size={20} className="text-white" />
              Connect Data
            </button>
          </div>
        </header>

        <section className="max-w-6xl mx-auto w-full h-[calc(100vh-18rem)] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {activeTab === 'chat' && <ChatInterface activeDirectory={activeDirectory} sessionId={currentSessionId} />}
              {activeTab === 'files' && <FileManager />}
              {activeTab === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </section>

        {indexStats.indexing && (
          <div className="absolute top-8 right-12 bg-white/80 backdrop-blur-xl border border-black/5 px-6 py-3 rounded-full flex items-center gap-4 text-xs font-bold shadow-2xl shadow-black/5">
            <Loader2 className="animate-spin text-primary-500" size={18} />
            <span className="tracking-tight text-black/60">Processing: <span className="text-black">{indexStats.path.split('/').pop()}</span></span>
          </div>
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, expanded }: { icon: any, label: string, active: boolean, onClick: () => void, expanded: boolean }) {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        "flex items-center gap-5 p-4.5 rounded-[24px] transition-all w-full group",
        active ? "bg-primary-500 text-white shadow-2xl shadow-primary-500/30" : "text-black/40 hover:text-black hover:bg-black/5"
      )}
    >
      <div className={twMerge(
        "min-w-[24px] transition-transform duration-300",
        active ? "scale-110" : "group-hover:scale-105"
      )}>{icon}</div>
      {expanded && <span className="font-bold tracking-tight text-sm">{label}</span>}
    </button>
  );
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

function ChatInterface({ activeDirectory, sessionId }: { activeDirectory: string, sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Ready to analyze your workspace. Select a project folder to begin.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchHistory();
    } else {
      setMessages([{ role: 'assistant', content: 'Welcome. Connect a project folder to start the intelligence sync.' }]);
    }
  }, [sessionId]);

  const fetchHistory = async () => {
    try {
      const resp = await axios.get(`${API_BASE}/sessions/${sessionId}`);
      if (resp.data.messages.length > 0) {
        setMessages(resp.data.messages);
      } else {
        setMessages([{ role: 'assistant', content: `Sync complete. How can I assist with ${activeDirectory.split('/').pop()}?` }]);
      }
    } catch (err) {
      console.error("Error fetching history");
    }
  };

  const clearChat = async () => {
    if (!sessionId) return;
    try {
      await axios.delete(`${API_BASE}/sessions/${sessionId}`);
      setMessages([{ role: 'assistant', content: 'Memory cleared. New session started.' }]);
    } catch (err) {
      alert('Error clearing chat');
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    if (!activeDirectory) {
      alert("Please connect a project directory using 'Connect Data' first to enable neural analysis.");
      return;
    }

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const resp = await axios.post(`${API_BASE}/query`, {
        text: input,
        session_id: sessionId,
        directory_path: activeDirectory
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: resp.data.answer,
        sources: resp.data.sources
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Intelligence sync failed. Check your local API status.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (messages.length < 2) return;
    const lastUserQuery = [...messages].reverse().find(m => m.role === 'user')?.content;
    if (!lastUserQuery) return;

    try {
      const resp = await axios.post(`${API_BASE}/export?format=${format}`,
        { text: lastUserQuery },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Export failed.');
    }
  };

  return (
    <div className="flex-1 flex flex-col glass-morphism p-10 h-full relative overflow-hidden border border-black/5 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-5">
          <div className="w-1.5 h-10 bg-primary-500 rounded-full" />
          <div>
            <h3 className="text-xl font-black text-black tracking-tighter">Sync Stream</h3>
            <p className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mt-0.5">Real-time Local Processing</p>
          </div>
          <button
            onClick={clearChat}
            className="ml-4 text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 rounded-full text-primary-500 transition-all"
          >
            Reset
          </button>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => handleExport('pdf')}
            className="text-xs px-5 py-2.5 bg-black/[0.03] hover:bg-black/5 border border-black/10 rounded-2xl flex items-center gap-2 text-black/80 font-bold transition-all"
          >
            <FileText size={16} /> PDF
          </button>
          <button
            onClick={() => handleExport('docx')}
            className="text-xs px-5 py-2.5 bg-black/[0.03] hover:bg-black/5 border border-black/10 rounded-2xl flex items-center gap-2 text-black/80 font-bold transition-all"
          >
            <FileText size={16} /> DOCX
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-10 pb-40 pr-6 custom-scrollbar">
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            key={i}
            className={twMerge(
              "flex flex-col max-w-[80%]",
              msg.role === 'user' ? "ml-auto items-end" : "items-start"
            )}
          >
            <div className={twMerge(
              "p-6 rounded-[32px] text-[15px] leading-relaxed shadow-sm",
              msg.role === 'user'
                ? "bg-primary-500 text-white font-semibold rounded-br-none shadow-xl shadow-primary-500/20"
                : "bg-white border border-black/10 text-black/90 rounded-bl-none shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)]"
            )}>
              {msg.content}
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-4 text-[10px] text-black/40 font-bold px-4 flex flex-wrap gap-2">
                {msg.sources.map((s, idx) => (
                  <span key={idx} className="bg-black/5 px-2 py-1 rounded-md opacity-80 hover:opacity-100 transition-opacity whitespace-nowrap">
                    #{s.split('/').pop()}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-4 text-primary-500 bg-primary-500/5 w-fit px-6 py-3 rounded-full border border-primary-500/20 shadow-sm">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-[10px] font-black tracking-[0.3em] uppercase">Neural Processing...</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-10 left-10 right-10 z-30">
        <div className="relative">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
            placeholder="Query your local knowledge basis..."
            className="w-full bg-white border border-black/15 rounded-[30px] px-8 py-6 focus:outline-none focus:border-primary-500 focus:shadow-2xl focus:shadow-primary-500/10 transition-all text-base font-medium pr-20 shadow-xl shadow-black/[0.04] text-black placeholder:text-black/30"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className="absolute right-3 top-3 bottom-3 aspect-square bg-primary-500 rounded-[20px] hover:bg-primary-600 transition-all disabled:opacity-50 flex items-center justify-center text-white shadow-xl shadow-primary-500/20 group"
          >
            <Send size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FileManager() {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const resp = await axios.get(`${API_BASE}/files`);
        setFiles(resp.data.files || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFiles();
  }, []);

  return (
    <div className="flex-1 glass-morphism p-12 overflow-y-auto custom-scrollbar h-full">
      <div className="flex items-center justify-between mb-14">
        <div>
          <h2 className="text-4xl font-black text-black tracking-tighter mb-2">Neural Assets</h2>
          <p className="text-black/30 text-sm font-semibold tracking-tight">Browse and manage synchronized local data primitives.</p>
        </div>
      </div>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <Loader2 className="animate-spin text-primary-500" size={50} />
          <span className="text-[10px] font-black tracking-[0.4em] uppercase text-black/20">Syncing Assets</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {files.map((file, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="p-8 bg-white border border-black/5 rounded-[40px] flex flex-col gap-6 group hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-2 transition-all duration-500"
            >
              <div className="w-16 h-16 rounded-[24px] bg-primary-500/10 flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-all duration-500 shadow-sm">
                <FileText size={28} />
              </div>
              <div>
                <div className="font-black text-black text-lg tracking-tight truncate mb-1">{file}</div>
                <div className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em]">Synchronized Primitive</div>
              </div>
            </motion.div>
          ))}
          {files.length === 0 && (
            <div className="col-span-full text-center py-32 glass-morphism border-dashed border-2 flex flex-col items-center justify-center gap-4 bg-white/40">
              <Folder size={40} className="text-black/10" />
              <div className="text-black/20 font-bold uppercase tracking-widest text-xs">No project data detected</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const FREE_MODELS = [
  { name: 'Llama 3.1 8B (Elite)', id: 'meta-llama/llama-3.1-8b-instruct:free' },
  { name: 'Gemini 2.0 Flash (Experimental)', id: 'google/gemini-2.0-flash-exp:free' },
  { name: 'Mistral 7B (Reliable)', id: 'mistralai/mistral-7b-instruct:free' }
];

const RECOMMENDATIONS = {
  LOCAL: [
    { name: 'Llama 3.2 3B', id: 'llama3.2:3b' },
    { name: 'Phi 3 Mini', id: 'phi3:mini' },
    { name: 'Qwen 2.5 1.5B', id: 'qwen2.5:1.5b' }
  ],
  GROQ: [
    { name: 'Llama 3.3 70B Versatile', id: 'llama-3.3-70b-versatile' },
    { name: 'Llama 3.1 8B Instant', id: 'llama-3.1-8b-instant' },
    { name: 'Mixtral 8x7B 32k', id: 'mixtral-8x7b-32768' },
    { name: 'DeepSeek R1 Distill Llama 70B', id: 'deepseek-r1-distill-llama-70b' }
  ]
};

function SettingsView() {
  const [mode, setMode] = useState<'LOCAL' | 'OPENROUTER' | 'GEMINI' | 'GROQ'>('LOCAL');
  const [cloudMode, setCloudMode] = useState<'OPENROUTER' | 'GEMINI' | 'GROQ'>('GEMINI');
  const [apiKey, setApiKey] = useState('');
  const [localModel, setLocalModel] = useState('llama3.2:3b');
  const [selectedFreeModel, setSelectedFreeModel] = useState(FREE_MODELS[0].id);
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-versatile');
  const [activeBackendMode, setActiveBackendMode] = useState<string>('LOCAL');

  useEffect(() => {
    if (apiKey.startsWith('sk-or-')) {
      setCloudMode('OPENROUTER');
      setMode('OPENROUTER');
    } else if (apiKey.startsWith('AIza')) {
      setCloudMode('GEMINI');
      setMode('GEMINI');
    } else if (apiKey.startsWith('gsk_')) {
      setCloudMode('GROQ');
      setMode('GROQ');
    }
  }, [apiKey]);

  const saveSettings = async () => {
    try {
      await axios.post(`${API_BASE}/settings`, {
        mode,
        openrouter_key: (mode === 'OPENROUTER' || (mode === 'LOCAL' && cloudMode === 'OPENROUTER')) ? apiKey : '',
        gemini_key: (mode === 'GEMINI' || (mode === 'LOCAL' && cloudMode === 'GEMINI')) ? apiKey : '',
        groq_key: (mode === 'GROQ' || (mode === 'LOCAL' && cloudMode === 'GROQ')) ? apiKey : '',
        openrouter_model: selectedFreeModel,
        groq_model: groqModel,
        local_model: localModel
      });
      setActiveBackendMode(mode);
      alert(`Sync preferences updated! Mode: ${mode}`);
    } catch (err) {
      alert('Sync update failed.');
    }
  };

  const isGeminiKey = apiKey.startsWith('AIza');
  const isOpenRouterKey = apiKey.startsWith('sk-or-');
  const isGroqKey = apiKey.startsWith('gsk_');
  const keyWarning = (cloudMode === 'GEMINI' && (isOpenRouterKey || isGroqKey)) ||
    (cloudMode === 'OPENROUTER' && (isGeminiKey || isGroqKey)) ||
    (cloudMode === 'GROQ' && (isGeminiKey || isOpenRouterKey));

  return (
    <div className="flex-1 glass-morphism p-12 max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar h-full">
      <div className="flex justify-between items-center mb-16">
        <div>
          <h2 className="text-4xl font-black text-black tracking-tighter mb-2">Sync Preferences</h2>
          <p className="text-black/30 text-sm font-semibold tracking-tight">Configure core neural engines and API handshake keys.</p>
        </div>
        <div className="px-6 py-2 bg-primary-500 text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-primary-500/20">
          {activeBackendMode} Operational
        </div>
      </div>

      <div className="space-y-16">
        <section className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-black/30 uppercase tracking-[0.4em]">Cloud Neural Bridge</h3>
            {keyWarning && (
              <span className="text-[10px] font-bold text-primary-500 animate-pulse uppercase tracking-tight">⚠️ Key Handshake Error</span>
            )}
          </div>

          <div className="space-y-10 bg-white border border-black/5 p-10 rounded-[48px] shadow-2xl shadow-black/[0.03]">
            <div className="flex gap-4 p-2 bg-black/5 rounded-[24px] w-fit">
              {(['OPENROUTER', 'GEMINI', 'GROQ'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setCloudMode(m);
                    if (mode !== 'LOCAL') setMode(m);
                  }}
                  className={twMerge(
                    "px-10 py-3 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all",
                    cloudMode === m ? "bg-white text-black shadow-xl" : "text-black/30 hover:text-black/50"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="space-y-5">
              <label className="text-[10px] font-black text-black/20 uppercase tracking-widest block px-2">
                {cloudMode === 'GEMINI' ? 'Neural Key (Pro)' : cloudMode === 'GROQ' ? 'Groq Key (Elite)' : 'Global Bridge Key'}
              </label>
              <input
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                type="password"
                placeholder={cloudMode === 'GEMINI' ? "Bridge-Sync-AIza..." : cloudMode === 'GROQ' ? "Bridge-Sync-gsk_..." : "Bridge-Sync-sk-or-..."}
                className={twMerge(
                  "w-full bg-black/5 border border-transparent rounded-[24px] px-8 py-5 focus:bg-white focus:border-primary-500 outline-none text-base font-bold transition-all shadow-inner",
                  keyWarning ? "border-primary-500/30" : ""
                )}
              />
            </div>

            {cloudMode === 'GROQ' && (
              <div className="space-y-8 pt-10 border-t border-black/5">
                <div className="space-y-5">
                  <label className="text-[10px] font-black text-black/20 uppercase tracking-widest px-2 block">Accelerated Neural Architecture</label>
                  <div className="flex flex-wrap gap-4 px-1">
                    {RECOMMENDATIONS.GROQ.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setGroqModel(m.id)}
                        className={twMerge(
                          "px-8 py-4 rounded-[20px] text-xs font-black transition-all border",
                          groqModel === m.id ? "bg-primary-500 text-white shadow-xl shadow-primary-500/20 border-transparent" : "bg-black/5 border-transparent text-black/40 hover:bg-black/10 hover:text-black/60"
                        )}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-8">
          <h3 className="text-xs font-black text-black/30 uppercase tracking-[0.4em] px-2">Local Computing Grid</h3>
          <div className="bg-white border border-black/5 p-10 rounded-[48px] space-y-12 shadow-2xl shadow-black/[0.03]">
            <div className="flex items-center justify-between px-2">
              <div className="flex flex-col gap-3">
                <span className="text-xl font-black text-black tracking-tight uppercase">Ollama Local Sync</span>
                <span className="text-xs font-bold text-black/20 tracking-wider">Zero-Latency Private Neural Processing</span>
              </div>
              <button
                onClick={() => setMode(mode === 'LOCAL' ? cloudMode : 'LOCAL')}
                className={twMerge(
                  "w-20 h-10 rounded-full transition-all relative border border-transparent p-1.5",
                  mode === 'LOCAL' ? "bg-primary-500 shadow-2xl shadow-primary-500/30" : "bg-black/5"
                )}
              >
                <div className={twMerge(
                  "w-7 h-7 bg-white rounded-full transition-all shadow-xl",
                  mode === 'LOCAL' ? "translate-x-10" : "translate-x-0"
                )} />
              </button>
            </div>

            {mode === 'LOCAL' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-10 pt-10 border-t border-black/5">
                <div className="space-y-5">
                  <label className="text-[10px] font-black text-black/20 uppercase tracking-widest px-2 block">Active Weight Architecture</label>
                  <input value={localModel} onChange={e => setLocalModel(e.target.value)} type="text" placeholder="llama3.2:3b" className="w-full bg-black/5 border border-transparent rounded-[24px] px-8 py-5 focus:bg-white focus:border-primary-500 outline-none text-base font-bold shadow-inner transition-all" />
                </div>

                <div className="space-y-5">
                  <label className="text-[10px] font-black text-black/20 uppercase tracking-widest px-2 block">Elite Architectures</label>
                  <div className="flex flex-wrap gap-4 px-1">
                    {RECOMMENDATIONS.LOCAL.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setLocalModel(m.id)}
                        className={twMerge(
                          "px-8 py-4 rounded-[20px] text-xs font-black transition-all border",
                          localModel === m.id ? "bg-primary-500 text-white shadow-xl shadow-primary-500/20 border-transparent" : "bg-black/5 border-transparent text-black/40 hover:bg-black/10 hover:text-black/60"
                        )}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        <button
          onClick={saveSettings}
          className="w-full py-7 bg-primary-500 text-white hover:bg-primary-600 rounded-[36px] font-black text-base tracking-[0.2em] uppercase shadow-2xl shadow-primary-500/20 transition-all active:scale-[0.98] mb-12"
        >
          Confirm Synchronization
        </button>
      </div>
    </div>
  );
}

export default App;
