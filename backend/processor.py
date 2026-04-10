import os
import numpy as np
from umap import UMAP
from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
import chromadb

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
VECTOR_STORE_DIR = os.path.join(BASE_DIR, "vector_store")

# Initialize ChromaDB
chroma_client = chromadb.PersistentClient(path=VECTOR_STORE_DIR)
collection = chroma_client.get_or_create_collection(name="rag_wiki")
embedder = OllamaEmbeddings(model="nomic-embed-text")

def build_coordinates(embeddings):
    if len(embeddings) < 4:
        angles = np.linspace(0, 2 * np.pi, len(embeddings), endpoint=False)
        return np.column_stack([
            np.cos(angles),
            np.sin(angles),
            np.linspace(-0.5, 0.5, len(embeddings)),
        ])

    n_neighbors = min(15, len(embeddings) - 1)
    reducer = UMAP(n_components=3, n_neighbors=n_neighbors, min_dist=0.1)
    return reducer.fit_transform(np.asarray(embeddings))

def process_pdfs_and_build_graph():
    # 1. Load and Chunk
    loader = DirectoryLoader(DATA_DIR, glob="*.pdf", loader_cls=PyPDFLoader)
    docs = loader.load()
    
    if not docs:
        return {"error": f"No PDFs found in {DATA_DIR}"}

    docs = [doc for doc in docs if doc.page_content.strip()]
    if not docs:
        return {
            "error": (
                "The PDFs were found, but no extractable text was detected. "
                "These files may be scanned/image-only PDFs; OCR is needed before indexing."
            )
        }

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(docs)
    chunks = [chunk for chunk in chunks if chunk.page_content.strip()]

    if not chunks:
        return {"error": "PDF text was detected, but it did not produce any indexable chunks."}

    # 2. Embed
    texts = [c.page_content for c in chunks]
    metadatas = [{"source": os.path.basename(c.metadata['source']), "id": str(i)} for i, c in enumerate(chunks)]
    ids = [str(i) for i in range(len(chunks))]
    
    print(f"Embedding {len(texts)} chunks...")
    embeddings = embedder.embed_documents(texts)

    if not embeddings:
        return {"error": "The embedding model returned no embeddings for the extracted text."}

    # 3. Dimensionality Reduction (UMAP)
    coords_3d = build_coordinates(embeddings)

    # Add 3D coordinates to metadata
    for i in range(len(metadatas)):
        metadatas[i]["x"] = float(coords_3d[i][0] * 50) # Scale for 3D view
        metadatas[i]["y"] = float(coords_3d[i][1] * 50)
        metadatas[i]["z"] = float(coords_3d[i][2] * 50)

    # 4. Save to Chroma
    existing_ids = collection.get(include=[])["ids"]
    if existing_ids:
        collection.delete(ids=existing_ids)

    collection.upsert(
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=ids
    )
    return {"status": "success", "chunks_processed": len(chunks)}
