"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, CirclePause, CirclePlay, CircleStop } from "lucide-react";


export default function VoiceRecorder({
  onRecordingComplete,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const sendRecording = () => {
    if (audioUrl) {
      fetch(audioUrl)
        .then((res) => res.blob())
        .then((blob) => {
          onRecordingComplete(blob);
          setAudioUrl(null);
        });
    }
  };

  const cancelRecording = () => {
    setAudioUrl(null);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Start recording"
        >
          <Mic className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="rounded-full p-2 bg-red-500 text-white hover:bg-red-600 transition-colors animate-pulse"
          aria-label="Stop recording"
        >
          <CircleStop className="h-5 w-5" />
        </button>
      )}

      {audioUrl && (
        <div className="flex items-center gap-2">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            hidden
          />
          <button
            onClick={togglePlayback}
            className="rounded-full p-2 bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            aria-label={isPlaying ? "Pause playback" : "Play recording"}
          >
            {isPlaying ? (
              <CirclePause className="h-5 w-5" />
            ) : (
              <CirclePlay className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={sendRecording}
            className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm font-medium"
          >
            Send
          </button>
          <button
            onClick={cancelRecording}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}