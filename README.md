# 3D RAG Wiki

3D RAG Wiki is a full-stack application that turns a folder of PDFs into an interactive 3D knowledge graph and a chat interface.

The backend indexes PDF text into ChromaDB, generates embeddings with Ollama, and answers questions with a local language model. The frontend visualizes the indexed chunks as a 3D graph and highlights the chunks used to answer each query.

## Features

- Index PDFs from a local folder
- Store embeddings in a persistent Chroma vector store
- Visualize document chunks in a 3D force graph
- Ask questions about the indexed documents
- Highlight the graph nodes used for each answer

## Tech Stack

- Frontend: React, Vite, Axios, `react-force-graph-3d`, Three.js
- Backend: FastAPI, LangChain, ChromaDB, UMAP
- Local AI runtime: Ollama

## Project Structure

```text
3d-rag-wiki/
|-- backend/
|   |-- data/           # Put your PDF files here
|   |-- main.py         # FastAPI app
|   |-- processor.py    # PDF loading, chunking, embedding, graph coordinates
|   `-- requirements.txt
|-- frontend/
|   |-- src/
|   |-- package.json
|   `-- vite.config.js
`-- README.md
```

## Prerequisites

Install these before running the app:

- Python 3.10+
- Node.js 18+
- Ollama

You also need these Ollama models because the backend is hardcoded to use them:

- `llama3.2:3b`
- `nomic-embed-text`

Example:

```powershell
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

## How It Works

1. Add PDF files to `backend/data/`.
2. Start the backend and frontend.
3. Open the app in the browser.
4. Click `Process PDFs` to load, chunk, embed, and store the documents.
5. Ask questions in the chat panel.
6. The app returns an answer and highlights the related chunks in the 3D graph.

## Backend Setup

From the `backend` folder:

Windows PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

Windows Git Bash:

```bash
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
```

Linux/macOS Bash:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Start the FastAPI server:

PowerShell or Bash:

```powershell
uvicorn main:app --reload --port 8000
```

The backend runs at `http://localhost:8000`.

## Frontend Setup

From the `frontend` folder:

```powershell
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

Vite is configured to proxy `/api` requests to the backend on port `8000`.

## Running the Application

Use two terminals:

Terminal 1:

```powershell
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

Terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

## API Endpoints

- `POST /api/process`  
  Loads PDFs from `backend/data`, chunks them, creates embeddings, computes 3D coordinates, and stores them in ChromaDB.

- `GET /api/graph`  
  Returns graph nodes and links for the frontend visualization.

- `POST /api/chat`  
  Accepts a JSON body like:

```json
{
  "query": "What are the main ideas in these PDFs?"
}
```

Returns an answer plus the chunk IDs used to answer the question.

## Data and Storage

- Source PDFs: `backend/data/`
- Persistent vector store: `backend/vector_store/`

Each time you process PDFs, the current Chroma collection is cleared and rebuilt from the files in `backend/data/`.

## Troubleshooting

- If the frontend says the backend is unreachable, make sure FastAPI is running on `http://localhost:8000`.
- If PDF processing fails, verify that your PDFs are in `backend/data/`.
- If PDFs contain only scanned images, text extraction may fail unless OCR has already been applied.
- If chat or embedding requests fail, make sure Ollama is running and both required models are installed.
- If no graph appears, process the PDFs first so the vector store has indexed chunks.

## Notes

- CORS is currently open to all origins for development.
- The backend uses local Ollama models, so responses depend on your local machine setup and installed models.
