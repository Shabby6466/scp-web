import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Message = {
  id: string;
  subject: string;
  body: string;
  sender_id: string;
  recipient_id: string | null;
  is_read: boolean;
  is_broadcast: boolean;
  created_at: string;
  sender?: { full_name: string; email: string };
  recipient?: { full_name: string; email: string };
};

export default function MessageCenter() {
  const { user } = useAuth();
  const { schoolId } = useUserRole();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    subject: "",
    body: "",
    isBroadcast: false,
  });

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await api.get('/messages');
      setMessages(Array.isArray(data) ? data : data?.data ?? []);
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const openCompose = () => {
    setForm({ subject: "", body: "", isBroadcast: false });
    setOpen(true);
  };

  const sendMessage = async () => {
    if (!form.subject.trim() || !form.body.trim()) {
      toast({
        title: "Validation Error",
        description: "Subject and message body are required",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    if (!schoolId) {
      toast({
        title: "Error",
        description: "Could not determine your school",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.post("/messages", {
        school_id: schoolId,
        sender_id: user.id,
        subject: form.subject,
        body: form.body,
        is_broadcast: form.isBroadcast,
      });

      toast({ title: "Success", description: "Message sent" });
      setOpen(false);
      loadMessages();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/messages/${id}`, { is_read: true, read_at: new Date().toISOString() });
      loadMessages();
    } catch {
      // silently fail
    }
  };

  const viewMessage = (msg: Message) => {
    setSelectedMessage(msg);
    if (!msg.is_read) markAsRead(msg.id);
  };

  const currentUserId = user?.id ?? null;

  return (
    <div className="space-y-4 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Message Center
        </h1>
        <Button onClick={openCompose}>
          <Send className="h-4 w-4 mr-2" />
          Compose
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Messages</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {messages.filter((m) => !m.is_read).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {messages.filter((m) => !m.is_read).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No messages yet
            </Card>
          ) : (
            messages.map((msg) => (
              <Card
                key={msg.id}
                className="p-4 cursor-pointer hover:bg-muted/50"
                onClick={() => viewMessage(msg)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {!msg.is_read && (
                        <Badge variant="default" className="text-xs">
                          New
                        </Badge>
                      )}
                      {msg.is_broadcast && (
                        <Badge variant="secondary" className="text-xs">
                          Broadcast
                        </Badge>
                      )}
                      <span className="font-medium">{msg.subject}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      From: {msg.sender?.full_name || "Unknown"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-2">
          {messages
            .filter((m) => !m.is_read)
            .map((msg) => (
              <Card
                key={msg.id}
                className="p-4 cursor-pointer hover:bg-muted/50"
                onClick={() => viewMessage(msg)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        New
                      </Badge>
                      <span className="font-medium">{msg.subject}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      From: {msg.sender?.full_name || "Unknown"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="sent" className="space-y-2">
          {messages
            .filter((m) => m.sender_id === currentUserId)
            .map((msg) => (
              <Card
                key={msg.id}
                className="p-4 cursor-pointer hover:bg-muted/50"
                onClick={() => viewMessage(msg)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span className="font-medium">{msg.subject}</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      To: {msg.recipient?.full_name || "All Staff"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </Card>
            ))}
        </TabsContent>
      </Tabs>

      {/* Compose Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">Compose Message</h2>
          <div className="space-y-4">
            <Input
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
            <Textarea
              placeholder="Message body"
              rows={6}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="broadcast"
                checked={form.isBroadcast}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isBroadcast: e.target.checked }))
                }
              />
              <label htmlFor="broadcast" className="text-sm">
                Send as broadcast to all staff
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={sendMessage}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Message Dialog */}
      {selectedMessage && (
        <Dialog
          open={!!selectedMessage}
          onOpenChange={() => setSelectedMessage(null)}
        >
          <DialogContent className="max-w-2xl">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{selectedMessage.subject}</h2>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <span>From: {selectedMessage.sender?.full_name}</span>
                  <span>·</span>
                  <span>
                    {formatDistanceToNow(new Date(selectedMessage.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="whitespace-pre-wrap">{selectedMessage.body}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
