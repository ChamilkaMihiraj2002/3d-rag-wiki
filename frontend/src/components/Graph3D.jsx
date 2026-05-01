import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';

const getNodeTitle = node => node.topic || node.file || 'Untitled data';

const shortenName = name => {
  if (!name) return 'Untitled data';

  const cleanName = name.replace(/\.[^/.]+$/, '');
  return cleanName.length > 24 ? `${cleanName.slice(0, 21)}...` : cleanName;
};

const createTextSprite = (text, isActive) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const label = shortenName(text);
  const scale = window.devicePixelRatio || 1;
  const fontSize = 30 * scale;
  const paddingX = 18 * scale;
  const paddingY = 10 * scale;

  context.font = `700 ${fontSize}px "Segoe UI", sans-serif`;
  const textWidth = context.measureText(label).width;
  canvas.width = textWidth + paddingX * 2;
  canvas.height = fontSize + paddingY * 2;

  context.font = `700 ${fontSize}px "Segoe UI", sans-serif`;
  context.textBaseline = 'middle';
  context.fillStyle = isActive ? 'rgba(255, 209, 102, 0.94)' : 'rgba(10, 18, 20, 0.82)';
  context.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.44)' : 'rgba(248, 241, 223, 0.24)';
  context.lineWidth = 2 * scale;

  const radius = 18 * scale;
  const width = canvas.width;
  const height = canvas.height;

  context.beginPath();
  context.moveTo(radius, 1);
  context.lineTo(width - radius, 1);
  context.quadraticCurveTo(width - 1, 1, width - 1, radius);
  context.lineTo(width - 1, height - radius);
  context.quadraticCurveTo(width - 1, height - 1, width - radius, height - 1);
  context.lineTo(radius, height - 1);
  context.quadraticCurveTo(1, height - 1, 1, height - radius);
  context.lineTo(1, radius);
  context.quadraticCurveTo(1, 1, radius, 1);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = isActive ? '#13201d' : '#f8f1df';
  context.fillText(label, paddingX, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width / scale / 5, canvas.height / scale / 5, 1);
  sprite.position.set(0, 12, 0);

  return sprite;
};

export default function Graph3D({ graphData, activeNodes }) {
  const fgRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [isFrozen, setIsFrozen] = useState(false);
  const activeNodeSet = useMemo(() => new Set(activeNodes), [activeNodes]);
  const dataNames = useMemo(() => {
    const names = graphData.nodes.map(node => getNodeTitle(node)).filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [graphData.nodes]);

  const getLinkNodeId = node => (typeof node === 'object' ? node.id : node);

  const focusNode = useCallback(node => {
    if (!node || !fgRef.current) return;

    setSelectedNode(node);
    fgRef.current.cameraPosition(
      { x: node.x || 0, y: node.y || 0, z: (node.z || 0) + 72 },
      node,
      1200
    );
  }, []);

  const fitGraph = () => {
    if (!fgRef.current || graphData.nodes.length === 0) return;

    fgRef.current.zoomToFit(900, 80);
    setSelectedNode(null);
  };

  const focusAnswer = () => {
    if (activeNodes.length === 0) return;

    const firstActiveNode = graphData.nodes.find(node => node.id === activeNodes[0]);
    focusNode(firstActiveNode);
  };

  const togglePhysics = () => {
    if (!fgRef.current) return;

    if (isFrozen) {
      fgRef.current.resumeAnimation();
    } else {
      fgRef.current.pauseAnimation();
    }

    setIsFrozen(prev => !prev);
  };

  // Fly camera to active nodes when RAG retrieves them
  useEffect(() => {
    if (activeNodes.length > 0 && fgRef.current && graphData.nodes.length > 0) {
      const activeNodeData = graphData.nodes.find(n => n.id === activeNodes[0]);
      if (activeNodeData) {
        fgRef.current.cameraPosition(
          {
            x: activeNodeData.x || 0,
            y: activeNodeData.y || 0,
            z: (activeNodeData.z || 0) + 72
          },
          activeNodeData,
          1200
        );
      }
    }
  }, [activeNodes, graphData]);

  return (
    <>
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel={node => `${getNodeTitle(node)}\n${node.file}\nChunk ${node.id}\nClick to focus`}
        nodeAutoColorBy="file"
        nodeRelSize={7}
        nodeThreeObject={node => createTextSprite(getNodeTitle(node), activeNodeSet.has(node.id))}
        nodeThreeObjectExtend
        linkWidth={link => {
          const sourceId = getLinkNodeId(link.source);
          const targetId = getLinkNodeId(link.target);
          return activeNodeSet.has(sourceId) || activeNodeSet.has(targetId) ? 2.4 : 0.8;
        }}
        linkDirectionalParticles={link => {
          const sourceId = getLinkNodeId(link.source);
          const targetId = getLinkNodeId(link.target);
          return activeNodeSet.has(sourceId) || activeNodeSet.has(targetId) ? 5 : 0;
        }}
        linkDirectionalParticleSpeed={0.012}
        linkDirectionalParticleWidth={2.6}
        nodeColor={node => activeNodeSet.has(node.id) ? '#ffd166' : node.color}
        nodeOpacity={node => activeNodeSet.has(node.id) ? 1 : 0.66}
        linkColor={link => {
          const sourceId = getLinkNodeId(link.source);
          const targetId = getLinkNodeId(link.target);
          return activeNodeSet.has(sourceId) || activeNodeSet.has(targetId)
            ? 'rgba(255, 209, 102, 0.72)'
            : 'rgba(146, 220, 255, 0.24)';
        }}
        linkOpacity={0.46}
        onNodeClick={focusNode}
        onNodeHover={setSelectedNode}
      />

      <div className="graph-controls" aria-label="3D graph controls">
        <button onClick={fitGraph} disabled={graphData.nodes.length === 0}>
          Fit graph
        </button>
        <button onClick={focusAnswer} disabled={activeNodes.length === 0}>
          Show answer path
        </button>
        <button onClick={togglePhysics} disabled={graphData.nodes.length === 0}>
          {isFrozen ? 'Resume motion' : 'Freeze motion'}
        </button>
      </div>

      {graphData.nodes.length > 0 && (
        <div className="graph-guide" aria-live="polite">
          <div>
            <strong>{selectedNode ? getNodeTitle(selectedNode) : 'How to explore'}</strong>
            <span>
              {selectedNode
                ? `${selectedNode.file} - Chunk ${selectedNode.id}. Click any node to focus it.`
                : 'Drag to rotate, scroll to zoom, click a node to focus.'}
            </span>
          </div>

          <div className="graph-legend">
            <span><i className="legend-dot normal" /> PDF chunk</span>
            <span><i className="legend-dot active" /> Answer source</span>
          </div>
        </div>
      )}

      {dataNames.length > 0 && (
        <div className="data-name-panel" aria-label="Data names in graph">
          <strong>Data names</strong>
          <div className="data-name-list">
            {dataNames.map(name => (
              <span key={name} className="data-name-chip" title={name}>
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
