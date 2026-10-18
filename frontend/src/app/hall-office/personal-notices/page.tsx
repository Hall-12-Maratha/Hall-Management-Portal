"use client";

/**
 * Hall office - personal notices (monthly bill, warnings, anything meant for
 * one student). Bulk CSV upload (roll, title, notice), a single-send form,
 * and the sent list filtered in the browser (no request per keystroke).
 */

import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils";
import type { PersonalNoticeAdmin, PersonalNoticeUploadResponse } from "@/types";

const TEMPLATE_CSV = "roll,title,notice\r\n230001,October mess bill,Your mess bill for October is INR 3450. Pay at the hall office by 10 Nov.\r\n";

export default function PersonalNoticesPage() {
  const { toast } = useToast();
  const [list, setList] = useState<PersonalNoticeAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [skipped, setSkipped] = useState<PersonalNoticeUploadResponse["skipped"]>([]);

  const [rollNo, setRollNo] = useState("");
  const [title, setTitle] = useState("");
  const [notice, setNotice] = useState("");
  const [isSending, setIsSending] = useState(false);

  const fetchList = async () => {
    setIsLoading(true);
    try {
      setList(await apiFetch<PersonalNoticeAdmin[]>("/hall-office/personal-notices"));
    } catch (err: unknown) {
      toast((err as Error).message || "Failed to load personal notices", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast("Please select a .csv file.", "warning");
      return;
    }
    if (file.size > 1_048_576) {
      toast("File too large. Maximum size is 1MB.", "warning");
      return;
    }
    setIsUploading(true);
    setSkipped([]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await apiFetch<PersonalNoticeUploadResponse>("/hall-office/personal-notices/upload", {
        method: "POST",
        body: formData,
      });
      toast(data.message, data.skipped.length ? "warning" : "success");
      setSkipped(data.skipped);
      setFile(null);
      const input = document.getElementById("pn-csv-input") as HTMLInputElement | null;
      if (input) input.value = "";
      fetchList();
    } catch (err: unknown) {
      toast((err as Error).message || "Upload failed.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNo.trim() || !title.trim() || !notice.trim()) return;
    setIsSending(true);
    try {
      const created = await apiFetch<PersonalNoticeAdmin>("/hall-office/personal-notices", {
        method: "POST",
        body: JSON.stringify({ roll_no: rollNo.trim(), title: title.trim(), notice: notice.trim() }),
      });
      toast(`Sent to ${created.roll_no}`, "success");
      setRollNo("");
      setTitle("");
      setNotice("");
      setList((current) => [created, ...current]);
    } catch (err: unknown) {
      toast((err as Error).message || "Failed to send notice", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this personal notice? The student will no longer see it.")) return;
    try {
      await apiFetch(`/hall-office/personal-notices/${id}`, { method: "DELETE" });
      setList((current) => current.filter((n) => n.id !== id));
      toast("Deleted", "success");
    } catch (err: unknown) {
      toast((err as Error).message || "Failed to delete", "error");
    }
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "personal-notices-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (n) =>
        (n.roll_no ?? "").toLowerCase().includes(q) ||
        n.student_name.toLowerCase().includes(q) ||
        n.title.toLowerCase().includes(q)
    );
  }, [list, search]);

  const inputClass =
    "w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary mb-1">Personal Notices</h1>
        <p className="text-sm text-text-muted">
          Messages for one student each: monthly bill, warnings, reminders. Each student sees only their own, and gets a
          push notification if they enabled them.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bulk upload */}
        <div className="glass-card p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Upload CSV</h2>
            <button type="button" onClick={downloadTemplate} className="text-xs text-accent hover:underline">
              Download template
            </button>
          </div>
          <p className="text-xs text-text-muted">
            Columns in order: <span className="font-mono">roll, title, notice</span>. One row per student. Rows with an
            unknown roll number are skipped and listed below.
          </p>
          <input
            id="pn-csv-input"
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-text-secondary file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-accent/10 file:text-accent file:text-xs file:font-medium hover:file:bg-accent/20"
          />
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isUploading ? "Uploading…" : "Send notices"}
          </button>
          {skipped.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold text-warning">Skipped rows</p>
              {skipped.map((s) => (
                <p key={`${s.row}-${s.roll_no}`} className="text-text-secondary">
                  Row {s.row} {s.roll_no ? `(${s.roll_no})` : ""}: {s.reason}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Single notice */}
        <form onSubmit={handleSend} className="glass-card p-6 rounded-xl space-y-3">
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Send to one student</h2>
          <input
            type="text"
            placeholder="Roll number *"
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            className={inputClass}
            required
          />
          <input
            type="text"
            placeholder="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            className={inputClass}
            required
          />
          <textarea
            placeholder="Notice *"
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            maxLength={4000}
            className={`${inputClass} min-h-[96px]`}
            required
          />
          <button
            type="submit"
            disabled={isSending}
            className="w-full py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        </form>
      </div>

      {/* Sent list */}
      <div className="glass-card p-6 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
            Sent ({list.length})
          </h2>
          <input
            type="search"
            placeholder="Filter by roll, name or title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} sm:w-72`}
          />
        </div>

        {isLoading ? (
          <div className="animate-subtle-pulse h-20 bg-bg-elevated rounded-xl" />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">
            {list.length === 0 ? "No personal notices sent yet." : "No match."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted uppercase tracking-wider border-b border-border">
                  <th className="py-2 pr-4">Roll</th>
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Notice</th>
                  <th className="py-2 pr-4">Sent</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((n) => (
                  <tr key={n.id} className="border-b border-border/50 align-top">
                    <td className="py-2 pr-4 font-mono text-text-primary whitespace-nowrap">{n.roll_no ?? "-"}</td>
                    <td className="py-2 pr-4 text-text-secondary whitespace-nowrap">{n.student_name}</td>
                    <td className="py-2 pr-4 text-text-primary">{n.title}</td>
                    <td className="py-2 pr-4 text-text-secondary whitespace-pre-wrap max-w-md">{n.notice}</td>
                    <td className="py-2 pr-4 text-text-muted whitespace-nowrap">{formatDateTime(n.created_at)}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id)}
                        className="text-error/70 hover:text-error text-xs bg-error/10 hover:bg-error/20 px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
