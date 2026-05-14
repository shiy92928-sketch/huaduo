import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { HandState } from './store';

export default function HandTracker() {
  const videoRef = useRef<Webcam>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let landmarker: HandLandmarker | null = null;
    let requestRef: number;
    let lastPinchTime = 0;
    
    async function initHandTracking() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm'
        );
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        setIsLoaded(true);
        startDetection();
      } catch (error) {
        console.error('Error loading mediapipe', error);
      }
    }

    const startDetection = () => {
      if (!landmarker || !videoRef.current || !videoRef.current.video) return;
      const video = videoRef.current.video;

      if (video.readyState >= 2) {
        const results = landmarker.detectForVideo(video, performance.now());
        
        HandState.camWidth = video.videoWidth;
        HandState.camHeight = video.videoHeight;

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          
          // Thumb tip: 4, Index tip: 8
          const thumb = landmarks[4];
          const index = landmarks[8];
          
          // We mirror X because webcam is mirrored visually
          // X and Y are 0-1 values.
          const x = 1 - (thumb.x + index.x) / 2;
          const y = (thumb.y + index.y) / 2;
          
          HandState.x = x;
          HandState.y = y;

          // Compute aspect-corrected distance
          const dx = (thumb.x - index.x);
          const dy = (thumb.y - index.y);
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Pinch logic
          if (distance < 0.04) {
            if (!HandState.isPinching && performance.now() - lastPinchTime > 500) {
              HandState.isPinching = true;
              HandState.pinchPulsed = true;
              lastPinchTime = performance.now();
            }
          } else if (distance > 0.06) {
            HandState.isPinching = false;
          }
        } else {
          // Hand lost
          HandState.x = -999;
          HandState.y = -999;
          HandState.isPinching = false;
        }
      }
      
      requestRef = requestAnimationFrame(startDetection);
    };

    initHandTracking();

    return () => {
      cancelAnimationFrame(requestRef);
      if (landmarker) landmarker.close();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <div className="relative overflow-hidden rounded-xl border border-white/20 shadow-2xl backdrop-blur-md">
        <Webcam
          ref={videoRef}
          mirrored
          className="h-32 w-48 object-cover opacity-80"
          videoConstraints={{
            facingMode: 'user',
            width: 640,
            height: 480,
          }}
        />
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white">
            Loading AI...
          </div>
        )}
      </div>
      <div className="text-right text-xs font-mono text-white/50 tracking-widest backdrop-blur-sm rounded px-2 py-1">
        PINCH TO GROW
      </div>
    </div>
  );
}
