import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

interface LogEntry {
  type: 'chat' | 'roll' | 'system' | 'emote';
  sender?: string;
  message?: string;
  dice?: string;
  result?: string;
  timestamp: string;
}

interface CharacterStats {
  hp: number;
  maxHp: number;
  inventory: string[];
  level: number;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [sessionId, setSessionId] = useState<string>('')
  const [isGM, setIsGM] = useState(false)
  const [connected, setConnected] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [inputValue, setInputValue] = useState('')
  const [stats, setStats] = useState<CharacterStats>({
    hp: 10,
    maxHp: 10,
    inventory: ['Ніж', 'Кресало'],
    level: 1
  })
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      transports: ['websocket'],
    })
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setConnected(true)
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
    })

    newSocket.on('new-log', (log: LogEntry) => {
      setLogs((prev) => [...prev, log])
    })

    newSocket.on('player-joined', (data: { playerId: string }) => {
      setLogs((prev) => [...prev, {
        type: 'system',
        message: `Новий вижилий приєднався до експедиції: ${data.playerId.substring(0, 4)}`,
        timestamp: new Date().toISOString()
      }])
    })

    return () => {
      newSocket.close()
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const createSession = () => {
    if (socket) {
      socket.emit('create-session', (res: { sessionId: string }) => {
        setSessionId(res.sessionId)
        setIsGM(true)
      })
    }
  }

  const joinSession = (id: string) => {
    if (socket) {
      socket.emit('join-session', { sessionId: id }, (res: { success: boolean, history?: LogEntry[] }) => {
        if (res.success) {
          setSessionId(id)
          setIsGM(false)
          if (res.history) setLogs(res.history)
        } else {
          alert('Сесію не знайдено!')
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

  return (
    <div className="min-h-screen w-full bg-island-wood text-island-sand font-mono p-4 flex flex-col items-center">
      <header className="w-full max-w-4xl flex flex-col items-center mb-6">
        <h1 className="text-2xl md:text-4xl font-bold uppercase tracking-tighter border-b-2 border-island-sand pb-2 mb-2">
          Island Survival Logbook
        </h1>
        <p className="text-[10px] md:text-xs opacity-60">Електронний журнал виживання v1.0.3</p>
      </header>

      {!sessionId ? (
        <main className="w-full max-w-md bg-black/40 border-2 border-island-sand p-6 shadow-2xl rounded-sm">
          <div className="space-y-6">
            <div className="text-center space-y-2">
               <p className="text-sm italic">Здається, ви опинилися на безлюдному острові...</p>
               <div className="h-px bg-island-sand/30 w-full"></div>
            </div>
            
            <button 
              onClick={createSession}
              className="w-full py-3 bg-island-forest/80 hover:bg-island-forest text-island-sand border border-island-sand font-bold transition-colors uppercase text-sm"
            >
              [ Очолити експедицію ]
            </button>
            
            <div className="relative py-2">
               <span className="absolute left-1/2 -top-1/2 -translate-x-1/2 bg-[#5d4037] px-2 text-[10px] uppercase opacity-60">АБО</span>
               <div className="h-px bg-island-sand/30 w-full"></div>
            </div>

            <div className="space-y-2">
              <input 
                type="text" 
                placeholder="Введіть код сигналу (Session ID)..."
                className="w-full bg-black/50 border border-island-sand p-3 text-island-sand focus:outline-none focus:ring-1 focus:ring-island-ocean text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') joinSession((e.target as HTMLInputElement).value)
                }}
              />
              <button 
                onClick={() => {
                  const input = document.querySelector('input') as HTMLInputElement
                  joinSession(input.value)
                }}
                className="w-full py-2 bg-island-ocean/80 hover:bg-island-ocean text-island-sand border border-island-sand font-bold transition-colors text-sm"
              >
                ПРИЄДНАТИСЯ ДО ГРУПИ
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
          {/* Stats Sidebar */}
          <aside className="md:col-span-1 space-y-4 order-2 md:order-1">
            <div className="bg-black/40 border border-island-sand p-4 rounded-sm">
               <h2 className="text-xs font-bold uppercase border-b border-island-sand/30 mb-3 pb-1">Стан Вижилого</h2>
               <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                       <span>Здоров'я:</span>
                       <span>{stats.hp}/{stats.maxHp}</span>
                    </div>
                    <div className="w-full bg-gray-900 h-2 border border-island-sand/20">
                       <div 
                         className="bg-red-600 h-full transition-all duration-500" 
                         style={{ width: `${(stats.hp / stats.maxHp) * 100}%` }}
                       ></div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                     <span>Рівень:</span>
                     <span className="text-island-forest">{stats.level}</span>
                  </div>
               </div>
            </div>

            <div className="bg-black/40 border border-island-sand p-4 rounded-sm flex-1">
               <h2 className="text-xs font-bold uppercase border-b border-island-sand/30 mb-3 pb-1">Інвентар</h2>
               <ul className="text-[10px] space-y-1 opacity-80">
                  {stats.inventory.map((item, i) => (
                    <li key={i} className="flex items-center">
                      <span className="mr-2">▸</span> {item}
                    </li>
                  ))}
                  {stats.inventory.length === 0 && <li className="italic">Порожньо...</li>}
               </ul>
            </div>
          </aside>

          {/* Terminal Main */}
          <section className="md:col-span-3 flex flex-col space-y-2 order-1 md:order-2">
            <div className="flex justify-between items-center text-[10px] uppercase opacity-60 px-1">
               <span>Сигнал: {sessionId}</span>
               <span className={connected ? 'text-island-forest' : 'text-red-500'}>
                 {connected ? '● Підключено' : '○ Зв'язок втрачено'}
               </span>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 min-h-[400px] max-h-[60vh] md:max-h-[70vh] overflow-y-auto bg-black/60 border-2 border-island-sand p-4 text-xs md:text-sm shadow-inner space-y-1 custom-scrollbar"
            >
              {logs.map((log, i) => (
                <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="opacity-30 text-[10px] mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  {log.type === 'system' && (
                    <span className="text-island-forest italic">
                      <span className="mr-2">»</span> {log.message}
                    </span>
                  )}
                  {log.type === 'chat' && (
                    <div className="inline">
                      <span className="text-island-ocean font-bold">{log.sender?.substring(0, 4)}: </span>
                      <span className="text-island-sand">{log.message}</span>
                    </div>
                  )}
                  {log.type === 'emote' && (
                    <span className="text-pink-300 italic opacity-90">
                      * {log.sender?.substring(0, 4)} {log.message} *
                    </span>
                  )}
                  {log.type === 'roll' && (
                    <div className="bg-yellow-900/10 border-l-2 border-yellow-500/50 pl-2 py-1 my-1">
                      <span className="text-yellow-400 font-bold">
                        🎲 {log.sender?.substring(0, 4)} кинув {log.dice} і отримав: <span className="text-lg underline">{log.result}</span>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage()
                }}
              />
              <button 
                onClick={sendMessage}
                className="px-4 md:px-8 bg-island-forest/80 hover:bg-island-forest text-island-sand border-2 border-island-sand font-bold transition-all active:scale-95 text-xs md:text-sm uppercase"
              >
                Send
              </button>
            </div>
          </section>
        </main>
      )}

      <footer className="mt-auto pt-8 pb-4 w-full max-w-4xl text-center">
         <div className="h-px bg-gradient-to-r from-transparent via-island-sand/20 to-transparent w-full mb-4"></div>
         <p className="text-[10px] opacity-40 uppercase tracking-widest italic">
           Кожна дія має наслідки. Виживання — це вибір.
         </p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f2d2a9; border-radius: 3px; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-in { animation: fade-in 0.3s ease-out; }
      `}} />
    </div>
  )
}

export default App
