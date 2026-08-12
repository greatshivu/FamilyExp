import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageSquare, Send, User } from "lucide-react";

export default function NotesPage() {
  const { user } = useAuth();
  const [individualNote, setIndividualNote] = useState("");
  const [isSavingIndividual, setIsSavingIndividual] = useState(false);

  const [commonNotes, setCommonNotes] = useState([]);
  const [newCommonNote, setNewCommonNote] = useState("");
  const [isPostingCommon, setIsPostingCommon] = useState(false);
  const [replies, setReplies] = useState({}); // noteId -> replyText

  const loadData = useCallback(async () => {
    try {
      const [indRes, comRes] = await Promise.all([
        api.get("/notes/individual"),
        api.get("/notes/common")
      ]);
      if (indRes.data) setIndividualNote(indRes.data.content);
      setCommonNotes(comRes.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load notes");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveIndividual = async () => {
    setIsSavingIndividual(true);
    try {
      await api.post("/notes/individual", { content: individualNote });
      toast.success("Individual note saved");
    } catch (e) {
      toast.error("Failed to save individual note");
    } finally {
      setIsSavingIndividual(false);
    }
  };

  const postCommonNote = async () => {
    if (!newCommonNote.trim()) return;
    setIsPostingCommon(true);
    try {
      await api.post("/notes/common", { content: newCommonNote });
      setNewCommonNote("");
      toast.success("Shared note posted");
      loadData();
    } catch (e) {
      toast.error("Failed to post shared note");
    } finally {
      setIsPostingCommon(false);
    }
  };

  const postReply = async (noteId) => {
    const replyText = replies[noteId];
    if (!replyText?.trim()) return;
    try {
      await api.post(`/notes/common/${noteId}/reply`, { content: replyText });
      setReplies(prev => ({ ...prev, [noteId]: "" }));
      toast.success("Reply added");
      loadData();
    } catch (e) {
      toast.error("Failed to add reply");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="font-display text-4xl font-black text-[#1C1F1D] tracking-tighter mb-2">
          Notes & Discussions
        </h1>
        <p className="text-[#5C635F]">Private notes and shared partner discussions.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Individual Section */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-[#DCD7CB] shadow-sm">
            <CardHeader className="bg-[#E8E5DC]/50">
              <CardTitle className="text-xl font-display">My Private Notes</CardTitle>
              <CardDescription>Only you can see these notes.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Content</Label>
                <Textarea
                  value={individualNote}
                  onChange={(e) => setIndividualNote(e.target.value)}
                  placeholder="Draft your private thoughts here..."
                  className="min-h-[300px] border-[#DCD7CB] focus:ring-[#2D4C3B]"
                />
              </div>
              <Button 
                onClick={saveIndividual} 
                disabled={isSavingIndividual}
                className="w-full bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0]"
              >
                {isSavingIndividual ? "Saving..." : "Save Private Note"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Common Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-[#DCD7CB] shadow-sm">
            <CardHeader className="bg-[#3F6450] text-[#F5F4F0]">
              <CardTitle className="text-xl font-display">Shared Discussion</CardTitle>
              <CardDescription className="text-[#E8E5DC]">Post updates or questions for all partners.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-3">
                <Textarea
                  value={newCommonNote}
                  onChange={(e) => setNewCommonNote(e.target.value)}
                  placeholder="Share something with the team..."
                  className="border-[#DCD7CB] focus:ring-[#2D4C3B]"
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={postCommonNote} 
                    disabled={isPostingCommon || !newCommonNote.trim()}
                    className="bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0]"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Post to Shared Board
                  </Button>
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t border-[#DCD7CB]">
                {commonNotes.length === 0 ? (
                  <div className="text-center py-8 text-[#8C938F] italic">
                    No shared discussions yet. Start one above!
                  </div>
                ) : (
                  commonNotes.map((note) => (
                    <div key={note.id} className="space-y-4">
                      <div className="bg-[#F5F4F0] p-4 rounded-lg border border-[#DCD7CB]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#2D4C3B] text-[#F5F4F0] flex items-center justify-center">
                              <User className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-[#1C1F1D]">{note.author_name}</span>
                          </div>
                          <span className="text-[10px] text-[#8C938F] uppercase">
                            {new Date(note.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[#1C1F1D] whitespace-pre-wrap">{note.content}</p>
                      </div>

                      {/* Replies */}
                      <div className="ml-8 space-y-3">
                        {note.replies.map((reply) => (
                          <div key={reply.id} className="bg-white p-3 rounded-lg border border-[#DCD7CB] text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-[#2D4C3B]">{reply.author_name}</span>
                              <span className="text-[10px] text-[#8C938F]">
                                {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[#5C635F]">{reply.content}</p>
                          </div>
                        ))}

                        {/* Reply Input */}
                        <div className="flex gap-2">
                          <Textarea
                            value={replies[note.id] || ""}
                            onChange={(e) => setReplies(prev => ({ ...prev, [note.id]: e.target.value }))}
                            placeholder="Type a reply..."
                            rows={1}
                            className="min-h-0 py-2 border-[#DCD7CB] text-sm"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => postReply(note.id)}
                            disabled={!replies[note.id]?.trim()}
                            className="text-[#2D4C3B] hover:bg-[#E8E5DC]"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
