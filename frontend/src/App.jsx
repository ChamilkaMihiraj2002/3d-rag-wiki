import { useState, useEffect } from 'react';
import api from './api';
import Graph3D from './components/Graph3D';
import ChatPanel from './components/ChatPanel';
import './App.css';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [activeNodes, setActiveNodes] = useState([]);
  const [status, setStatus] = useState('');
  const [loadingGraph, setLoadingGraph] = useState(false);

  const loadGraph = async ({ clearStatus = true } = {}) => {
    try {
      const res = await api.get('/graph');
      setGraphData(res.data);
      if (clearStatus) {
        setStatus('');
      }
    } catch (error) {
      console.error(error);
      setStatus('Backend is not reachable. Start the FastAPI server on port 8000.');
    }
  };

  const processPdfs = async () => {
    setLoadingGraph(true);
    setStatus('Processing PDFs...');

    try {
      const res = await api.post('/process');

      if (res.data.error) {
        setStatus(res.data.error);
      } else {
        setStatus(`Processed ${res.data.chunks_processed} chunks.`);
        await loadGraph({ clearStatus: false });
      }
    } catch (error) {
      console.error(error);
      setStatus('Could not process PDFs. Check the backend terminal for details.');
    } finally {
      setLoadingGraph(false);
    }
  };

  // Fetch graph data on load
  useEffect(() => {
    loadGraph();
  }, []);

  const hasGraph = graphData.nodes.length > 0;

  return (
    <main className="app-shell">
      <section className="graph-stage" aria-label="3D knowledge graph">
        <Graph3D graphData={graphData} activeNodes={activeNodes} />

        <div className="graph-toolbar">
          <button
            className="primary-button"
            onClick={processPdfs}
            disabled={loadingGraph}
          >
            {loadingGraph ? 'Processing PDFs...' : 'Process PDFs'}
          </button>
          <span className="graph-count">
            {hasGraph
              ? `${graphData.nodes.length} chunks mapped`
              : 'No chunks mapped yet'}
          </span>
        </div>

        {status && (
          <div className="status-toast" role="status">
            <span className="status-dot" />
            {status}
          </div>
        )}

        {!hasGraph && !loadingGraph && (
          <div className="empty-graph-card">
            <strong>Your graph is waiting.</strong>
            <span>Put PDFs in the backend document folder, then process them here.</span>
          </div>
        )}
      </section>

      <aside className="chat-sidebar" aria-label="Chat with your knowledge base">
        <ChatPanel setActiveNodes={setActiveNodes} />
      </aside>
    </main>
  );
}

export default App;
