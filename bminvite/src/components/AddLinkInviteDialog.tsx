import { useState, useEffect } from "react";
import { Link as LinkIcon, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { api } from "../renderer/services/api";

interface AddLinkInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLinkInviteDialog({ open, onOpenChange }: AddLinkInviteDialogProps) {
  const [inviteLinks, setInviteLinks] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setInviteLinks("");
      setNotes("");
      setSaving(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!inviteLinks.trim()) {
      alert("Vui lòng nhập ít nhất một link invite");
      return;
    }

    setSaving(true);
    try {
      const links = inviteLinks
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          const trimmed = line.trim();
          return trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://'));
        });

      if (links.length === 0) {
        alert("Không tìm thấy link invite hợp lệ. Vui lòng nhập link bắt đầu bằng http:// hoặc https://");
        setSaving(false);
        return;
      }

      const result = await api.createInvites({ links, notes: notes || undefined });

      if (result.success) {
        alert(`Đã tạo ${result.data?.count || 0} invite thành công!`);
        onOpenChange(false);
        setInviteLinks("");
        setNotes("");
        window.dispatchEvent(new Event('invite:created'));
      } else {
        alert(`Lỗi: ${result.error || 'Không thể tạo invite'}`);
      }
    } catch (error: any) {
      console.error('Error creating invites:', error);
      alert(`Lỗi: ${error.message || 'Đã xảy ra lỗi khi tạo invite'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = async () => {
    try {
      const fileResult = await api.selectFile({
        filters: [
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (fileResult.success && fileResult.filePath) {
        setSaving(true);
        const result = await api.uploadInvites(fileResult.filePath);
        if (result.success) {
          alert(`Uploaded ${result.data?.count || 0} invites successfully!`);
          onOpenChange(false);
          setInviteLinks("");
          setNotes("");
          window.dispatchEvent(new Event('invite:created'));
        } else {
          alert(`Error: ${result.error}`);
        }
        setSaving(false);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl rounded-2xl max-h-[90vh] overflow-y-auto" style={{ border: "1px solid #E5E7EB" }}>
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#EEF2FF" }}
            >
              <LinkIcon size={20} style={{ color: "#6366F1" }} />
            </div>
            Add Link Invite
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-lg p-1" style={{ backgroundColor: "#F3F4F6" }}>
            <TabsTrigger value="manual" className="rounded-lg py-2.5">Manual Input</TabsTrigger>
            <TabsTrigger value="import" className="rounded-lg py-2.5">Import File</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="invite-links" className="text-base">Invite Links</Label>
              <Textarea
                id="invite-links"
                placeholder="Enter invite links (one per line)&#10;Example:&#10;https://facebook.com/invite/abc123&#10;https://facebook.com/invite/def456"
                value={inviteLinks}
                onChange={(e) => setInviteLinks(e.target.value)}
                className="rounded-xl min-h-[180px]"
                style={{ borderColor: "#E5E7EB" }}
              />
              <p className="text-xs" style={{ color: "#6B7280" }}>
                One link per line
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about these invites..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl min-h-[80px]"
                style={{ borderColor: "#E5E7EB" }}
              />
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-5 mt-6">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="mx-auto mb-4" size={32} style={{ color: "#9CA3AF" }} />
              <p className="text-sm text-gray-500 mb-4">
                Import invite links from a text file
              </p>
              <p className="text-xs text-gray-400 mb-4">
                One link per line. Only URLs starting with http:// or https:// will be imported.
              </p>
              <Button onClick={handleImportFile} disabled={saving}>
                <Upload size={16} className="mr-2" />
                {saving ? "Importing..." : "Select File"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !inviteLinks.trim()}
            style={{ backgroundColor: "#6366F1" }}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
