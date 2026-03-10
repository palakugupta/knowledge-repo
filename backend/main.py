from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid
import os
import shutil
import tempfile
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

from database import engine, get_db, Base
from models import Repo, Account, Source, GraphNode, GraphEdge
from ingest import ingest_source, ARTIFACT_SUB_TYPES

Base.metadata.create_all(bind=engine)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

class RepoCreate(BaseModel):
    name: str
    description: Optional[str] = None

class RepoUpdate(BaseModel):
    name: str
    description: Optional[str] = None

class AccountCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    notes: Optional[str] = None

class AccountUpdate(BaseModel):
    name: str
    industry: Optional[str] = None
    notes: Optional[str] = None

class ChatMessage(BaseModel):
    message: str
    history: list = []

# --- Repo Routes ---
@app.get("/repos")
def get_repos(db: Session = Depends(get_db)):
    repos = db.query(Repo).order_by(Repo.created_at.desc()).all()
    result = []
    for repo in repos:
        result.append({
            "id": repo.id,
            "name": repo.name,
            "description": repo.description,
            "source_count": len(repo.sources),
            "created_at": repo.created_at,
            "updated_at": repo.updated_at,
        })
    return result

@app.get("/repos/{repo_id}")
def get_repo(repo_id: str, db: Session = Depends(get_db)):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    return {
        "id": repo.id,
        "name": repo.name,
        "description": repo.description,
        "source_count": len(repo.sources),
        "created_at": repo.created_at,
        "updated_at": repo.updated_at,
    }

