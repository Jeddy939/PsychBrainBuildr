import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import SlotMachine, { SlotMachineProps } from './SlotMachine';
import './App.css';

function App() {
  const [messages, setMessages] = useState<string[]>([]);
  const slotRef = useRef<{ spin: () => void }>(null);

  const handleSpin = () => {
    slotRef.current?.spin();
  };

  const handleStop: SlotMachineProps['onStop'] = (results) => {
    const center = results[1];
    const win = center.every((v) => v === center[0]);
    setMessages((m) => [
      win ? `Jackpot! ${center[0]} ${center[1]} ${center[2]}` : `Result: ${center.join(' ')}`,
      ...m,
    ]);
  };

  return (
    <div className="App">
      <button onClick={handleSpin}>Spin</button>
      <div style={{ height: '300px' }}>
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.8} />
          <SlotMachine ref={slotRef} onStop={handleStop} />
        </Canvas>
      </div>
      <div className="log">
        {messages.map((m, i) => (
          <div key={i}>{m}</div>
        ))}
      </div>
    </div>
  );
}

export default App
