import React, { useCallback, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

const GRID_COORDS: Array<{ node: number; x: number; y: number }> = [
  { node: 1, x: 26, y: 26 },
  { node: 2, x: 78, y: 26 },
  { node: 3, x: 130, y: 26 },
  { node: 4, x: 26, y: 78 },
  { node: 5, x: 78, y: 78 },
  { node: 6, x: 130, y: 78 },
  { node: 7, x: 26, y: 130 },
  { node: 8, x: 78, y: 130 },
  { node: 9, x: 130, y: 130 },
];

export function parsePatternNodes(value: string | null | undefined): number[] | null {
  if (!value) return null;
  const match = value.trim().match(/^Patr[oó]n:\s*([1-9](?:-[1-9])+)$/i);
  if (!match) return null;
  const nodes = match[1]
    .split('-')
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 9);
  return nodes.length >= 2 ? nodes : null;
}

export function formatPatternValue(nodes: number[]): string {
  return nodes.length > 0 ? `Patrón: ${nodes.join('-')}` : '';
}

interface PatternLockPadProps {
  nodes: number[];
  onChange: (nodes: number[]) => void;
}

export const PatternLockPad: React.FC<PatternLockPadProps> = ({ nodes, onChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const initialPressNodeRef = useRef<number | null>(null);
  const didMoveToNewNodeRef = useRef<boolean>(false);

  const getSvgCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 156,
      y: ((clientY - rect.top) / rect.height) * 156,
    };
  }, []);

  const hitTestNode = useCallback((x: number, y: number): number | null => {
    const hitRadius = 19;
    for (const pt of GRID_COORDS) {
      if (Math.hypot(x - pt.x, y - pt.y) <= hitRadius) {
        return pt.node;
      }
    }
    return null;
  }, []);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    const pos = getSvgCoords(e.clientX, e.clientY);
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrawing(true);
    setPointerPos(pos);

    const hit = hitTestNode(pos.x, pos.y);
    initialPressNodeRef.current = hit;
    didMoveToNewNodeRef.current = false;

    if (hit !== null && nodes.length === 0) {
      onChange([hit]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing) return;
    const pos = getSvgCoords(e.clientX, e.clientY);
    if (!pos) return;
    setPointerPos(pos);

    const hit = hitTestNode(pos.x, pos.y);
    if (hit === null) return;

    if (!didMoveToNewNodeRef.current) {
      if (initialPressNodeRef.current !== null && hit !== initialPressNodeRef.current) {
        didMoveToNewNodeRef.current = true;
        onChange([initialPressNodeRef.current, hit]);
      } else if (initialPressNodeRef.current === null) {
        didMoveToNewNodeRef.current = true;
        onChange([hit]);
      }
      return;
    }

    if (!nodes.includes(hit)) {
      onChange([...nodes, hit]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (!didMoveToNewNodeRef.current && initialPressNodeRef.current !== null) {
      const tapped = initialPressNodeRef.current;
      if (!nodes.includes(tapped)) {
        onChange([...nodes, tapped]);
      }
    }

    setDrawing(false);
    setPointerPos(null);
    initialPressNodeRef.current = null;
    didMoveToNewNodeRef.current = false;
  };

  const lastNodeCoord =
    nodes.length > 0 ? GRID_COORDS.find((g) => g.node === nodes[nodes.length - 1]) ?? null : null;

  const polylinePoints = nodes
    .map((n) => GRID_COORDS.find((g) => g.node === n))
    .filter((pt): pt is { node: number; x: number; y: number } => Boolean(pt))
    .map((pt) => `${pt.x},${pt.y}`)
    .join(' ');

  return (
    <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
      <svg
        ref={svgRef}
        viewBox="0 0 156 156"
        className="w-[144px] h-[144px] bg-white border border-slate-200 rounded-lg shrink-0 select-none touch-none cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Líneas del patrón */}
        {nodes.length > 1 && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#059669"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Línea guía mientras se arrastra */}
        {drawing && lastNodeCoord && pointerPos && (
          <line
            x1={lastNodeCoord.x}
            y1={lastNodeCoord.y}
            x2={pointerPos.x}
            y2={pointerPos.y}
            stroke="#34d399"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray="4 3"
          />
        )}

        {/* Puntos 1-9 */}
        {GRID_COORDS.map((pt) => {
          const orderIdx = nodes.indexOf(pt.node);
          const selected = orderIdx !== -1;
          const isStart = orderIdx === 0;
          return (
            <g key={pt.node} className="cursor-pointer">
              <circle
                cx={pt.x}
                cy={pt.y}
                r={14}
                fill={selected ? (isStart ? '#059669' : '#ecfdf5') : '#f8fafc'}
                stroke={selected ? '#059669' : '#cbd5e1'}
                strokeWidth={selected ? 2 : 1.5}
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r={4.5}
                fill={selected ? (isStart ? '#ffffff' : '#059669') : '#94a3b8'}
              />
              <text
                x={pt.x + 12}
                y={pt.y - 11}
                fontSize="8.5"
                fontFamily="monospace"
                fontWeight="700"
                fill={selected ? '#047857' : '#94a3b8'}
              >
                {pt.node}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex-1 min-w-[160px] space-y-2">
        <p className="text-xs font-semibold text-slate-800">
          Dibuja el patrón arrastrando o tocando los puntos
        </p>
        <div className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono text-xs text-slate-700">
          {nodes.length > 0 ? (
            <span>
              Secuencia: <strong className="text-emerald-700">{nodes.join(' → ')}</strong>
            </span>
          ) : (
            <span className="text-slate-400">Sin trazar aún (mínimo 2 puntos)</span>
          )}
        </div>
        {nodes.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Limpiar patrón
          </button>
        )}
      </div>
    </div>
  );
};

interface PatternPreviewSvgProps {
  nodes: number[];
  size?: number;
  monochrome?: boolean;
}

export const PatternPreviewSvg: React.FC<PatternPreviewSvgProps> = ({
  nodes,
  size = 56,
  monochrome = false,
}) => {
  const miniCoords = GRID_COORDS.map((pt) => ({
    node: pt.node,
    x: (pt.x / 156) * 60,
    y: (pt.y / 156) * 60,
  }));

  const points = nodes
    .map((n) => miniCoords.find((c) => c.node === n))
    .filter((c): c is { node: number; x: number; y: number } => Boolean(c))
    .map((c) => `${c.x},${c.y}`)
    .join(' ');

  const strokeColor = monochrome ? '#000000' : '#059669';
  const inactiveDot = monochrome ? '#999999' : '#cbd5e1';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      aria-label={`Patrón ${nodes.join('-')}`}
      style={{
        display: 'inline-block',
        border: `1px solid ${monochrome ? '#000' : '#e2e8f0'}`,
        borderRadius: '6px',
        background: '#ffffff',
      }}
    >
      {nodes.length > 1 && (
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {miniCoords.map((pt) => {
        const idx = nodes.indexOf(pt.node);
        const active = idx !== -1;
        const isFirst = idx === 0;
        return (
          <g key={pt.node}>
            {isFirst && (
              <circle
                cx={pt.x}
                cy={pt.y}
                r={5.5}
                fill="none"
                stroke={strokeColor}
                strokeWidth={1.4}
              />
            )}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={active ? 3 : 2}
              fill={active ? strokeColor : inactiveDot}
            />
          </g>
        );
      })}
    </svg>
  );
};
