"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import "./login.css";
import Image from "next/image";

async function retrieveData(folderName) {
  const { data, error } = await supabase
    .storage
    .from("root")
    .list(folderName);

  if (error) return [];
  return data;
}

// Helper functions for format conversion
function toDisplayPath(name) {
  return name.replace("-: ", "/");
}

function toDBFormat(path) {
  return path.replace("/", "-: ");
}

export default function AdminPanel() {
  const [data, setData] = useState([]);
  const [path, setPath] = useState("");
  const [fileUrl, setFileUrl] = useState(null);
  const [message, setMessage] = useState("");
  const [verifiedList, setVerifiedList] = useState([]);

  const [inputPassword, setInputPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  async function handleAuth() {
    const { data: admins } = await supabase
      .from("admins")
      .select("password");

    if (!admins) {
      setMessage("❌ No admins found");
      return;
    }

    const passwords = admins.map(a => a.password);
    if (passwords.includes(inputPassword)) {
      setIsAuthenticated(true);
      setMessage("✅ Access Granted");
    } else {
      setMessage("❌ Wrong Password");
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadData("");
      loadVerified();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) loadData(path);
  }, [path]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  async function loadData(folderName) {
    const result = await retrieveData(folderName);
    setData(result);
  }

  async function loadVerified() {
    const { data } = await supabase
      .from("verified_projects")
      .select("project_name");

    setVerifiedList(data || []);
  }

  function handleClick(item) {
    if (!item.metadata) {
      const newPath = path ? `${path}/${item.name}` : item.name;
      setPath(newPath);
      setFileUrl(null);
    } else {
      const filePath = path ? `${path}/${item.name}` : item.name;
      const { data } = supabase
        .storage
        .from("root")
        .getPublicUrl(filePath);
      setFileUrl(data.publicUrl);
    }
  }

  function goBack() {
    if (!path) return;
    const i = path.lastIndexOf("/");
    setPath(i === -1 ? "" : path.substring(0, i));
    setFileUrl(null);
  }

  async function handleVerify(folderName) {
    const projectPath = path ? `${path}/${folderName}` : folderName;
    const projectDB = toDBFormat(projectPath);
    const { error } = await supabase
      .from("verified_projects")
      .insert([{ project_name: projectDB }]);
    setMessage(error ? "⚠️ Already verified" : "✅ Verified: " + projectPath);
    loadVerified();
  }

  async function handleUnverify(folderName) {
    const projectPath = path ? `${path}/${folderName}` : folderName;
    const projectDB = toDBFormat(projectPath);
    const { error } = await supabase
      .from("verified_projects")
      .delete()
      .eq("project_name", projectDB);
    setMessage(error ? "❌ Error removing" : "🗑️ Unverified: " + projectPath);
    loadVerified();
  }

  function isVerified(folderName) {
    const projectPath = path ? `${path}/${folderName}` : folderName;
    const projectDB = toDBFormat(projectPath);
    return verifiedList.some(v => v.project_name === projectDB);
  }

  if (!isAuthenticated) {
    return (
      <div className="login-root">
        <div className="card">
          <Image
            className="vvitimage"
            src="/VVIT.png"
            alt="VVIT Logo"
            width={104}
            height={104}
          />
          <h2>Admin Access</h2>
          <input
            type="password"
            placeholder="Enter Admin Password"
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
          />
          <button onClick={handleAuth}>Enter</button>
          {message && <div className="message-box">{message}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="file-container">
      <div className="file-inner">
        <div className="admin-header">
          <Image
            className="vvitimage"
            src="/VVIT.png"
            alt="VVIT Logo"
            width={104}
            height={104}
          />
          <h2>VVITU Repository Admin Panel</h2>
        </div>

        <div className="path-bar">
          <button onClick={goBack}>⬅ Back</button>
          <span>{path || "root"}</span>
        </div>

        <div className="file-list">
          {data.map((item, index) => (
            <div key={index} className="file-row">
              <div className="file-left" onClick={() => handleClick(item)}>
                <span>{item.metadata ? "📄" : "📁"}</span>
                <span>{item.name}</span>
              </div>

              {!item.metadata && path && (
                isVerified(item.name) ? (
                  <button
                    className="unverify-btn"
                    onClick={() => handleUnverify(item.name)}
                  >
                    Unverify
                  </button>
                ) : (
                  <button
                    className="verify-btn"
                    onClick={() => handleVerify(item.name)}
                  >
                    Verify
                  </button>
                )
              )}
            </div>
          ))}
        </div>

        {message && <div className="message-box">{message}</div>}

        {fileUrl && (
          <div className="preview">
            <iframe src={fileUrl} width="100%" height="400px" />
          </div>
        )}
      </div>
    </div>
  );
}