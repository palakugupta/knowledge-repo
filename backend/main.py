from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid
import os
import shutil
from datetime import datetime

from database import engine, get_db, Base
from models import Repo, Account, Source

Base.metadata.create_all(bind=engine)

# Create uploads directory
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

# --- Schemas ---
class RepoCreate(BaseModel):
    name: str
    description: Optional[str] = None

class RepoUpdate(BaseModel):
    name: str
    description: Optional[str] = None

class RepoOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    source_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AccountCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    notes: Optional[str] = None

class AccountUpdate(BaseModel):
    name: str
    industry: Optional[str] = None
    notes: Optional[str] = None

class AccountOut(BaseModel):
    id: str
    name: str
    industry: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SourceOut(BaseModel):
    id: str
    repo_id: str
    filename: str
    artifact_type: str
    is_internal: bool
    account_id: Optional[str]
    account_name: Optional[str] = None
    size_bytes: Optional[int]
    mime_type: Optional[str]
    uploaded_at: datetime

    class Config:
        from_attributes = True

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
    new_repo = Repo(
        id=str(uuid.uuid4()),
        name=repo.name.strip(),
        description=repo.description
    )
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
    # Delete uploaded files
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
    new_account = Account(
        id=str(uuid.uuid4()),
        name=account.name.strip(),
        industry=account.industry,
        notes=account.notes
    )
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

    # Save file
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    stored_filename = f"{file_id}{ext}"
    stored_path = os.path.join(UPLOAD_DIR, stored_filename)

    with open(stored_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(stored_path)

    source = Source(
        id=str(uuid.uuid4()),
        repo_id=repo_id,
        account_id=account_id if not is_internal_bool else None,
        filename=file.filename,
        stored_path=stored_path,
        artifact_type=artifact_type,
        is_internal=is_internal_bool,
        size_bytes=file_size,
        mime_type=file.content_type,
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    return {
        "id": source.id,
        "repo_id": source.repo_id,
        "filename": source.filename,
        "artifact_type": source.artifact_type,
        "is_internal": source.is_internal,
        "account_id": source.account_id,
        "account_name": source.account.name if source.account else None,
        "size_bytes": source.size_bytes,
        "mime_type": source.mime_type,
        "uploaded_at": source.uploaded_at,
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