import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Camera,
  X,
  RotateCcw,
  Check,
  SwitchCamera,
  FlashlightOff,
  Flashlight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export const CameraCapture = ({ onCapture, onCancel }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [hasZoom, setHasZoom] = useState(false);
  const [maxZoom, setMaxZoom] = useState(1);
  const isMobile = useIsMobile();

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    stopStream();

    try {
      // Check for multiple cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setHasMultipleCameras(videoDevices.length > 1);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Check for torch and zoom capabilities
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities?.() as any;
      
      if (capabilities?.torch) {
        setHasTorch(true);
      }
      
      if (capabilities?.zoom) {
        setHasZoom(true);
        setMaxZoom(capabilities.zoom.max || 1);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setError("Camera access denied. Please allow camera access to scan documents.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError(`Failed to access camera: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, [startCamera, stopStream]);

  const toggleCamera = async () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    
    const videoTrack = streamRef.current.getVideoTracks()[0];
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: !torchOn } as any],
      });
      setTorchOn(!torchOn);
    } catch (err) {
      console.error("Torch toggle failed:", err);
    }
  };

  const handleZoom = async (direction: "in" | "out") => {
    if (!streamRef.current || !hasZoom) return;
    
    const newZoom = direction === "in" 
      ? Math.min(zoomLevel + 0.5, maxZoom) 
      : Math.max(zoomLevel - 0.5, 1);
    
    const videoTrack = streamRef.current.getVideoTracks()[0];
    try {
      await videoTrack.applyConstraints({
        advanced: [{ zoom: newZoom } as any],
      });
      setZoomLevel(newZoom);
    } catch (err) {
      console.error("Zoom failed:", err);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw the video frame
    ctx.drawImage(video, 0, 0);
    
    // Get the image as data URL
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedImage(dataUrl);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const confirmCapture = async () => {
    if (!capturedImage) return;

    // Convert data URL to File
    const response = await fetch(capturedImage);
    const blob = await response.blob();
    const file = new File([blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" });
    
    stopStream();
    onCapture(file);
  };

  const handleCancel = () => {
    stopStream();
    onCancel();
  };

  if (error) {
    return (
      <Card className="p-6 text-center space-y-4">
        <div className="text-destructive">{error}</div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={startCamera}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center space-y-2">
              <Camera className="h-8 w-8 mx-auto animate-pulse text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Starting camera...</p>
            </div>
          </div>
        )}
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${capturedImage ? "hidden" : ""}`}
        />
        
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        )}
        
        <canvas ref={canvasRef} className="hidden" />

        {/* Document guide overlay */}
        {!capturedImage && !isLoading && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-white/50 border-dashed rounded-lg">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                Align document within frame
              </div>
            </div>
          </div>
        )}

        {/* Camera controls overlay */}
        {!capturedImage && !isLoading && (
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {hasMultipleCameras && (
              <Button
                size="icon"
                variant="secondary"
                className="bg-black/50 hover:bg-black/70 text-white"
                onClick={toggleCamera}
              >
                <SwitchCamera className="h-5 w-5" />
              </Button>
            )}
            {hasTorch && (
              <Button
                size="icon"
                variant="secondary"
                className="bg-black/50 hover:bg-black/70 text-white"
                onClick={toggleTorch}
              >
                {torchOn ? (
                  <Flashlight className="h-5 w-5" />
                ) : (
                  <FlashlightOff className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        )}

        {/* Zoom controls */}
        {!capturedImage && !isLoading && hasZoom && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="bg-black/50 hover:bg-black/70 text-white"
              onClick={() => handleZoom("out")}
              disabled={zoomLevel <= 1}
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <span className="bg-black/50 text-white px-2 py-1 rounded text-sm flex items-center">
              {zoomLevel.toFixed(1)}x
            </span>
            <Button
              size="icon"
              variant="secondary"
              className="bg-black/50 hover:bg-black/70 text-white"
              onClick={() => handleZoom("in")}
              disabled={zoomLevel >= maxZoom}
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-4">
        {!capturedImage ? (
          <>
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              size="lg"
              className="rounded-full w-16 h-16"
              onClick={capturePhoto}
              disabled={isLoading}
            >
              <Camera className="h-6 w-6" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={retakePhoto}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button onClick={confirmCapture}>
              <Check className="h-4 w-4 mr-2" />
              Use Photo
            </Button>
          </>
        )}
      </div>

      {isMobile && !capturedImage && (
        <p className="text-center text-sm text-muted-foreground">
          Position the document flat and ensure good lighting for best results
        </p>
      )}
    </div>
  );
};
