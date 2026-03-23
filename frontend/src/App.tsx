import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [sessionId, setSessionId] = useState<string>('')
  const [isGM, setIsGM] = useState(false)
  const [connected, setConnected] = useState(false)

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

    return () => {
      newSocket.close()
    }
  }, [])

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
      socket.emit('join-session', { sessionId: id }, (res: { success: boolean }) => {
        if (res.success) {
          setSessionId(id)
          setIsGM(false)
        } else {
          alert('Session not found!')
        }
      })
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-island-sand mb-8">Island Survival Logbook</h1>
      
      <div className="bg-island-wood border-2 border-island-sand p-6 rounded-lg shadow-xl w-full max-w-md">
        {!sessionId ? (
          <div className="space-y-4">
            <button 
              onClick={createSession}
              className="w-full py-2 bg-island-forest hover:opacity-80 text-island-sand border border-island-sand font-bold"
            >
              [ START NEW EXPEDITION ]
            </button>
            <div className="flex space-x-2">
              <input 
                type="text" 
                placeholder="Enter Session ID..."
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
                JOIN
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-b border-island-sand pb-2 mb-4">
              <p className="text-island-sand">Status: <span className="text-island-forest font-bold">READY</span></p>
              <p className="text-island-sand">Role: <span className="font-bold">{isGM ? 'Expedition Guide (GM)' : 'Survivor'}</span></p>
              <p className="text-island-sand">Session ID: <span className="font-bold text-island-ocean">{sessionId}</span></p>
            </div>
            <div className="h-64 overflow-y-auto bg-black p-4 text-island-sand text-sm border border-island-sand">
              <p className="text-island-forest">[SYSTEM] Logs gathering...</p>
              <p>[SYSTEM] Expedition started on island.</p>
              <p>[SYSTEM] Welcome, {isGM ? 'Guide' : 'Survivor'}!</p>
            </div>
          </div>
        )}
      </div>
      <p className="mt-8 text-island-sand text-xs opacity-50">
        Connected: {connected ? 'YES' : 'NO'} | Server: localhost:3000
      </p>
    </div>
  )
}

export default App
