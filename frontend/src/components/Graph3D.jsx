import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';

export default function Graph3D({ graphData, activeNodes }) {
  const fgRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [isFrozen, setIsFrozen] = useState(false);
  const activeNodeSet = useMemo(() => new Set(activeNodes), [activeNodes]);

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
        nodeLabel={node => `${node.file}\nChunk ${node.id}\nClick to focus`}
        nodeAutoColorBy="file"
        nodeRelSize={7}
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
            <strong>{selectedNode ? selectedNode.file : 'How to explore'}</strong>
            <span>
              {selectedNode
                ? `Chunk ${selectedNode.id}. Click any node to focus it.`
                : 'Drag to rotate, scroll to zoom, click a node to focus.'}
            </span>
          </div>

          <div className="graph-legend">
            <span><i className="legend-dot normal" /> PDF chunk</span>
            <span><i className="legend-dot active" /> Answer source</span>
          </div>
        </div>
      )}
    </>
  );
}
