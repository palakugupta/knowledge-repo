from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime

def gen_uuid():
    return str(uuid.uuid4())

class Repo(Base):
    __tablename__ = "repos"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sources = relationship("Source", back_populates="repo", cascade="all, delete-orphan")
    graph_nodes = relationship("GraphNode", back_populates="repo", cascade="all, delete-orphan")

class Account(Base):
    __tablename__ = "accounts"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, unique=True, nullable=False)
    industry = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sources = relationship("Source", back_populates="account")

class Source(Base):
    __tablename__ = "sources"
    id = Column(String, primary_key=True, default=gen_uuid)
    repo_id = Column(String, ForeignKey("repos.id"), nullable=False)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=True)
    filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)
    artifact_type = Column(String, nullable=False)
    is_internal = Column(Boolean, default=False)
    size_bytes = Column(Integer, nullable=True)
    mime_type = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    repo = relationship("Repo", back_populates="sources")
    account = relationship("Account", back_populates="sources")

class GraphNode(Base):
    __tablename__ = "graph_nodes"
    id = Column(String, primary_key=True, default=gen_uuid)
    repo_id = Column(String, ForeignKey("repos.id"), nullable=False)
    source_id = Column(String, ForeignKey("sources.id"), nullable=True)
    node_type = Column(String, nullable=False)   # Repo, Account, Internal, ArtifactType, Artifact, Section, AtomicFact
    sub_type = Column(String, nullable=True)      # e.g. SOW_ProjectOverview
    label = Column(String, nullable=False)
    content = Column(Text, nullable=True)         # extracted text/facts from LLM
    owner_type = Column(String, nullable=True)    # "Account" or "Internal"
    owner_id = Column(String, nullable=True)      # account_id or internal node id
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    repo = relationship("Repo", back_populates="graph_nodes")

class GraphEdge(Base):
    __tablename__ = "graph_edges"
    id = Column(String, primary_key=True, default=gen_uuid)
    repo_id = Column(String, ForeignKey("repos.id"), nullable=False)
    from_node_id = Column(String, ForeignKey("graph_nodes.id"), nullable=False)
    to_node_id = Column(String, ForeignKey("graph_nodes.id"), nullable=False)
    relation_type = Column(String, nullable=False)  # HAS_ACCOUNT, HAS_ARTIFACT, HAS_SECTION, etc.
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)