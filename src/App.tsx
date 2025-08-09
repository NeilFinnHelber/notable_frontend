import { Redirect, Route } from "react-router-dom";
import { IonApp, IonRouterOutlet, setupIonicReact, IonSplitPane, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonMenuToggle, IonAvatar, IonText, IonButton, IonSpinner, IonLabel, IonThumbnail, IonImg, IonModal, IonButtons, IonInput, useIonToast } from "@ionic/react";
import React from "react";
import { IonReactRouter } from "@ionic/react-router";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Menu from "./pages/Menu";
import authConfig from "./auth_config";
import { MindmapFolder } from "./pages/MindmapFolder";
import { homeOutline, settingsOutline, musicalNoteOutline, playSkipBackOutline, playSkipForwardOutline, pauseOutline, playOutline, personOutline, peopleOutline, folderOutline, chevronUpOutline, chevronDownOutline, closeOutline, copyOutline, fileTrayFullOutline, analyticsOutline, calculatorOutline, refreshOutline, pencilOutline, lockClosedOutline } from 'ionicons/icons';
import { useState, useRef, useEffect } from 'react';

// Extend Window interface to include our global functions and unlockFolderRequest
declare global {
  interface Window {
    refreshSharedFolders: (userId: string) => Promise<void>;
    openFolderEditModal: (folder: any) => void;
    setSelectedFolder: (folder: any) => void;
    checkFolderPassword: (folder: any, intent: 'view' | 'edit') => void;
    unlockFolderRequest?: { folderId: string; intent: 'view' | 'edit' };
  }
}
import { PlaybackProvider } from './components/PlaybackContext';
import MiniPlayer from './components/MiniPlayer';
import { getUserConfig, updateUserTheme, getSharedFolders } from './pages/apiService';
import { ThemeModal } from './components/ThemeModal';
import { ThemeName, themes, applyTheme } from './themeColors';
import { setAuth0TokenGetter } from './utils/api';

// API URL constant
const apiUrl = 'https://localhost:7281/notes/api/v1/';

/* Ionic CSS */
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";
import "@ionic/react/css/palettes/dark.system.css";

/* Theme */
import "./theme/variables.css";
import "./theme/customTheme.css";

setupIonicReact();

import { RouteComponentProps } from "react-router-dom";
import List from "./pages/List";
import Folder from "./pages/Folder"; 
import OrganizerFolder from "./pages/OrganizerFolder";
import CalcFolder from "./pages/calcFolder"; // Ensured casing
import MusicTab from "./pages/MusicTab";
import { UserProfile } from './components/UserProfile';
// Removed incorrect import of 'list' as it is not a React component.

const ProtectedRoute: React.FC<{ component: React.ComponentType<RouteComponentProps>; path: string; exact?: boolean }> = ({ component: Component, ...rest }) => {
  const { isAuthenticated, isLoading } = useAuth0();

if (isLoading) return isAuthenticated;

return (
  <Route
    {...rest}
    render={(props) =>
      isAuthenticated ? <Component {...props} /> : <Redirect to="/" />
    }
  />
);
};

// Add TypeScript declarations for the global functions
declare global {
  interface Window {
    setMediaPlayerState: (video: any, playing: boolean) => void;
    handlePlayPause: () => void;
    handleNext: () => void;
    handlePrevious: () => void;
    refreshSharedFolders: (userId: string) => Promise<void>;
  }
}

// Initialize global functions with no-op implementations
window.setMediaPlayerState = () => {};
window.handlePlayPause = () => {};
window.handleNext = () => {};
window.handlePrevious = () => {};
window.refreshSharedFolders = async () => {};

