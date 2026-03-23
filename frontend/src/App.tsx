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

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [sessionId, setSessionId] = useState<string>('')
  const [isGM, setIsGM] = useState(false)
  const [connected, setConnected] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [inputValue, setInputValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      transports: ['websocket'],
    })
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setConnected(true)
      console.log('Connected to server')
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
        message: `Новий вижилий приєднався до експедиції: ${data.playerId}`,
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
        setLogs([{
          type: 'system',
          message: `Ви розпочали нову експедицію. ID: ${res.sessionId}`,
          timestamp: new Date().toISOString()
        }])
      })
    }
  }

  const joinSession = (id: string) => {
    if (socket) {
      socket.emit('join-session', { sessionId: id }, (res: { success: boolean, history?: LogEntry[] }) => {
        if (res.success) {
          setSessionId(id)
          setIsGM(false)
          if (res.history) {
            setLogs(res.history)
          } else {
            setLogs([{
              type: 'system',
              message: `Ви приєдналися до експедиції ${id}`,
              timestamp: new Date().toISOString()
            }])
          }
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
    <div className="flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-island-sand mb-8 text-center">Журнал виживання на острові</h1>
      
      <div className="bg-island-wood border-2 border-island-sand p-6 rounded-lg shadow-xl w-full max-w-2xl">
        {!sessionId ? (
          <div className="space-y-4">
            <button 
              onClick={createSession}
              className="w-full py-2 bg-island-forest hover:opacity-80 text-island-sand border border-island-sand font-bold"
            >
              [ РОЗПОЧАТИ НОВУ ЕКСПЕДИЦІЮ ]
            </button>
            <div className="flex space-x-2">
              <input 
                type="text" 
                placeholder="Введіть ID сесії..."
                className="flex-1 bg-island-wood border border-island-sand p-2 text-island-sand focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') joinSession((e.target as HTMLInputElement).value)
                }}
              />
              <button 
                onClick={() => {
                  const input = document.querySelector('input') as HTMLInputElement
                  joinSession(input.value)
                }}
                className="px-4 py-2 bg-island-ocean hover:opacity-80 text-island-sand border border-island-sand font-bold"
              >
                УВІЙТИ
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-b border-island-sand pb-2 mb-4 flex justify-between items-center">
              <div>
                <p className="text-island-sand text-xs">ID сесії: <span className="font-bold text-island-ocean">{sessionId}</span></p>
                <p className="text-island-sand text-xs">Роль: <span className="font-bold">{isGM ? 'Провідник' : 'Вижилий'}</span></p>
              </div>
              <div className="text-right">
                 <span className={`text-[10px] ${connected ? 'text-island-forest' : 'text-red-500'}`}>
                   {connected ? '● ОНЛАЙН' : '○ ОФЛАЙН'}
                 </span>
              </div>
            </div>
            
            <div 
              ref={scrollRef}
              className="h-80 overflow-y-auto bg-black p-4 text-island-sand text-sm border border-island-sand font-mono space-y-1"
            >
              {logs.map((log, i) => (
                <div key={i} className="break-words">
                  <span className="opacity-40 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  {log.type === 'system' && <span className="text-island-forest italic">-- {log.message} --</span>}
                  {log.type === 'chat' && (
                    <>
                      <span className="text-island-ocean font-bold">{log.sender?.substring(0, 4)}: </span>
                      <span>{log.message}</span>
                    </>
                  )}
                  {log.type === 'emote' && (
                    <span className="text-pink-300" style={{ fontStyle: 'italic' }}>
                      * {log.sender?.substring(0, 4)} {log.message} *
                    </span>
                  )}
                  {log.type === 'roll' && (
                    <span className="text-yellow-400 font-bold bg-yellow-900/20 px-1">
                      🎲 {log.sender?.substring(0, 4)} кинув {log.dice} та отримав результат: {log.result}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex space-x-2 pt-2">
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Введіть команду (/roll, /emote) або повідомлення..."
                className="flex-1 bg-island-wood border border-island-sand p-2 text-island-sand focus:outline-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage()
                }}
              />
              <button 
                onClick={sendMessage}
                className="px-6 py-2 bg-island-forest hover:opacity-80 text-island-sand border border-island-sand font-bold text-sm"
              >
                ВІДПРАВИТИ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
