import { useEffect, useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { gameRegistry } from './games';

function App(): React.ReactElement | null {
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentGameId('safe-driving');
  }, []);
  // 主選單
  if (!currentGameId) {
    return (
      <MainMenu
        games={gameRegistry}
        onSelectGame={setCurrentGameId}
      />
    );
  }

  // 找到對應遊戲
  const game = gameRegistry.find(g => g.id === currentGameId);
  if (!game) {
    setCurrentGameId(null);
    return null;
  }

  const GameComponent = game.component;

  return <GameComponent onExit={() => setCurrentGameId(null)} />;
}

export default App;