const PersistentMediaPlayer: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize video element
  useEffect(() => {
    if (!videoRef.current || isInitializedRef.current) return;

    const video = videoRef.current;
    video.preload = 'auto';
    video.playsInline = true;
    isInitializedRef.current = true;

    return () => {
      isInitializedRef.current = false;
    };
  }, []);

  // Format time in MM:SS format
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle video playback control functions
  useEffect(() => {
    // Play/pause function
    const playPause = async () => {
      if (!videoRef.current) return;

      try {
        if (isPlaying) {
          await videoRef.current.pause();
          setIsPlaying(false);
        } else {
          if (playPromiseRef.current) {
            await playPromiseRef.current;
          }
          playPromiseRef.current = videoRef.current.play();
          await playPromiseRef.current;
          setIsPlaying(true);
          setVideoError(null);
        }
      } catch (error) {
        console.error('Error playing/pausing video:', error);
        setVideoError('Failed to play video. Please try again.');
        setIsPlaying(false);
      }
    };

    // Next function implementation
    const next = async () => {
      if (playlist.length === 0 || currentIndex === -1) return;
      
      const nextIndex = (currentIndex + 1) % playlist.length;
      const nextVideo = playlist[nextIndex];
      
      if (nextVideo) {
        setCurrentIndex(nextIndex);
        await window.setMediaPlayerState(nextVideo, true);
      }
    };

    // Previous function implementation
    const previous = async () => {
      if (playlist.length === 0 || currentIndex === -1) return;
      
      const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
      const prevVideo = playlist[prevIndex];
      
      if (prevVideo) {
        setCurrentIndex(prevIndex);
        await window.setMediaPlayerState(prevVideo, true);
      }
    };

    // Assign the functions to the global window object
    window.handlePlayPause = playPause;
    window.handleNext = next;
    window.handlePrevious = previous;

    // Function to set media player state
    window.setMediaPlayerState = async (video: any, playing: boolean) => {
      if (!videoRef.current) {
        console.error('Video element not found');
        return;
      }

      try {
        // Update playlist if needed
        const videoExists = playlist.some(v => v.id === video.id);
        if (!videoExists) {
          const newPlaylist = [...playlist, video];
          setPlaylist(newPlaylist);
          setCurrentIndex(newPlaylist.length - 1);
        } else {
          setCurrentIndex(playlist.findIndex(v => v.id === video.id));
        }

        // Set the selected video
        setSelectedVideo(video);
        setIsLoadingVideo(true);
        setVideoError(null);

        // Construct the video URL
        const videoUrl = `https://localhost:7281/notes/api/v1/videos/${video.id}/stream`;
        
        // Set video source directly
        videoRef.current.src = videoUrl;
        
        // Wait for the video to be loaded
        await new Promise((resolve) => {
          const handleCanPlay = () => {
            videoRef.current?.removeEventListener('canplay', handleCanPlay);
            resolve(true);
          };
          videoRef.current?.addEventListener('canplay', handleCanPlay);
          videoRef.current?.load();
        });
        
        // If playing is true, try to play the video when it's ready
        if (playing) {
          try {
            if (playPromiseRef.current) {
              await playPromiseRef.current;
            }
            playPromiseRef.current = videoRef.current.play();
            await playPromiseRef.current;
            setIsPlaying(true);
          } catch (playError) {
            console.error('Error playing video:', playError);
            setVideoError('Failed to play video. Please try again.');
            setIsPlaying(false);
          }
        } else {
          setIsPlaying(false);
        }
        setIsLoadingVideo(false);
      } catch (error) {
        console.error('Error setting video source:', error);
        setVideoError('Failed to load video. Please try again.');
        setIsPlaying(false);
        setIsLoadingVideo(false);
      }
    };

    return () => {
      // Clean up function
      window.handlePlayPause = () => {};
      window.handleNext = () => {};
      window.handlePrevious = () => {};
      window.setMediaPlayerState = () => {};
    };
  }, [playlist, currentIndex, isPlaying]);

  // Update progress bar and handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Handle time updates
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    // Handle duration change
    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    // Handle when data is loaded
    const handleLoadedData = () => {
      setIsLoadingVideo(false);
      setVideoError(null);
    };

    // Handle errors
    const handleError = () => {
      const error = video.error;
      let errorMessage = 'Failed to load video';
      
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Video playback was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading video';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Error decoding video';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video format not supported';
            break;
        }
      }
      
      console.error('Video error:', errorMessage);
      setVideoError(errorMessage);
      setIsPlaying(false);
      setIsLoadingVideo(false);
    };

    // Add event listeners
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('ended', () => {
      setIsPlaying(false);
      window.handleNext();
    });
    video.addEventListener('pause', () => setIsPlaying(false));
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('waiting', () => setIsLoadingVideo(true));
    video.addEventListener('playing', () => setIsLoadingVideo(false));

    return () => {
      // Remove event listeners on cleanup
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ended', () => {});
      video.removeEventListener('pause', () => {});
      video.removeEventListener('play', () => {});
      video.removeEventListener('waiting', () => {});
      video.removeEventListener('playing', () => {});
    };
  }, []);

  // Handle seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newTime = parseFloat(e.target.value);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Don't render anything if no video is selected
  if (!selectedVideo) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'var(--ion-color-light)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      boxShadow: '0 -2px 4px rgba(0,0,0,0.1)',
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <IonThumbnail style={{ minWidth: '64px', minHeight: '64px' }}>
          <IonImg 
            src={selectedVideo.thumbnailUrl?.startsWith('http') ? selectedVideo.thumbnailUrl : `https://localhost:7281/notes/api/v1/videos/${selectedVideo.id}/thumbnail`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.src = 'https://via.placeholder.com/64x64?text=No+Thumbnail';
            }}
          />
        </IonThumbnail>
        <div style={{ flex: 1, minWidth: 0 }}>
          <IonText>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{selectedVideo.title}</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--ion-color-medium)' }}>
              {selectedVideo.format?.toUpperCase()} • Downloaded on {new Date(selectedVideo.downloadedAt).toLocaleDateString()}
            </p>
            {isLoadingVideo && (
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--ion-color-primary)' }}>
                Loading video...
              </p>
            )}
            {videoError && (
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--ion-color-danger)' }}>
                {videoError}
              </p>
            )}
          </IonText>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IonButton fill="clear" onClick={() => window.handlePrevious()}>
            <IonIcon icon={playSkipBackOutline} slot="icon-only" />
          </IonButton>
          <IonButton fill="clear" onClick={() => window.handlePlayPause()}>
            {isLoadingVideo ? (
              <IonSpinner name="dots" />
            ) : (
              <IonIcon icon={isPlaying ? pauseOutline : playOutline} slot="icon-only" />
            )}
          </IonButton>
          <IonButton fill="clear" onClick={() => window.handleNext()}>
            <IonIcon icon={playSkipForwardOutline} slot="icon-only" />
          </IonButton>
        </div>
      </div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '0 16px',
        position: 'relative'
      }}>
        <span style={{ 
          fontSize: '0.8rem', 
          color: 'var(--ion-color-medium)',
          minWidth: '45px',
          textAlign: 'right'
        }}>
          {formatTime(currentTime)}
        </span>
        <div style={{
          flex: 1,
          height: '4px',
          backgroundColor: 'var(--ion-color-medium)',
          borderRadius: '2px',
          position: 'relative',
          cursor: 'pointer'
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progress}%`,
            backgroundColor: 'var(--ion-color-primary)',
            borderRadius: '2px',
            transition: 'width 0.1s linear'
          }} />
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              margin: 0,
              padding: 0
            }}
          />
        </div>
        <span style={{ 
          fontSize: '0.8rem', 
          color: 'var(--ion-color-medium)',
          minWidth: '45px'
        }}>
          {formatTime(duration)}
        </span>
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, display: selectedVideo ? 'block' : 'none' }}>
        <video
          ref={videoRef}
          style={{ display: 'none' }}
          onEnded={() => window.handleNext()}
          playsInline
          preload="auto"
        />
      </div>
    </div>
  );
};

// Helper function to process text with hashtags and return segments
const processHashtags = (text: string): { text: string; isHashtagged: boolean; isDoubleHashtag: boolean; hashtagIndex: number }[] => {
  if (!text) return [];
  
  const segments: { text: string; isHashtagged: boolean; isDoubleHashtag: boolean; hashtagIndex: number }[] = [];
  let currentText = '';
  let inHashtag = false;
  let inDoubleHashtag = false;
  let currentHashtag = '';
  let hashtagCount = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '#' && nextChar === '#' && !inHashtag) {
      // Start of double hashtag
      if (currentText) {
        segments.push({ text: currentText, isHashtagged: false, isDoubleHashtag: false, hashtagIndex: -1 });
        currentText = '';
      }
      inHashtag = true;
      inDoubleHashtag = true;
      currentHashtag = '##';
      i++; // Skip the next #
    } else if (char === '#' && !inHashtag) {
      // Start of single hashtag
      if (currentText) {
        segments.push({ text: currentText, isHashtagged: false, isDoubleHashtag: false, hashtagIndex: -1 });
        currentText = '';
      }
      inHashtag = true;
      inDoubleHashtag = false;
      currentHashtag = '#';
    } else if (inHashtag && ((inDoubleHashtag && char === '#' && nextChar === '#') || 
                            (!inDoubleHashtag && char === '#'))) {
      // End of hashtag
      currentHashtag += char;
      if (inDoubleHashtag) {
        currentHashtag += text[++i]; // Add the second # and increment i
      }
      segments.push({ 
        text: currentHashtag, 
        isHashtagged: true, 
        isDoubleHashtag: inDoubleHashtag, 
        hashtagIndex: hashtagCount++ 
      });
      currentHashtag = '';
      inHashtag = false;
      inDoubleHashtag = false;
    } else if (inHashtag) {
      currentHashtag += char;
    } else {
      currentText += char;
    }
  }
  
  // Add any remaining text
  if (currentText) {
    segments.push({ text: currentText, isHashtagged: false, isDoubleHashtag: false, hashtagIndex: -1 });
  } else if (currentHashtag) {
    // Handle unclosed hashtag
    segments.push({ 
      text: currentHashtag, 
      isHashtagged: true, 
      isDoubleHashtag: inDoubleHashtag, 
      hashtagIndex: hashtagCount++ 
    });
  }
  
  return segments;
};

// Helper function to extract text between hashtags
const extractTextFromHashtags = (text: string): string => {
  // Handle both single (#text#) and double (##text##) hashtags in one pass
  return text.replace(/#{1,2}([^#]+)#{1,2}/g, '$1');
};

// Helper function to render text with hashtags (without showing the # characters)
const renderTextWithHashtags = (text: string, parentColor?: string, isStandardCard?: boolean) => {
  if (!text) return null;
  
  const segments = processHashtags(text);
  const totalHashtags = segments.filter(s => s.isHashtagged).length;
  
  if (segments.length === 0) {
    return <span style={{ display: 'inline' }}>{text}</span>;
  }
  
  const getHashtagColor = (segment: { isHashtagged: boolean; isDoubleHashtag: boolean }) => {
    if (!segment.isHashtagged) return null;
    
    // Double hashtags (##text##) get violet or dark blue
    if (segment.isDoubleHashtag) {
      // If the note/folder has tertiary color, use dark blue, otherwise violet
      if (parentColor === 'tertiary') {
        return '#00008B'; // Dark blue
      } else {
        return '#6b46c1'; // Violet
      }
    }
    
    // Single hashtags (#text#) get green or red
    
    // If parent is green (success), use red for single hashtag
    if (parentColor === 'success') {
      return 'var(--ion-color-danger)'; // Red color
    }
    
    // If there are two or more single hashtags, still use green
    if (totalHashtags >= 2) {
      return 'var(--ion-color-success)'; // Green color
    }
    
    // Default case - single hashtag in non-green parent
    return 'var(--ion-color-success)'; // Green color
  };
  
  return (
    <span style={{ display: 'inline', position: 'relative' }}>
      {segments.map((segment, index) => {
        if (segment.isHashtagged) {
          const textBetweenHashtags = extractTextFromHashtags(segment.text);
          const color = getHashtagColor(segment);
          
          return (
            <span 
              key={index}
              style={{
                display: 'inline',
                position: 'relative',
                zIndex: 1,
                color: color || undefined,
                all: 'unset',
                WebkitTextFillColor: color || undefined
              }}
            >
              {textBetweenHashtags}
            </span>
          );
        } else {
          return (
            <span 
              key={index}
              style={{
                display: 'inline',
                color: isStandardCard ? 'var(--ion-text-color)' : 
                  (parentColor ? `var(--ion-color-${parentColor})` : 'inherit')
              }}
            >
              {segment.text}
            </span>
          );
        }
      })}
    </span>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth0();
  const [userConfig, setUserConfig] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [presentToast] = useIonToast();
  
  // Function to refresh shared folders
  const refreshSharedFolders = async (userId: string) => {
    if (!userId) return;
    
    try {
      const sharedFoldersData = await getSharedFolders(userId);
      console.log('Refreshed shared folders:', sharedFoldersData);
      setSharedFolders(sharedFoldersData);
    } catch (error) {
      console.error('Error refreshing shared folders:', error);
    }
  };
  
  // Helper function to determine the route for a folder based on its type
  const getRouteForFolder = (folder: any) => {
    if (!folder || !folder.name) return '/app/list';
    
    if (folder.folder_type === 2) {
      return `/app/organizerfolder/${encodeURIComponent(folder.name)}`;
    } else if (folder.folder_type === 3) {
      return `/app/mindmapfolder/${encodeURIComponent(folder.name)}`;
    } else if (folder.folder_type === 5) {
      return `/app/calcfolder/${encodeURIComponent(folder.name)}`;
    } else {
      return `/app/folder/${encodeURIComponent(folder.name)}`;
    }
  };

  // Make refreshSharedFolders and openFolderEditModal available globally
  useEffect(() => {
    if (window && user?.sub) {
      // Global function to refresh shared folders
      window.refreshSharedFolders = async () => {
        console.log('Refreshing shared folders from global function');
        await refreshSharedFolders(user.sub || ''); // Add empty string fallback to avoid undefined
      };
      
      // Global function to open folder edit modal
      window.openFolderEditModal = (folder: any) => {
        // If no folder, do nothing
        if (!folder) {
          console.error('Cannot open folder edit modal: folder is null');
          return;
        }
        
        // Log the folder being edited
        console.log('Opening edit modal for folder:', folder);
        
        // For both password-protected and regular folders, use setSelectedFolder
        // The List component will handle the password check internally
        if (window.setSelectedFolder) {
          window.setSelectedFolder(folder);
        } else {
          console.error('Cannot open folder edit modal: setSelectedFolder not available');
        }
      };
    }
    
    return () => {
      // Reset to no-op on cleanup
      window.refreshSharedFolders = async () => {};
      window.openFolderEditModal = () => {};
    };
  }, [user?.sub]);

  // Fetch user config and shared folders from backend when authenticated
  useEffect(() => {
    const fetchUserData = async () => {
      if (isAuthenticated && user?.sub) {
        setIsLoadingProfile(true);
        try {
          // Get user config from backend
          let config = await getUserConfig(user.sub);
          
          // Fetch all users for co-worker display
          const baseUrl = apiUrl.replace('/notes/api/v1/', '');
          const allUsersResponse = await fetch(`${baseUrl}/config/api/v1/users`, {
            headers: { 'Accept': 'application/json' }
          });
          
          if (allUsersResponse.ok) {
            const users = await allUsersResponse.json();
            setAllUsers(users);
            console.log('Fetched all users for co-worker display:', users.length);
          }
          
          // If config doesn't exist or is missing data, update it with OAuth data
          if (!config) {
            console.log('No user config found, will be created when visiting profile page');
          } else {
            // Check if we need to update missing fields with OAuth data
            let configUpdated = false;
            const baseUrl = apiUrl.replace('/notes/api/v1/', '');
            
            // If username is missing, use OAuth name
            if (!config.username && user.name) {
              console.log('Username missing in config, updating with OAuth name');
              await fetch(`${baseUrl}/config/api/v1/${user.sub}/username`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user.name)
              });
              config.username = user.name;
              configUpdated = true;
            }
            
            // If image is missing, use OAuth picture
            if (!config.image_url && user.picture) {
              console.log('Image URL missing in config, updating with OAuth picture');
              await fetch(`${baseUrl}/config/api/v1/${user.sub}/image`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user.picture)
              });
              config.image_url = user.picture;
              configUpdated = true;
            }
            
            // If theme is missing, use the current selected theme
            if (!config.theme && selectedTheme) {
              console.log('Theme missing in config, updating with current theme:', selectedTheme);
              await updateUserTheme(user.sub, selectedTheme);
              config.theme = selectedTheme;
              configUpdated = true;
            }
            
            // If we updated the config, refresh it
            if (configUpdated) {
              console.log('Config was updated with OAuth data, refreshing...');
              config = await getUserConfig(user.sub);
            }
            
            // Load shared folders and folders with co-workers using the new getSharedFolders function
            try {
              // Use our new function that handles both null coordinates and co-workers
              const sharedFoldersData = await getSharedFolders(user.sub);
              console.log('Loaded shared folders:', sharedFoldersData);
              setSharedFolders(sharedFoldersData);
            } catch (folderError) {
              console.error('Error loading shared folders:', folderError);
              setSharedFolders([]);
            }
          }
          
          setUserConfig(config);
          
          // Apply theme from backend if available
          if (config && config.theme && Object.keys(themes).includes(config.theme)) {
            console.log('Applying theme from backend:', config.theme);
            setSelectedTheme(config.theme as ThemeName);
            localStorage.setItem('notable-theme', config.theme);
          }
          
          console.log('Loaded user config:', config);
        } catch (error) {
          console.error('Error loading user config:', error);
        } finally {
          setIsLoadingProfile(false);
        }
      }
    };
    
    fetchUserData();
  }, [isAuthenticated, user]);

  const paths = [
    { name: "Home", url: "/app", icon: homeOutline },
    { name: "Media", url: "/app/media", icon: musicalNoteOutline },

  ];
  
  // State for modals
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [showAddCoWorkerModal, setShowAddCoWorkerModal] = useState<boolean>(false);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(() => {
    // Try to load from localStorage, fallback to 'arcticFox'
    const stored = localStorage.getItem('notable-theme');
    // Check if the stored theme is one of our valid animal themes
    if (stored && Object.keys(themes).includes(stored)) {
      return stored as ThemeName;
    }
    // Map old theme names to new animal-themed names
    if (stored === 'light') return 'arcticFox';
    if (stored === 'dark') return 'darkFox';
    if (stored === 'solarized') return 'redFox';
    if (stored === 'ocean') return 'corsacFox';
    // Default to darkFox if no valid theme is found
    return 'arcticFox';
  });
  const [sharedFoldersExpanded, setSharedFoldersExpanded] = useState<boolean>(false);
  
  // State for profile editing
  const [newUsername, setNewUsername] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // State for co-worker management
  const [coWorkerKey, setCoWorkerKey] = useState<string>('');
  const [coWorkerStatus, setCoWorkerStatus] = useState<string>('');
  
  // State for shared folders
  const [sharedFolders, setSharedFolders] = useState<any[]>([]);

  // Apply theme whenever selectedTheme changes
  useEffect(() => {
    applyTheme(themes[selectedTheme], selectedTheme);
    localStorage.setItem('notable-theme', selectedTheme);
    
    // Save theme to backend if user is authenticated
    if (isAuthenticated && user?.sub) {
      console.log('[DEBUG] About to call updateUserTheme', { userId: user.sub, selectedTheme });
      updateUserTheme(user.sub, selectedTheme)
        .then(() => {
          console.log('Theme preference saved to backend:', selectedTheme);
        })
        .catch(error => {
          console.error('Failed to save theme preference to backend:', error);
        });
    }
  }, [selectedTheme, isAuthenticated, user]);

  return (
    <PlaybackProvider>
      <MiniPlayer />
      <IonApp>
        <IonReactRouter>
          <IonSplitPane contentId="main" when={false}>
            <IonMenu contentId="main" type="overlay">
            <IonContent>
              {/* User Profile Section at the very top of the menu sidebar */}
              {isAuthenticated && user && (
                <div style={{
                  padding: "28px 16px 16px 16px",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                  background: "linear-gradient(90deg, var(--ion-color-primary-shade) 60%, var(--ion-color-primary))",
                  color: "white",
                  marginBottom: 12
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <IonAvatar style={{ width: 64, height: 64, border: "2.5px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.09)" }}>
                      {isLoadingProfile ? (
                        <IonSpinner name="crescent" />
                      ) : (
                        <img 
                          src={userConfig?.image_url || user.picture} 
                          alt="User" 
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                        />
                      )}
                    </IonAvatar>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "1.15rem", marginBottom: 2 }}>
                        {userConfig?.username || user.name}
                      </div>
                      <div style={{ fontSize: "0.97rem", opacity: 0.92, wordBreak: "break-all" }}>{user.email}</div>
                    </div>
                  </div>
                </div>
              )}
              <IonList>
                {paths.map((path, index) => (
                  <IonMenuToggle key={index} autoHide={false}>
                    <IonItem routerLink={path.url} routerDirection="forward" lines="none" detail={false}>
                      <IonIcon slot="start" icon={path.icon} />
                      <IonLabel>{path.name}</IonLabel>
                    </IonItem>
                  </IonMenuToggle>
                ))}
              </IonList>

              {/* Edit Profile Button */}
              {isAuthenticated && (
                <IonItem button onClick={() => {
                  setShowEditProfileModal(true);
                  setNewUsername(userConfig?.username || user?.name || '');
                  setSelectedImage(null);
                }} lines="none" className="ion-margin-top">
                  <IonIcon slot="start" icon={personOutline} />
                  <IonLabel>Edit Profile</IonLabel>
                </IonItem>
              )}
              
              {/* Add Co-worker Button */}
              {isAuthenticated && (
                <IonItem button onClick={() => {
                  setShowAddCoWorkerModal(true);
                  setCoWorkerKey('');
                  setCoWorkerStatus('');
                }} lines="none">
                  <IonIcon slot="start" icon={peopleOutline} />
                  <IonLabel>Add Co-worker</IonLabel>
                </IonItem>
              )}
              
              {/* Shared Folders Dropdown */}
              {isAuthenticated && (
                <>
                  <IonItem button onClick={() => setSharedFoldersExpanded(!sharedFoldersExpanded)} lines="none">
                    <IonIcon slot="start" icon={peopleOutline} />
                    <IonLabel>Shared Folders</IonLabel>
                    <IonIcon slot="end" icon={sharedFoldersExpanded ? chevronUpOutline : chevronDownOutline} />
                  </IonItem>
                  
                  {sharedFoldersExpanded && (
                    <div className="shared-folders-list" style={{ paddingLeft: '16px' }}>
                      {isAuthenticated && user && (
                        <IonButton size="small" fill="clear" style={{marginBottom: 4}} onClick={async () => {
                          if (typeof window.refreshSharedFolders === 'function' && typeof user?.sub === 'string') {
                            await window.refreshSharedFolders(user.sub);
                            if (typeof window !== 'undefined' && window.document) {
                              const evt = new CustomEvent('ionToast', { detail: { message: 'Shared folders reloaded!', duration: 1500, color: 'success' } });
                              window.dispatchEvent(evt);
                            }
                          }
                        }}>
                          <IonIcon slot="icon-only" icon={refreshOutline} />
                        </IonButton>
                      )}
                      {sharedFolders.length > 0 ? (
                        sharedFolders.map((folder, index) => (
                          <IonItem key={index} lines="none" detail={false}>
                            <IonIcon 
                              slot="start" 
                              icon={
                                folder.folder_type === 2 ? 
                                  fileTrayFullOutline : 
                                folder.folder_type === 3 ? 
                                  analyticsOutline : 
                                folder.folder_type === 5 ? 
                                  calculatorOutline : 
                                  folderOutline
                              }
                              color={folder.color && folder.color !== 'null' ? folder.color : undefined}
                              style={{ fontSize: '18px', opacity: 0.85 }} 
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <IonButton 
                                fill="clear" 
                                className="folder-link-button"
                                onClick={() => {
                                  const route = getRouteForFolder(folder);
                                  if (folder.password) {
                                    // Set a global unlock request and navigate
                                    window.unlockFolderRequest = { folderId: folder.id, intent: 'view' };
                                    window.location.href = route;
                                  } else {
                                    window.location.href = route;
                                  }
                                }}
                                style={{ 
                                  margin: 0, 
                                  padding: 0,
                                  textAlign: 'left',
                                  justifyContent: 'flex-start',
                                  fontSize: '14px',
                                  textTransform: 'none',
                                  fontWeight: 'normal',
                                  flex: 1,
                                  '--color': 'inherit',
                                  '--background': 'transparent',
                                  '--background-hover': 'transparent',
                                  '--background-activated': 'transparent',
                                  '--color-hover': 'inherit',
                                  '--color-activated': 'inherit',
                                  '--box-shadow': 'none',
                                  '--border-radius': '0',
                                  '--padding-start': '0',
                                  '--padding-end': '0',
                                  '--padding-top': '0',
                                  '--padding-bottom': '0',
                                  '--ripple-color': 'transparent'
                                }}
                              >
                                <span style={{
                                  textDecoration: folder.crossed_out ? 'line-through' : 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: folder.color && folder.color !== 'null' ? 
                                    `var(--ion-color-${folder.color})` : 'inherit'
                                }}>
                                  {renderTextWithHashtags(folder.name, folder.color, !folder.color)}
                                  {folder.password && (
                                    <IonIcon icon={lockClosedOutline} style={{ fontSize: '14px', opacity: 0.7 }} />
                                  )}
                                </span>
                              </IonButton>
                              <IonButton 
                                fill="clear" 
                                size="small" 
                                onClick={() => {
                                  console.log('Edit button clicked for folder:', folder.name, 'ID:', folder.id);
                                  if (typeof window.openFolderEditModal === 'function') {
                                    // Pass the entire folder object instead of just the ID
                                    console.log('Calling openFolderEditModal with folder:', folder);
                                    window.openFolderEditModal(folder);
                                  }
                                }}
                                style={{ margin: 0, padding: 0, minWidth: '30px' }}
                              >
                                <IonIcon icon={pencilOutline} style={{ fontSize: '16px' }} />
                              </IonButton>
                            </div>
                          </IonItem>
                        ))
                      ) : (
                        <IonItem lines="none">
                          <IonLabel style={{ fontSize: '14px', opacity: 0.7 }}>No shared folders</IonLabel>
                        </IonItem>
                      )}
                    </div>
                  )}
                </>
              )}
              
              {/* Theme Switcher Button */}
              {isAuthenticated && (
                <IonItem button onClick={() => setShowThemeModal(true)} lines="none" className="ion-margin-top">
                  <IonIcon slot="start" icon={settingsOutline} />
                  <IonLabel>Change Theme</IonLabel>
                </IonItem>
              )}
              
              {/* Logout Button */}
              {isAuthenticated && (
                <IonMenuToggle autoHide={false}>
                  <IonItem lines="none" className="ion-margin-top">
                    <IonButton expand="full" color="danger" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
                      Logout
                    </IonButton>
                  </IonItem>
                </IonMenuToggle>
              )}
              </IonContent>
            </IonMenu>
            {/* Edit Profile Modal */}
            <IonModal isOpen={showEditProfileModal} onDidDismiss={() => setShowEditProfileModal(false)}>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>Edit Profile</IonTitle>
                  <IonButtons slot="end">
                    <IonButton onClick={() => setShowEditProfileModal(false)}>
                      <IonIcon icon={closeOutline} />
                    </IonButton>
                  </IonButtons>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                  <IonAvatar style={{ width: '100px', height: '100px', marginBottom: '16px' }}>
                    <img src={selectedImage || userConfig?.image_url || user?.picture} alt="Profile" />
                  </IonAvatar>
                  <input 
                    type="file" 
                    id="profile-image-upload" 
                    accept="image/*" 
                    style={{ display: 'none' }}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setSelectedImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <IonButton 
                      size="small" 
                      onClick={() => document.getElementById('profile-image-upload')?.click()}
                    >
                      Change Image
                    </IonButton>
                    {(selectedImage || userConfig?.image_url) && (
                      <IonButton 
                        size="small" 
                        color="danger"
                        onClick={() => setSelectedImage(null)}
                      >
                        Remove
                      </IonButton>
                    )}
                  </div>
                </div>
                
                <IonItem>
                  <IonLabel position="stacked">Username</IonLabel>
                  <IonInput 
                    value={newUsername} 
                    onIonChange={(e: CustomEvent) => setNewUsername((e.detail.value as string) || '')}
                    placeholder="Enter your username"
                  />
                </IonItem>
                
                <IonButton 
                  expand="block" 
                  className="ion-margin-top"
                  onClick={async () => {
                    if (!user?.sub) return;
                    
                    try {
                      console.log('Updating entire user config at once to preserve all data');
                      const baseUrl = apiUrl.replace('/notes/api/v1/', '');
                      
                      // Determine the final image value
                      let finalImageUrl = userConfig?.image_url || '';
                      if (selectedImage !== undefined) {
                        finalImageUrl = selectedImage || ''; // null becomes empty string
                      }
                      
                      // Create a complete config object with all existing data plus updates
                      const updatedConfig = {
                        user_id: user.sub,
                        username: newUsername || userConfig?.username || '',
                        image_url: finalImageUrl,
                        co_workers: userConfig?.co_workers || [],
                        co_folders: userConfig?.co_folders || [],
                        user_key: userConfig?.user_key || ''
                      };
                      
                      console.log('Sending complete config update:', updatedConfig);
                      
                      // Update the entire config at once
                      const response = await fetch(`${baseUrl}/config/api/v1/${user.sub}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedConfig)
                      });
                      
                      if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Failed to update profile:', errorText);
                        presentToast({
                          message: 'Failed to update profile',
                          duration: 2000,
                          position: 'bottom',
                          color: 'danger'
                        });
                        return;
                      }
                      
                      const updatedData = await response.json();
                      console.log('Profile updated successfully:', updatedData);
                      
                      // Profile was successfully updated
                      // Wait a moment to ensure backend processing completes
                      await new Promise(resolve => setTimeout(resolve, 500));
                      
                      // Refresh user config
                      const config = await getUserConfig(user.sub);
                      console.log('Updated user config:', config);
                      setUserConfig(config);
                      setShowEditProfileModal(false);
                      presentToast({
                        message: 'Profile updated successfully!',
                        duration: 2000,
                        position: 'bottom',
                        color: 'success'
                      });
                      
                      // Force refresh of all users data to update co-worker displays
                      const allUsersResponse = await fetch(`${baseUrl}/config/api/v1/users`, {
                        headers: { 'Accept': 'application/json' }
                      });
                      
                      if (allUsersResponse.ok) {
                        const users = await allUsersResponse.json();
                        setAllUsers(users);
                        console.log('Refreshed all users data after profile update');
                      }
                  } catch (error) {
                    console.error('Error updating profile:', error);
                    presentToast({
                      message: 'Error updating profile',
                      duration: 2000,
                      position: 'bottom',
                      color: 'danger'
                    });
                  }
                  }}
                >
                  Save Changes
                </IonButton>
              </IonContent>
            </IonModal>
            
            {/* Add Co-worker Modal */}
            <IonModal isOpen={showAddCoWorkerModal} onDidDismiss={() => setShowAddCoWorkerModal(false)}>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>Add Co-worker</IonTitle>
                  <IonButtons slot="end">
                    <IonButton onClick={() => setShowAddCoWorkerModal(false)}>
                      <IonIcon icon={closeOutline} />
                    </IonButton>
                  </IonButtons>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding">
                {/* Display user's own key */}
                <div className="ion-padding-bottom">
                  <IonText color="medium">
                    <h5 style={{ margin: '0 0 8px 0' }}>Your User Key</h5>
                    <div style={{ 
                      background: 'var(--ion-color-medium)', 
                      padding: '12px', 
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      wordBreak: 'break-all',
                      marginBottom: '8px',
                      position: 'relative',
                      color: 'var(--ion-color-light)'
                    }}>
                      {userConfig?.user_key || 'Loading...'}
                    </div>
                    <IonButton 
                      size="small" 
                      fill="outline"
                      onClick={() => {
                        if (userConfig?.user_key) {
                          navigator.clipboard.writeText(userConfig.user_key)
                            .then(() => {
                              presentToast({
                                message: 'User key copied to clipboard!',
                                duration: 2000,
                                position: 'bottom',
                                color: 'success'
                              });
                            })
                            .catch(err => {
                              console.error('Could not copy text: ', err);
                              presentToast({
                                message: 'Failed to copy to clipboard',
                                duration: 2000,
                                position: 'bottom',
                                color: 'danger'
                              });
                            });
                        }
                      }}
                      style={{ marginBottom: '8px' }}
                    >
                      <IonIcon slot="start" icon={copyOutline} />
                      Copy to Clipboard
                    </IonButton>
                    <p style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>
                      Share this key with others so they can add you as a co-worker
                    </p>
                  </IonText>
                </div>
                
                {/* Current Co-workers Section */}
                {userConfig?.co_workers && userConfig.co_workers.length > 0 && (
                  <div className="ion-padding-bottom">
                    <h5 style={{ margin: '16px 0 12px 0' }}>Your Co-workers</h5>
                    <div style={{ 
                      background: 'var(--ion-color-light-shade)', 
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: '16px'
                    }}>
                      {userConfig.co_workers.map((coWorkerId: string, index: number) => {
                        // Find co-worker details from all users
                        const coWorkerDetails = allUsers?.find((u: any) => 
                          u.user_id === coWorkerId || u.user_key === coWorkerId
                        );
                        
                        const displayName = coWorkerDetails?.username || 
                                          coWorkerDetails?.email || 
                                          coWorkerDetails?.name || 
                                          'Unknown User';
                                          
                        const imageUrl = coWorkerDetails?.image_url || 
                                        'https://ionicframework.com/docs/img/demos/avatar.svg';
                        
                        return (
                          <div key={index} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '12px 16px',
                            borderBottom: index < userConfig.co_workers.length - 1 ? '1px solid var(--ion-color-light)' : 'none'
                          }}>
                            <IonAvatar style={{ width: '40px', height: '40px', marginRight: '12px' }}>
                              <img src={imageUrl} alt={displayName} />
                            </IonAvatar>
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                fontWeight: 'bold', 
                                color: 'var(--ion-color-medium-contrast)',
                                marginBottom: '4px'
                              }}>
                                {displayName}
                              </div>
                              <div style={{ 
                                fontSize: '12px', 
                                color: 'var(--ion-color-light)',
                                fontFamily: 'monospace',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '200px',
                                background: 'var(--ion-color-medium)',
                                padding: '4px 8px',
                                borderRadius: '4px'
                              }}>
                                {coWorkerId}
                              </div>
                            </div>
                            <IonButton 
                              fill="clear" 
                              color="danger"
                              size="small"
                              onClick={async () => {
                                if (!user?.sub) return;
                                
                                try {
                                  const baseUrl = apiUrl.replace('/notes/api/v1/', '');
                                  console.log('Current co-workers:', userConfig.co_workers);
                                  console.log('Removing co-worker:', coWorkerId);
                                  
                                  const updatedCoWorkers = userConfig.co_workers.filter(
                                    (id: string) => id !== coWorkerId
                                  );
                                  console.log('Updated co-workers list:', updatedCoWorkers);
                                  
                                  // Use the DELETE endpoint specifically for removing co-workers
                                  const response = await fetch(`${baseUrl}/config/api/v1/${user.sub}/co-workers/${coWorkerId}`, {
                                    method: 'DELETE',
                                    headers: { 
                                      'Accept': 'application/json'
                                    }
                                  });
                                  
                                  console.log('Remove co-worker response status:', response.status);
                                  
                                  if (response.ok) {
                                    // Get the response data
                                    const responseData = await response.json();
                                    console.log('Co-worker removal response:', responseData);
                                    
                                    // Refresh user config
                                    const config = await getUserConfig(user.sub);
                                    console.log('Updated user config after removal:', config);
                                    console.log('Co-workers after removal:', config?.co_workers || []);
                                    setUserConfig(config);
                                    
                                    // Update allUsers state to refresh the UI
                                    const allUsersResponse = await fetch(`${baseUrl}/config/api/v1/users`, {
                                      headers: { 'Accept': 'application/json' }
                                    });
                                    
                                    if (allUsersResponse.ok) {
                                      const users = await allUsersResponse.json();
                                      console.log('All users after co-worker removal:', users.length);
                                      
                                      // Check if the removed co-worker still has the current user as a co-worker
                                      const removedCoWorkerConfig = users.find((u: any) => 
                                        u.user_key === coWorkerId || u.user_id === coWorkerId
                                      );
                                      
                                      if (removedCoWorkerConfig && config) {
                                        console.log('Removed co-worker config:', removedCoWorkerConfig);
                                        console.log('Does removed co-worker still have current user as co-worker?', 
                                          removedCoWorkerConfig.co_workers?.includes(config.user_key) || false);
                                      }
                                      
                                      setAllUsers(users);
                                    }
                                    
                                    presentToast({
                                      message: 'Co-worker removed successfully',
                                      duration: 2000,
                                      position: 'bottom',
                                      color: 'success'
                                    });
                                  } else {
                                    const errorText = await response.text();
                                    console.error('Failed to remove co-worker:', errorText);
                                    presentToast({
                                      message: 'Failed to remove co-worker: ' + errorText,
                                      duration: 2000,
                                      position: 'bottom',
                                      color: 'danger'
                                    });
                                  }
                                } catch (error) {
                                  console.error('Error removing co-worker:', error);
                                  presentToast({
                                    message: 'Error removing co-worker',
                                    duration: 2000,
                                    position: 'bottom',
                                    color: 'danger'
                                  });
                                }
                              }}
                            >
                              <IonIcon icon={closeOutline} />
                            </IonButton>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Add New Co-worker Section */}
                <h5 style={{ margin: '16px 0 12px 0' }}>Add New Co-worker</h5>
                <IonItem>
                  <IonLabel position="stacked">Co-worker's User Key</IonLabel>
                  <IonInput 
                    value={coWorkerKey} 
                    onIonChange={(e: CustomEvent) => setCoWorkerKey((e.detail.value as string) || '')}
                    placeholder="Enter co-worker's user key"
                  />
                </IonItem>
                
                {coWorkerStatus && (
                  <div className="ion-padding" style={{ color: coWorkerStatus.includes('Error') ? 'var(--ion-color-danger)' : 'var(--ion-color-success)' }}>
                    {coWorkerStatus}
                  </div>
                )}
                
                <IonButton 
                  expand="block" 
                  className="ion-margin-top"
                  onClick={async () => {
                    if (!user?.sub || !coWorkerKey.trim()) {
                      setCoWorkerStatus('Error: Please enter a valid user key');
                      return;
                    }
                    
                    try {
                      const baseUrl = apiUrl.replace('/notes/api/v1/', '');
                      const currentConfig = await getUserConfig(user.sub);
                      
                      if (!currentConfig) {
                        setCoWorkerStatus('Error: Could not retrieve your profile');
                        return;
                      }
                      
                      const currentCoWorkers = currentConfig.co_workers || [];
                      
                      if (currentCoWorkers.includes(coWorkerKey.trim())) {
                        setCoWorkerStatus('Error: This user is already your co-worker');
                        return;
                      }
                      
                      const response = await fetch(`${baseUrl}/config/api/v1/${user.sub}/co-workers`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify([...currentCoWorkers, coWorkerKey.trim()])
                      });
                      
                      if (response.ok) {
                        // Clear status and input
                        setCoWorkerStatus('');
                        setCoWorkerKey('');
                        
                        // Refresh user config
                        const config = await getUserConfig(user.sub);
                        setUserConfig(config);
                        
                        // Show success toast and close modal
                        presentToast({
                          message: 'Co-worker added successfully!',
                          duration: 2000,
                          position: 'bottom',
                          color: 'success'
                        });
                        
                        // Close modal immediately
                        setShowAddCoWorkerModal(false);
                      } else {
                        const errorText = await response.text();
                        setCoWorkerStatus(`Error: ${errorText || 'Failed to add co-worker'}`);
                      }
                    } catch (error) {
                      console.error('Error adding co-worker:', error);
                      setCoWorkerStatus('Error: Failed to add co-worker');
                    }
                  }}
                >
                  Add Co-worker
                </IonButton>
              </IonContent>
            </IonModal>
            
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <IonRouterOutlet id="main">
                <Route exact path="/" component={Login} />
                <Route exact path="/register" component={Register} />
                <ProtectedRoute exact path="/app" component={List} />
                <ProtectedRoute exact path="/app/list" component={List} />
                <ProtectedRoute exact path="/app/organizerfolder/:name" component={OrganizerFolder} />
                <ProtectedRoute exact path="/app/folder/:name" component={Folder} />
                <ProtectedRoute exact path="/app/folder/name/:folderName" component={Folder} />
                <ProtectedRoute path="/app/mindmapfolder/:folderName" component={MindmapFolder} exact />
                <ProtectedRoute path="/app/calcfolder/:folderName" component={CalcFolder} exact /> 
                <ProtectedRoute exact path="/app/media" component={MusicTab} />
                <ProtectedRoute exact path="/app/media/downloaded" component={MusicTab} />
                <ProtectedRoute exact path="/app/media/browser" component={MusicTab} />
                
                <ProtectedRoute exact path="/app/profile" component={UserProfile} />
              </IonRouterOutlet>
            </div>
          </IonSplitPane>
          {/* Theme Modal */}
          <ThemeModal
            isOpen={showThemeModal}
            onClose={() => setShowThemeModal(false)}
            selectedTheme={selectedTheme}
            onThemeChange={(theme) => {
              setSelectedTheme(theme);
              setShowThemeModal(false);
            }}
          />
          {isAuthenticated && <PersistentMediaPlayer />}
        </IonReactRouter>
      </IonApp>
    </PlaybackProvider>
  );
};

// Wrapper component that provides Auth0 context
// Component to set up the Auth0 token getter
const Auth0Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getAccessTokenSilently } = useAuth0();
  
  // Set up the token getter for the API utility
  React.useEffect(() => {
    // Create a function that will be called by the API utility
    const tokenGetter = async () => {
      try {
        const token = await getAccessTokenSilently();
        return token;
      } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
      }
    };
    
    // Set the token getter in the API utility
    setAuth0TokenGetter(tokenGetter);
    
    // Cleanup function - set a no-op function
    return () => {
      setAuth0TokenGetter(async () => '');
    };
  }, [getAccessTokenSilently]);
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Auth0Provider
      domain={authConfig.domain}
      clientId={authConfig.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: authConfig.audience,
        scope: "openid profile email offline_access"
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <Auth0Wrapper>
        <AppContent />
      </Auth0Wrapper>
    </Auth0Provider>
  );
};

export default App;


