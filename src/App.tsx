import { useState } from 'react'
import { GameScene } from './game/scenes/GameScene'
import { ExampleScene } from './game/scenes/ExampleScene'
import './App.css'

function App() {
  const [currentScene, setCurrentScene] = useState<'game' | 'example'>('game')

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 場景選擇器 */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '10px',
        borderRadius: '5px'
      }}>
        <button
          onClick={() => setCurrentScene('game')}
          style={{
            padding: '10px 20px',
            background: currentScene === 'game' ? '#4CAF50' : '#333',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontFamily: 'monospace'
          }}
        >
          遊戲場景
        </button>
        <button
          onClick={() => setCurrentScene('example')}
          style={{
            padding: '10px 20px',
            background: currentScene === 'example' ? '#4CAF50' : '#333',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontFamily: 'monospace'
          }}
        >
          範例場景
        </button>
      </div>

      {/* 渲染當前場景 */}
      {currentScene === 'game' ? <GameScene /> : <ExampleScene />}
    </div>
  )
}

export default App
