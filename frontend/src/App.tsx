import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
}

interface LogEntry {
  type: 'chat' | 'roll' | 'system' | 'emote';
  sender?: string;
  message?: string;
  dice?: string;
  result?: string;
  timestamp: string;
}

interface Character {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  food: number;
  water: number;
  hasShelter: boolean;
  inventory: InventoryItem[];
}

interface SessionInfo {
  id: string;
  islandName: string;
  createdAt: string;
  playersCount: number;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [view, setView] = useState<'home' | 'gm_dashboard' | 'join' | 'game'>('home')
  const [sessionId, setSessionId] = useState<string>('')
  const [isGM, setIsGM] = useState(false)
  const [connected, setConnected] = useState(false)
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [inputValue, setInputValue] = useState('')
  const [myCharacter, setMyCharacter] = useState<Character | null>(null)
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const newSocket = io('http://localhost:3000', { transports: ['websocket'] })
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setConnected(true)
      const savedGMData = localStorage.getItem('island_survival_gm');
      if (savedGMData) {
        const { sessionId: savedId, gmKey } = JSON.parse(savedGMData);
        newSocket.emit('reconnect-gm', { sessionId: savedId, gmKey }, (res: any) => {
          if (res.success) {
            setSessionId(savedId);
            setIsGM(true);
            setLogs(res.session.logs);
            setView('game');
          }
        });
      }
    })

    newSocket.on('disconnect', () => setConnected(false))
    newSocket.on('new-log', (log: LogEntry) => setLogs((prev) => [...prev, log]))
    
    return () => { newSocket.close() }
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [logs])

  const loadSessions = () => {
    if (socket) {
      socket.emit('get-sessions', (list: SessionInfo[]) => {
        setSessions(list)
        setView('gm_dashboard')
      })
    }
  }

  const createSession = () => {
    if (socket) {
      socket.emit('create-session', (res: { sessionId: string, gmKey: string, islandName: string }) => {
        setSessionId(res.sessionId)
        setIsGM(true)
        localStorage.setItem('island_survival_gm', JSON.stringify({ sessionId: res.sessionId, gmKey: res.gmKey }));
        setView('game')
      })
    }
  }

  const deleteSession = (id: string) => {
    const gmData = JSON.parse(localStorage.getItem('island_survival_gm') || '{}');
    if (socket && gmData.sessionId === id) {
      socket.emit('delete-session', { sessionId: id, gmKey: gmData.gmKey }, (res: { success: boolean }) => {
        if (res.success) {
          setSessions(prev => prev.filter(s => s.id !== id))
          if (sessionId === id) leaveSession()
        }
      })
    } else {
      alert('Ви можете видаляти лише власні активні сесії у цьому браузері.')
    }
  }

  const startJoin = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('s');
    if (id) setSessionId(id);
    setView('join');
  }

  const joinSession = (name: string, startingItem: string) => {
    if (socket && sessionId) {
      socket.emit('join-session', { sessionId, name, startingItem }, (res: any) => {
        if (res.success) {
          setMyCharacter(res.session.players[res.characterId]);
          setLogs(res.session.logs);
          setView('game');
        } else {
          alert('Помилка приєднання: ' + res.error);
        }
      })
    }
  }

  const sendMessage = () => {
    if (socket && inputValue.trim()) {
      socket.emit('send-message', { sessionId, message: inputValue })
      setInputValue('')
    }
  }

  const leaveSession = () => {
     setSessionId('');
     setIsGM(false);
     setLogs([]);
     setMyCharacter(null);
     setView('home');
     localStorage.removeItem('island_survival_gm');
  }

  return (
    <div className="min-h-screen w-full bg-island-wood text-island-sand font-mono flex flex-col items-center overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/old-map.png')]"></div>

      {/* Header */}
      <header className="w-full max-w-4xl flex flex-col items-center py-6 z-10">
        <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-widest border-b-4 border-island-sand pb-2 mb-2 text-center drop-shadow-lg">
          Island Survival
        </h1>
        <p className="text-[10px] md:text-xs opacity-60 uppercase tracking-[0.3em]">Logbook Digital System</p>
      </header>

      {/* View: Home */}
      {view === 'home' && (
        <main className="flex-1 flex flex-col items-center justify-center z-10 space-y-8">
           <div className="bg-black/40 border-2 border-island-sand p-8 shadow-2xl backdrop-blur-sm max-w-sm w-full text-center space-y-6">
              <p className="italic text-sm">Ласкаво просимо до системи виживання. Оберіть свою роль:</p>
              <button 
                onClick={loadSessions}
                className="w-full py-4 bg-island-forest/80 hover:bg-island-forest border-2 border-island-sand font-bold transition-all uppercase"
              >
                Провідник (GM)
              </button>
              <button 
                onClick={startJoin}
                className="w-full py-4 bg-island-ocean/80 hover:bg-island-ocean border-2 border-island-sand font-bold transition-all uppercase"
              >
                Вижилий (Player)
              </button>
           </div>
        </main>
      )}

      {/* View: GM Dashboard */}
      {view === 'gm_dashboard' && (
        <main className="flex-1 w-full max-w-4xl px-4 z-10 space-y-6">
           <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold uppercase underline">Менеджер Сесій</h2>
              <button onClick={() => setView('home')} className="text-xs hover:underline">[ Назад ]</button>
           </div>

           <button 
             onClick={createSession}
             className="w-full py-6 bg-island-forest/40 hover:bg-island-forest/60 border-2 border-dashed border-island-sand font-bold transition-all text-lg uppercase"
           >
             + Створити нову експедицію
           </button>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map(s => (
                <div key={s.id} className="bg-black/40 border border-island-sand p-4 flex flex-col space-y-3">
                   <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-island-ocean">{s.islandName}</h3>
                        <p className="text-[10px] opacity-50">Створено: {new Date(s.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="text-[10px] bg-island-sand/20 px-2 py-1 rounded-full">👥 {s.playersCount}</span>
                   </div>
                   <div className="flex space-x-2">
                      <button 
                        onClick={() => { setSessionId(s.id); setIsGM(true); setView('game'); }}
                        className="flex-1 py-2 bg-island-sand text-island-wood font-bold text-xs uppercase"
                      >
                        Зайти як Майстер
                      </button>
                      <button 
                        onClick={() => deleteSession(s.id)}
                        className="px-3 py-2 bg-red-900/40 hover:bg-red-900 border border-red-500/50 text-red-200 text-xs"
                      >
                        🗑
                      </button>
                   </div>
                </div>
              ))}
              {sessions.length === 0 && <p className="col-span-full text-center opacity-40 py-8 italic">Активних сесій не знайдено...</p>}
           </div>
        </main>
      )}

      {/* View: Join (Character Creation) */}
      {view === 'join' && (
        <main className="flex-1 w-full max-w-md px-4 z-10">
           <div className="bg-black/40 border-2 border-island-sand p-8 shadow-2xl space-y-6">
              <h2 className="text-xl font-bold uppercase text-center border-b border-island-sand/30 pb-4">Створення Вижилого</h2>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase opacity-60">ID Сесії (Код сигналу)</label>
                  <input 
                    type="text" 
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="Напр. rcfm0pn"
                    className="w-full bg-black/50 border border-island-sand p-3 text-island-sand focus:outline-none text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase opacity-60">Ім'я персонажа</label>
                  <input 
                    type="text" 
                    id="char-name"
                    placeholder="Як вас звати?"
                    className="w-full bg-black/50 border border-island-sand p-3 text-island-sand focus:outline-none text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase opacity-60">Стартовий предмет</label>
                  <input 
                    type="text" 
                    id="char-item"
                    placeholder="Що ви встигли вхопити?"
                    className="w-full bg-black/50 border border-island-sand p-3 text-island-sand focus:outline-none text-sm"
                  />
                </div>
                
                <button 
                  onClick={() => {
                    const name = (document.getElementById('char-name') as HTMLInputElement).value;
                    const item = (document.getElementById('char-item') as HTMLInputElement).value;
                    if (name) joinSession(name, item);
                    else alert('Введіть хоча б ім'я!');
                  }}
                  className="w-full py-4 bg-island-ocean hover:bg-island-ocean/80 text-island-sand border border-island-sand font-bold transition-all uppercase"
                >
                  Розпочати Виживання
                </button>
                <button onClick={() => setView('home')} className="w-full text-xs opacity-40 hover:opacity-100 uppercase underline">Повернутися</button>
              </div>
           </div>
        </main>
      )}

      {/* View: Game */}
      {view === 'game' && (
        <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 items-start px-4 z-10">
          {/* Main Terminal Section */}
          <section className="md:col-span-3 flex flex-col space-y-2 order-1">
            <div className="flex justify-between items-center text-[10px] uppercase opacity-60 px-1">
               <div className="flex space-x-4">
                 <span className="text-island-ocean font-bold">Острів: {sessionId}</span>
                 <button onClick={leaveSession} className="hover:text-red-400 underline">[Залишити]</button>
               </div>
               <span className={connected ? 'text-island-forest' : 'text-red-500'}>
                 {connected ? "● Стабільний зв'язок" : "○ Пошук сигналу..."}
               </span>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 min-h-[450px] max-h-[65vh] md:max-h-[75vh] overflow-y-auto bg-black/70 border-2 border-island-sand p-4 text-xs md:text-sm shadow-inner space-y-2 custom-scrollbar"
            >
              {logs.map((log, i) => (
                <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="opacity-30 text-[10px] mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  {log.type === 'system' && (
                    <span className="text-island-forest italic bg-island-forest/5 px-1">
                      <span className="mr-2">»</span> {log.message}
                    </span>
                  )}
                  {log.type === 'chat' && (
                    <div className="inline">
                      <span className="text-island-ocean font-bold">{log.sender}: </span>
                      <span className="text-island-sand">{log.message}</span>
                    </div>
                  )}
                  {log.type === 'emote' && (
                    <span className="text-pink-300 italic opacity-90">
                      * {log.sender} {log.message} *
                    </span>
                  )}
                  {log.type === 'roll' && (
                    <div className="bg-yellow-900/10 border-l-2 border-yellow-500/50 pl-2 py-1 my-1">
                      <span className="text-yellow-400 font-bold">
                        🎲 {log.sender} кинув {log.dice} і отримав: <span className="text-lg underline ml-1">{log.result}</span>
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Введіть команду (/roll, /emote) або повідомлення..."
                className="flex-1 bg-black/40 border-2 border-island-sand p-3 text-island-sand focus:outline-none focus:border-island-ocean text-xs md:text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
              />
              <button 
                onClick={sendMessage}
                className="px-4 md:px-8 bg-island-forest/80 hover:bg-island-forest text-island-sand border-2 border-island-sand font-bold transition-all active:scale-95 text-xs md:text-sm uppercase"
              >
                Send
              </button>
            </div>
          </section>

          {/* Sidebar Area */}
          <aside className="md:col-span-1 space-y-4 order-2">
            <div className="bg-black/40 border border-island-sand p-4 rounded-sm shadow-xl backdrop-blur-sm">
               <h2 className="text-xs font-bold uppercase border-b border-island-sand/30 mb-3 pb-1">Поточний стан</h2>
               {isGM ? (
                 <div className="text-xs space-y-2">
                    <p className="text-island-ocean font-bold">Ви — Провідник</p>
                    <p className="opacity-60 text-[10px]">Керуйте вижилими через команди або спеціальну панель (скоро).</p>
                 </div>
               ) : (
                 <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between mb-1 text-[10px]">
                         <span>Здоров'я {myCharacter?.name}:</span>
                         <span>{myCharacter?.hp || 10}/{myCharacter?.maxHp || 10}</span>
                      </div>
                      <div className="w-full bg-gray-900 h-1.5 border border-island-sand/20">
                         <div 
                           className="bg-red-600 h-full transition-all duration-500" 
                           style={{ width: `${((myCharacter?.hp || 10) / (myCharacter?.maxHp || 10)) * 100}%` }}
                         ></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                       <span className="opacity-60 uppercase">Ресурси:</span>
                       <span className="text-island-ocean">🍗 {myCharacter?.food} | 💧 {myCharacter?.water}</span>
                    </div>
                    <button 
                      onClick={() => socket?.emit('send-message', { sessionId, message: '/roll 1d20' })}
                      className="w-full py-2 bg-yellow-900/20 hover:bg-yellow-900/40 border border-yellow-500/50 text-yellow-400 font-bold text-[10px] uppercase transition-all"
                    >
                      🎲 Кинути d20
                    </button>
                 </div>
               )}
            </div>

            {!isGM && (
              <div className="bg-black/40 border border-island-sand p-4 rounded-sm shadow-xl backdrop-blur-sm">
                 <h2 className="text-xs font-bold uppercase border-b border-island-sand/30 mb-3 pb-1">Інвентар</h2>
                 <ul className="text-[10px] space-y-1 opacity-80">
                    {myCharacter?.inventory.map((item, i) => (
                      <li key={i} className="flex items-center justify-between">
                        <span><span className="text-island-forest mr-1">▸</span> {item.name}</span>
                        <span className="opacity-40">x{item.quantity}</span>
                      </li>
                    ))}
                    {(!myCharacter?.inventory || myCharacter.inventory.length === 0) && <li className="italic opacity-40">Кишені порожні...</li>}
                 </ul>
              </div>
            )}
          </aside>
        </main>
      )}

      {/* Footer Decoration */}
      <footer className="mt-auto pt-8 pb-4 w-full max-w-4xl text-center opacity-40">
         <div className="h-px bg-gradient-to-r from-transparent via-island-sand/20 to-transparent w-full mb-4"></div>
         <p className="text-[10px] uppercase tracking-widest italic px-4">
           Загублені в океані часу.
         </p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f2d2a9; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fade-in 0.4s ease-out; }
      `}} />
    </div>
  )
}

export default App
