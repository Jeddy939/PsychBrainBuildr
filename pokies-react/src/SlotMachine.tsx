import {
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const reelLayouts = [
  ['\u{1F352}', '\u{1F34B}', '\u{1F514}', '\u{2B50}', '\u{1F48E}', '\u{1F34B}', '\u{2B50}', '\u{1F352}'],
  ['\u{1F514}', '\u{1F352}', '\u{1F34B}', '\u{2B50}', '\u{1F352}', '\u{1F48E}', '\u{1F34B}', '\u{2B50}'],
  ['\u{1F34B}', '\u{1F48E}', '\u{1F352}', '\u{1F514}', '\u{1F34B}', '\u{2B50}', '\u{1F48E}', '\u{1F352}']
];

function createSymbolTexture(sym: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '100px serif';
  ctx.fillText(sym, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

interface ReelHandle {
  spin: (index: number) => void;
}

interface ReelProps {
  layout: string[];
  x: number;
}

const Reel = forwardRef<ReelHandle, ReelProps>(({ layout, x }, ref) => {
  const group = useRef<THREE.Group>(null!);
  const [targetRot, setTargetRot] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const SEGMENT_COUNT = layout.length;
  const angleStep = (2 * Math.PI) / SEGMENT_COUNT;
  const wheelRadius = 1.2;

  const meshes = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (!group.current || meshes.current.length > 0) return;
    layout.forEach((sym, i) => {
      const geo = new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshBasicMaterial({
        map: createSymbolTexture(sym),
        transparent: true,
      });
      const m = new THREE.Mesh(geo, mat);
      const angle = i * angleStep;
      m.position.y = Math.sin(angle) * wheelRadius;
      m.position.z = Math.cos(angle) * wheelRadius;
      m.rotation.x = angle;
      meshes.current.push(m);
      group.current.add(m);
    });
  }, []);

  useImperativeHandle(ref, () => ({
    spin: (idx: number) => {
      const angle = -idx * angleStep - Math.PI * 6;
      setTargetRot(angle);
      setSpinning(true);
    },
  }));

  useFrame((_, delta) => {
    if (!spinning) return;
    const rot = group.current.rotation.x;
    const diff = targetRot - rot;
    const step = delta * 6;
    if (Math.abs(diff) <= step) {
      group.current.rotation.x = targetRot;
      setSpinning(false);
    } else {
      group.current.rotation.x = rot + Math.sign(diff) * step;
    }
  });

  return <group ref={group} position={[x, 0, 0]} />;
});

interface SlotMachineProps {
  onStop: (results: string[][]) => void;
}

const SlotMachine = forwardRef<null, SlotMachineProps>(({ onStop }, ref) => {
  const reelRefs = [useRef<ReelHandle>(null), useRef<ReelHandle>(null), useRef<ReelHandle>(null)];
  const [spinning, setSpinning] = useState(false);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    const results: string[][] = [[], [], []];
    reelRefs.forEach((reelRef, c) => {
      const layout = reelLayouts[c];
      const idx = Math.floor(Math.random() * layout.length);
      for (let r = 0; r < 3; r++) {
        results[r][c] = layout[(idx - 1 + r) % layout.length];
      }
      reelRef.current?.spin(idx);
    });
    setTimeout(() => {
      setSpinning(false);
      onStop(results);
    }, 2000);
  };

  useImperativeHandle(ref, () => ({ spin }));

  return (
    <group>
      <Reel layout={reelLayouts[0]} x={-2} ref={reelRefs[0]} />
      <Reel layout={reelLayouts[1]} x={0} ref={reelRefs[1]} />
      <Reel layout={reelLayouts[2]} x={2} ref={reelRefs[2]} />
    </group>
  );
});

export default SlotMachine;
export type { SlotMachineProps, ReelHandle };
