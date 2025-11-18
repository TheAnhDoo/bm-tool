import { useState, useEffect } from "react";
import { Plus, Search, Trash2, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { api } from "../renderer/services/api";
import { AddLinkInviteDialog } from "./AddLinkInviteDialog";

interface LinkInvite {
  id: number;
  link: string;
  notes: string | null;
  status: string;
  viaId?: number | null;
  bmId?: number | null;
  createdAt: string;
  viaProfile?: { id: number; username: string | null };
  bmProfile?: { id: number; username: string | null; bmUid?: string | null };
}

export function LinkInviteDashboard() {
  const [links, setLinks] = useState<LinkInvite[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddInviteOpen, setIsAddInviteOpen] = useState(false);

  useEffect(() => {
    loadInvites();
    
    // Listen for invite creation events
    const handleInviteCreated = () => {
      loadInvites();
    };
    window.addEventListener('invite:created', handleInviteCreated);
    
    // Subscribe to automation events
    let unsubscribe: (() => void) | undefined;
    if (window.electronAPI) {
      unsubscribe = window.electronAPI.subscribeAutomation((event, data) => {
        if (event === 'invite:deleted' || event === 'invites:deleted' || event === 'invites:created') {
          loadInvites();
        }
      });
    }
    
    return () => {
      window.removeEventListener('invite:created', handleInviteCreated);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const result = await api.listInvites({ search: searchQuery });
      if (result.success && result.data?.invites) {
        setLinks(result.data.invites);
        // Clear selected IDs that no longer exist
        setSelectedIds(prev => prev.filter(id => result.data.invites.some((invite: LinkInvite) => invite.id === id)));
      } else {
        console.error('Failed to load invites:', result.error);
        if (result.error) {
          alert(`Failed to load invites: ${result.error}`);
        }
      }
    } catch (error: any) {
      console.error('Failed to load invites:', error);
      alert(`Failed to load invites: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, [searchQuery]);

  const filteredLinks = links.filter(
    (link) =>
      link.link.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (link.notes || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!confirm(`Are you sure you want to delete ${count} invite(s)?`)) return;

    try {
      const result = await api.deleteInvites(selectedIds);
      if (result.success) {
        setSelectedIds([]);
        await loadInvites();
        // Show success message after reload
        alert(`Deleted ${count} invite(s) successfully`);
      } else {
        alert(`Error: ${result.error || 'Failed to delete invites'}`);
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(`Error: ${error.message || 'Failed to delete invites'}`);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6" style={{ borderBottom: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl" style={{ color: "#333" }}>
            Quản lý Link Invite
          </h2>
          <Button
            className="rounded-xl gap-2"
            style={{ backgroundColor: "#6366F1" }}
            onClick={() => setIsAddInviteOpen(true)}
          >
            <Plus size={18} />
            Add Invite
          </Button>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: "#9CA3AF" }} />
            <Input
              placeholder="Search invite links..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
              style={{ borderColor: "#E5E7EB" }}
            />
          </div>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={handleDelete}
            disabled={selectedIds.length === 0}
            style={{ borderColor: "#E5E7EB", color: "#EF4444" }}
          >
            <Trash2 size={18} />
            Delete ({selectedIds.length})
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-gray-500">Loading invites...</div>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "#E5E7EB" }}>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === filteredLinks.length && filteredLinks.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds(filteredLinks.map(l => l.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLinks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No invites found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLinks.map((link) => {
                    // Determine if link has been used: has viaId and bmId, or status is success
                    const isUsed = (link.viaId && link.bmId) || link.status === 'success';
                    const statusDisplay = isUsed ? 'Đã dùng' : 'Chưa dùng';
                    const statusColor = isUsed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
                    
                    return (
                      <TableRow key={link.id} style={{ borderColor: "#E5E7EB" }}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(link.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds([...selectedIds, link.id]);
                              } else {
                                setSelectedIds(selectedIds.filter(id => id !== link.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>{link.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <a
                              href={link.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {link.link.substring(0, 50)}...
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${statusColor}`}>
                            {statusDisplay}
                          </span>
                        </TableCell>
                        <TableCell>{link.notes || 'N/A'}</TableCell>
                        <TableCell>{new Date(link.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AddLinkInviteDialog
        open={isAddInviteOpen}
        onOpenChange={setIsAddInviteOpen}
      />
    </div>
  );
}
