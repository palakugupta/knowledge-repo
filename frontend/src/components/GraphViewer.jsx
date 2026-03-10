import { useState, useEffect, useRef } from "react";

const API = "http://localhost:8000";

const NODE_COLORS = {
  Repo:         { bg: "#1a1a1a", text: "white",   border: "#1a1a1a" },
  Account:      { bg: "#e8f0fe", text: "#1a56db", border: "#a4c2fb" },
  Internal:     { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  ArtifactType: { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
  Artifact:     { bg: "#fdf4ff", text: "#7e22ce", border: "#d8b4fe" },
  Section:      { bg: "#fff7ed", text: "#c2410c", border: "#fdba74" },
};

const NODE_TYPE_LABELS = {
  Repo: "Repo", Account: "Account", Internal: "Internal",
  ArtifactType: "Artifact Type", Artifact: "Artifact", Section: "Section"
};

const nodeColor = (type) => NODE_COLORS[type] || { bg: "#f5f5f5", text: "#333", border: "#ddd" };

// ─── CHAT PANEL ───────────────────────────────────────────────────────────────
function ChatPanel({ title, endpoint, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, history: messages }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Error — could not get a response." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", bottom: "20px", right: "20px", width: "380px", height: "480px",
      background: "white", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      display: "flex", flexDirection: "column", zIndex: 1000, border: "1px solid #e0e0e0" }}>

      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1a1a1a", borderRadius: "12px 12px 0 0" }}>
        <div style={{ color: "white", fontWeight: "700", fontSize: "13px" }}>💬 {title}</div>
        <div onClick={onClose} style={{ color: "#aaa", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>×</div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.length === 0 && (
          <div style={{ color: "#aaa", fontSize: "12px", textAlign: "center", marginTop: "20px" }}>
            Ask anything about {title.includes("Repo") ? "all documents in this repo" : "this section"}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "85%", padding: "8px 12px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: m.role === "user" ? "#1a1a1a" : "#f5f5f5",
              color: m.role === "user" ? "white" : "#333",
              fontSize: "13px", lineHeight: "1.5", whiteSpace: "pre-wrap"
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: "#f5f5f5", borderRadius: "12px 12px 12px 2px", padding: "8px 14px", fontSize: "13px", color: "#aaa" }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid #eee", display: "flex", gap: "8px" }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Type a question..."
          style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", outline: "none" }} />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ padding: "8px 14px", background: loading ? "#ccc" : "#1a1a1a", color: "white",
            border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "600" }}>
          Send
        </button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function GraphViewer({ repo }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedPath, setSelectedPath] = useState([]);
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [nodeChat, setNodeChat] = useState(null); // { id, label }
  const [repoChat, setRepoChat] = useState(false);

  useEffect(() => {
    if (!repo?.id) return;
    setLoading(true);
    fetch(`${API}/repos/${repo.id}/graph/nodes`)
      .then(r => r.json())
      .then(data => {
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        const repoNode = (data.nodes || []).find(n => n.node_type === "Repo");
        if (repoNode) { setSelectedNode(repoNode); setSelectedPath([repoNode.id]); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [repo?.id]);

  const getNode = (id) => nodes.find(n => n.id === id);
  const getChildren = (parentId) => edges.filter(e => e.from === parentId).map(e => getNode(e.to)).filter(Boolean);
  const getParent = (nodeId) => { const edge = edges.find(e => e.to === nodeId); return edge ? getNode(edge.from) : null; };

  const buildPath = (nodeId) => {
    const path = []; let current = getNode(nodeId); const visited = new Set();
    while (current && !visited.has(current.id)) {
      visited.add(current.id); path.unshift(current);
      if (current.node_type === "Repo") break;
      current = getParent(current.id);
    }
    return path;
  };

  const selectNode = (node) => {
    const path = buildPath(node.id);
    setSelectedPath(path.map(n => n.id));
    setSelectedNode(node);
  };

  const repoNode = nodes.find(n => n.node_type === "Repo");
  const accountNodes = repoNode ? getChildren(repoNode.id).filter(n => n.node_type === "Account" || n.node_type === "Internal") : [];
  const allArtifactTypes = [...new Set(nodes.filter(n => n.node_type === "ArtifactType").map(n => n.label))];

  const filteredNodes = nodes.filter(n => {
    if (n.node_type === "Repo") return false;
    if (filterAccount !== "all") {
      if (n.node_type === "Account" || n.node_type === "Internal") return n.label === filterAccount;
      if (n.owner_label) return n.owner_label === filterAccount;
      return false;
    }
    if (filterType !== "all") {
      if (n.node_type === "ArtifactType") return n.label === filterType;
      if (n.node_type === "Artifact") {
        const typeEdge = edges.find(e => e.to === n.id && getNode(e.from)?.node_type === "ArtifactType");
        return typeEdge ? getNode(typeEdge.from)?.label === filterType : false;
      }
      if (n.node_type === "Section") {
        const artifact = getParent(n.id);
        if (!artifact) return false;
        const typeEdge = edges.find(e => e.to === artifact.id && getNode(e.from)?.node_type === "ArtifactType");
        return typeEdge ? getNode(typeEdge.from)?.label === filterType : false;
      }
      return false;
    }
    return true;
  });

  const pathNodes = selectedPath.map(id => getNode(id)).filter(Boolean);
  const lastNode = pathNodes[pathNodes.length - 1];
  const children = lastNode ? getChildren(lastNode.id) : [];

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading graph...</div>;
  if (nodes.length === 0) return <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>No graph built yet. Go to Knowledge Graph tab and click Build Graph Now.</div>;

  return (
    <div style={{ position: "relative" }}>
      {/* Repo Chat Button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
        <button onClick={() => setRepoChat(true)}
          style={{ padding: "8px 18px", background: "#1a1a1a", color: "white", border: "none",
            borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
          💬 Chat with Repo
        </button>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 320px)", minHeight: "500px", background: "#f0f0f0", borderRadius: "8px", overflow: "hidden", border: "1px solid #ddd" }}>

        {/* LEFT PANEL */}
        <div style={{ width: "240px", minWidth: "240px", background: "white", borderRight: "1px solid #e0e0e0", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 12px 10px", borderBottom: "1px solid #eee" }}>
            <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "10px" }}>Filters</div>
            <label style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "4px" }}>ACCOUNT</label>
            <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)}
              style={{ width: "100%", padding: "5px 7px", borderRadius: "5px", border: "1px solid #ddd", fontSize: "12px", marginBottom: "8px" }}>
              <option value="all">All Accounts</option>
              {accountNodes.map(n => <option key={n.id} value={n.label}>{n.label}</option>)}
            </select>
            <label style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "4px" }}>ARTIFACT TYPE</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ width: "100%", padding: "5px 7px", borderRadius: "5px", border: "1px solid #ddd", fontSize: "12px" }}>
              <option value="all">All Types</option>
              {allArtifactTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {filteredNodes.map(n => {
              const c = nodeColor(n.node_type);
              const isSelected = selectedNode?.id === n.id;
              return (
                <div key={n.id} onClick={() => selectNode(n)}
                  style={{ padding: "8px 12px", cursor: "pointer", borderLeft: isSelected ? "3px solid #1a1a1a" : "3px solid transparent", background: isSelected ? "#f5f5f5" : "white" }}>
                  <div style={{ fontSize: "11px", color: c.text, background: c.bg, border: `1px solid ${c.border}`, borderRadius: "4px", padding: "1px 6px", display: "inline-block", marginBottom: "2px" }}>
                    {NODE_TYPE_LABELS[n.node_type]}
                  </div>
                  <div style={{ fontSize: "13px", color: "#1a1a1a", fontWeight: isSelected ? "600" : "normal", wordBreak: "break-word" }}>{n.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER PANEL */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column" }}>
          {pathNodes.map((node, idx) => {
            const isLast = idx === pathNodes.length - 1;
            const siblings = idx === 0 ? [node] : getChildren(pathNodes[idx - 1].id);
            return (
              <div key={node.id}>
                <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", paddingLeft: `${idx * 20}px`, marginBottom: "4px", marginTop: idx > 0 ? "8px" : "0" }}>
                  {NODE_TYPE_LABELS[node.node_type]?.toUpperCase()}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingLeft: `${idx * 20}px`, marginBottom: "4px" }}>
                  {siblings.map(sib => {
                    const sc = nodeColor(sib.node_type);
                    const isActive = sib.id === node.id;
                    return (
                      <div key={sib.id} onClick={() => selectNode(sib)}
                        style={{ padding: "8px 14px", borderRadius: "8px", cursor: "pointer",
                          background: isActive ? sc.bg : "white", border: `2px solid ${isActive ? sc.border : "#e0e0e0"}`,
                          fontWeight: isActive ? "600" : "normal", fontSize: "13px", color: isActive ? sc.text : "#555",
                          boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.08)" : "none" }}>
                        {sib.label}
                      </div>
                    );
                  })}
                </div>
                {!isLast && <div style={{ paddingLeft: `${(idx + 1) * 20}px`, color: "#ccc", fontSize: "18px", margin: "2px 0" }}>↓</div>}
              </div>
            );
          })}

          {children.length > 0 && (
            <div style={{ marginTop: "4px" }}>
              <div style={{ paddingLeft: `${pathNodes.length * 20}px`, color: "#ccc", fontSize: "18px", margin: "2px 0" }}>↓</div>
              <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", paddingLeft: `${pathNodes.length * 20}px`, marginBottom: "4px", marginTop: "8px" }}>
                {NODE_TYPE_LABELS[children[0].node_type]?.toUpperCase()}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingLeft: `${pathNodes.length * 20}px` }}>
                {children.map(child => {
                  const cc = nodeColor(child.node_type);
                  return (
                    <div key={child.id} onClick={() => selectNode(child)}
                      style={{ padding: "8px 14px", borderRadius: "8px", cursor: "pointer", background: "white", border: "2px solid #e0e0e0", fontSize: "13px", color: "#555" }}
                      onMouseEnter={e => { e.currentTarget.style.background = cc.bg; e.currentTarget.style.borderColor = cc.border; e.currentTarget.style.color = cc.text; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.color = "#555"; }}>
                      {child.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {children.length === 0 && lastNode?.node_type === "Section" && (
            <div style={{ paddingLeft: `${pathNodes.length * 20}px`, marginTop: "12px", fontSize: "13px", color: "#aaa", fontStyle: "italic" }}>
              ↳ Leaf node — see details in right panel
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width: "280px", minWidth: "280px", background: "white", borderLeft: "1px solid #e0e0e0", padding: "16px", overflowY: "auto" }}>
          {selectedNode ? (
            <>
              {(() => { const c = nodeColor(selectedNode.node_type); return (
                <div style={{ display: "inline-block", background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: "5px", padding: "2px 10px", fontSize: "11px", fontWeight: "600", marginBottom: "10px" }}>
                  {NODE_TYPE_LABELS[selectedNode.node_type]}
                </div>
              );})()}
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#1a1a1a", marginBottom: "14px", wordBreak: "break-word" }}>{selectedNode.label}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {selectedNode.sub_type && (
                  <div><div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", marginBottom: "2px" }}>SUB TYPE</div>
                  <div style={{ fontSize: "13px", color: "#555" }}>{selectedNode.sub_type}</div></div>
                )}
                {selectedNode.owner_label && (
                  <div><div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", marginBottom: "2px" }}>OWNED BY</div>
                  <div style={{ fontSize: "13px", color: "#555" }}>{selectedNode.owner_label}</div></div>
                )}
                {selectedNode.artifact_label && (
                  <div><div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", marginBottom: "2px" }}>SOURCE FILE</div>
                  <div style={{ fontSize: "13px", color: "#1a56db", wordBreak: "break-word" }}>{selectedNode.artifact_label}</div></div>
                )}
                {selectedNode.node_type === "Section" && (
                  <>
                    <div>
                      <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", marginBottom: "4px" }}>CONTENT</div>
                      <div style={{ fontSize: "12px", color: selectedNode.content ? "#333" : "#aaa", background: "#f9f9f9",
                        borderRadius: "6px", padding: "10px", border: "1px solid #eee",
                        fontStyle: selectedNode.content ? "normal" : "italic", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
                        {selectedNode.content || "No content extracted for this section."}
                      </div>
                    </div>
                    {selectedNode.content && (
                      <button onClick={() => setNodeChat({ id: selectedNode.id, label: selectedNode.label })}
                        style={{ padding: "8px 14px", background: "#fff7ed", color: "#c2410c", border: "1px solid #fdba74",
                          borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "12px", textAlign: "left" }}>
                        💬 Ask about this section
                      </button>
                    )}
                  </>
                )}
                <div>
                  <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", marginBottom: "4px" }}>FULL PATH</div>
                  <div style={{ fontSize: "11px", color: "#888" }}>{buildPath(selectedNode.id).map(n => n.label).join(" → ")}</div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: "#aaa", fontSize: "13px", textAlign: "center", marginTop: "40px" }}>Select a node to see details</div>
          )}
        </div>
      </div>

      {/* NODE CHAT */}
      {nodeChat && (
        <ChatPanel
          title={nodeChat.label}
          endpoint={`${API}/nodes/${nodeChat.id}/chat`}
          onClose={() => setNodeChat(null)}
        />
      )}

      {/* REPO CHAT */}
      {repoChat && (
        <ChatPanel
          title={`Repo: ${repo?.name}`}
          endpoint={`${API}/repos/${repo.id}/chat`}
          onClose={() => setRepoChat(false)}
        />
      )}
    </div>
  );
}