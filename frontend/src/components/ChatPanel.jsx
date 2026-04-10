import { useState } from 'react';
import api from '../api';

const starterPrompts = [
  'What are the main ideas in these PDFs?',
  'Summarize the most important connections.',
  'Which sources support this answer?',
];

export default function ChatPanel({ setActiveNodes }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendMessage = async (prompt = input) => {
    const query = prompt.trim();
    if (!query || loading) return;
    
    const userMsg = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/chat', { query });
      
      // Update UI with AI response
      setMessages(prev => [...prev, { role: 'ai', content: res.data.answer }]);
      
      // Trigger 3D Graph highlight
      setActiveNodes(res.data.active_nodes);
      
    } catch (error) {
      console.error(error);
      setError('Could not reach the backend or no indexed PDFs are available yet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-panel">
      <header className="chat-header">
        <span className="eyebrow">Ask the archive</span>
        <h2>RAG Link</h2>
        <p>Questions become graph highlights, so you can see where the answer came from.</p>
      </header>
      
      <div className="chat-feed">
        {messages.length === 0 && (
          <div className="welcome-card">
            <strong>Start with a broad question.</strong>
            <span>
              The assistant will answer from your indexed PDFs and brighten the
              matching graph nodes.
            </span>
            <div className="starter-list" aria-label="Starter questions">
              {starterPrompts.map(prompt => (
                <button
                  key={prompt}
                  className="starter-chip"
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <article key={`${m.role}-${i}`} className={`message ${m.role}`}>
            <span className="message-author">{m.role === 'ai' ? 'Brain' : 'You'}</span>
            <p>{m.content}</p>
          </article>
        ))}

        {loading && (
          <div className="thinking-bubble" aria-live="polite">
            <span />
            <span />
            <span />
            Searching the map...
          </div>
        )}

        {error && <div className="error-card">{error}</div>}
      </div>

      <div className="chat-composer">
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          disabled={loading}
          placeholder="Ask your knowledge base..."
          aria-label="Ask your knowledge base"
        />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
          {loading ? 'Wait' : 'Send'}
        </button>
      </div>
    </div>
  );
}