@app.post("/repos", status_code=201)
def create_repo(repo: RepoCreate, db: Session = Depends(get_db)):
    if not repo.name.strip():
        raise HTTPException(status_code=422, detail="Repo name is required")
    existing = db.query(Repo).filter(Repo.name == repo.name.strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Repo name already exists")
    new_repo = Repo(id=str(uuid.uuid4()), name=repo.name.strip(), description=repo.description)
    db.add(new_repo)
    db.commit()
    db.refresh(new_repo)
    return {"id": new_repo.id, "name": new_repo.name, "description": new_repo.description, "source_count": 0, "created_at": new_repo.created_at, "updated_at": new_repo.updated_at}

@app.put("/repos/{repo_id}")
def update_repo(repo_id: str, repo: RepoUpdate, db: Session = Depends(get_db)):
    if not repo.name.strip():
        raise HTTPException(status_code=422, detail="Repo name is required")
    db_repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not db_repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    existing = db.query(Repo).filter(Repo.name == repo.name.strip(), Repo.id != repo_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Repo name already exists")
    db_repo.name = repo.name.strip()
    db_repo.description = repo.description
    db.commit()
    db.refresh(db_repo)
    return {"id": db_repo.id, "name": db_repo.name, "description": db_repo.description, "source_count": len(db_repo.sources), "created_at": db_repo.created_at, "updated_at": db_repo.updated_at}

@app.delete("/repos/{repo_id}", status_code=204)
def delete_repo(repo_id: str, db: Session = Depends(get_db)):
    db_repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not db_repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    for source in db_repo.sources:
        if os.path.exists(source.stored_path):
            os.remove(source.stored_path)
    db.delete(db_repo)
    db.commit()

# --- Account Routes ---
@app.get("/accounts")
def get_accounts(db: Session = Depends(get_db)):
    return db.query(Account).order_by(Account.created_at.desc()).all()

@app.post("/accounts", status_code=201)
def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    if not account.name.strip():
        raise HTTPException(status_code=422, detail="Account name is required")
    existing = db.query(Account).filter(Account.name == account.name.strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Account name already exists")
    new_account = Account(id=str(uuid.uuid4()), name=account.name.strip(), industry=account.industry, notes=account.notes)
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return new_account

@app.put("/accounts/{account_id}")
def update_account(account_id: str, account: AccountUpdate, db: Session = Depends(get_db)):
    if not account.name.strip():
        raise HTTPException(status_code=422, detail="Account name is required")
    db_account = db.query(Account).filter(Account.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Account not found")
    existing = db.query(Account).filter(Account.name == account.name.strip(), Account.id != account_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Account name already exists")
    db_account.name = account.name.strip()
    db_account.industry = account.industry
    db_account.notes = account.notes
    db.commit()
    db.refresh(db_account)
    return db_account

@app.delete("/accounts/{account_id}", status_code=204)
def delete_account(account_id: str, db: Session = Depends(get_db)):
    db_account = db.query(Account).filter(Account.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(db_account)
    db.commit()

# --- Source Routes ---
@app.get("/repos/{repo_id}/sources")
def get_sources(repo_id: str, db: Session = Depends(get_db)):
    sources = db.query(Source).filter(Source.repo_id == repo_id).order_by(Source.uploaded_at.desc()).all()
    result = []
    for s in sources:
        result.append({
            "id": s.id,
            "repo_id": s.repo_id,
            "filename": s.filename,
            "artifact_type": s.artifact_type,
            "is_internal": s.is_internal,
            "account_id": s.account_id,
            "account_name": s.account.name if s.account else None,
            "size_bytes": s.size_bytes,
            "mime_type": s.mime_type,
            "uploaded_at": s.uploaded_at,
        })
    return result

@app.post("/repos/{repo_id}/sources", status_code=201)
async def upload_source(
    repo_id: str,
    file: UploadFile = File(...),
    artifact_type: str = Form(...),
    is_internal: str = Form(...),
    account_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    is_internal_bool = is_internal.lower() == "true"
    if not is_internal_bool and not account_id:
        raise HTTPException(status_code=422, detail="Account is required when not internal")
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    stored_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
    with open(stored_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    source = Source(
        id=str(uuid.uuid4()), repo_id=repo_id,
        account_id=account_id if not is_internal_bool else None,
        filename=file.filename, stored_path=stored_path,
        artifact_type=artifact_type, is_internal=is_internal_bool,
        size_bytes=os.path.getsize(stored_path), mime_type=file.content_type,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return {
        "id": source.id, "repo_id": source.repo_id, "filename": source.filename,
        "artifact_type": source.artifact_type, "is_internal": source.is_internal,
        "account_id": source.account_id,
        "account_name": source.account.name if source.account else None,
        "size_bytes": source.size_bytes, "mime_type": source.mime_type, "uploaded_at": source.uploaded_at,
    }

@app.delete("/sources/{source_id}", status_code=204)
def delete_source(source_id: str, db: Session = Depends(get_db)):
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    if os.path.exists(source.stored_path):
        os.remove(source.stored_path)
    db.delete(source)
    db.commit()

# ─── GRAPH BUILD ─────────────────────────────────────────────────────────────
graph_build_status = {}

def run_graph_build(repo_id: str, sources):
    from database import SessionLocal
    db = SessionLocal()
    try:
        db.query(GraphEdge).filter(GraphEdge.repo_id == repo_id).update({"is_deleted": True})
        db.query(GraphNode).filter(GraphNode.repo_id == repo_id).update({"is_deleted": True})
        db.commit()

        repo = db.query(Repo).filter(Repo.id == repo_id).first()
        repo_node = GraphNode(repo_id=repo_id, node_type="Repo", label=repo.name, is_deleted=False)
        db.add(repo_node)
        db.flush()

        account_nodes = {}
        type_nodes = {}

        for i, source in enumerate(sources):
            graph_build_status[repo_id]["message"] = f"Processing {source.filename}..."

            if source.is_internal:
                owner_key = "internal"
                if owner_key not in account_nodes:
                    node = GraphNode(repo_id=repo_id, node_type="Internal", label="Internal", is_deleted=False)
                    db.add(node)
                    db.flush()
                    account_nodes[owner_key] = node
                    db.add(GraphEdge(repo_id=repo_id, from_node_id=repo_node.id, to_node_id=node.id, relation_type="HAS_INTERNAL", is_deleted=False))
                owner_node = account_nodes[owner_key]
                owner_type = "Internal"
                owner_id = owner_node.id
            else:
                owner_key = source.account_id
                if owner_key not in account_nodes:
                    account = db.query(Account).filter(Account.id == source.account_id).first()
                    node = GraphNode(repo_id=repo_id, node_type="Account", label=account.name, is_deleted=False)
                    db.add(node)
                    db.flush()
                    account_nodes[owner_key] = node
                    db.add(GraphEdge(repo_id=repo_id, from_node_id=repo_node.id, to_node_id=node.id, relation_type="HAS_ACCOUNT", is_deleted=False))
                owner_node = account_nodes[owner_key]
                owner_type = "Account"
                owner_id = owner_node.id

            atype = source.artifact_type
            if atype not in type_nodes:
                node = GraphNode(repo_id=repo_id, node_type="ArtifactType", label=atype, is_deleted=False)
                db.add(node)
                db.flush()
                type_nodes[atype] = node
                db.add(GraphEdge(repo_id=repo_id, from_node_id=repo_node.id, to_node_id=node.id, relation_type="HAS_TYPE", is_deleted=False))
            type_node = type_nodes[atype]

            artifact_node = GraphNode(
                repo_id=repo_id, source_id=source.id, node_type="Artifact",
                sub_type=ARTIFACT_SUB_TYPES.get(atype, "Other_Document"),
                label=source.filename, owner_type=owner_type, owner_id=owner_id, is_deleted=False
            )
            db.add(artifact_node)
            db.flush()
            db.add(GraphEdge(repo_id=repo_id, from_node_id=owner_node.id, to_node_id=artifact_node.id, relation_type="HAS_ARTIFACT", is_deleted=False))
            db.add(GraphEdge(repo_id=repo_id, from_node_id=type_node.id, to_node_id=artifact_node.id, relation_type="HAS_ARTIFACT", is_deleted=False))

            sections = ingest_source(source, db)
            for sub_type, label, content in sections:
                section_node = GraphNode(
                    repo_id=repo_id, source_id=source.id, node_type="Section",
                    sub_type=sub_type, label=label, content=content,
                    owner_type=owner_type, owner_id=owner_id, is_deleted=False
                )
                db.add(section_node)
                db.flush()
                db.add(GraphEdge(repo_id=repo_id, from_node_id=artifact_node.id, to_node_id=section_node.id, relation_type="HAS_SECTION", is_deleted=False))

            db.commit()
            graph_build_status[repo_id]["artifacts_done"] = i + 1

        graph_build_status[repo_id]["status"] = "done"
        graph_build_status[repo_id]["message"] = "Graph build complete!"

    except Exception as e:
        db.rollback()
        graph_build_status[repo_id]["status"] = "error"
        graph_build_status[repo_id]["message"] = str(e)
    finally:
        db.close()

@app.post("/repos/{repo_id}/build-graph")
def build_graph(repo_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    sources = db.query(Source).filter(Source.repo_id == repo_id).all()
    if not sources:
        raise HTTPException(status_code=400, detail="No sources found in this repo")
    graph_build_status[repo_id] = {"status": "running", "message": "Starting graph build...", "artifacts_done": 0, "artifacts_total": len(sources)}
    background_tasks.add_task(run_graph_build, repo_id, sources)
    return {"message": "Graph build started", "total_sources": len(sources)}

@app.get("/repos/{repo_id}/build-graph/status")
def get_build_status(repo_id: str):
    return graph_build_status.get(repo_id, {"status": "not_started"})

@app.get("/repos/{repo_id}/graph")
def get_graph(repo_id: str, db: Session = Depends(get_db)):
    nodes = db.query(GraphNode).filter(GraphNode.repo_id == repo_id, GraphNode.is_deleted == False).all()
    result = []
    for source in db.query(Source).filter(Source.repo_id == repo_id).all():
        artifact_nodes = [n for n in nodes if n.source_id == source.id and n.node_type == "Artifact"]
        section_nodes = [n for n in nodes if n.source_id == source.id and n.node_type == "Section"]
        if artifact_nodes:
            if source.account_id:
                account = db.query(Account).filter(Account.id == source.account_id).first()
                owned_by = account.name if account else "Unknown"
            else:
                owned_by = "Internal"
            result.append({
                "source_id": source.id, "artifact_name": source.filename,
                "artifact_type": source.artifact_type, "owned_by": owned_by,
                "section_count": len(section_nodes),
                "sections": [{"sub_type": s.sub_type, "label": s.label, "content": s.content} for s in section_nodes]
            })
    return result

# ─── NODE DETAIL + PATH ENDPOINTS ────────────────────────────────────────────
@app.get("/nodes/{node_id}")
def get_node(node_id: str, db: Session = Depends(get_db)):
    node = db.query(GraphNode).filter(GraphNode.id == node_id, GraphNode.is_deleted == False).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    source = db.query(Source).filter(Source.id == node.source_id).first() if node.source_id else None
    owner_node = db.query(GraphNode).filter(GraphNode.id == node.owner_id).first() if node.owner_id else None
    return {
        "id": node.id, "label": node.label, "node_type": node.node_type,
        "sub_type": node.sub_type, "content": node.content, "owner_type": node.owner_type,
        "owner_label": owner_node.label if owner_node else None,
        "source_id": node.source_id,
        "artifact_label": source.filename if source else None,
        "repo_id": node.repo_id,
    }

@app.get("/nodes/{node_id}/path")
def get_node_path(node_id: str, db: Session = Depends(get_db)):
    node = db.query(GraphNode).filter(GraphNode.id == node_id, GraphNode.is_deleted == False).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    path = []
    current = node
    while current:
        source = db.query(Source).filter(Source.id == current.source_id).first() if current.source_id else None
        owner_node = db.query(GraphNode).filter(GraphNode.id == current.owner_id).first() if current.owner_id else None
        path.insert(0, {
            "id": current.id, "label": current.label, "node_type": current.node_type,
            "sub_type": current.sub_type,
            "owner_label": owner_node.label if owner_node else None,
            "artifact_label": source.filename if source else None,
        })
        edge = db.query(GraphEdge).filter(GraphEdge.to_node_id == current.id, GraphEdge.is_deleted == False).first()
        if edge:
            current = db.query(GraphNode).filter(GraphNode.id == edge.from_node_id).first()
        else:
            break
    return {"focused_node_id": node_id, "path": path}

@app.get("/repos/{repo_id}/graph/nodes")
def get_all_graph_nodes(repo_id: str, db: Session = Depends(get_db)):
    nodes = db.query(GraphNode).filter(GraphNode.repo_id == repo_id, GraphNode.is_deleted == False).all()
    edges = db.query(GraphEdge).filter(GraphEdge.repo_id == repo_id, GraphEdge.is_deleted == False).all()
    nodes_out = []
    for n in nodes:
        source = db.query(Source).filter(Source.id == n.source_id).first() if n.source_id else None
        owner_node = db.query(GraphNode).filter(GraphNode.id == n.owner_id).first() if n.owner_id else None
        nodes_out.append({
            "id": n.id, "label": n.label, "node_type": n.node_type, "sub_type": n.sub_type,
            "content": n.content, "owner_type": n.owner_type, "owner_id": n.owner_id,
            "owner_label": owner_node.label if owner_node else None,
            "source_id": n.source_id,
            "artifact_label": source.filename if source else None,
        })
    edges_out = [{"from": e.from_node_id, "to": e.to_node_id, "relation": e.relation_type} for e in edges]
    return {"nodes": nodes_out, "edges": edges_out}

# ─── AUTO-DETECT ARTIFACT TYPE ───────────────────────────────────────────────
@app.post("/repos/{repo_id}/sources/detect-type")
async def detect_artifact_type(repo_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    from ingest import extract_text_from_docx, extract_text_from_pptx
    from groq import Groq

    ext = os.path.splitext(file.filename)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        text = ""
        if ext == ".docx":
            text = extract_text_from_docx(tmp_path)
        elif ext == ".pptx":
            text = extract_text_from_pptx(tmp_path)
        elif ext == ".pdf":
            text = f"PDF file: {file.filename}"
        elif ext in (".png", ".jpg", ".jpeg"):
            text = f"Image file: {file.filename}"

        words = " ".join(text.split()[:200])
        prompt = f"""You are a document classifier. Classify this document into exactly one of: SOW, Proposal, DesignDocument, ProcessMap, DiscoveryNotes, Other
Filename: {file.filename}
First 200 words: {words}
Reply with ONLY the artifact type, nothing else."""

        _client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        response = _client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        detected = response.choices[0].message.content.strip()
        valid_types = ["SOW", "Proposal", "DesignDocument", "ProcessMap", "DiscoveryNotes", "Other"]
        if detected not in valid_types:
            detected = "Other"
    except Exception as e:
        print(f"detect-type error: {e}")
        detected = "Other"
    finally:
        os.unlink(tmp_path)

    return {"artifact_type": detected, "filename": file.filename}

# ─── BULK UPLOAD ─────────────────────────────────────────────────────────────
@app.post("/repos/{repo_id}/sources/bulk", status_code=201)
async def bulk_upload_sources(
    repo_id: str,
    files: list[UploadFile] = File(...),
    is_internal: str = Form(...),
    account_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    from ingest import extract_text_from_docx, extract_text_from_pptx
    from groq import Groq

    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")

    is_internal_bool = is_internal.lower() == "true"
    if not is_internal_bool and not account_id:
        raise HTTPException(status_code=422, detail="Account is required when not internal")

    ALLOWED_EXTENSIONS = {".docx", ".pdf", ".png", ".pptx", ".jpg", ".jpeg"}
    uploaded = []
    _client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        try:
            text = ""
            if ext == ".docx":
                text = extract_text_from_docx(tmp_path)
            elif ext == ".pptx":
                text = extract_text_from_pptx(tmp_path)
            words = " ".join(text.split()[:200])
            prompt = f"""Classify this document into exactly one of: SOW, Proposal, DesignDocument, ProcessMap, DiscoveryNotes, Other
Filename: {file.filename}
First 200 words: {words}
Reply with ONLY the artifact type."""
            response = _client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
            )
            artifact_type = response.choices[0].message.content.strip()
            valid_types = ["SOW", "Proposal", "DesignDocument", "ProcessMap", "DiscoveryNotes", "Other"]
            if artifact_type not in valid_types:
                artifact_type = "Other"
        except:
            artifact_type = "Other"

        file_id = str(uuid.uuid4())
        stored_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        shutil.move(tmp_path, stored_path)

        source = Source(
            id=str(uuid.uuid4()), repo_id=repo_id,
            account_id=account_id if not is_internal_bool else None,
            filename=file.filename, stored_path=stored_path,
            artifact_type=artifact_type, is_internal=is_internal_bool,
            size_bytes=os.path.getsize(stored_path), mime_type=file.content_type,
        )
        db.add(source)
        db.commit()
        db.refresh(source)
        uploaded.append({"filename": source.filename, "artifact_type": source.artifact_type, "id": source.id})

    return {"uploaded": uploaded, "count": len(uploaded)}

# ─── NODE CHAT ────────────────────────────────────────────────────────────────
@app.post("/nodes/{node_id}/chat")
def chat_with_node(node_id: str, body: ChatMessage, db: Session = Depends(get_db)):
    from groq import Groq
    node = db.query(GraphNode).filter(GraphNode.id == node_id, GraphNode.is_deleted == False).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    source = db.query(Source).filter(Source.id == node.source_id).first() if node.source_id else None

    system_prompt = f"""You are a helpful assistant answering questions about a specific section of a project document.

Section: {node.label}
Document: {source.filename if source else "Unknown"}
Content:
{node.content or "No content available for this section."}

Answer questions based only on the content above. Be concise and helpful."""

    messages = [{"role": "system", "content": system_prompt}]
    for h in body.history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": body.message})

    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.3,
        )
        reply = response.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"reply": reply}

# ─── GLOBAL REPO CHAT ─────────────────────────────────────────────────────────
@app.post("/repos/{repo_id}/chat")
def chat_with_repo(repo_id: str, body: ChatMessage, db: Session = Depends(get_db)):
    from groq import Groq
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")

    sections = db.query(GraphNode).filter(
        GraphNode.repo_id == repo_id,
        GraphNode.node_type == "Section",
        GraphNode.is_deleted == False,
        GraphNode.content != None,
        GraphNode.content != ""
    ).all()

    context_parts = []
    for s in sections:
        source = db.query(Source).filter(Source.id == s.source_id).first() if s.source_id else None
        context_parts.append(f"[{source.filename if source else 'Unknown'} > {s.label}]\n{s.content}")

    context = "\n\n".join(context_parts[:40])

    system_prompt = f"""You are a helpful assistant with access to all documents in the '{repo.name}' knowledge repository.

Below is the extracted knowledge from all documents:

{context}

Answer questions based on this knowledge. Be concise, specific, and cite which document your answer comes from."""

    messages = [{"role": "system", "content": system_prompt}]
    for h in body.history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": body.message})

    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.3,
        )
        reply = response.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"reply": reply}