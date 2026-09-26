import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Eye, FileText, Folder, Grid2x2, List, Share2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, SkeletonGrid } from "@/components/shared/states";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { UserCell } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/format";
import { useDeleteFile, useFiles, useUploadFile } from "@/hooks/use-data";
import { cn } from "@/lib/utils";
import { FilePreviewDialog, downloadFile, registerFileBlob } from "@/components/files/file-preview-dialog";
import { useWorkspaceIntegrations } from "@/lib/integrations/use-integrations";
import type { FileRecord } from "@/lib/types";

export const Route = createFileRoute("/files")({
  head: () => ({
    meta: [
      { title: "File Manager — Teamlio" },
      { name: "description", content: "Project and client files organised in shared folders." },
      { property: "og:title", content: "File Manager — Teamlio" },
      { property: "og:description", content: "Shared project and client file storage." },
    ],
  }),
  component: FilesPage,
});

function FilesPage() {
  const { data: files = [], isLoading } = useFiles();
  const { integrations } = useWorkspaceIntegrations();
  const storageState = integrations.storage;
  const [folder, setFolder] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<FileRecord | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadFile();
  const remove = useDeleteFile();

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    for (const picked of Array.from(list)) {
      try {
        const record = await upload.mutateAsync({
          name: picked.name,
          folder: folder ?? "Shared Files",
          mime_type: picked.type || "application/octet-stream",
          size_kb: Math.max(1, Math.round(picked.size / 1024)),
        });
        registerFileBlob(record.id, picked);
        toast.success(`${picked.name} uploaded`);
      } catch {
        toast.error(`Could not upload ${picked.name}`);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  const folders = Array.from(new Set(files.map((f) => f.folder)));
  const rows = files.filter(
    (f) => (!folder || f.folder === folder) && f.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <PermissionGuard permission="file.manage" mode="page">
      <div className="mx-auto max-w-[1400px]">
        <PageHeader
          title="File manager"
          description="Documents, designs and deliverables attached to projects and clients."
          actions={
            <div className="flex items-center gap-2">
              {storageState?.connected ? (
                <Badge
                  variant="outline"
                  className="gap-1.5 py-1 px-3 bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs font-medium"
                >
                  <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Storage: {storageState.config.provider?.toUpperCase() || "AWS S3"} ({storageState.config.bucket_name || "teamlio-vault"})</span>
                </Badge>
              ) : null}
              <input
                ref={inputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => void handleFiles(e.target.files)}
              />
              <Button size="sm" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
                <Upload className="size-4" /> {upload.isPending ? "Uploading…" : "Upload"}
              </Button>
            </div>
          }
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            className="h-9 max-w-xs"
            aria-label="Search files"
          />
          <div className="ml-auto flex items-center gap-1">
            <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setView("grid")} aria-label="Grid view">
              <Grid2x2 className="size-4" />
            </Button>
            <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setView("list")} aria-label="List view">
              <List className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <Button variant={folder === null ? "secondary" : "outline"} size="sm" onClick={() => setFolder(null)}>
            All files
          </Button>
          {folders.map((f) => (
            <Button key={f} variant={folder === f ? "secondary" : "outline"} size="sm" onClick={() => setFolder(f)}>
              <Folder className="size-4" /> {f}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <SkeletonGrid />
        ) : rows.length === 0 ? (
          <EmptyState title="No files here" description="Upload a file or pick another folder." />
        ) : (
          <div className={cn(view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-4" : "surface-card divide-y")}>
            {rows.map((f) =>
              view === "grid" ? (
                <article key={f.id} className="surface-card p-4">
                  <button type="button" className="block w-full text-left" onClick={() => setPreview(f)} aria-label={`Preview ${f.name}`}>
                    <FileText className="size-8 text-primary" />
                    <p className="mt-3 truncate text-sm font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.folder} · {Math.round(f.size_kb)} KB</p>
                  </button>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <UserCell userId={f.uploader_id} subtitle={fmtDate(f.created_at)} />
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" onClick={() => setPreview(f)} aria-label={`Preview ${f.name}`}>
                        <Eye className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => downloadFile(f)} aria-label={`Download ${f.name}`}>
                        <Download className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toast.success("Share link copied")} aria-label="Share file">
                        <Share2 className="size-4" />
                      </Button>
                      <ConfirmDialog
                        trigger={<Button variant="ghost" size="icon" aria-label="Delete file"><Trash2 className="size-4" /></Button>}
                        title="Delete this file?"
                        description={`${f.name} will be removed from the workspace.`}
                        confirmLabel="Delete"
                        destructive
                        onConfirm={() => {
                          remove.mutate(f.id);
                          toast.success("File deleted");
                        }}
                      />
                    </div>
                  </div>
                </article>
              ) : (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <button type="button" className="min-w-0 flex-1 truncate text-left text-sm hover:underline" onClick={() => setPreview(f)}>
                    {f.name}
                  </button>
                  {f.shared ? <Badge variant="secondary">Shared</Badge> : null}
                  <span className="hidden text-xs text-muted-foreground sm:block">{f.folder}</span>
                  <span className="hidden text-xs text-muted-foreground min-[420px]:block">{Math.round(f.size_kb)} KB</span>
                  <Button variant="ghost" size="icon" onClick={() => setPreview(f)} aria-label={`Preview ${f.name}`}>
                    <Eye className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => downloadFile(f)} aria-label={`Download ${f.name}`}>
                    <Download className="size-4" />
                  </Button>
                </div>
              ),
            )}
          </div>
        )}

        <FilePreviewDialog file={preview} open={!!preview} onOpenChange={(o) => !o && setPreview(null)} />
      </div>
    </PermissionGuard>
  );
}
