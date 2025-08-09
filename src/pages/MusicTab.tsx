import React, { useState, useEffect, useRef } from 'react';


// Using Ionic's native reordering components instead of react-beautiful-dnd
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonLabel,
  IonIcon,
  IonRouterOutlet,
  IonSpinner,
  IonToast,
  IonInput,
  IonButton,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonProgressBar,
  IonAlert,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonImg,
  IonThumbnail,
  IonList,
  IonListHeader,
  IonModal,
  IonButtons,
  IonBackdrop,
  IonSkeletonText,
  IonText,
  IonCheckbox,
  IonMenuButton,
  IonSegment,
  IonSegmentButton,
  IonChip,
  IonReorderGroup,
  IonReorder,
  IonSearchbar,
} from "@ionic/react";
import { 
  menuOutline, 
  musicalNotesOutline, 
  downloadOutline, 
  searchOutline, 
  closeOutline, 
  playOutline, 
  folderOutline, 
  playSkipBackOutline, 
  playSkipForwardOutline, 
  pauseOutline, 
  trashOutline, 
  ellipsisHorizontalOutline, 
  musicalNoteOutline, 
  pinOutline, 
  albumsOutline, 
  add,
  shuffleOutline,
  repeatOutline
} from "ionicons/icons";
import { handleAddFolder } from './apiCalls';
import { getFolders as getFoldersAPI, Folder, addFolder } from './apiService';
import { Route, Redirect, useHistory, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import { ScrollDetail } from '@ionic/core';
import { useParams } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import Menu from "./Menu";
import { getFolders } from "./apiCalls";

// Using Folder interface from apiService

interface VideoItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: {
        url: string;
      };
      medium?: {
        url: string;
      };
      high?: {
        url: string;
      };
    };
    channelTitle: string;
  };
}

const YouTubeBrowserTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<"mp3" | "mp4">("mp3");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [existingVideos, setExistingVideos] = useState<DownloadedVideo[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup function to cancel any pending requests when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Fetch existing videos when component mounts
    const fetchExistingVideos = async () => {
      try {
        const response = await fetch("https://localhost:7281/notes/api/v1/videos");
        if (!response.ok) {
          throw new Error('Failed to fetch existing videos');
        }
        const data = await response.json();
        setExistingVideos(data);
      } catch (err) {
        console.error('Error fetching existing videos:', err);
      }
    };

    fetchExistingVideos();
  }, []);

  const checkIfVideoExists = (videoId: string, format: string): boolean => {
    return existingVideos.some(video => 
      video.videoId === videoId && video.format === format
    );
  };

  const handleScroll = (e: any) => {
    const content = e.target;
    const scrollTop = content.scrollTop;
    const scrollHeight = content.scrollHeight;
    const clientHeight = content.clientHeight;
    
    // Load more when user has scrolled to 80% of the content
    if (scrollHeight - scrollTop <= clientHeight * 1.2 && !isLoadingMore && hasMore) {
      searchVideos(new Event('scroll') as any, true);
    }
  };

  const searchVideos = async (e: React.FormEvent, isLoadMore: boolean = false) => {
    e.preventDefault();
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    if (isLoadMore) {
      if (!hasMore || isLoadingMore) return;
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setVideos([]);
      setNextPageToken(null);
      setHasMore(true);
    }
    setError(null);

    try {
      // Clear any existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Add debounce for search
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          console.log('Starting search for:', searchQuery);
          const url = new URL('https://localhost:7281/notes/api/v1/search');
          url.searchParams.append('query', searchQuery);
          if (isLoadMore && nextPageToken) {
            url.searchParams.append('pageToken', nextPageToken);
          }

          const response = await fetch(url.toString(), {
            signal: abortControllerRef.current?.signal
          });

          if (response.status === 404) {
            throw new Error('Search endpoint not found. Please check the server configuration.');
          }

          console.log('Search response status:', response.status);
          const responseText = await response.text();
          console.log('Raw response:', responseText);

          if (!response.ok) {
            let errorMessage = 'Failed to search videos';
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              console.error('Failed to parse error response:', e);
            }
            throw new Error(errorMessage);
          }

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (e) {
            console.error('Failed to parse response:', e);
            throw new Error('Invalid response from server');
          }

          if (!data.items || data.items.length === 0) {
            if (!isLoadMore) {
              setVideos([]);
              setError('No videos found. Try a different search term.');
            }
            setHasMore(false);
          } else {
            console.log('Found videos:', data.items);
            if (isLoadMore) {
              setVideos(prev => [...prev, ...data.items]);
            } else {
              setVideos(data.items);
            }
            setNextPageToken(data.nextPageToken);
            setHasMore(!!data.nextPageToken);
          }
        } catch (error) {
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              console.log('Search request was cancelled');
              return;
            }
            setError(error.message);
          } else {
            setError('An unexpected error occurred');
          }
        } finally {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }, 300); // 300ms debounce
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to search videos. Please try again.');
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleDownloadClick = (video: VideoItem) => {
    setSelectedVideo(video);
    setShowDownloadModal(true);
  };

  const handleDownload = async () => {
    if (!selectedVideo) {
      setAlertMessage("No video selected for download");
      setShowAlert(true);
      return;
    }

    if (!selectedVideo.id?.videoId) {
      setAlertMessage("Invalid video ID. Please try selecting the video again.");
      setShowAlert(true);
      return;
    }

    const videoId = selectedVideo.id.videoId;
    console.log('Selected video:', selectedVideo);
    console.log('Video ID:', videoId);
    setShowDownloadModal(false);
    setIsLoading(true);
    setDownloadProgress(0);
    setToastMessage(null);
  
    try {
      console.log('Starting download process...');
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log('Constructed YouTube URL:', youtubeUrl);
      
      const requestBody = { 
        url: youtubeUrl,
        format: downloadFormat
      };
      
      console.log('Sending request to server with body:', requestBody);
      const response = await fetch("https://localhost:7281/notes/api/v1/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/octet-stream"
        },
        body: JSON.stringify(requestBody),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(errorText || `Failed to download video (Status: ${response.status})`);
      }

      const contentType = response.headers.get('content-type');
      console.log('Response content type:', contentType);

      if (!contentType?.includes('audio/') && !contentType?.includes('video/') && !contentType?.includes('application/octet-stream')) {
        const responseText = await response.text();
        console.error('Unexpected response:', {
          contentType,
          responseText
        });
        throw new Error('Server returned an unexpected response format');
      }

      const blob = await response.blob();
      console.log('Received blob:', {
        size: blob.size,
        type: blob.type
      });

      if (blob.size === 0) {
        throw new Error('Received empty file from server');
      }

      const filename = `${selectedVideo.snippet.title}.${downloadFormat}`;
      
      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onloadend = async () => {
            try {
              const base64Data = (reader.result as string).split(',')[1];
              const savedFile = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Documents,
                recursive: true
              });

              await FileOpener.open({
                filePath: savedFile.uri,
                contentType: downloadFormat === 'mp3' ? 'audio/mpeg' : 'video/mp4'
              });
              setToastMessage("Download completed successfully!");
              resolve(true);
            } catch (error) {
              console.error('Mobile save error:', error);
              reject(new Error('Failed to save file on device'));
            }
          };
          reader.onerror = (error) => {
            console.error('FileReader error:', error);
            reject(new Error('FileReader failed'));
          };
          reader.readAsDataURL(blob);
        });
      } else {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        setToastMessage("Download started successfully!");
      }
      
      // Update existing videos list
      const updatedResponse = await fetch("https://localhost:7281/notes/api/v1/videos");
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setExistingVideos(updatedData);
      }
    } catch (error) {
      console.error("Download error details:", {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setAlertMessage(`Download failed: ${errorMessage}`);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
      setDownloadProgress(0);
    }
  };

  const handleFolderClick = (folder: Folder) => {
    // Handle folder click - you can implement navigation or filtering here
    console.log('Folder clicked:', folder);
  };

  return (
    <IonContent onIonScroll={handleScroll}>
      <div style={{ padding: '16px' }}>
        <form onSubmit={searchVideos} style={{ display: 'flex', marginBottom: '16px' }}>
          <IonItem style={{ flex: 1, marginRight: '8px' }}>
            <IonInput
              value={searchQuery}
              onIonChange={(e) => setSearchQuery(e.detail.value!)}
              placeholder="Search for videos..."
              clearInput
            />
          </IonItem>
          <IonButton type="submit" disabled={isLoading}>
            {isLoading ? (
              <IonSpinner name="dots" />
            ) : (
              <IonIcon icon={searchOutline} />
            )}
          </IonButton>
        </form>

        {error && (
          <IonAlert
            isOpen={!!error}
            onDidDismiss={() => setError(null)}
            header="Error"
            message={error}
            buttons={['OK']}
          />
        )}

        {showAlert && (
          <IonAlert
            isOpen={showAlert}
            onDidDismiss={() => setShowAlert(false)}
            header="Error"
            message={alertMessage}
            buttons={['OK']}
          />
        )}

        {toastMessage && (
          <IonToast
            isOpen={!!toastMessage}
            message={toastMessage}
            duration={3000}
            onDidDismiss={() => setToastMessage(null)}
          />
        )}

        {videos.length > 0 && (
          <IonList>
            {videos.map((video) => (
              <IonCard key={video.id.videoId} style={{ marginBottom: '16px' }} className="note-card">
                <IonCardHeader>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <IonThumbnail style={{ marginRight: '16px', minWidth: '120px', minHeight: '90px' }}>
                      <IonImg 
                        src={video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </IonThumbnail>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <IonCardTitle style={{ fontSize: '1rem', marginBottom: '4px' }}>
                        {video.snippet.title}
                      </IonCardTitle>
                      <IonCardSubtitle style={{ fontSize: '0.8rem' }}>
                        {video.snippet.channelTitle}
                      </IonCardSubtitle>
                    </div>
                    <IonButton
                      fill="clear"
                      onClick={() => handleDownloadClick(video)}
                      style={{ marginLeft: '8px' }}
                    >
                      <IonIcon icon={downloadOutline} slot="icon-only" />
                    </IonButton>
                  </div>
                </IonCardHeader>
              </IonCard>
            ))}
            {isLoadingMore && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <IonSpinner name="dots" />
              </div>
            )}
          </IonList>
        )}

        {isLoading && !isLoadingMore && (
          <IonList>
            {[...Array(5)].map((_, index) => (
              <IonCard key={index} style={{ marginBottom: '16px' }}>
                <IonCardHeader>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <IonSkeletonText animated style={{ width: '120px', height: '90px', marginRight: '16px' }} />
                    <div style={{ flex: 1 }}>
                      <IonSkeletonText animated style={{ width: '80%', height: '20px', marginBottom: '8px' }} />
                      <IonSkeletonText animated style={{ width: '60%', height: '16px' }} />
                    </div>
                  </div>
                </IonCardHeader>
              </IonCard>
            ))}
          </IonList>
        )}
      </div>

      <IonModal
        isOpen={showDownloadModal}
        onDidDismiss={() => setShowDownloadModal(false)}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Download Options</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowDownloadModal(false)}>
                <IonIcon slot="icon-only" icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {selectedVideo && (
            <>
              <h2>{selectedVideo.snippet.title}</h2>
              <p>{selectedVideo.snippet.channelTitle}</p>
              
              {existingVideos.some(v => v.videoId === selectedVideo.id.videoId) && (
                <IonText color="medium" style={{ display: 'block', marginBottom: '16px' }}>
                  Already downloaded in: {existingVideos
                    .filter(v => v.videoId === selectedVideo.id.videoId)
                    .map(v => v.format.toUpperCase())
                    .join(', ')}
                </IonText>
              )}
              
              <IonItem>
                <IonLabel>Download Format</IonLabel>
                <IonSelect
                  value={downloadFormat}
                  onIonChange={(e) => setDownloadFormat(e.detail.value)}
                >
                  <IonSelectOption value="mp3">MP3 (Audio)</IonSelectOption>
                  <IonSelectOption value="mp4">MP4 (Video)</IonSelectOption>
                </IonSelect>
              </IonItem>

              {isLoading && (
                <IonProgressBar
                  value={downloadProgress / 100}
                  className="ion-margin-top"
                />
              )}

              <IonButton
                expand="block"
                onClick={handleDownload}
                disabled={isLoading}
                className="ion-margin-top"
              >
                {isLoading ? (
                  <>
                    <IonSpinner name="dots" slot="start" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <IonIcon icon={downloadOutline} slot="start" />
                    Download {downloadFormat.toUpperCase()}
                  </>
                )}
              </IonButton>
            </>
          )}
        </IonContent>
      </IonModal>
    </IonContent>
  );
};

