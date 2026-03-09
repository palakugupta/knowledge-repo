import { useState } from "react";

// ─── SAMPLE DATA (from Set 2B spec) ──────────────────────────────────────────
const SAMPLE_REPO = { id: "1", name: "Salesforce SI Knowledge", description: "Consolidated Salesforce SI projects KG" };

const SAMPLE_NODES = [
  { id: "100", node_type: "Repo",         sub_type: null,                      label: "Salesforce SI Knowledge",      owner_type: null,       owner_id: null,  source_id: null },
  { id: "200", node_type: "Account",      sub_type: null,                      label: "ACME Manufacturing",           owner_type: null,       owner_id: null,  source_id: null },
  { id: "201", node_type: "Account",      sub_type: null,                      label: "HealthPlus Insurance",         owner_type: null,       owner_id: null,  source_id: null },
  { id: "202", node_type: "Internal",     sub_type: null,                      label: "Internal",                     owner_type: null,       owner_id: null,  source_id: null },
  { id: "300", node_type: "ArtifactType", sub_type: null,                      label: "SOW",                         owner_type: null,       owner_id: null,  source_id: null },
  { id: "301", node_type: "ArtifactType", sub_type: null,                      label: "Proposal",                    owner_type: null,       owner_id: null,  source_id: null },
  { id: "302", node_type: "ArtifactType", sub_type: null,                      label: "DesignDocument",              owner_type: null,       owner_id: null,  source_id: null },
  { id: "303", node_type: "ArtifactType", sub_type: null,                      label: "ProcessMap",                  owner_type: null,       owner_id: null,  source_id: null },
  { id: "400", node_type: "Artifact",     sub_type: "SOW_Document",            label: "ACME_SOW_v1.docx",            owner_type: "Account",  owner_id: "200", source_id: "10" },
  { id: "401", node_type: "Artifact",     sub_type: "Proposal_Document",       label: "ACME_Proposal_v1.pptx",       owner_type: "Account",  owner_id: "200", source_id: "11" },
  { id: "402", node_type: "Artifact",     sub_type: "Design_Document",         label: "HealthPlus_DesignDoc_v1.docx",owner_type: "Account",  owner_id: "201", source_id: "12" },
  { id: "403", node_type: "Artifact",     sub_type: "SOW_Document",            label: "Global_SF_SOW_Template.docx", owner_type: "Internal", owner_id: "202", source_id: "13" },
  { id: "404", node_type: "Artifact",     sub_type: "ProcessMap_Document",     label: "Generic_ProcessMap.png",      owner_type: "Internal", owner_id: "202", source_id: "14" },
  { id: "500", node_type: "Section",      sub_type: "SOW_ProjectOverview",     label: "Project Overview",            owner_type: "Account",  owner_id: "200", source_id: "10" },
  { id: "501", node_type: "Section",      sub_type: "SOW_InScope",             label: "In Scope",                    owner_type: "Account",  owner_id: "200", source_id: "10" },
  { id: "502", node_type: "Section",      sub_type: "SOW_Pricing",             label: "Pricing",                     owner_type: "Account",  owner_id: "200", source_id: "10" },
  { id: "503", node_type: "Section",      sub_type: "Proposal_AccountOverview",label: "Account Overview",            owner_type: "Account",  owner_id: "200", source_id: "11" },
  { id: "504", node_type: "Section",      sub_type: "Proposal_ProposedSolution",label: "Proposed Solution",          owner_type: "Account",  owner_id: "200", source_id: "11" },
  { id: "505", node_type: "Section",      sub_type: "Design_DataModel",        label: "Data Model",                  owner_type: "Account",  owner_id: "201", source_id: "12" },
  { id: "506", node_type: "Section",      sub_type: "ProcessMap_Journey",      label: "Lead-to-Order Journey",       owner_type: "Internal", owner_id: "202", source_id: "14" },
];

