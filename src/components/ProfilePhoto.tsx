"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";
import { API_ORIGIN, authFetch } from "@/lib/api";

interface ProfilePhotoProps {
  token: string;
  existingImage?: string | null;
  onUploadSuccess?: (imageUrl: string) => void;
  initials?: string;
}

export default function ProfilePhoto({ token, existingImage, onUploadSuccess, initials = "US" }: ProfilePhotoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [image, setImage] = useState(existingImage || null);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setImage(existingImage || null);
  }, [existingImage]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOpen || !video || !stream) return;

    video.srcObject = stream;

    const startPlayback = async () => {
      try {
        await video.play();
      } catch {
        video.play().catch(() => {});
      }
    };

    const onLoadedMetadata = () => {
      startPlayback();
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    startPlayback();

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [cameraOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  const openCamera = async () => {
    setCameraError(null);
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setCameraError("Camera requires localhost/127.0.0.1 over a secure context.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not supported on this device/browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      console.error("Camera access failed", error);
      setCameraError("Could not access camera. Please allow permission.");
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("Unable to capture image.");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });
    if (!blob) {
      setCameraError("Could not process captured photo.");
      return;
    }
    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
    stopCamera();
    await uploadImage(file);
  };

  const uploadImage = async (file: File | null) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const res = await authFetch(`${API_ORIGIN}/users/upload-profile-image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || "Upload failed");
      }

      const data = await res.json();
      setImage(data.image_url);
      if (onUploadSuccess) {
        onUploadSuccess(data.image_url);
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert(err instanceof Error ? err.message : "Failed to upload photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const imageSrc = image
    ? image.startsWith("http://") || image.startsWith("https://")
      ? image
      : `${API_ORIGIN}/${image}`
    : null;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* PROFILE IMAGE CONTAINER */}
      <div className="relative group">
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#4DA3FF] to-[#7CC4FF] flex items-center justify-center shadow-[0_0_30px_rgba(77,163,255,0.3)] overflow-hidden border-4 border-[#121A2F] relative">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Profile"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-[#0A0F1F] bg-[#4DA3FF]/20">
              {initials}
            </div>
          )}
          
          {loading && (
            <div className="absolute inset-0 bg-[#0A0F1F]/60 backdrop-blur-sm flex items-center justify-center z-10">
              <Loader2 className="w-8 h-8 text-[#4DA3FF] animate-spin" />
            </div>
          )}
        </div>

        {/* OVERLAY CAMERA BUTTON */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-1 right-1 bg-[#4DA3FF] text-[#0A0F1F] p-2.5 rounded-full shadow-lg hover:bg-[#7CC4FF] transition-all transform hover:scale-110 active:scale-95 z-20 border-2 border-[#121A2F]"
          title="Change Photo"
        >
          <Camera size={18} />
        </button>
      </div>

      {/* HIDDEN INPUTS */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => uploadImage(e.target.files?.[0] || null)}
      />

      {/* ACTIONS */}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#121A2F] hover:bg-[#1A2540] text-white border border-[#4DA3FF]/30 hover:border-[#4DA3FF] rounded-xl transition-all font-bold text-sm shadow-md"
        >
          <Upload size={16} className="text-[#4DA3FF]" />
          Upload Photo
        </button>

        <button
          onClick={openCamera}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] rounded-xl hover:shadow-[0_0_20px_rgba(77,163,255,0.4)] transition-all font-black text-sm shadow-md"
        >
          <Camera size={16} />
          Take Photo
        </button>
      </div>

      {cameraOpen && (
        <div className="w-full max-w-sm rounded-2xl border border-[#4DA3FF]/30 bg-[#0A0F1F]/80 p-3 space-y-3">
          <video ref={videoRef} className="w-full rounded-xl bg-black" autoPlay playsInline muted />
          <div className="flex gap-2">
            <button
              onClick={capturePhoto}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-[#4DA3FF] text-[#0A0F1F] font-bold"
            >
              Capture & Upload
            </button>
            <button
              onClick={stopCamera}
              className="flex-1 px-4 py-2 rounded-lg border border-[#A0AEC0]/30 text-[#A0AEC0] font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {cameraError && <p className="text-red-400 text-xs font-semibold">{cameraError}</p>}

      {loading && (
        <p className="text-[#4DA3FF] text-xs font-bold animate-pulse tracking-widest uppercase">
          Processing secure upload...
        </p>
      )}
    </div>
  );
}
