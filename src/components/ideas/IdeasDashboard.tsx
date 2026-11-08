"use client";

import React, { useState, useEffect } from "react";
import {
  Lightbulb,
  Pin,
  Heart,
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  Download,
  Play,
  Square,
  Pause,
  Filter,
  Users,
  MessageSquare,
  Sparkles,
  ArrowUpDown
} from "lucide-react";
import { IdeasPoll, Idea } from "@/lib/types/interaction";

interface IdeasDashboardProps {
  pollId: string;
  eventCode: string;
  onRefresh?: () => void;
  onEdit?: (poll: IdeasPoll) => void;
}

export default function IdeasDashboard({
  pollId,
  eventCode,
  onRefresh,
  onEdit,
}: IdeasDashboardProps) {
  const [poll, setPoll] = useState<IdeasPoll | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "pending" | "rejected">("all");
  const [sortBy, setSortBy] = useState<"popular" | "newest" | "oldest" | "pinned">("popular");
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchPollData = async () => {
    try {
      const res = await fetch(`/api/ideas-polls/${pollId}`);
      const data = await res.json();
      if (data.success && data.poll) {
        setPoll(data.poll);
        setIdeas(data.poll.ideas || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPollData();
    const interval = setInterval(fetchPollData, 3000);
    return () => clearInterval(interval);
  }, [pollId]);

  const handleUpdateStatus = async (newStatus: "active" | "paused" | "closed") => {
    try {
      const endpoint = newStatus === "active" ? `/api/ideas-polls/${pollId}/start` : `/api/ideas-polls/${pollId}/close`;
      await fetch(endpoint, { method: "POST" });
      fetchPollData();
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleModerateIdea = async (ideaId: string, status: "published" | "rejected" | "pending") => {
    try {
      await fetch(`/api/ideas-polls/${pollId}/ideas/${ideaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchPollData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePin = async (ideaId: string, currentPinned: boolean) => {
    try {
      await fetch(`/api/ideas-polls/${pollId}/ideas/${ideaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !currentPinned }),
      });
      fetchPollData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteIdea = async (ideaId: string) => {
    if (!confirm("Hapus ide ini secara permanen?")) return;
    try {
      await fetch(`/api/ideas-polls/${pollId}/ideas/${ideaId}`, {
        method: "DELETE",
      });
      fetchPollData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEdit = async (ideaId: string) => {
    if (!editContent.trim()) return;
    try {
      await fetch(`/api/ideas-polls/${pollId}/ideas/${ideaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      setEditingIdeaId(null);
      fetchPollData();
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading || !poll) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-bold">Memuat dashboard ide...</p>
      </div>
    );
  }

  // Analytics
  const totalIdeas = ideas.length;
  const uniqueParticipants = new Set(ideas.map((i) => i.participantId)).size;
  const totalReactions = ideas.reduce((acc, curr) => acc + (curr.reactionCount || 0), 0);
  const publishedIdeas = ideas.filter((i) => i.status === "published");
  const popularIdea = [...publishedIdeas].sort((a, b) => b.reactionCount - a.reactionCount)[0];

  // Filtering
  const filteredIdeas = ideas.filter((idea) => {
    if (statusFilter === "all") return true;
    return idea.status === statusFilter;
  });

  // Sorting
  const sortedIdeas = [...filteredIdeas].sort((a, b) => {
    if (sortBy === "pinned") {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.reactionCount - a.reactionCount;
    }
    if (sortBy === "popular") {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.reactionCount - a.reactionCount;
    }
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
              💡 Gagasan (Ideas Poll)
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                poll.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : poll.status === "paused"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              Status: {poll.status === "active" ? "Aktif" : poll.status === "paused" ? "Jeda" : "Ditutup"}
            </span>
            {poll.moderationEnabled && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Moderasi Aktif
              </span>
            )}
          </div>
          <h2 className="text-lg font-black text-slate-900">{poll.title}</h2>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">{poll.question}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {poll.status !== "active" ? (
            <button
              onClick={() => handleUpdateStatus("active")}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Aktifkan Sesi</span>
            </button>
          ) : (
            <button
              onClick={() => handleUpdateStatus("closed")}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Tutup Sesi</span>
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => onEdit(poll)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          <a
            href={`/api/ideas-polls/${poll.id}/export`}
            download
            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </a>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Total Gagasan</span>
            <Lightbulb className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalIdeas}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Ide yang terkumpul</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Peserta Berpartisipasi</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{uniqueParticipants}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Kontributor unik</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Total Reaksi</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalReactions}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Apresiasi & upvotes</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Gagasan Terpopuler</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm font-black text-slate-900 truncate">
            {popularIdea ? popularIdea.content : "-"}
          </div>
          <p className="text-[11px] text-amber-600 font-bold mt-0.5">
            {popularIdea ? `${popularIdea.reactionCount} reaksi` : "Belum ada suara"}
          </p>
        </div>
      </div>

      {/* Filter and Sorting Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </span>
          {[
            { id: "all", label: `Semua (${ideas.length})` },
            { id: "published", label: `Terbit (${ideas.filter((i) => i.status === "published").length})` },
            { id: "pending", label: `Pending (${ideas.filter((i) => i.status === "pending").length})` },
            { id: "rejected", label: `Ditolak (${ideas.filter((i) => i.status === "rejected").length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Urutkan:</span>
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="popular">Reaksi Terbanyak</option>
            <option value="newest">Paling Baru</option>
            <option value="oldest">Terlama</option>
            <option value="pinned">Disematkan (Pinned)</option>
          </select>
        </div>
      </div>

      {/* List of Ideas */}
      {sortedIdeas.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <Lightbulb className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Belum Ada Gagasan</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Peserta dapat mengirimkan ide begitu sesi ini berstatus aktif.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {sortedIdeas.map((idea) => {
            const isEditing = editingIdeaId === idea.id;

            return (
              <div
                key={idea.id}
                className={`p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
                  idea.isPinned
                    ? "bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/20"
                    : idea.status === "pending"
                    ? "bg-blue-50/40 border-blue-200"
                    : idea.status === "rejected"
                    ? "bg-slate-50 border-slate-200 opacity-60"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {idea.authorName || "Anonim"}
                      </span>
                      {idea.category && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                          {idea.category}
                        </span>
                      )}
                      {idea.isPinned && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-white flex items-center gap-1 shadow-2xs">
                          <Pin className="w-3 h-3 fill-current" />
                          <span>Pinned</span>
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        idea.status === "published"
                          ? "bg-emerald-100 text-emerald-800"
                          : idea.status === "pending"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {idea.status}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 mb-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        rows={3}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setEditingIdeaId(null)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => handleSaveEdit(idea.id)}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-white"
                        >
                          Simpan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap break-words mb-3">
                      {idea.content}
                    </p>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 font-bold text-rose-600">
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    <span>{idea.reactionCount} reaksi</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Pin Toggle */}
                    <button
                      onClick={() => handleTogglePin(idea.id, idea.isPinned)}
                      className={`p-1.5 rounded-lg border transition ${
                        idea.isPinned
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                      }`}
                      title={idea.isPinned ? "Lepaskan Pin" : "Sematkan Ide (Pin)"}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    {/* Moderation Controls */}
                    {idea.status !== "published" && (
                      <button
                        onClick={() => handleModerateIdea(idea.id, "published")}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                        title="Setujui Ide"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {idea.status !== "rejected" && (
                      <button
                        onClick={() => handleModerateIdea(idea.id, "rejected")}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                        title="Tolak Ide"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Edit */}
                    <button
                      onClick={() => {
                        setEditingIdeaId(idea.id);
                        setEditContent(idea.content);
                      }}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
                      title="Edit Isi Ide"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteIdea(idea.id)}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition"
                      title="Hapus Ide"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