interface DownloadedVideo {
  id: string;
  videoId: string;
  title: string;
  url: string;
  format: string;
  downloadedAt: string;
  filePath: string;
  thumbnailUrl: string;
  folder_id: string[];
  y: number[]; // Array of y-values, one per folder
  artist?: string; // Optional artist field
}

const DownloadedVideosTab: React.FC = () => {
  // Video queue state
  const [videoQueue, setVideoQueue] = useState<DownloadedVideo[]>([]);
  const [showUpNextModal, setShowUpNextModal] = useState(false);
  const [randomMode, setRandomMode] = useState(false);
  const [videos, setVideos] = useState<DownloadedVideo[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const showToast = (opts: {message: string, duration: number, color: string}) => {
    // This is a placeholder for the toast functionality
    // In a real implementation, you would use a toast controller here
    console.log('Toast:', opts.message);
  };
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<DownloadedVideo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<Set<number>>(new Set());
  const [videoForOptions, setVideoForOptions] = useState<DownloadedVideo | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [originalFolderId, setOriginalFolderId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedArtist, setEditedArtist] = useState<string>('');
  const [editedThumbnailUrl, setEditedThumbnailUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const history = useHistory();
  const location = useLocation();
  const [playlist, setPlaylist] = useState<DownloadedVideo[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isInitializedRef = useRef(false);
  const { user } = useAuth0();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<DownloadedVideo[]>([]);

  // Search function to filter videos by title or artist
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      // If search term is empty, reset to normal view
      handleFolderClick(selectedFolder);
      setSearchResults([]);
      return;
    }
    
    // Filter videos based on search term (case insensitive)
    const termLower = term.toLowerCase();
    let results: DownloadedVideo[];
    
    // First filter by folder if a folder is selected
    if (selectedFolder === null || selectedFolder === "00000000-0000-0000-0000-0000000000D1") {
      results = videos;
    } else {
      results = videos.filter(video => 
        video.folder_id && video.folder_id.includes(selectedFolder)
      );
    }
    
    // Then filter by search term (title or artist)
    results = results.filter(video => {
      const titleMatch = video.title?.toLowerCase().includes(termLower);
      const artistMatch = video.artist?.toLowerCase().includes(termLower);
      return titleMatch || artistMatch;
    });
    
    // Sort by y-value
    const currentFolderId = selectedFolder ?? "00000000-0000-0000-0000-0000000000D1";
    results = [...results].sort((a, b) => {
      const folderIndexA = a.folder_id?.findIndex(id => id === currentFolderId) ?? "00000000-0000-0000-0000-0000000000D1";
      const folderIndexB = b.folder_id?.findIndex(id => id === currentFolderId) ?? "00000000-0000-0000-0000-0000000000D1";
      
      const yValueA = folderIndexA >= 0 && Array.isArray(a.y) && a.y[folderIndexA] ? a.y[folderIndexA] : 0;
      const yValueB = folderIndexB >= 0 && Array.isArray(b.y) && b.y[folderIndexB] ? b.y[folderIndexB] : 0;
      
      // Sort by y-value in descending order (highest y at top)
      return yValueB - yValueA;
    });
    
    console.log('Search results:', results);
    setSearchResults(results);
    setPlaylist(results);
  };
  
  // Auto-sort videos into folders by artist name
  const handleAutoSortByArtist = async () => {
    try {
      setIsLoading(true);
      
      // Step 1: Identify all unique artists (excluding null/empty values)
      const uniqueArtists = new Set<string>();
      const videosWithArtist: DownloadedVideo[] = [];
      const videosWithoutArtist: DownloadedVideo[] = [];
      
      videos.forEach(video => {
        if (video.artist && video.artist.trim()) {
          uniqueArtists.add(video.artist.trim());
          videosWithArtist.push(video);
        } else {
          videosWithoutArtist.push(video);
        }
      });
      
      console.log('Unique artists found:', Array.from(uniqueArtists));
      console.log('Videos without artist information:', videosWithoutArtist.length);
      
      // Step 2: Create folders for each artist if they don't exist
      const artistFolderMap = new Map<string, string>(); // Maps artist name to folder ID
      // Find existing artist folders by name
      const existingArtistFolders = folders.filter(folder => 
        folder.name && 
        uniqueArtists.has(folder.name) && 
        (folder.folder_id === "00000000-0000-0000-0000-0000000000D1" )
      );
      
      // Add existing artist folders to the map
      existingArtistFolders.forEach(folder => {
        artistFolderMap.set(folder.name, folder.id);
      });
      
      // Create folders for artists that don't have one
      const artistsNeedingFolders = Array.from(uniqueArtists).filter(artist => 
        !artistFolderMap.has(artist)
      );
      
      // Create new folders for artists
      for (const artist of artistsNeedingFolders) {
        try {
          // Use the same folder creation logic as the create folder button
          const nextY = getNextY();
          const newFolder = { 
            name: artist, 
            folder_type: 4, // Special folder type for artist folders
            x: 0, 
            y: nextY,
            crossed_out: false,
            color: 'medium',
            folder_id: "00000000-0000-0000-0000-0000000000D1", // Root level folder
            checklist: false
          };
          
          // Use the addFolder function from apiService
          const addedFolder = await addFolder(newFolder, user?.sub || '', "00000000-0000-0000-0000-0000000000D1");
          artistFolderMap.set(artist, addedFolder.id);
          console.log(`Created folder for artist: ${artist} with ID: ${addedFolder.id}`);
          
          // Add the new folder to the folders state
          setFolders(prev => [...prev, addedFolder]);
        } catch (error) {
          console.error(`Error creating folder for artist ${artist}:`, error);
          showToast({ message: `Failed to create folder for ${artist}`, duration: 2000, color: 'danger' });
        }
      }
      
      // Step 3: Move videos to their respective artist folders
      let successCount = 0;
      let errorCount = 0;
      
      for (const video of videos) {
        if (video.artist && video.artist.trim() && artistFolderMap.has(video.artist.trim())) {
          const artistFolderId = artistFolderMap.get(video.artist.trim());
          
          // Skip if video is already in the correct folder
          if (video.folder_id && video.folder_id.includes(artistFolderId!)) {
            successCount++;
            continue;
          }
          
          // Create new folder_id array that includes the artist folder
          const newFolderIds = video.folder_id ? [...video.folder_id] : ["00000000-0000-0000-0000-0000000000D1"];
          if (!newFolderIds.includes(artistFolderId!)) {
            newFolderIds.push(artistFolderId!);
          }
          
          try {
            // Update the video's folder_id to include the artist folder
            const response = await fetch(`https://localhost:7281/notes/api/v1/videos/${video.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                folder_id: newFolderIds
              })
            });
            
            if (!response.ok) {
              throw new Error(`Failed to update video ${video.id}`);
            }
            
            successCount++;
          } catch (error) {
            console.error(`Error moving video ${video.id} to artist folder:`, error);
            errorCount++;
          }
        } else if (!video.artist || !video.artist.trim()) {
          console.log(`Video ${video.id} has no artist information, skipping`);
        }
      }
      
      // Step 4: Refresh data
      // Fetch videos and folders again to update the UI
      try {
        const videosResponse = await fetch("https://localhost:7281/notes/api/v1/videos");
        if (videosResponse.ok) {
          const videoData = await videosResponse.json();
          const processedData = videoData.map((video: any) => {
            let folder_id = video.folder_id;
            if (!folder_id) {
              folder_id = ["00000000-0000-0000-0000-0000000000D1"];
            } else if (Array.isArray(folder_id) && !folder_id.includes("00000000-0000-0000-0000-0000000000D1")) {
              folder_id = [...folder_id, "00000000-0000-0000-0000-0000000000D1"];
            }
            let y = Array.isArray(video.y) ? video.y : [];
            return { ...video, folder_id, y };
          });
          setVideos(processedData);
          setPlaylist(processedData);
        }
        
        if (user?.sub) {
          const foldersResponse = await fetch("https://localhost:7281/notes/api/v1/folders", {
            headers: { userId: user.sub }
          });
          if (foldersResponse.ok) {
            const folderData = await foldersResponse.json();
            // Only show folders with folder_id === -1 in the sidebar
            const rootFolders = folderData.filter((folder: any) => {
              return folder.folder_id === "00000000-0000-0000-0000-0000000000D1";
            });
            setFolders(rootFolders);
          }
        }
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
      
      // Show results
      if (errorCount > 0) {
        showToast({
          message: `Sorted ${successCount} videos. ${errorCount} videos could not be sorted.`,
          duration: 3000,
          color: 'warning'
        });
      } else {
        showToast({
          message: `Successfully sorted ${successCount} videos into artist folders!`,
          duration: 3000,
          color: 'success'
        });
      }
    } catch (error) {
      console.error('Error auto-sorting videos by artist:', error);
      showToast({ message: 'Failed to auto-sort videos', duration: 2000, color: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to get the next highest y-value
  const getNextY = (): number => {
    // Get the maximum y value from folders
    const maxFolderY = folders.length > 0 ? 
      Math.max(...folders.map(folder => {
        // Handle different y value formats safely
        if (Array.isArray(folder.y)) {
          return Math.max(...folder.y.filter(y => typeof y === 'number'), 0);
        } else if (typeof folder.y === 'number') {
          return folder.y;
        }
        return 0;
      })) : 0;
    
    // Add a larger increment to ensure new items appear at the top
    return maxFolderY + 100;
  };

  // Handle folder click
  const handleFolderClick = (folderId: string | null) => {
    setSelectedFolder(folderId);
    
    let filteredVideos;
    if (folderId === null || folderId === "00000000-0000-0000-0000-0000000000D1") {
      // For root folder (null or -1), show all videos
      // This ensures all videos appear in the root folder
      filteredVideos = videos;
    } else {
      // For specific folders, only show videos that include that folder ID
      filteredVideos = videos.filter(video => 
        video.folder_id && video.folder_id.includes(folderId)
      );
    }
    
    // Sort videos by y-value for the current folder
    const currentFolderId = folderId ?? "00000000-0000-0000-0000-0000000000D1";
    filteredVideos = [...filteredVideos].sort((a, b) => {
      const folderIndexA = a.folder_id?.findIndex(id => id === currentFolderId) ?? "00000000-0000-0000-0000-0000000000D1";
      const folderIndexB = b.folder_id?.findIndex(id => id === currentFolderId) ?? "00000000-0000-0000-0000-0000000000D1";
      
      const yValueA = folderIndexA >= 0 && Array.isArray(a.y) && a.y[folderIndexA] ? a.y[folderIndexA] : 0;
      const yValueB = folderIndexB >= 0 && Array.isArray(b.y) && b.y[folderIndexB] ? b.y[folderIndexB] : 0;
      
      // Sort by y-value in descending order (highest y at top)
      return yValueB - yValueA;
    });
    
    console.log('Filtered and sorted playlist:', filteredVideos);
    setPlaylist(filteredVideos);
    
    // Reset search when changing folders
    setSearchTerm('');
    setSearchResults([]);
  };

  // Update playlist when videos or selected folder changes
  useEffect(() => {
    handleFolderClick(selectedFolder);
  }, [videos, selectedFolder]);
  
  // Handle reordering of videos
  const handleReorderVideos = async (event: CustomEvent) => {
    try {
      console.log('Reorder event:', event.detail);
      
      // Create a copy of the current playlist
      const reordered = Array.from(playlist);
      
      // Get the moved item
      const movedItem = reordered[event.detail.from];
      
      // Remove the item from its original position
      reordered.splice(event.detail.from, 1);
      
      // Insert it at the new position
      reordered.splice(event.detail.to, 0, movedItem);
      
      // Update y array for each video for the selected folder
      const folderId = selectedFolder ?? "00000000-0000-0000-0000-0000000000D1";
      console.log('Current folder ID:', folderId);
      
      const updatedVideos = reordered.map((video, idx) => {
        // y is an array of positions per folder
        let newY = Array.isArray(video.y) ? [...video.y] : [];
        
        // Find index for current folder
        let folderIndex = video.folder_id?.findIndex((id) => id === folderId);
        if (folderIndex === undefined || folderIndex < 0) folderIndex = 0;
        
        // Assign y-value (highest number = highest position)
        // Multiply by 100 to leave room for future insertions without reordering everything
        newY[folderIndex] = (reordered.length - idx) * 100;
        console.log(`Video ${video.id} new y-value at index ${folderIndex}:`, newY[folderIndex]);
        
        return { ...video, y: newY };
      });
      
      // Update state first for immediate UI feedback
      setPlaylist(updatedVideos);
      setVideos(videos.map(v => {
        const found = updatedVideos.find(u => u.id === v.id);
        return found ? found : v;
      }));
      
      // Complete the reorder event immediately to improve UI responsiveness
      event.detail.complete();
      
      // Update backend for all affected videos
      try {
        for (const video of updatedVideos) {
          let folderIndex = video.folder_id?.findIndex((id) => id === folderId);
          if (folderIndex === undefined || folderIndex < 0) folderIndex = 0;
          
          console.log(`Updating video ${video.id} in backend with y:`, video.y);
          
          const response = await fetch(`https://localhost:7281/notes/api/v1/videos/${video.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              Y: video.y  // Capital 'Y' to match the backend model property
            })
          });
          
          if (!response.ok) {
            console.error(`Failed to update video ${video.id}:`, await response.text());
          }
        }
        console.log('Backend update complete');
      } catch (error) {
        console.error('Error updating backend:', error);
        showToast({ message: 'Failed to save video positions', duration: 2000, color: 'danger' });
      }
    } catch (error) {
      console.error('Error reordering videos:', error);
      showToast({ message: 'Failed to reorder videos', duration: 2000, color: 'danger' });
      // Revert the reorder if it failed
      event.detail.complete(false);
    }
  };

  // Handle play/pause toggle
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      // Don't reset the current time, just resume from where it was paused
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(err => {
          console.error('Error playing video:', err);
          setVideoError('Failed to play video');
        });
    }
  };

  // Handle stop playback and hide player
  const handleStopPlayback = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setSelectedVideo(null);
    setCurrentTime(0);
    setDuration(0);
    console.log('Playback stopped and player hidden');
  };

  // Add a video to the queue
  const addToQueue = (video: DownloadedVideo) => {
    setVideoQueue(prev => [...prev, video]);
  };

  // Handle video playback
  const handlePlayVideo = async (video: DownloadedVideo) => {
    if (!video || !video.id) {
      console.error('Invalid video object:', video);
      return;
    }

    try {
      console.log('Starting video playback for:', video.title);
      setCurrentTime(0);
      setDuration(0);
      setIsLoadingVideo(true);
      setVideoError(null);
      setSelectedVideo(video);

      const videoIndex = playlist.findIndex(v => v.id === video.id);
      if (videoIndex !== -1) {
        setCurrentIndex(videoIndex);
      }

      if (videoRef.current) {
        const videoUrl = `https://localhost:7281/notes/api/v1/videos/${video.id}/stream?format=${video.format}`;
        console.log('Setting video source:', videoUrl);
        
        if (videoRef.current.src) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }

        videoRef.current.src = videoUrl;

        // Make sure the onended event is properly set for this video
        // This is the ONLY place we should set the onended handler
        videoRef.current.onended = async () => {
          await handleNext(); // This is the same as the forward button
        };

        await videoRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error in handlePlayVideo:', error);
      setVideoError('Failed to play video. Please try again.');
    } finally {
      setIsLoadingVideo(false);
    }
  };

  // Handle seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newTime = parseFloat(e.target.value);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Handle progress bar click
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Initialize video element
  useEffect(() => {
    if (!videoRef.current || isInitializedRef.current) return;

    const video = videoRef.current;
    video.preload = 'auto';
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    isInitializedRef.current = true;

    return () => {
      isInitializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchFolders = async () => {
      if (!user?.sub) return;
      
      try {
        setIsLoadingFolders(true);
        const folderData = await getFolders(user.sub);
        // Filter folders with folder_id -1
        const rootFolders = folderData.filter((folder: Folder) => folder.folder_id === "00000000-0000-0000-0000-0000000000D1");
        setFolders(rootFolders);
      } catch (err) {
        console.error('Error fetching folders:', err);
      } finally {
        setIsLoadingFolders(false);
      }
    };

    const fetchVideos = async () => {
      try {
        const response = await fetch("https://localhost:7281/notes/api/v1/videos");
        if (!response.ok) {
          throw new Error('Failed to fetch videos');
        }
        const data = await response.json();
        
        // Ensure all videos have the root folder (-1) in their folder_id array
        const processedData = data.map((video: any) => {
          // If folder_id is null or undefined, initialize it as an array with -1
          let folder_id = video.folder_id;
          if (!folder_id) {
            folder_id = ["00000000-0000-0000-0000-0000000000D1"];
          } else if (Array.isArray(folder_id) && !folder_id.includes("00000000-0000-0000-0000-0000000000D1")) {
            folder_id = [...folder_id, "00000000-0000-0000-0000-0000000000D1"];
          }
          // Ensure y is an array and initialize with default values if empty
          let y = Array.isArray(video.y) ? video.y : [];
          
          // If y is empty and folder_id exists, initialize y values for each folder
          if (y.length === 0 && Array.isArray(folder_id) && folder_id.length > 0) {
            // Default y value based on video ID to maintain consistent initial order
            // Higher IDs (newer videos) get higher y values to appear at the top
            const defaultY = video.id * 100;
            y = folder_id.map(() => defaultY);
          }
          
          console.log(`Video ${video.id} initialized with folder_id:`, folder_id, 'and y:', y);
          return { ...video, folder_id, y };
        });
        
        setVideos(processedData);
        // Initialize playlist with all available videos
        setPlaylist(processedData);
      } catch (err) {
        setError('Failed to load videos. Please try again.');
        console.error('Error fetching videos:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
    fetchFolders();
  }, [user?.sub]);

  // Add navigation listener
  useEffect(() => {
    const unlisten = history.listen((location) => {
      // Only cleanup when leaving the media section entirely
      if (!location.pathname.startsWith('/app/media')) {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.src = '';
          videoRef.current.load();
        }
        setSelectedVideo(null);
        setIsPlaying(false);
        setIsLoadingVideo(false);
        setVideoError(null);
      }
    });

    return () => {
      unlisten();
    };
  }, [history]);

  // Play a random video from the playlist
  const playRandomVideo = async () => {
    if (playlist.length <= 1) return;
    
    // Get a random index that's different from the current one
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * playlist.length);
    } while (randomIndex === currentIndex && playlist.length > 1);
    
    console.log('Playing random video:', randomIndex, playlist[randomIndex]);
    await handlePlayVideo(playlist[randomIndex]);
  };

  const handleNext = async () => {
    
    if (videoQueue.length > 0) {
      const [next, ...rest] = videoQueue;
      setVideoQueue(rest);
      setCurrentIndex(playlist.findIndex(v => v.id === next.id)); // <-- update index
      await handlePlayVideo(next);
    } else if (randomMode) {
      await playRandomVideo();
    } else if (playlist.length > 0) {
      // Play the next video in the playlist sequentially
      // If we're at the end, loop back to the beginning
      const nextIndex = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
      setCurrentIndex(nextIndex); // <-- update index
      await handlePlayVideo(playlist[nextIndex]);
    } else {
      setIsPlaying(false);
    }
  };

  const handlePrevious = async () => {
    if (playlist.length === 0) {
      console.log('No videos in playlist');
      return;
    }
    
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    console.log('Playing previous video:', prevIndex, playlist[prevIndex]);
    await handlePlayVideo(playlist[prevIndex]);
  };

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const duration = video.duration;
      console.log('Time update:', currentTime, 'Duration:', duration);
      setCurrentTime(currentTime);
      setDuration(duration);
    };

    const handleDurationChange = () => {
      console.log('Duration changed:', video.duration);
      setDuration(video.duration);
    };

    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded:', video.duration);
      setDuration(video.duration);
    };

    const handleLoadedData = () => {
      console.log('Video loaded data');
      setIsLoadingVideo(false);
      setVideoError(null);
    };

    const handleError = (e: Event) => {
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
      
      console.error('Video error:', errorMessage, error);
      setVideoError(errorMessage);
      setIsPlaying(false);
      setIsLoadingVideo(false);
    };

    // Add event listeners
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    // We no longer need this global handler as we're setting it directly in handlePlayVideo
    // Remove any existing handler to avoid conflicts
    if (videoRef.current) {
      videoRef.current.onended = null;
    }
    video.addEventListener('pause', () => {
      // Only set isPlaying to false if not at the end of the video
      if (video.currentTime < video.duration) {
        console.log('Video paused');
        setIsPlaying(false);
      }
    });
    video.addEventListener('play', () => {
      console.log('Video playing');
      setIsPlaying(true);
    });
    video.addEventListener('waiting', () => {
      console.log('Video waiting');
      setIsLoadingVideo(true);
    });
    video.addEventListener('playing', () => {
      console.log('Video playing');
      setIsLoadingVideo(false);
    });
    video.addEventListener('pause', () => {
      // Only set isPlaying to false if not at the end of the video
      if (video.currentTime < video.duration) {
        console.log('Video paused');
        setIsPlaying(false);
      }
    });

    return () => {
      // Remove event listeners on cleanup
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      // Don't remove the onended handler as we're using the direct property
      video.onended = null;
      video.removeEventListener('pause', () => {});
      video.removeEventListener('play', () => {});
      video.removeEventListener('waiting', () => {});
      video.removeEventListener('playing', () => {});
    };
  }, []);

  // Format time in MM:SS format
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Calculate progress percentage (derived from currentTime and duration)
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleOptionsClick = (video: DownloadedVideo) => {
    setVideoForOptions(video);
    const initialFolderId = video.folder_id && video.folder_id.length > 0 ? video.folder_id[0] : null;
    setSelectedFolderId(initialFolderId);
    setOriginalFolderId(initialFolderId);
    // Initialize the selected folder IDs with the video's current folders
    const folderIds = video.folder_id?.filter(id => id !== "00000000-0000-0000-0000-0000000000D1") || [];
    setSelectedFolderIds(folderIds);
    
    // Initialize the editing fields with the video's current values
    setEditedTitle(video.title || '');
    setEditedArtist(video.artist || '');
    setEditedThumbnailUrl(video.thumbnailUrl || '');
    
    setShowOptionsModal(true);
    console.log('Opening options for video:', video.id, 'with folders:', folderIds);
  };

  const handleFolderChange = (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  const handleThumbnailFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoForOptions || !event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    
    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      showToast({
        message: 'Please select an image file (JPEG, PNG, GIF)',
        duration: 2000,
        color: 'danger'
      });
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Instead of using the API, let's use a simpler approach:
      // Convert the image to a data URL and use that directly
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target && e.target.result) {
          // Set the data URL as the thumbnail URL
          const dataUrl = e.target.result.toString();
          setEditedThumbnailUrl(dataUrl);
          
          showToast({
            message: 'Thumbnail loaded successfully',
            duration: 2000,
            color: 'success'
          });
          
          setIsUploading(false);
          setUploadProgress(100);
        }
      };
      
      reader.onerror = () => {
        showToast({
          message: 'Failed to load image',
          duration: 2000,
          color: 'danger'
        });
        setIsUploading(false);
      };
      
      // Start reading the file as a data URL
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Error handling thumbnail:', error);
      showToast({
        message: error instanceof Error ? error.message : 'Failed to process thumbnail',
        duration: 2000,
        color: 'danger'
      });
      setIsUploading(false);
      
      // Reset the file input
      const fileInput = document.getElementById('thumbnail-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };

  const handleSaveFolderChange = async () => {
    if (!videoForOptions) {
      console.error('No video selected for folder change');
      return;
    }
    
    try {
      console.log('Saving changes for video:', videoForOptions.id);
      console.log('Selected folder IDs:', selectedFolderIds);
      console.log('Edited title:', editedTitle);
      console.log('Edited artist:', editedArtist);
      
      // Prepare the new folder IDs array
      // Always include -1 (root folder) and add all selected folders
      let newFolderIds: string[] = ["00000000-0000-0000-0000-0000000000D1"]; // Root folder ID always included
      
      // Add all selected folder IDs except -1 (which is already included)
      selectedFolderIds.forEach(id => {
        if (id !== "00000000-0000-0000-0000-0000000000D1" && !newFolderIds.includes(id)) {
          newFolderIds.push(id);
        }
      });
      
      console.log('New folder IDs to save:', newFolderIds);
      
      // Use the data URL directly if present
      let thumbnailUrl = editedThumbnailUrl;
      console.log('Using thumbnail URL:', thumbnailUrl);
      
      // Create an update object with all the edited fields
      const updateData = {
        Id: videoForOptions.id,
        folder_id: newFolderIds,
        Title: editedTitle,       // Capital T to match backend DTO property
        Artist: editedArtist,     // Capital A to match backend DTO property
        // Send the thumbnailUrl directly, including data URLs
        ThumbnailUrl: thumbnailUrl  // Capital T to match backend DTO property
      };
      
      console.log('Sending update data:', JSON.stringify(updateData));
      
      // Send the update request to the API
      console.log('Sending update request to API:', `https://localhost:7281/notes/api/v1/videos/${videoForOptions.id}`);
      
      const response = await fetch(`https://localhost:7281/notes/api/v1/videos/${videoForOptions.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      // Get the full response text for debugging
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      if (!response.ok) {
        let errorMessage = 'Failed to update video';
        try {
          const errorData = JSON.parse(responseText);
          console.error('API error response:', errorData);
          if (errorData.message) {
            errorMessage = errorData.message;
          }
          if (errorData.details) {
            console.error('Error details:', errorData.details);
          }
        } catch (e) {
          console.error('API error response (text):', responseText);
        }
        throw new Error(errorMessage);
      }
      
      // Parse the response to get the updated video
      let updatedVideo;
      try {
        updatedVideo = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing response:', e);
        // If parsing fails, create a basic updated video object with all the edited fields
        updatedVideo = {
          ...videoForOptions,
          folder_id: newFolderIds,
          title: editedTitle,
          artist: editedArtist,
          thumbnailUrl: thumbnailUrl
        };
      }

      // Update the video in the local state
      setVideos(videos.map(v => 
        v.id === videoForOptions.id ? { 
          ...v, 
          folder_id: newFolderIds,
          title: editedTitle,
          artist: editedArtist,
          thumbnailUrl: thumbnailUrl 
        } : v
      ));
      
      // Update the playlist
      setPlaylist(playlist.map(v => 
        v.id === videoForOptions.id ? { 
          ...v, 
          folder_id: newFolderIds,
          title: editedTitle,
          artist: editedArtist,
          thumbnailUrl: thumbnailUrl 
        } : v
      ));
      
      // Update the videoForOptions state
      setVideoForOptions({
        ...videoForOptions,
        folder_id: newFolderIds,
        title: editedTitle,
        artist: editedArtist,
        thumbnailUrl: thumbnailUrl
      });

      // Prepare toast message
      let message = '';
      
      if (selectedFolderIds.length === 0 || (selectedFolderIds.length === 1 && selectedFolderIds[0] === "00000000-0000-0000-0000-0000000000D1")) {
        message = 'Removed from all folders';
      } else if (selectedFolderIds.length === 1) {
        const folderName = folders.find(f => f.id === selectedFolderIds[0])?.name || 'folder';
        message = `Added to ${folderName}`;
      } else {
        message = `Added to ${selectedFolderIds.length} folders`;
      }
      
      // Show success message
      showToast({
        message,
        duration: 2000,
        color: 'success'
      });
      
      // Update state and close the modal
      console.log('Update successful, closing modal');
      setShowOptionsModal(false);
    } catch (error) {
      console.error('Error updating video folder:', error);
      showToast({
        message: 'Failed to update folder',
        duration: 2000,
        color: 'danger'
      });
    }
  };

  const handleDelete = async () => {
    if (!videoForOptions) return;

    try {
      const response = await fetch(`https://localhost:7281/notes/api/v1/videos/${videoForOptions.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete video');
      }

      // Stop playback if the deleted video is currently playing
      if (videoRef.current && selectedVideo?.id === videoForOptions.id) {
        videoRef.current.pause();
        setSelectedVideo(null);
        setIsPlaying(false);
      }

      // Update the videos list
      setVideos(videos.filter(v => v.id !== videoForOptions.id));
      setShowDeleteAlert(false);
      setShowOptionsModal(false);
    } catch (error) {
      console.error('Error deleting video:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete video');
    }
  };

  const handleVideoSelect = (videoId: number) => {
    setSelectedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    try {
      // Delete each selected video
      for (const videoId of selectedVideos) {
        const response = await fetch(`https://localhost:7281/notes/api/v1/videos/${videoId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to delete video ${videoId}`);
        }

        // Stop playback if the deleted video is currently playing
        if (videoRef.current && selectedVideo?.id === String(videoId)) {
          videoRef.current.pause();
          setSelectedVideo(null);
          setIsPlaying(false);
        }
      }

      // Update the videos list
      setVideos(videos.filter(v => !selectedVideos.has(Number(v.id))));
      setSelectedVideos(new Set());
      setShowBulkActionsModal(false);
    } catch (error) {
      console.error('Error deleting videos:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete videos');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {/* Toggle Sidebar Button */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 1000,
        }}>
          <IonButton
            fill="clear"
            onClick={() => setShowSidebar(!showSidebar)}
            style={{
              '--background': 'rgba(0, 0, 0, 0.5)',
              '--border-radius': '50%',
              width: '40px',
              height: '40px',
              margin: '0',
            }}
          >
            <IonIcon icon={showSidebar ? closeOutline : folderOutline} slot="icon-only" />
          </IonButton>
        </div>
        <IonContent className="ion-padding" style={{ '--padding-bottom': '80px' }}>
          <h1>Downloaded Videos</h1>
          
          {/* Search bar for filtering videos by title or artist */}
          <div className="search-and-actions" style={{ marginBottom: '16px' }}>
            <div className="search-container" style={{ marginBottom: '8px' }}>
              <IonSearchbar
                value={searchTerm}
                onIonChange={(e: CustomEvent) => handleSearch(e.detail.value || '')}
                placeholder="Search by title or artist"
                animated
                showCancelButton="focus"
                debounce={300}
              />
              {searchTerm && (
                <div className="search-results-info" style={{ textAlign: 'center', margin: '8px 0' }}>
                  <IonText color="medium">
                    {searchResults.length === 0 ? 
                      'No videos found' : 
                      `Found ${searchResults.length} video${searchResults.length === 1 ? '' : 's'}`}
                  </IonText>
                </div>
              )}
            </div>
            
            <div className="action-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <IonButton
                onClick={handleAutoSortByArtist}
                disabled={isLoading}
                fill="outline"
                color="primary"
                size="small"
              >
                <IonIcon icon={folderOutline} slot="start" />
                Auto-Sort by Artist
              </IonButton>
            </div>
          </div>
          
          {error && (
            <IonAlert
              isOpen={!!error}
              onDidDismiss={() => setError(null)}
              header="Error"
              message={error}
              buttons={['OK']}
            />
          )}

          <IonAlert
            isOpen={showDeleteAlert}
            onDidDismiss={() => setShowDeleteAlert(false)}
            header="Delete Video"
            message={`Are you sure you want to delete "${videoForOptions?.title}"?`}
            buttons={[
              {
                text: 'Cancel',
                role: 'cancel',
                handler: () => setShowDeleteAlert(false)
              },
              {
                text: 'Delete',
                role: 'destructive',
                handler: handleDelete
              }
            ]}
          />

          <IonAlert
            isOpen={showBulkActionsModal}
            onDidDismiss={() => setShowBulkActionsModal(false)}
            header="Delete Selected Videos"
            message={`Are you sure you want to delete ${selectedVideos.size} selected videos?`}
            buttons={[
              {
                text: 'Cancel',
                role: 'cancel',
                handler: () => setShowBulkActionsModal(false)
              },
              {
                text: 'Delete',
                role: 'destructive',
                handler: handleBulkDelete
              }
            ]}
          />

          <IonModal
            isOpen={showOptionsModal}
            onDidDismiss={() => setShowOptionsModal(false)}
          >
            <IonHeader>
              <IonToolbar>
                <IonTitle>Video Options</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setShowOptionsModal(false)}>
                    <IonIcon icon={closeOutline} slot="icon-only" />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
              {videoForOptions && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <IonThumbnail style={{ marginRight: '16px', minWidth: '120px', minHeight: '90px', marginBottom: '16px' }}>
                      <IonImg 
                        src={editedThumbnailUrl || videoForOptions.thumbnailUrl || `https://localhost:7281/notes/api/v1/videos/${videoForOptions.id}/thumbnail`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          const imgElement = e.target as HTMLImageElement;
                          if (imgElement.src.includes('maxresdefault')) {
                            imgElement.src = imgElement.src.replace('maxresdefault', 'hqdefault');
                          } else if (imgElement.src.includes('hqdefault')) {
                            imgElement.src = imgElement.src.replace('hqdefault', 'mqdefault');
                          } else if (imgElement.src.includes('mqdefault')) {
                            imgElement.src = imgElement.src.replace('mqdefault', 'default');
                          } else {
                            imgElement.src = 'https://via.placeholder.com/120x90?text=No+Thumbnail';
                          }
                        }}
                      />
                    </IonThumbnail>
                    
                    <IonItem>
                      <IonLabel position="stacked">Title</IonLabel>
                      <IonInput
                        value={editedTitle}
                        onIonChange={(e) => setEditedTitle(e.detail.value || '')}
                        placeholder="Video title"
                      />
                    </IonItem>
                    
                    <IonItem>
                      <IonLabel position="stacked">Artist</IonLabel>
                      <IonInput
                        value={editedArtist}
                        onIonChange={(e) => setEditedArtist(e.detail.value || '')}
                        placeholder="Artist name"
                      />
                    </IonItem>
                    
                    <IonItem>
                      <IonLabel position="stacked">Thumbnail URL</IonLabel>
                      <IonInput
                        value={editedThumbnailUrl}
                        onIonChange={(e) => setEditedThumbnailUrl(e.detail.value || '')}
                        placeholder="Custom thumbnail URL"
                      />
                    </IonItem>
                    
                    <div style={{ margin: '16px 0' }}>
                      <IonLabel>Upload Custom Thumbnail</IonLabel>
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                        <input
                          type="file"
                          id="thumbnail-upload"
                          accept="image/*"
                          onChange={handleThumbnailFileUpload}
                          style={{ display: 'none' }}
                        />
                        <IonButton
                          expand="block"
                          fill="outline"
                          onClick={() => document.getElementById('thumbnail-upload')?.click()}
                          disabled={isUploading}
                        >
                          <IonIcon icon={add} slot="start" />
                          {isUploading ? 'Uploading...' : 'Upload Image'}
                        </IonButton>
                      </div>
                      {isUploading && (
                        <IonProgressBar value={uploadProgress / 100} style={{ marginTop: '8px' }} />
                      )}
                      <p style={{ fontSize: '0.8rem', color: 'var(--ion-color-medium)', margin: '8px 0 0 0' }}>
                        Upload a JPG, PNG, or GIF image from your computer to use as the thumbnail.
                      </p>
                    </div>
                    
                    <p style={{ margin: '8px 0', color: 'var(--ion-color-medium)' }}>
                      Downloaded on {new Date(videoForOptions.downloadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <IonItem>
                    <IonLabel>Manage Folders</IonLabel>
                    <IonSelect 
                      value={selectedFolderIds}
                      placeholder="Select Folders"
                      onIonChange={e => setSelectedFolderIds(e.detail.value)}
                      interface="popover"
                      multiple={true}
                    >
                      {folders.map(folder => (
                        <IonSelectOption key={folder.id} value={folder.id}>
                          {folder.name}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                  
                  <div style={{ marginTop: '16px', padding: '0 16px' }}>
                    <IonLabel>Selected Folders:</IonLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {selectedFolderIds.length === 0 ? (
                        <IonText color="medium">No folders selected (will be in root only)</IonText>
                      ) : (
                        selectedFolderIds.map(folderId => {
                          const folder = folders.find(f => f.id === folderId);
                          return folder ? (
                            <IonChip 
                              key={folder.id} 
                              color="primary"
                              outline={true}
                              onClick={() => {
                                setSelectedFolderIds(prev => prev.filter(id => id !== folder.id));
                              }}
                            >
                              <IonLabel>{folder.name}</IonLabel>
                              <IonIcon icon={closeOutline} />
                            </IonChip>
                          ) : null;
                        })
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <IonButton
                      expand="block"
                      color="primary"
                      onClick={handleSaveFolderChange}
                    >
                      <IonIcon icon={downloadOutline} slot="start" />
                      Save
                    </IonButton>
                    <IonButton
                      expand="block"
                      color="medium"
                      onClick={() => {
                        setSelectedFolderId(originalFolderId);
                        setShowOptionsModal(false);
                      }}
                    >
                      Cancel
                    </IonButton>
                    <IonButton
                      expand="block"
                      color="danger"
                      onClick={() => setShowDeleteAlert(true)}
                    >
                      <IonIcon icon={trashOutline} slot="start" />
                      Delete Video
                    </IonButton>
                  </div>
                </>
              )}
            </IonContent>
          </IonModal>

          {selectedVideos.size > 0 && (
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'var(--ion-color-light)',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 -2px 4px rgba(0,0,0,0.1)',
              zIndex: 1000
            }}>
              <IonText>
                <p style={{ margin: 0 }}>{selectedVideos.size} videos selected</p>
              </IonText>
              <IonButton color="danger" onClick={() => setShowBulkActionsModal(true)}>
                <IonIcon icon={trashOutline} slot="start" />
                Delete Selected
              </IonButton>
            </div>
          )}

          {isLoading ? (
            <IonList>
              {[...Array(5)].map((_, index) => (
                <IonCard key={index} style={{ marginBottom: '16px' }}>
                  <IonCardHeader>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <IonSkeletonText animated style={{ width: '120px', height: '90px', marginRight: '16px' }} />
                      <div style={{ flex: 1 }}>
                        <IonSkeletonText animated style={{ width: '80%', height: '20px', marginBottom: '8px' }} />
                        <IonSkeletonText animated style={{ width: '60%', height: '16px' }} />
                      </div>
                    </div>
                  </IonCardHeader>
                </IonCard>
              ))}
            </IonList>
          ) : playlist.length > 0 ? (
            <IonReorderGroup
              disabled={false}
              onIonItemReorder={handleReorderVideos}
            >
              {playlist.map((video) => (
                <IonItem 
                  key={video.id} 
                  className="video-item"
                  button
                  onClick={() => handlePlayVideo(video)} // <-- Make the whole item clickable
                >
                  <IonReorder slot="start">
                    <IonIcon icon={menuOutline} style={{ fontSize: 24, color: '#888', cursor: 'grab' }} />
                  </IonReorder>
                  <IonThumbnail slot="start" style={{ minWidth: '120px', minHeight: '90px' }}>
                    <IonImg
                      src={video.thumbnailUrl || `https://localhost:7281/notes/api/v1/videos/${video.id}/thumbnail`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        const imgElement = e.target as HTMLImageElement;
                        if (imgElement.src.includes('maxresdefault')) {
                          imgElement.src = imgElement.src.replace('maxresdefault', 'hqdefault');
                        } else if (imgElement.src.includes('hqdefault')) {
                          imgElement.src = imgElement.src.replace('hqdefault', 'mqdefault');
                        } else if (imgElement.src.includes('mqdefault')) {
                          imgElement.src = imgElement.src.replace('mqdefault', 'default');
                        } else {
                          imgElement.src = 'https://via.placeholder.com/120x90?text=No+Thumbnail';
                        }
                      }}
                    />
                  </IonThumbnail>
                  <IonLabel>
                    <h2>{video.title}</h2>
                    <p>Downloaded on {new Date(video.downloadedAt).toLocaleDateString()}</p>
                  </IonLabel>
                  <IonButton
                    fill="clear"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents double-trigger if you want to keep the play button
                      handlePlayVideo(video);
                    }}
                  >
                    <IonIcon icon={playOutline} slot="icon-only" />
                  </IonButton>
                  <IonButton
                    fill="clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToQueue(video);
                    }}
                  >
                    <IonIcon icon={add} slot="icon-only" />
                  </IonButton>
                  <IonButton
                    fill="clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOptionsClick(video);
                    }}
                  >
                    <IonIcon icon={ellipsisHorizontalOutline} slot="icon-only" />
                  </IonButton>
                </IonItem>
              ))}
            </IonReorderGroup>
          ) : (
            <IonText>
              <p>No videos in this folder.</p>
            </IonText>
          )}

          {selectedVideo && !selectedVideos.size && (
            <div style={{
              position: 'fixed',
              bottom: '40px',
              left: 0,
              right: 0,
              backgroundColor: 'var(--ion-color-light)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 -2px 4px rgba(0,0,0,0.1)',
              zIndex: 1000,
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <IonThumbnail style={{ minWidth: '64px', minHeight: '64px' }}>
                  <IonImg 
                    src={selectedVideo.thumbnailUrl || `https://localhost:7281/notes/api/v1/videos/${selectedVideo.id}/thumbnail`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      const imgElement = e.target as HTMLImageElement;
                      if (imgElement.src.includes('maxresdefault')) {
                        imgElement.src = imgElement.src.replace('maxresdefault', 'hqdefault');
                      } else if (imgElement.src.includes('hqdefault')) {
                        imgElement.src = imgElement.src.replace('hqdefault', 'mqdefault');
                      } else if (imgElement.src.includes('mqdefault')) {
                        imgElement.src = imgElement.src.replace('mqdefault', 'default');
                      } else {
                        imgElement.src = 'https://via.placeholder.com/64x64?text=No+Thumbnail';
                      }
                    }}
                  />
                </IonThumbnail>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <IonText>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{selectedVideo.title}</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--ion-color-medium)' }}>
                      {selectedVideo.format.toUpperCase()} • Downloaded on {new Date(selectedVideo.downloadedAt).toLocaleDateString()}
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
                  <IonButton fill="clear" onClick={handlePrevious}>
                    <IonIcon icon={playSkipBackOutline} slot="icon-only" />
                  </IonButton>
                  <IonButton fill="clear" onClick={handlePlayPause}>
                    {isLoadingVideo ? (
                      <IonSpinner name="dots" />
                    ) : isPlaying ? (
                      <IonIcon icon={pauseOutline} slot="icon-only" />
                    ) : (
                      <IonIcon icon={playOutline} slot="icon-only" />
                    )}
                  </IonButton>
                  <IonButton fill="clear" onClick={handleStopPlayback}>
                    <IonIcon icon={closeOutline} slot="icon-only" />
                  </IonButton>
                  <IonButton fill="clear" onClick={handleNext}>
                    <IonIcon icon={playSkipForwardOutline} slot="icon-only" />
                  </IonButton>
                  <IonButton fill="clear" onClick={() => setShowUpNextModal(true)}>
                    <IonIcon icon={ellipsisHorizontalOutline} slot="icon-only" />
                  </IonButton>
                  <IonButton 
                    fill="clear" 
                    color={randomMode ? 'primary' : 'medium'}
                    onClick={() => setRandomMode(!randomMode)}
                    title={randomMode ? 'Random mode: On' : 'Random mode: Off'}
                  >
                    <IonIcon icon={randomMode ? shuffleOutline : repeatOutline} slot="icon-only" />
                    {randomMode && (
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--ion-color-primary)',
                      }} />
                    )}
                  </IonButton>
                  <IonModal isOpen={showUpNextModal} onDidDismiss={() => setShowUpNextModal(false)}>
                    <IonHeader>
                      <IonToolbar>
                        <IonTitle>Up Next</IonTitle>
                        <IonButtons slot="end">
                          <IonButton onClick={() => setShowUpNextModal(false)}>
                            <IonIcon icon={closeOutline} slot="icon-only" />
                          </IonButton>
                        </IonButtons>
                      </IonToolbar>
                    </IonHeader>
                    <IonContent className="ion-padding">
                      {/* Show queue if not empty, otherwise show rest of playlist */}
                      {videoQueue.length > 0 ? (
                        <IonList lines="none">
                          {videoQueue.map((v, idx) => (
                            <IonItem key={v.id || idx}>
                              <IonThumbnail slot="start" style={{ minWidth: '40px', minHeight: '30px' }}>
                                <IonImg src={v.thumbnailUrl || `https://localhost:7281/notes/api/v1/videos/${v.id}/thumbnail`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </IonThumbnail>
                              <IonLabel>{v.title}</IonLabel>
                            </IonItem>
                          ))}
                        </IonList>
                      ) : (
                        <IonList lines="none">
                          {playlist.slice(currentIndex + 1).map((v, idx) => (
                            <IonItem key={v.id || idx}>
                              <IonThumbnail slot="start" style={{ minWidth: '40px', minHeight: '30px' }}>
                                <IonImg src={v.thumbnailUrl || `https://localhost:7281/notes/api/v1/videos/${v.id}/thumbnail`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </IonThumbnail>
                              <IonLabel>{v.title}</IonLabel>
                            </IonItem>
                          ))}
                        </IonList>
                      )}
                    </IonContent>
                  </IonModal>
                </div>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '0 16px',
                position: 'relative',
                height: '32px',
                marginTop: '8px',
                marginBottom: '8px',
              }}>
                <span style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--ion-color-medium)',
                  minWidth: '45px',
                  textAlign: 'right'
                }}>
                  {formatTime(currentTime)}
                </span>
                <div 
                  style={{
                    flex: 1,
                    height: '8px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '4px',
                    position: 'relative',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onClick={handleProgressBarClick}
                >
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${progress}%`,
                    backgroundColor: 'var(--ion-color-primary)',
                    borderRadius: '4px',
                    transition: 'width 0.1s linear',
                    zIndex: 1,
                  }} />
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    step="0.1"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '100%',
                      height: '100%',
                      margin: 0,
                      padding: 0,
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 2,
                    }}
                  />
                  {/* Custom thumb styling for Chrome */}
                  <style>{`
                    input[type=range]::-webkit-slider-thumb {
                      -webkit-appearance: none;
                      appearance: none;
                      width: 16px;
                      height: 16px;
                      border-radius: 50%;
                      background: var(--ion-color-primary);
                      border: 2px solid #fff;
                      box-shadow: 0 0 2px rgba(0,0,0,0.2);
                      margin-top: -4px;
                    }
                    input[type=range]:focus::-webkit-slider-thumb {
                      box-shadow: 0 0 0 4px rgba(0,123,255,0.2);
                    }
                    input[type=range]::-ms-fill-lower {
                      background: var(--ion-color-primary);
                    }
                    input[type=range]::-ms-fill-upper {
                      background:rgb(20, 19, 19);
                    }
                  `}</style>
                </div>
                <span style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--ion-color-medium)',
                  minWidth: '45px'
                }}>
                  {formatTime(duration)}
                </span>
              </div>
              <video
                ref={videoRef}
                style={{ display: 'none' }}
                
                playsInline
                preload="auto"
                controls={false}
                crossOrigin="anonymous"
                onTimeUpdate={(e) => {
                  const video = e.currentTarget;
                  console.log('Time update event:', video.currentTime, video.duration);
                  setCurrentTime(video.currentTime);
                  setDuration(video.duration);
                }}
                onDurationChange={(e) => {
                  const video = e.currentTarget;
                  console.log('Duration change event:', video.duration);
                  setDuration(video.duration);
                }}
                onCanPlay={(e) => {
                  console.log('Video can play event');
                  setIsLoadingVideo(false);
                }}
                onWaiting={(e) => {
                  console.log('Video waiting event');
                  setIsLoadingVideo(true);
                }}
                onPlaying={(e) => {
                  console.log('Video playing event');
                  setIsLoadingVideo(false);
                  setIsPlaying(true);
                }}
                onPause={(e) => {
                  console.log('Video pause event');
                  // Only set isPlaying to false if not at the end of the video
                  if (videoRef.current && videoRef.current.currentTime < videoRef.current.duration) {
                    setIsPlaying(false);
                  }
                }}
                onLoadedMetadata={(e) => {
                  console.log('Video metadata loaded');
                  const video = e.currentTarget;
                  setDuration(video.duration);
                }}
                onLoadedData={(e) => {
                  console.log('Video data loaded');
                  setIsLoadingVideo(false);
                }}
              />
            </div>
          )}
        </IonContent>
      </div>
      
      {/* Sidebar */}
      <div style={{
        width: '250px',
        backgroundColor: 'var(--ion-background-color, #121212)',
        borderLeft: '1px solid var(--ion-color-medium-shade)',
        padding: '16px',
        overflowY: 'auto',
        display: showSidebar ? 'flex' : 'none',
        flexDirection: 'column',
        gap: '8px',
        color: 'var(--ion-text-color, #ffffff)',
        position: 'absolute',
        right: '0',
        top: '0',
        bottom: '0',
        zIndex: 100,
        boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.3)'
      }}>
        <IonList style={{ background: 'transparent' }}>
          {/* Root folder button */}
          <IonItem 
            button 
            onClick={() => handleFolderClick(null)}
            style={{
              '--background': selectedFolder === null ? 'rgba(var(--ion-color-primary-rgb), 0.2)' : 'transparent',
              '--border-color': 'transparent',
              '--padding-start': '8px',
              '--inner-padding-end': '8px',
              marginBottom: '8px',
              borderRadius: '8px',
              border: selectedFolder === null ? '1px solid var(--ion-color-primary)' : '1px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            <IonIcon icon={folderOutline} slot="start" style={{ color: 'var(--ion-color-medium)' }} />
            <IonLabel>Root</IonLabel>
            <IonText slot="end" style={{ fontSize: '0.8rem', color: 'var(--ion-color-medium)' }}>
              {videos.filter(v => v.folder_id && Array.isArray(v.folder_id) && v.folder_id.includes("00000000-0000-0000-0000-0000000000D1")).length}
            </IonText>
          </IonItem>
          
          <IonText style={{ margin: '16px 0 8px 8px', display: 'block' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: 'var(--ion-color-medium)' }}>Folders</h3>
          </IonText>
          
          {isLoadingFolders ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
              <IonSpinner name="crescent" />
            </div>
          ) : folders.length > 0 ? (
            <IonList style={{ background: 'transparent' }}>
              {folders.map((folder) => (
                <IonItem 
                  key={folder.id} 
                  button 
                  onClick={() => handleFolderClick(folder.id)}
                  style={{
                    '--background': selectedFolder === folder.id ? 'rgba(var(--ion-color-primary-rgb), 0.2)' : 'transparent',
                    '--border-color': 'transparent',
                    '--padding-start': '8px',
                    '--inner-padding-end': '8px',
                    marginBottom: '4px',
                    borderRadius: '8px',
                    border: selectedFolder === folder.id ? '1px solid var(--ion-color-primary)' : '1px solid transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <IonIcon 
                    icon={folderOutline} 
                    slot="start" 
                    style={{ 
                      color: selectedFolder === folder.id 
                        ? 'var(--ion-color-primary)' 
                        : (folder.color || 'var(--ion-color-medium)') 
                    }} 
                  />
                  <IonLabel>{folder.name}</IonLabel>
                  <IonText slot="end" style={{ fontSize: '0.8rem', color: 'var(--ion-color-medium)' }}>
                    {videos.filter(v => v.folder_id && Array.isArray(v.folder_id) && v.folder_id.includes(folder.id)).length}
                  </IonText>
                </IonItem>
              ))}
            </IonList>
          ) : (
            <IonText color="medium">
              <p style={{ fontSize: '0.9rem', textAlign: 'center' }}>No folders found</p>
            </IonText>
          )}
        </IonList>
        
        <IonText style={{ margin: '0 0 16px 8px', display: 'block' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Folders</h3>
        </IonText>
        
        {/* Create Folder UI - Moved back to bottom */}
        <div style={{ marginTop: 'auto' }}>
          <IonText style={{ margin: '16px 0 8px 8px', display: 'block' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: 'var(--ion-color-primary)' }}>Create Folder</h3>
          </IonText>
          <IonItem style={{ '--background': 'transparent', '--border-color': 'transparent', '--padding-start': '0', '--inner-padding-end': '0' }}>
            <IonInput
              value={newFolderName}
              placeholder="Folder name"
              onIonChange={(e) => setNewFolderName(e.detail.value!)}
              style={{
                '--padding-start': '12px',
                '--padding-end': '12px',
                '--background': 'rgba(255, 255, 255, 0.1)',
                '--color': 'white',
                '--border-radius': '8px',
                '--placeholder-color': 'rgba(255, 255, 255, 0.6)',
                '--placeholder-opacity': '1',
                marginRight: '8px',
                flex: '1',
                fontSize: '0.95rem',
                height: '48px',
                '--border-color': 'transparent',
                '--highlight-color': 'var(--ion-color-primary)'
              }}
            />
            <IonButton 
              fill="solid"
              color="primary"
              style={{
                '--border-radius': '8px',
                '--padding-start': '0',
                '--padding-end': '0',
                '--padding-top': '0',
                '--padding-bottom': '0',
                margin: '0',
                height: '48px',
                width: '48px',
                '--box-shadow': 'none',
                '--background-hover': 'var(--ion-color-primary-shade)'
              }}
              onClick={() => {
                if (newFolderName.trim()) {
                  handleAddFolder(
                    newFolderName,
                    '', // folderDescription not used here
                    user,
                    "00000000-0000-0000-0000-0000000000D1", // folder_id -1 for media folders (as string)
                    4,  // folder_type 4 for media folders
                    0,  // x position
                    0,  // y position
                    showToast,
                    setFolders,
                    setNewFolderName,
                    () => {}, // setFolderDescription not used here
                    () => {}
                  );
                }
              }}
              disabled={!newFolderName.trim()}
            >
              <IonIcon icon={add} style={{ fontSize: '24px' }} slot="icon-only" />
            </IonButton>
          </IonItem>
        </div>
      </div>
    </div>
  );
};

const MediaFolder: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const [showToast, setShowToast] = useState(true);

  const activeTab = location.pathname.includes('/app/media/downloaded') || location.pathname.includes('/app/media/browser')
    ? 'media'
    : location.pathname.includes('/app/settings')
    ? 'settings'
    : 'notes';

  const handleTabChange = (e: CustomEvent) => {
    const value = e.detail.value;
    if (typeof value === 'string') {
      // Ensure we're using the full path
      const path = value.startsWith('/app/media') ? value : `/app/media/${value}`;
      history.push(path);
    }
  };

  // Show toast and redirect when the component mounts
  useEffect(() => {
    setShowToast(true);
  }, []);

  return (
    <IonPage>
      <IonToast
        isOpen={showToast}
        onDidDismiss={() => {
          setShowToast(false);
          history.push('/app/list');
        }}
        message="Work in Progress"
        duration={2000}
        position="middle"
        style={{
          '--width': '80%',
          '--max-width': '400px',
          '--height': '100px',
          'font-size': '1.5rem',
          '--border-radius': '12px',
          '--box-shadow': '0 4px 16px rgba(0, 0, 0, 0.2)'
        }}
      />
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Media</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={location.pathname} onIonChange={handleTabChange} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
            <IonSegmentButton value="/app/media/downloaded" style={{ '--padding-top': '4px', '--padding-bottom': '4px' }}>
              <IonIcon icon={folderOutline} />
              <IonLabel>Downloads</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="/app/media/browser" style={{ '--padding-top': '4px', '--padding-bottom': '4px' }}>
              <IonIcon icon={searchOutline} />
              <IonLabel>YouTube</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <Route exact path="/app/media">
          <Redirect to="/app/media/downloaded" />
        </Route>
        <Route exact path="/app/media/downloaded">
          <DownloadedVideosTab />
        </Route>
        <Route exact path="/app/media/browser">
          <YouTubeBrowserTab />
        </Route>
      </IonContent>
      <IonTabBar>
              <IonTabButton tab="notes" selected={activeTab === 'notes'} onClick={() => history.push('/app/list')}>
                <IonIcon icon={folderOutline} />
                <IonLabel>Notes</IonLabel>
              </IonTabButton>
              <IonTabButton tab="media" selected={activeTab === 'media'} onClick={() => history.push('/app/media/downloaded')}>
                <IonIcon icon={musicalNoteOutline} />
                <IonLabel>Media</IonLabel>
              </IonTabButton>
              
            </IonTabBar>
    </IonPage>
  );
};

export default MediaFolder;