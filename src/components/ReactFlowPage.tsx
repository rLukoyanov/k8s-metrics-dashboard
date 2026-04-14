import React, { useCallback, useRef, useState } from 'react'
import ReactFlow, { Background, Controls, useNodesState, useEdgesState, addEdge, type Connection } from 'reactflow'
import { driver  as Driver} from 'driver.js'
import 'driver.js/dist/driver.css'
import type { Node, Edge } from 'reactflow'
import 'reactflow/dist/style.css'

const emptyNodes: Node[] = []
const emptyEdges: Edge[] = []

export default function ReactFlowPage(): JSX.Element {
  const [mode, setMode] = useState<'menu' | 'canvas'>('menu')
  const [nodes, setNodes, onNodesChange] = useNodesState(emptyNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(emptyEdges)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const nextId = useRef<number>(1)

  const handleCreateNew = useCallback(() => {
    const defaultNode: Node = {
      id: 'node-1',
      position: { x: 250, y: 5 },
      data: { label: 'Новая нода' },
      draggable: true,
      style: { padding: 8, background: '#ffffff', color: '#000000', border: '1px solid rgba(0,0,0,0.12)' },
      type: 'default',
    }
    setNodes([defaultNode])
    setEdges(emptyEdges)
    setError(null)
    nextId.current = 2
    setMode('canvas')
  }, [])

  const handleOpenClick = useCallback(() => {
    fileRef.current?.click()
  }, [])

  const handleFile = useCallback((file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const content = reader.result as string
        const parsed = JSON.parse(content)
        const loadedNodes = Array.isArray(parsed.nodes) ? parsed.nodes : []
        const loadedEdges = Array.isArray(parsed.edges) ? parsed.edges : []
        const defaultNode: Node = { id: 'node-1', position: { x: 250, y: 5 }, data: { label: 'Новая нода' } }
        setNodes(loadedNodes.length ? loadedNodes : [defaultNode])
        nextId.current = loadedNodes.length ? loadedNodes.length + 1 : 2
        setEdges(loadedEdges)
        setError(null)
        setMode('canvas')
      } catch (e) {
        setError('Не удалось прочитать файл: неверный формат JSON')
      }
    }
    reader.onerror = () => setError('Ошибка чтения файла')
    reader.readAsText(file)
  }, [])

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files && e.target.files[0]
      handleFile(f)
      if (fileRef.current) fileRef.current.value = ''
    },
    [handleFile]
  )

  const addNode = useCallback(() => {
    const id = `node-${nextId.current++}`
    setNodes((n) => {
      const x = 50 + n.length * 120
      const y = 50
      const newNode: Node = { id, position: { x, y }, data: { label: `Нода ${id}` }, draggable: true, style: { padding: 8, background: '#ffffff', color: '#000000', border: '1px solid rgba(0,0,0,0.12)' }, type: 'default' }
      return [...n, newNode]
    })
  }, [])

  const onConnect = useCallback(
    (params: Connection | any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const startTutorial = useCallback(() => {
    // ensure we have at least two nodes for the tutorial
    setNodes((cur) => {
      if (cur.length >= 2) return cur
      const n1: Node = { id: 'node-1', position: { x: 150, y: 100 }, data: { label: 'Нода node-1' }, draggable: true, style: { padding: 8, background: '#ffffff', color: '#000' } }
      const n2: Node = { id: 'node-2', position: { x: 450, y: 100 }, data: { label: 'Нода node-2' }, draggable: true, style: { padding: 8, background: '#ffffff', color: '#000' } }
      nextId.current = 3
      return [n1, n2]
    })

    // reveal auto-connect button
    const autoBtn = document.getElementById('auto-connect-btn')
    if (autoBtn) autoBtn.style.display = 'inline-block'

    // small delay to allow DOM render
    setTimeout(() => {
      const driver = Driver({ animate: true, padding: 8, doneBtnText: 'Готово' })

      const steps = [
        {
          element: '#add-node-btn',
          popover: {
            title: 'Добавление ноды',
            description: 'Нажмите эту кнопку, чтобы добавить новую ноду на канвас.'
          }
        },
        {
          element: '#reactflow-wrapper',
          popover: {
            title: 'Канвас',
            description: 'Это рабочая область. Попробуйте перетаскивать ноды, чтобы изменить их положение.'
          }
        },
        {
          element: '[data-id="node-1"]',
          popover: {
            title: 'Нода',
            description: 'Это одна из нод — вы можете перетащить её.'
          }
        },
        {
          element: '[data-id="node-2"]',
          popover: {
            title: 'Соединение',
            description: 'Чтобы соединить ноды, перетащите из правого «хендла» первой ноды в левый хендл второй. Если хотите, можно автоматически показать соединение.'
          }
        },
        {
          element: '#auto-connect-btn',
          popover: {
            title: 'Авто‑соединение',
            description: 'Нажмите эту кнопку, чтобы автоматически соединить ноды для примера.'
          }
        }
      ]

      driver.setSteps(steps)
      driver.drive()
    //   driver.start()

      const hideAuto = () => {
        const b = document.getElementById('auto-connect-btn')
        if (b) b.style.display = 'none'
      }

      // hide the auto connect button when tutorial ends or is reset
    //   driver.on('reset', hideAuto)
    //   driver.on('complete', hideAuto)
    }, 250)
  }, [setNodes, setEdges])

  const autoConnect = useCallback(() => {
    // create an edge between node-1 and node-2 if not exists
    setEdges((cur) => {
      const exists = cur.some((e) => e.source === 'node-1' && e.target === 'node-2')
      if (exists) return cur
      const edge: Edge = { id: `e-node-1-node-2`, source: 'node-1', target: 'node-2', animated: true }
      return [...cur, edge]
    })
    const b = document.getElementById('auto-connect-btn')
    if (b) b.style.display = 'none'
  }, [setEdges])

  if (mode === 'menu') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <div style={{ width: 420, padding: 24, borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', background: '#fff' }}>
          <h2 style={{ marginTop: 0 }}>React Flow</h2>
          <p style={{ color: '#555' }}>Выберите действие для начала работы со схемой.</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button onClick={handleCreateNew} style={{ flex: 1, padding: '8px 12px' }}>Создать новую</button>
            <button onClick={handleOpenClick} style={{ flex: 1, padding: '8px 12px' }}>Открыть существующую</button>
          </div>
          {error && <div style={{ marginTop: 12, color: 'crimson' }}>{error}</div>}
          <input ref={fileRef} type="file" accept="application/json" onChange={onFileChange} style={{ display: 'none' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', background: '#ffffff' }}>
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
        <button onClick={() => setMode('menu')}>← Назад</button>
      </div>
      <div style={{ position: 'absolute', top: 72, right: 16, zIndex: 1000 }}>
        <button id="add-node-btn" onClick={addNode} style={{ background: '#fff', padding: '8px 10px', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)', marginRight: 8 }}>Добавить ноду</button>
        <button id="start-tutorial-btn" onClick={startTutorial} style={{ background: '#fff', padding: '8px 10px', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)', marginRight: 8 }}>Запустить туториал</button>
        <button id="auto-connect-btn" onClick={autoConnect} style={{ display: 'none' }}>Авто‑соединить</button>
      </div>
      <div id="reactflow-wrapper" style={{ height: '100%', width: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background gap={16} size={1} color="#f5f7fa" />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}

// end of component

