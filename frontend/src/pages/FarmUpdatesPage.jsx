import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, Upload, User, Calendar, Loader2, ImageIcon, X } from "lucide-react";
import imageCompression from "browser-image-compression";

const compressImage = async (file) => {
  const options = {
    maxSizeMB: 0.2, // 200KB for better quality than bills
    maxWidthOrHeight: 1280,
    useWebWorker: true,
  };
  try {
    const compressedFile = await imageCompression(file, options);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => resolve(reader.result);
    });
  } catch (error) {
    console.error("Image compression error:", error);
    return null;
  }
};

export default function FarmUpdatesPage() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const LIMIT = 2;

  const [newImage, setNewImage] = useState(null);
  const [newNote, setNewNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const loadUpdates = useCallback(async (reset = false) => {
    setLoading(true);
    const currentSkip = reset ? 0 : skip;
    try {
      const res = await api.get(`/farm-updates?skip=${currentSkip}&limit=${LIMIT}`);
      if (reset) {
        setUpdates(res.data);
        setSkip(LIMIT);
      } else {
        setUpdates(prev => [...prev, ...res.data]);
        setSkip(prev => prev + LIMIT);
      }
      if (res.data.length < LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (e) {
      toast.error("Failed to load updates");
    } finally {
      setLoading(false);
    }
  }, [skip]);

  useEffect(() => {
    loadUpdates(true);
  }, [loadUpdates]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const base64 = await compressImage(file);
    if (base64) {
      setNewImage(base64);
    } else {
      toast.error("Failed to process image");
    }
    setIsUploading(false);
  };

  const handleUpload = async () => {
    if (!newImage) return;
    setIsUploading(true);
    try {
      await api.post("/farm-updates", { image: newImage, note: newNote });
      toast.success("Farm update posted!");
      setNewImage(null);
      setNewNote("");
      loadUpdates(true);
    } catch (e) {
      toast.error("Failed to post update");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-black text-[#1C1F1D] tracking-tighter mb-2">
            Family Updates
          </h1>
          <p className="text-[#5C635F]">Family updates and notes.</p>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="border-[#DCD7CB] shadow-sm">
        <CardHeader className="bg-[#E8E5DC]/50">
          <CardTitle className="text-xl font-display flex items-center gap-2">
            <Camera className="w-5 h-5" /> Post an Update
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Update Photo</Label>
              {newImage ? (
                <div className="relative aspect-video border border-[#DCD7CB] rounded-lg overflow-hidden group">
                  <img src={newImage} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setNewImage(null)}
                    className="absolute top-2 right-2 bg-white/90 rounded-full p-2 shadow-sm hover:text-[#C35A42] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-[#DCD7CB] rounded-lg cursor-pointer hover:bg-[#F5F4F0] transition-colors group">
                  <div className="text-center space-y-2">
                    <ImageIcon className="w-10 h-10 text-[#8C938F] mx-auto group-hover:text-[#2D4C3B] transition-colors" />
                    <div className="text-sm text-[#5C635F]">
                      <span className="font-bold text-[#2D4C3B]">Click to upload</span> or drag and drop
                    </div>
                    <div className="text-xs text-[#8C938F]">PNG, JPG up to 10MB</div>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              )}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Note / Description</Label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="What's happening in the family??"
                  className="w-full h-[120px] p-3 rounded-md border border-[#DCD7CB] focus:ring-2 focus:ring-[#2D4C3B] transition-all text-sm outline-none resize-none"
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={isUploading || !newImage}
                className="w-full bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0] h-12"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Post Update
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      <div className="space-y-8">
        {updates.map((update) => (
          <Card key={update.id} className="border-[#DCD7CB] shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="aspect-video w-full bg-[#E8E5DC]">
              <img 
                src={update.image} 
                alt="Farm Update" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#3F6450] text-[#F5F4F0] flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-[#1C1F1D]">{update.author_name}</div>
                    <div className="text-xs text-[#8C938F]">Partner</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[#5C635F] text-sm bg-[#F5F4F0] px-3 py-1.5 rounded-full">
                  <Calendar className="w-4 h-4" />
                  {new Date(update.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              {update.note && (
                <p className="text-[#1C1F1D] text-lg leading-relaxed whitespace-pre-wrap italic font-display border-l-4 border-[#3F6450] pl-4">
                  "{update.note}"
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {updates.length === 0 && !loading && (
          <div className="text-center py-20 bg-white rounded-lg border border-[#DCD7CB] border-dashed">
            <ImageIcon className="w-12 h-12 text-[#DCD7CB] mx-auto mb-4" />
            <p className="text-[#5C635F]">No updates yet.</p>
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => loadUpdates()}
              disabled={loading}
              className="px-8 border-[#2D4C3B] text-[#2D4C3B] hover:bg-[#E8E5DC]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More Updates"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
