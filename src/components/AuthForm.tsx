"use client";

import { useState } from "react";

interface AuthFormProps {
  onSuccess: (user: { id: string; nickname: string }) => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !password.trim()) { setError("请填写昵称和密码"); return; }
    setLoading(true); setError("");
    try {
      const url = isLogin ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "操作失败"); setLoading(false); return; }
      onSuccess(data);
    } catch {
      setError("网络错误，请重试");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ActionFlow</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">行动秩序</p>
          <p className="text-gray-400 mt-2 text-sm">随手记录，灵活规划，高效执行</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button onClick={() => { setIsLogin(true); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${isLogin ? "bg-white shadow-sm text-gray-800" : "text-gray-500"}`}>
              登录
            </button>
            <button onClick={() => { setIsLogin(false); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!isLogin ? "bg-white shadow-sm text-gray-800" : "text-gray-500"}`}>
              注册
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 font-medium mb-1.5">昵称</label>
              <input type="text" placeholder="输入你的昵称" value={nickname} onChange={e => setNickname(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-medium mb-1.5">密码</label>
              <input type="password" placeholder="输入密码" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm">
              {loading ? "请稍候..." : isLogin ? "登录" : "注册"}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-4">
            {isLogin ? "没有账号？" : "已有账号？"}
            <button onClick={() => { setIsLogin(!isLogin); setError(""); }} className="text-blue-600 font-medium ml-1">{isLogin ? "立即注册" : "去登录"}</button>
          </p>
        </div>
      </div>
    </div>
  );
}