const SAMPLE_EDGES = [
  { from: "100", to: "200", relation: "HAS_ACCOUNT" },
  { from: "100", to: "201", relation: "HAS_ACCOUNT" },
  { from: "100", to: "202", relation: "HAS_INTERNAL" },
  { from: "100", to: "300", relation: "HAS_TYPE" },
  { from: "100", to: "301", relation: "HAS_TYPE" },
  { from: "100", to: "302", relation: "HAS_TYPE" },
  { from: "100", to: "303", relation: "HAS_TYPE" },
  { from: "200", to: "400", relation: "HAS_ARTIFACT" },
  { from: "200", to: "401", relation: "HAS_ARTIFACT" },
  { from: "201", to: "402", relation: "HAS_ARTIFACT" },
  { from: "202", to: "403", relation: "HAS_ARTIFACT" },
  { from: "202", to: "404", relation: "HAS_ARTIFACT" },
  { from: "400", to: "500", relation: "HAS_SECTION" },
  { from: "400", to: "501", relation: "HAS_SECTION" },
  { from: "400", to: "502", relation: "HAS_SECTION" },
  { from: "401", to: "503", relation: "HAS_SECTION" },
  { from: "401", to: "504", relation: "HAS_SECTION" },
  { from: "402", to: "505", relation: "HAS_SECTION" },
  { from: "404", to: "506", relation: "HAS_SECTION" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getNode = (id) => SAMPLE_NODES.find(n => n.id === id);
const getChildren = (parentId) => SAMPLE_EDGES.filter(e => e.from === parentId).map(e => getNode(e.to)).filter(Boolean);
const getParent = (nodeId) => {
  const edge = SAMPLE_EDGES.find(e => e.to === nodeId);
  return edge ? getNode(edge.from) : null;
};

// Build full path from repo down to a node
const buildPath = (nodeId) => {
  const path = [];
  let current = getNode(nodeId);
  while (current) {
    path.unshift(current);
    if (current.node_type === "Repo") break;
    current = getParent(current.id);
  }
  return path;
};

// Node type colors
const NODE_COLORS = {
  Repo:         { bg: "#1a1a1a", text: "white",   border: "#1a1a1a" },
  Account:      { bg: "#e8f0fe", text: "#1a56db", border: "#a4c2fb" },
  Internal:     { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  ArtifactType: { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
  Artifact:     { bg: "#fdf4ff", text: "#7e22ce", border: "#d8b4fe" },
  Section:      { bg: "#fff7ed", text: "#c2410c", border: "#fdba74" },
  AtomicFact:   { bg: "#f0f9ff", text: "#0369a1", border: "#7dd3fc" },
};

const nodeColor = (type) => NODE_COLORS[type] || { bg: "#f5f5f5", text: "#333", border: "#ddd" };

const NODE_TYPE_LABELS = {
  Repo: "Repo", Account: "Account", Internal: "Internal",
  ArtifactType: "Artifact Type", Artifact: "Artifact", Section: "Section"
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function GraphViewer({ repo }) {
  // selectedPath: array of node ids representing current drill-down path
  const [selectedPath, setSelectedPath] = useState(["100"]); // start at Repo
  const [selectedNode, setSelectedNode] = useState(getNode("100"));
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const repoNode = getNode("100");
  const accountNodes = getChildren("100").filter(n => n.node_type === "Account" || n.node_type === "Internal");
  const allArtifactTypes = [...new Set(SAMPLE_NODES.filter(n => n.node_type === "ArtifactType").map(n => n.label))];

  // When user clicks a node in the center or left panel
  const selectNode = (node) => {
    const path = buildPath(node.id);
    setSelectedPath(path.map(n => n.id));
    setSelectedNode(node);
  };

  // Drill into a child from center panel
  const drillInto = (node) => {
    selectNode(node);
  };

  // Left panel filtered nodes
  const filteredNodes = SAMPLE_NODES.filter(n => {
    if (n.node_type === "Repo") return false;
    if (filterAccount !== "all") {
      if (n.node_type === "Account" || n.node_type === "Internal") {
        if (filterAccount === "Internal") return n.node_type === "Internal";
        return n.label === filterAccount;
      }
      if (n.owner_id) {
        const owner = getNode(n.owner_id);
        if (filterAccount === "Internal") return owner?.node_type === "Internal";
        return owner?.label === filterAccount;
      }
      return false;
    }
    if (filterType !== "all") {
      if (n.node_type === "ArtifactType") return n.label === filterType;
      if (n.node_type === "Artifact") {
        // find which artifact type this belongs to
        const typeEdge = SAMPLE_EDGES.find(e => e.to === n.id && getNode(e.from)?.node_type === "ArtifactType");
        return typeEdge ? getNode(typeEdge.from)?.label === filterType : false;
      }
      if (n.node_type === "Section") {
        const artifact = getParent(n.id);
        if (!artifact) return false;
        const typeEdge = SAMPLE_EDGES.find(e => e.to === artifact.id && getNode(e.from)?.node_type === "ArtifactType");
        return typeEdge ? getNode(typeEdge.from)?.label === filterType : false;
      }
      return false;
    }
    return true;
  });

  // Current path nodes
  const pathNodes = selectedPath.map(id => getNode(id)).filter(Boolean);
  const lastNode = pathNodes[pathNodes.length - 1];
  const children = lastNode ? getChildren(lastNode.id) : [];

  return (
    <div style={{ display: "flex", gap: "0", height: "calc(100vh - 280px)", minHeight: "500px", background: "#f0f0f0", borderRadius: "8px", overflow: "hidden", border: "1px solid #ddd" }}>

      {/* ── LEFT PANEL ── */}
      <div style={{ width: "240px", minWidth: "240px", background: "white", borderRight: "1px solid #e0e0e0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 12px 10px", borderBottom: "1px solid #eee" }}>
          <div style={{ fontWeight: "bold", fontSize: "13px", color: "#1a1a1a", marginBottom: "10px" }}>Filters</div>

          <label style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "4px" }}>ACCOUNT</label>
          <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)}
            style={{ width: "100%", padding: "5px 7px", borderRadius: "5px", border: "1px solid #ddd", fontSize: "12px", color: "#1a1a1a", marginBottom: "8px" }}>
            <option value="all">All Accounts</option>
            {accountNodes.map(n => <option key={n.id} value={n.label}>{n.label}</option>)}
          </select>

          <label style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "4px" }}>ARTIFACT TYPE</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ width: "100%", padding: "5px 7px", borderRadius: "5px", border: "1px solid #ddd", fontSize: "12px", color: "#1a1a1a" }}>
            <option value="all">All Types</option>
            {allArtifactTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {filteredNodes.length === 0 && (
            <div style={{ padding: "16px 12px", fontSize: "12px", color: "#aaa", textAlign: "center" }}>No nodes match filters</div>
          )}
          {filteredNodes.map(n => {
            const c = nodeColor(n.node_type);
            const isSelected = selectedNode?.id === n.id;
            return (
              <div key={n.id} onClick={() => selectNode(n)}
                style={{ padding: "8px 12px", cursor: "pointer", borderLeft: isSelected ? "3px solid #1a1a1a" : "3px solid transparent",
                  background: isSelected ? "#f5f5f5" : "white", transition: "all 0.1s" }}>
                <div style={{ fontSize: "11px", color: c.text, background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: "4px", padding: "1px 6px", display: "inline-block", marginBottom: "2px" }}>
                  {NODE_TYPE_LABELS[n.node_type]}
                </div>
                <div style={{ fontSize: "13px", color: "#1a1a1a", fontWeight: isSelected ? "600" : "normal", wordBreak: "break-word" }}>{n.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CENTER PANEL ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "0" }}>

        {/* Breadcrumb path */}
        {pathNodes.map((node, idx) => {
          const c = nodeColor(node.node_type);
          const isLast = idx === pathNodes.length - 1;
          const siblings = idx === 0 ? [node] : getChildren(pathNodes[idx - 1].id);

          return (
            <div key={node.id} style={{ marginBottom: "0" }}>
              {/* Level label */}
              <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", letterSpacing: "0.5px",
                paddingLeft: `${idx * 20}px`, marginBottom: "4px", marginTop: idx > 0 ? "8px" : "0" }}>
                {NODE_TYPE_LABELS[node.node_type].toUpperCase()}
              </div>

              {/* Cards at this level */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingLeft: `${idx * 20}px`, marginBottom: "4px" }}>
                {siblings.map(sib => {
                  const sc = nodeColor(sib.node_type);
                  const isActive = sib.id === node.id;
                  return (
                    <div key={sib.id} onClick={() => drillInto(sib)}
                      style={{ padding: "8px 14px", borderRadius: "8px", cursor: "pointer",
                        background: isActive ? sc.bg : "white",
                        border: `2px solid ${isActive ? sc.border : "#e0e0e0"}`,
                        fontWeight: isActive ? "600" : "normal",
                        fontSize: "13px", color: isActive ? sc.text : "#555",
                        boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                        transition: "all 0.15s" }}>
                      {sib.label}
                    </div>
                  );
                })}
              </div>

              {/* Arrow connector */}
              {!isLast && (
                <div style={{ paddingLeft: `${(idx + 1) * 20}px`, color: "#ccc", fontSize: "18px", lineHeight: "1", margin: "2px 0" }}>↓</div>
              )}
            </div>
          );
        })}

        {/* Children of last node */}
        {children.length > 0 && (
          <div style={{ marginTop: "4px" }}>
            <div style={{ paddingLeft: `${pathNodes.length * 20}px`, color: "#ccc", fontSize: "18px", lineHeight: "1", margin: "2px 0" }}>↓</div>
            <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", letterSpacing: "0.5px",
              paddingLeft: `${pathNodes.length * 20}px`, marginBottom: "4px", marginTop: "8px" }}>
              {NODE_TYPE_LABELS[children[0].node_type]?.toUpperCase()}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingLeft: `${pathNodes.length * 20}px` }}>
              {children.map(child => {
                const cc = nodeColor(child.node_type);
                return (
                  <div key={child.id} onClick={() => drillInto(child)}
                    style={{ padding: "8px 14px", borderRadius: "8px", cursor: "pointer",
                      background: "white", border: `2px solid #e0e0e0`,
                      fontSize: "13px", color: "#555", transition: "all 0.15s" }}
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

      {/* ── RIGHT PANEL ── */}
      <div style={{ width: "260px", minWidth: "260px", background: "white", borderLeft: "1px solid #e0e0e0", padding: "16px", overflowY: "auto" }}>
        {selectedNode ? (
          <>
            {/* Node type badge */}
            {(() => {
              const c = nodeColor(selectedNode.node_type);
              return (
                <div style={{ display: "inline-block", background: c.bg, color: c.text,
                  border: `1px solid ${c.border}`, borderRadius: "5px", padding: "2px 10px",
                  fontSize: "11px", fontWeight: "600", marginBottom: "10px" }}>
                  {NODE_TYPE_LABELS[selectedNode.node_type]}
                </div>
              );
            })()}

            <div style={{ fontSize: "16px", fontWeight: "700", color: "#1a1a1a", marginBottom: "14px", wordBreak: "break-word" }}>
              {selectedNode.label}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {selectedNode.sub_type && (
                <div>
                  <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", marginBottom: "2px" }}>SUB TYPE</div>
                  <div style={{ fontSize: "13px", color: "#555" }}>{selectedNode.sub_type}</div>
                </div>
              )}

              {selectedNode.owner_id && (
                <div>
                  <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", marginBottom: "2px" }}>OWNED BY</div>
                  <div style={{ fontSize: "13px", color: "#555" }}>
                    {selectedNode.owner_type === "Internal" ? "Internal" : getNode(selectedNode.owner_id)?.label || selectedNode.owner_id}
                  </div>
                </div>
              )}

              {selectedNode.source_id && (
                <div>
                  <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", marginBottom: "2px" }}>SOURCE FILE</div>
                  <div style={{ fontSize: "13px", color: "#1a56db", wordBreak: "break-word" }}>
                    {SAMPLE_NODES.find(n => n.node_type === "Artifact" && n.source_id === selectedNode.source_id)?.label || `Source #${selectedNode.source_id}`}
                  </div>
                </div>
              )}

              {/* Children count */}
              {(() => {
                const kids = getChildren(selectedNode.id);
                return kids.length > 0 ? (
                  <div>
                    <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", marginBottom: "2px" }}>CHILDREN</div>
                    <div style={{ fontSize: "13px", color: "#555" }}>{kids.length} node{kids.length !== 1 ? "s" : ""}</div>
                  </div>
                ) : null;
              })()}

              {/* Content snippet placeholder */}
              {(selectedNode.node_type === "Section" || selectedNode.node_type === "AtomicFact") && (
                <div>
                  <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", marginBottom: "4px" }}>CONTENT</div>
                  <div style={{ fontSize: "12px", color: "#888", background: "#f9f9f9", borderRadius: "6px",
                    padding: "10px", border: "1px solid #eee", fontStyle: "italic" }}>
                    Content will be available after graph is built (Set 2A).
                  </div>
                </div>
              )}

              {/* Path breadcrumb */}
              <div>
                <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", marginBottom: "4px" }}>FULL PATH</div>
                <div style={{ fontSize: "11px", color: "#888" }}>
                  {buildPath(selectedNode.id).map(n => n.label).join(" → ")}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: "#aaa", fontSize: "13px", textAlign: "center", marginTop: "40px" }}>
            Select a node to see details
          </div>
        )}
      </div>
    </div>
  );
}