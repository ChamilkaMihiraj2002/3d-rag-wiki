from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_ollama import OllamaLLM
from processor import process_pdfs_and_build_graph, collection, embedder

app = FastAPI()
llm = OllamaLLM(model="llama3.2:3b")

# Allow React frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change this to ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str

@app.post("/api/process")
def trigger_processing():
    return process_pdfs_and_build_graph()

@app.get("/api/graph")
def get_graph_data():
    data = collection.get(include=["metadatas"])
    nodes = []
    links = []
    
    if not data["metadatas"]:
        return {"nodes": [], "links": []}

    # Build Nodes
    for meta in data["metadatas"]:
        nodes.append({
            "id": meta["id"],
            "x": meta["x"], "y": meta["y"], "z": meta["z"],
            "file": meta["source"]
        })
    
    # Build simple sequential links for the "neural" look
    for i in range(len(nodes) - 1):
        if nodes[i]["file"] == nodes[i+1]["file"]: # Only link chunks from the same file
            links.append({"source": nodes[i]["id"], "target": nodes[i+1]["id"]})

    return {"nodes": nodes, "links": links}

@app.post("/api/chat")
def chat(request: ChatRequest):
    query = request.query.strip()
    if not query:
        return {
            "answer": "Ask a question first, then I can search your indexed PDFs.",
            "active_nodes": []
        }

    # 1. Retrieve top 3 relevant chunks
    query_embedding = embedder.embed_query(query)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=3
    )
    
    retrieved_docs = results["documents"][0]
    retrieved_ids = results["ids"][0]

    if not retrieved_docs:
        return {
            "answer": "I could not find any indexed PDF chunks yet. Process your PDFs first, then ask again.",
            "active_nodes": []
        }

    context = "\n\n".join(retrieved_docs)

    # 2. Generate Answer
    prompt = f"Use the following context to answer the question.\n\nContext:\n{context}\n\nQuestion: {query}\nAnswer:"
    response = llm.invoke(prompt)

    # 3. Return answer AND the nodes the LLM used
    return {
        "answer": response,
        "active_nodes": retrieved_ids
    }
