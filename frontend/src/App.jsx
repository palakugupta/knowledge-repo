import { useState } from "react";
import RepoList from "./components/RepoList";
import RepoDetail from "./components/RepoDetail";
import AccountList from "./components/AccountList";

export default function App() {
  const [screen, setScreen] = useState("repos");
  const [selectedRepo, setSelectedRepo] = useState(null);

  if (screen === "accounts") {
    return <AccountList onBack={() => setScreen("repos")} />;
  }

  if (screen === "repo-detail" && selectedRepo) {
    return <RepoDetail repo={selectedRepo} onBack={() => setScreen("repos")} />;
  }

  return (
    <RepoList
      onOpenRepo={(repo) => { setSelectedRepo(repo); setScreen("repo-detail"); }}
      onOpenAccounts={() => setScreen("accounts")}
    />
  );
}