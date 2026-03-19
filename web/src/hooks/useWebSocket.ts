import { useState, useEffect, useRef } from 'react'

export function useWebSocket(path: string) {
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shouldReconnectRef = useRef(true)

  useEffect(() => {
    shouldReconnectRef.current = true

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}${path}`
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
      }

      ws.onmessage = (event) => {
        setLastMessage(event.data)
      }

      ws.onclose = () => {
        if (!shouldReconnectRef.current) {
          return
        }
        console.log('WebSocket disconnected, reconnecting...')
        // 3秒后重连
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    }

    connect()

    return () => {
      shouldReconnectRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [path])

  return lastMessage
}
