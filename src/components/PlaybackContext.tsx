import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';

// Types for the video and playback state
type DownloadedVideo = {
  id: number;
  videoId: string;
  title: string;
  artist?: string;
  thumbnailUrl?: string;
  downloadedAt: string;
  format: string;
  [key: string]: any;
};

interface PlaybackContextProps {
  selectedVideo: DownloadedVideo | null;
  setSelectedVideo: (video: DownloadedVideo | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  videoQueue: DownloadedVideo[];
  setVideoQueue: (queue: DownloadedVideo[]) => void;
  currentIndex: number;
  setCurrentIndex: (idx: number) => void;
  playlist: DownloadedVideo[];
  setPlaylist: (list: DownloadedVideo[]) => void;
  handlePlayVideo: (video: DownloadedVideo) => Promise<void>;
  handleNext: () => Promise<void>;
  handlePrevious: () => Promise<void>;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const PlaybackContext = createContext<PlaybackContextProps | undefined>(undefined);

export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
};

export const PlaybackProvider = ({ children }: { children: ReactNode }) => {
  // State management
  const [selectedVideo, setSelectedVideo] = useState<DownloadedVideo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoQueue, setVideoQueue] = useState<DownloadedVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playlist, setPlaylist] = useState<DownloadedVideo[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Placeholder playback logic (to be replaced with real logic from MusicTab)
  const handlePlayVideo = async (video: DownloadedVideo) => {
    setSelectedVideo(video);
    setIsPlaying(true);
    // Additional logic can be added here
  };

  const handleNext = async () => {
    // Placeholder: advance index and play next
    if (playlist.length > 0) {
      const nextIndex = (currentIndex + 1) % playlist.length;
      setCurrentIndex(nextIndex);
      setSelectedVideo(playlist[nextIndex]);
      setIsPlaying(true);
    }
  };

  const handlePrevious = async () => {
    // Placeholder: go to previous
    if (playlist.length > 0) {
      const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
      setCurrentIndex(prevIndex);
      setSelectedVideo(playlist[prevIndex]);
      setIsPlaying(true);
    }
  };

  return (
    <PlaybackContext.Provider
      value={{
        selectedVideo,
        setSelectedVideo,
        isPlaying,
        setIsPlaying,
        videoQueue,
        setVideoQueue,
        currentIndex,
        setCurrentIndex,
        playlist,
        setPlaylist,
        handlePlayVideo,
        handleNext,
        handlePrevious,
        videoRef,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
};
