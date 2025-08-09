import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonDatetime,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonMenuButton,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
  IonReorderGroup,
  IonReorder,
  useIonAlert,
  useIonRouter,
  useIonToast,
  useIonViewWillEnter,
  IonTabBar,
  IonTabButton,
  IonToggle,
  IonText,
  IonListHeader,
} from "@ionic/react";
import { 
  addOutline, 
  folderOutline, 
  trashBinOutline, 
  reorderThreeOutline, 
  saveOutline, 
  sendOutline, 
  calculatorOutline, 
  fileTrayFullOutline, 
  musicalNoteOutline, 
  createOutline, 
  analyticsOutline, 
  pinOutline, 
  attachOutline, 
  micOutline,
  micOffOutline,
  documentAttachOutline, 
  codeDownloadOutline, 
  imageOutline, 
  closeCircleOutline, 
  lockClosedOutline, 
  closeOutline 
} from "ionicons/icons";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getNotes, addNote, updateNote, deleteNote, Note, getFolders, addFolder, Folder, deleteFolder, updateFolder, uploadNoteImage, uploadVoiceMessage, uploadFiles, updateFolderPassword, getCoWorkerDetails, getUserCoWorkers, updateFolderCoWorkers } from './apiService';
import './List.css';
import handleDrag from "./draggingHandler";
import { useAuth0 } from '@auth0/auth0-react';
import { useHistory, useParams } from "react-router-dom";
import { doRefresh, handleAddFolder, handleAddNote, handleDeleteFolder, handleDeleteNote, handleEditFolder, handleEditNote, handleFolderClick, handleUpdateFolder, handleUpdateNote, handleUploadFilesToServer } from "./apiCalls";
import { hashStringSHA256 } from './hash';

declare global {
  interface Window {
    MediaRecorder: any;
  }
}

// Define a union type for items that can be reordered
type ReorderableItem = Note | Folder;

// Helper function to determine if an item is a Note
const isNote = (item: ReorderableItem): item is Note => {
  return (item as Note).text !== undefined;
};

// Helper function to determine if an item is a Folder
const isFolder = (item: ReorderableItem): item is Folder => {
  return (item as Folder).folder_type !== undefined;
};

// Interface for drag data
interface DragData {
  type: 'note' | 'folder';
  id: string;
}

// CSS for drag and drop
const dragStyles = {
  folderDropZone: {
    border: '2px dashed #ccc',
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    transition: 'all 0.2s ease',
    padding: '8px',
    margin: '4px 0',
  },
  folderDropZoneActive: {
    border: '2px dashed #3880ff',
    backgroundColor: 'rgba(56, 128, 255, 0.1)',
  },
  noteBeingDragged: {
    opacity: 0.6,
    transform: 'scale(0.98)',
  }
};

const processHashtags = (text: string) => {
  if (!text) return [];
  const segments: { text: string; isHashtagged: boolean; isDoubleHashtag: boolean; hashtagIndex: number }[] = [];
  let lastIndex = 0;
  let hashtagCount = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === '#' && text[i + 1] === '#') {
      let endIndex = -1;
      for (let j = i + 2; j < text.length - 1; j++) {
        if (text[j] === '#' && text[j + 1] === '#') {
          endIndex = j;
          break;
        }
      }
      if (endIndex !== -1) {
        if (i > lastIndex) {
          segments.push({
            text: text.substring(lastIndex, i),
            isHashtagged: false,
            isDoubleHashtag: false,
            hashtagIndex: -1
          });
        }
        segments.push({
          text: text.substring(i + 2, endIndex),
          isHashtagged: true,
          isDoubleHashtag: true,
          hashtagIndex: hashtagCount++
        });
        lastIndex = endIndex + 2;
        i = lastIndex;
        continue;
      }
    } else if (text[i] === '#' && (i === 0 || text[i - 1] !== '#') && (i === text.length - 1 || text[i + 1] !== '#')) {
      let endIndex = -1;
      for (let j = i + 1; j < text.length; j++) {
        if (text[j] === '#' && 
            (j === text.length - 1 || text[j + 1] !== '#') && 
            (j === 0 || text[j - 1] !== '#')) {
          endIndex = j;
          break;
        }
      }
      if (endIndex !== -1) {
        if (i > lastIndex) {
          segments.push({
            text: text.substring(lastIndex, i),
            isHashtagged: false,
            isDoubleHashtag: false,
            hashtagIndex: -1
          });
        }
        segments.push({
          text: text.substring(i + 1, endIndex),
          isHashtagged: true,
          isDoubleHashtag: false,
          hashtagIndex: hashtagCount++
        });
        lastIndex = endIndex + 1;
        i = lastIndex;
        continue;
      }
    }
    i++;
  }
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      isHashtagged: false,
      isDoubleHashtag: false,
      hashtagIndex: -1
    });
  }
  return segments;
};

function renderTextWithHashtags(text: string, parentColor?: string, isStandardCard?: boolean) {
  if (!text) return null;
  const lines = text.split('\n');
  if (lines.length === 1) {
    const segments = processHashtags(text);
    const totalHashtags = segments.filter(s => s.isHashtagged).length;
    if (segments.length === 0) {
      return <span style={{ 
        display: 'inline',
        color: parentColor ? `var(--ion-color-${parentColor})` : 'inherit'
      }}>{text}</span>;
    }
    return renderHashtagSegments(segments, totalHashtags, parentColor, isStandardCard);
  }
  return (
    <div style={{ whiteSpace: 'pre-line' }}>
      {lines.map((line, lineIndex) => {
        const segments = processHashtags(line);
        const totalHashtags = segments.filter(s => s.isHashtagged).length;
        return (
          <div key={lineIndex}>
            {segments.length > 0 ? (
              <span style={{ display: 'inline' }}>
                {renderHashtagSegments(segments, totalHashtags, parentColor, isStandardCard)}
              </span>
            ) : (
              <span style={{ 
                display: 'inline',
                color: parentColor ? `var(--ion-color-${parentColor})` : 'inherit'
              }}>{line}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Helper function to render segments with hashtags (used by renderTextWithHashtags)
function renderHashtagSegments(segments: any[], totalHashtags: number, parentColor?: string, isStandardCard?: boolean) {
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
        const hashtagColor = getHashtagColor(segment);
        const baseStyle = {
          display: 'inline',
          color: isStandardCard ? 'var(--ion-text-color)' : 
                (parentColor ? `var(--ion-color-${parentColor})` : 'inherit')
        };
        
        if (segment.isHashtagged) {
          return (
            <span 
              key={index}
              style={{
                ...baseStyle,
                position: 'relative',
                zIndex: 1,
                color: hashtagColor || baseStyle.color,
                WebkitTextFillColor: hashtagColor || 'initial'
              }}
            >
              {segment.text}
            </span>
          );
        } else {
          return (
            <span 
              key={index}
              style={baseStyle}
            >
              {segment.text}
            </span>
          );
        }
      })}
    </span>
  );
}

const CalcFolder: React.FC = () => {
  // Get user and toast
  const { user } = useAuth0();
  const [showToast] = useIonToast();
  
  // Main state
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  // Voice recording state
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  // UI state
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<DragData | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  
  // Data state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showAlert] = useIonAlert();
  const [noteNumber, setNoteNumber] = useState<number | null>(null);
  const [calcNumberState, setCalcNumberState] = useState<number | undefined>();
  const [percentageValue, setPercentageValue] = useState<number>(100); // Default to 100%
  const [targetGoal, setTargetGoal] = useState<number>(1000); // Default target goal
  const [showGoal, setShowGoal] = useState<boolean>(false); // Whether to show the goal tracker
  const [result, setResult] = useState<number | undefined>(undefined); // Result state
  const [folderDescription, setFolderDescription] = useState<string>('');
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);

  // Co-worker sharing state
  const [showCoWorkerModal, setShowCoWorkerModal] = useState(false);
  const [selectedFolderForCoWorkers, setSelectedFolderForCoWorkers] = useState<Folder | null>(null);
  const [availableCoWorkers, setAvailableCoWorkers] = useState<string[]>([]);
  const [selectedCoWorkers, setSelectedCoWorkers] = useState<string[]>([]);
  const [coWorkerDetails, setCoWorkerDetails] = useState<any[]>([]);
  const [isLoadingCoWorkers, setIsLoadingCoWorkers] = useState(false);

  // Main useEffect for triggering calculations
  useEffect(() => {
    if (currentFolder) {
      const notesInCurrentFolder = notes.filter(note => note.folder_id === currentFolder.id);
      // The calculateResult function already filters for crossed_out notes and folders
      calculateResult(currentFolder, notesInCurrentFolder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    notes, // Triggers on any change to notes array (add, delete, update of calc_number or crossed_out)
    // Safely generate dependency string for sub-calc folders, only if currentFolder exists
    currentFolder 
      ? folders.filter(f => f.folder_id === currentFolder.id && f.folder_type === 5)
               .map(f => `${f.id}-${f.calc_number}-${f.crossed_out}`)
               .join(',') 
      : '', // Provide a stable fallback if currentFolder is not yet defined
    currentFolder, 
    percentageValue, 
    targetGoal
  ]);
  
  // Note operations have been removed
  
  // Define the type for uploaded files
  interface UploadedFile {
    id: string;
    file: File;
    previewUrl: string;
    type: 'image' | 'file' | 'audio';
  }
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [noteColor, setNoteColor] = useState<string>('null');
  const [folderColor, setFolderColor] = useState<string>('null');
  const [isCrossedOut, setIsCrossedOut] = useState<boolean>(false);
  const [isChecklistEnabled, setIsChecklistEnabled] = useState<boolean>(false);
  const modal = useRef<HTMLIonModalElement>(null);
  const folderModal = useRef<HTMLIonModalElement>(null);
  const cardModal = useRef<HTMLIonModalElement>(null);
  const [presentingElement, setPresentingElement] = useState<HTMLElement | null>(null);
  const page = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLIonContentElement>(null);
  const ionRefresherRef = useRef<HTMLIonRefresherElement>(null);
  const history = useHistory();

  const [activeTab, setActiveTab] = useState<'notes' | 'media' | 'settings'>('notes');
  const [dropdownValue, setDropdownValue] = useState<string>("");
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [folderName, setFolderName] = useState('');
  const folderType = dropdownValue === "option2" ? 2 : 1;

  const [modalTab, setModalTab] = useState<'notes' | 'attachments' | 'settings'>('notes');
  const [folderModalTab, setFolderModalTab] = useState<'folder' | 'settings' >('folder');
  const [folderPassword, setFolderPassword] = useState('');
  const [oldFolderPassword, setOldFolderPassword] = useState('');
  const [passwordFolderId, setPasswordFolderId] = useState<string | null>(null);
const [unlockFolderId, setUnlockFolderId] = useState<string | null>(null);
const [unlockPassword, setUnlockPassword] = useState('');
const [unlockError, setUnlockError] = useState('');
const [unlockIntent, setUnlockIntent] = useState<'view' | 'edit' | null>(null);

  useEffect(() => {
    // Set the presenting element for modals
    setPresentingElement(page.current);
    
    // Initialize the refresher after the component mounts
    const initializeRefresher = () => {
      // The IonRefresher will automatically connect to the nearest scrollable ancestor
      // No need to manually set scrollEl in newer versions of Ionic
    };
    
    // Small timeout to ensure the DOM is ready
    const timer = setTimeout(initializeRefresher, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Consistent sorting function to use throughout the app
  const sortByYDescending = (a: { y?: number | null }, b: { y?: number | null }) => {
    // Sort by y value in descending order (largest y at top)
    // Treat null or undefined as 0 for sorting
    const aY = a.y ?? 0;
    const bY = b.y ?? 0;
    return bY - aY;
  };
  
  // Extract folder name from URL path
  const { folderName: urlFolderName } = useParams<{ folderName: string }>();
  const decodedName = decodeURIComponent(urlFolderName || '');
  console.log('URL param folderName:', urlFolderName, 'Decoded:', decodedName);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  // The useState for currentFolder has been moved above the main calculation useEffect

  useEffect(() => {
    const fetchData = async () => {
      if (user && user.sub) {
        try {
          // Fetch all folders and notes for the user
          const foldersResponse = await getFolders(user.sub);
          const notesResponse = await getNotes(user.sub);
          
          // Log all folders to help with debugging
          console.log('All folders:', foldersResponse);
          console.log('Looking for folder with name:', decodedName);
          
          // First try to find the folder by exact name and type 5 (calc folder)
          let currentFolder = foldersResponse.find(folder => 
            folder.name === decodedName && folder.folder_type === 5
          );
          
          // If not found by type 5, try with any folder type
          if (!currentFolder) {
            console.log('Folder not found with type 5, trying any folder with matching name');
            currentFolder = foldersResponse.find(folder => folder.name === decodedName);
            
            if (currentFolder) {
              console.log('Found folder with name but different type:', currentFolder);
              // Use this folder even if it's not type 5
            } else {
              // If still not found, try a case-insensitive match
              const lowerCaseName = decodedName.toLowerCase();
              currentFolder = foldersResponse.find(folder => 
                folder.name.toLowerCase() === lowerCaseName
              );
              
              if (currentFolder) {
                console.log('Found folder with case-insensitive name match:', currentFolder);
              }
            }
          }
          
          if (currentFolder) {
            console.log('Found folder to use:', currentFolder);
            // Parse the calc_method field to extract any embedded values
            if (currentFolder.calc_method) {
              // Handle percentage calculation method format: "percentage:100"
              if (currentFolder.calc_method.startsWith('percentage:')) {
                const parts = currentFolder.calc_method.split(':');
                if (parts.length > 1) {
                  const percentageValue = parseFloat(parts[1]);
                  if (!isNaN(percentageValue)) {
                    setPercentageValue(percentageValue);
                    console.log(`Extracted percentage value: ${percentageValue}`);
                  }
                  // Update the calc_method to just the base method for UI purposes
                  currentFolder.calc_method = 'percentage';
                }
              }
              // Handle goal calculation method format: "goal:1000"
              else if (currentFolder.calc_method.startsWith('goal:')) {
                const parts = currentFolder.calc_method.split(':');
                if (parts.length > 1) {
                  const goalValue = parseFloat(parts[1]);
                  if (!isNaN(goalValue)) {
                    setTargetGoal(goalValue);
                    console.log(`Extracted goal value: ${goalValue}`);
                  }
                  // Update the calc_method to just the base method for UI purposes
                  currentFolder.calc_method = 'goal';
                }
              }
            }
            
            setCurrentFolderId(currentFolder.id);
            setCurrentFolder(currentFolder);
            
            // Filter notes and folders for direct children
            const filteredNotes = notesResponse.filter(note => note.folder_id === currentFolder.id);
            console.log(`Found ${filteredNotes.length} notes for this folder`);
            
            const filteredFolders = foldersResponse.filter(folder => folder.folder_id === currentFolder.id && folder.folder_type !== 4);
            console.log(`Found ${filteredFolders.length} subfolders for this folder`);
            // Debug output for testing
            console.log('Current Folder:', { id: currentFolder.id, name: currentFolder.name });
            console.log('Filtered Notes to display:', filteredNotes);
            console.log('Filtered Folders to display:', filteredFolders);
            filteredNotes.sort(sortByYDescending);
            filteredFolders.sort(sortByYDescending);
            setNotes(filteredNotes);
            setFolders(filteredFolders);
            
            // Calculate the sum of all note calc_number values based on calc_method
            // Make sure we're only using the filtered notes for this folder
            calculateResult(currentFolder, filteredNotes);
          } else {
            // If folder not found, set empty arrays
            setNotes([]);
            setFolders([]);
            showToast({
              message: 'Folder not found',
              duration: 2000,
              color: 'danger'
            });
          }
        } catch (error) {
          console.error('Error fetching data:', error);
          showToast({
            message: 'Failed to load notes and folders',
            duration: 2000,
            color: 'danger'
          });
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [decodedName, user]);

  const getNextY = (): number => {
    // Get the maximum y value from notes and folders
    const maxNoteY = notes.length > 0 ? Math.max(...notes.map(note => note.y || 0)) : 0;
    const maxFolderY = folders.length > 0 ? Math.max(...folders.map(folder => folder.y || 0)) : 0;
    // Add a larger increment to ensure new items appear at the top
    return Math.max(maxNoteY, maxFolderY) + 100;
  };
  
  const onAddNote = () => {
    if (!currentFolderId || !user || !currentFolder) {
      showToast({
        message: 'Cannot add note: Folder not found',
        duration: 2000,
        color: 'danger'
      });
      return;
    }
    
    // Create a new note with calc_number field
    const newNote = {
      title: title || 'New Note',
      text: text || '',
      folder_id: currentFolderId,
      y: getNextY(),
      crossed_out: false,
      color: noteColor === 'null' ? 'medium' : noteColor, // Default to 'medium' if null
      calc_number: noteNumber || 0, // Use the noteNumber state or default to 0
      settings_id: 0, // Default settings ID
      x: 0 // Default x position
    };

    // Add the note to the database
    addNote(newNote, user.sub || '', currentFolderId)
      .then(addedNote => {
        // Update the notes state with the new note
        const updatedNotes = [addedNote, ...notes];
        setNotes(updatedNotes);
        
        // Reset form fields
        setTitle('');
        setText('');
        setNoteNumber(null);
        
        // Recalculate the result based on the updated notes
        calculateResult(currentFolder, updatedNotes);
        
        // Close the modal
        cardModal.current!.dismiss();
        
        showToast({
          message: 'Note added successfully',
          duration: 2000,
          color: 'success'
        });
      })
      .catch(error => {
        console.error('Error adding note:', error);
        showToast({
          message: 'Failed to add note',
          duration: 2000,
          color: 'danger'
        });
      });
  };

  const onAddFolder = () => {
    if (!currentFolderId) {
      showToast({
        message: 'Cannot add folder: Parent folder not found',
        duration: 2000,
        color: 'danger'
      });
      return;
    }
    
    const nextY = getNextY();
    handleAddFolder(
      folderName,           // Name of the new folder
      folderDescription,    // Folder description (added argument)
      user,                 // User object
      currentFolderId !== null ? currentFolderId.toString() : "0",      // parentFolderId (the correct parent folder ID)
      folderType,           // Folder type
      0,                    // x position (set to 0 for now, can be customized)
      nextY,                // y position (for sorting)
      showToast,            // Toast callback
      setFolders,           // Update folders state
      setFolderName,        // Reset folder name input
      setFolderDescription, // Reset folder description input (added argument)
      () => {
        setFolderColor('light');
        setIsCrossedOut(false);
        folderModal.current!.dismiss();
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      type: (file.type.startsWith('image/') ? 'image' : 'file') as 'image' | 'file' | 'audio'
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleUploadFiles = async () => {
    if (!selectedNote?.id || uploadedFiles.length === 0) return;
    
    // Convert uploadedFiles to FileList
    const fileArray = uploadedFiles.map(item => item.file);
    const dataTransfer = new DataTransfer();
    fileArray.forEach(file => dataTransfer.items.add(file));
    const fileList = dataTransfer.files;
    
    // Use the helper function from apiCalls
    await handleUploadFilesToServer(
      fileList,
      selectedNote,
      user,
      setNotes,
      showToast,
      setUploadedFiles,
      setIsUploading
    );
  };

  // Helper function to construct base API URL for file links
  const getBaseApiUrl = () => {
    // This should ideally parse the apiUrl from apiService or a config
    // For now, assuming a common structure like 'https://localhost:7281/notes/api/v1/'
    // IMPORTANT: Replace 'https://localhost:7281/notes/api/v1/' with actual apiUrl import if possible for robustness.
    const currentApiUrl = 'https://localhost:7281/notes/api/v1/'; 
    try {
      const url = new URL(currentApiUrl);
      return `${url.protocol}//${url.host}`; // e.g., 'https://localhost:7281'
    } catch (error) {
      console.error('Error constructing base API URL:', error);
      return ''; // Fallback or handle error appropriately
    }
  };

  const onUpdateNote = async () => {
    if (selectedNote && currentFolder) {
      // Use noteNumber if it's not null, otherwise use calcNumberState
      const calculationNumber = noteNumber !== null ? noteNumber : calcNumberState;
      
      const updatedNote = {
        ...selectedNote,
        title,
        text, // Assuming 'text' state variable holds the text for update
        calc_number: calculationNumber, // Use the determined calculation number
        color: selectedNote.color,
        crossed_out: selectedNote.crossed_out,
        image_url: selectedNote.image_url, // Preserve the image_url when updating
        voice_message_url: selectedNote.voice_message_url, // Preserve voice messages
        file_link: selectedNote.file_link // Preserve file links
      };
      
      // First update the note in the database
      try {
        await updateNote(updatedNote.id, updatedNote, user?.sub || '');
        
        // Then update our local state with the updated note
        setNotes(prevNotes => {
          const updatedNotes = prevNotes.map(note => 
            note.id === updatedNote.id ? updatedNote : note
          );
          
          // Get only the notes that belong to the current folder
          const notesInCurrentFolder = updatedNotes.filter(
            note => note.folder_id === currentFolder.id
          );
          
          // Recalculate the total with only the notes in this folder
          calculateResult(currentFolder, notesInCurrentFolder);
          
          return updatedNotes;
        });
        
        // Reset UI state
        setSelectedNote(null);
        setNoteColor('null');
        setIsCrossedOut(false);
        setNoteNumber(null); // Reset noteNumber
        
        // Close the modal
        if (modal.current) {
          modal.current.dismiss();
        }
      } catch (error) {
        console.error('Error updating note:', error);
        showToast({
          message: 'Failed to update note',
          duration: 2000,
          color: 'danger'
        });
      }
    }
  };

  const handleModalDismiss = () => {
    if (selectedNote) {
      const hasTitleChanged = title !== selectedNote.title;
      const hasTextChanged = text !== selectedNote.text;
      // Use noteNumber instead of calcNumberState for comparison
      const hasCalcNumberChanged = (noteNumber !== null ? noteNumber : selectedNote.calc_number) !== (selectedNote.calc_number !== undefined ? selectedNote.calc_number : null);

      if (hasTitleChanged || hasTextChanged || hasCalcNumberChanged) {
        const updatedNote = {
          ...selectedNote,
          title,
          text,
          // Use noteNumber instead of calcNumberState, falling back to the original value if null
          calc_number: noteNumber !== null ? noteNumber : selectedNote.calc_number,
          // Retain original color and crossed_out status unless they are explicitly changed elsewhere
          color: selectedNote.color,
          crossed_out: selectedNote.crossed_out,
          // Preserve media attachments
          image_url: selectedNote.image_url,
          voice_message_url: selectedNote.voice_message_url,
          file_link: selectedNote.file_link,
        };
        
        // Assuming handleUpdateNote exists and has a compatible signature
        // We'll verify handleUpdateNote's signature next
        handleUpdateNote(updatedNote, user, setNotes, setSelectedNote, () => {
          // Callback after update, e.g., show toast
          showToast({
            message: 'Note auto-saved!',
            duration: 2000,
            color: 'success',
          });
          // Clear selectedNote AFTER saving and handling callbacks
          setSelectedNote(null);
          
          // Recalculate the total if we have a current folder
          if (currentFolder) {
            // Get all notes in the current folder with the updated note
            const notesInCurrentFolder = notes.map(note => {
              if (note.id === updatedNote.id) {
                return updatedNote; // Use the updated note
              }
              return note;
            }).filter(note => note.folder_id === currentFolder.id);
            
            // Recalculate the total
            calculateResult(currentFolder, notesInCurrentFolder);
          }
        });
      } else {
        // No changes, just close the modal by clearing selectedNote
        setSelectedNote(null);
        
        // Even if no changes, still recalculate the total to ensure consistency
        if (currentFolder) {
          const notesInCurrentFolder = notes.filter(note => note.folder_id === currentFolder.id);
          calculateResult(currentFolder, notesInCurrentFolder);
        }
      }
    } else {
      // Fallback if selectedNote is somehow null, though onDidDismiss on this modal implies it was open
      setSelectedNote(null);
    }
  };

  const onDeleteNote = (id: string) => {
    // First delete the note from the database
    deleteNote(id, user?.sub || '')
      .then(() => {
        // Then update our local state by removing the deleted note
        setNotes(prevNotes => {
          // Create a new array without the deleted note
          const updatedNotes = prevNotes.filter(note => note.id !== id);
          
          // If we have a current folder, recalculate the total
          if (currentFolder) {
            // Get only the notes that belong to the current folder
            const notesInCurrentFolder = updatedNotes.filter(
              note => note.folder_id === currentFolder.id
            );
            
            // Recalculate the total with only the notes in this folder
            calculateResult(currentFolder, notesInCurrentFolder);
          }
          
          return updatedNotes;
        });
        
        // Reset selected note if it was the one deleted
        if (selectedNote && selectedNote.id === id) {
          setSelectedNote(null);
        }
        
        // Close the modal if it's open
        if (modal.current) {
          modal.current.dismiss();
        }
        
        showToast({
          message: 'Note deleted successfully',
          duration: 2000,
          color: 'success'
        });
      })
      .catch(error => {
        console.error('Error deleting note:', error);
        showToast({
          message: 'Failed to delete note',
          duration: 2000,
          color: 'danger'
        });
      });
  };

  const onEditNote = (note: Note) => {
    setTitle(note.title);
    setText(note.text);
    setNoteColor(note.color);
    setIsCrossedOut(note.crossed_out);
    setSelectedNote(note);
    setCalcNumberState(note.calc_number);
    setNoteNumber(note.calc_number !== undefined ? note.calc_number : null);
  };

  const onEditFolder = (folder: Folder) => {
    setFolderName(folder.name);
    setFolderColor(folder.color);
    setIsCrossedOut(folder.crossed_out);
    setIsChecklistEnabled(folder.checklist || false);
    setSelectedFolder(folder);
    setFolderModalTab('folder');
    folderModal.current!.present();
  };
  
  const onUpdateFolder = () => {
    if (selectedFolder) {
      // Preserve the original folder_type when updating a folder
      const updatedFolder = {
        ...selectedFolder,
        name: folderName,
        // Keep the original folder_type instead of using the default folderType
        folder_type: selectedFolder.folder_type,
        color: folderColor,
        crossed_out: isCrossedOut,
        checklist: isChecklistEnabled
      };
      
      console.log('Updating folder, preserving original type:', selectedFolder.folder_type);
      
      // Pass the original folder_type to handleUpdateFolder
      handleUpdateFolder(updatedFolder, user, folderName, folderDescription, selectedFolder.folder_type, setFolders, setSelectedFolder, () => {
        setFolderColor('null');
        setIsCrossedOut(false);
        setIsChecklistEnabled(false);
        folderModal.current!.dismiss();
      });
    }
  };

  const onDeleteFolder = (id: string) => {
    handleDeleteFolder(id.toString(), user, setFolders);
    folderModal.current?.dismiss();
  };
  
  // Handle dragging a note
  const handleNoteDragStart = (e: React.DragEvent, note: Note) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'note', id: note.id }));
    setDraggedItem({ type: 'note', id: note.id });
    
    // Set the drag image (optional)
    const dragImage = document.createElement('div');
    dragImage.textContent = note.title || 'Note';
    dragImage.style.padding = '8px';
    dragImage.style.background = '#fff';
    dragImage.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    dragImage.style.borderRadius = '4px';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };

  // Handle dragging a folder
  const handleFolderDragStart = (e: React.DragEvent, folder: Folder) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'folder', id: folder.id }));
    setDraggedItem({ type: 'folder', id: folder.id });
    
    // Set the drag image (optional)
    const dragImage = document.createElement('div');
    dragImage.textContent = folder.name || 'Folder';
    dragImage.style.padding = '8px';
    dragImage.style.background = '#fff';
    dragImage.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    dragImage.style.borderRadius = '4px';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };
  
  // Handle dragging over a folder
  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDropTargetId(folderId);
  };
  
  // Handle dragging leaving a folder
  const handleDragLeave = () => {
    setDropTargetId(null);
  };
  
  // Handle dropping a note or folder into a folder
  const handleDrop = async (e: React.DragEvent, targetFolder: Folder) => {
    e.preventDefault();
    setDropTargetId(null);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain')) as DragData;
      
      // Prevent dropping onto itself
      if (data.type === 'folder' && String(data.id) === String(targetFolder.id)) {
        showToast({
          message: 'Cannot move a folder into itself',
          duration: 2000,
          color: 'warning'
        });
        setDraggedItem(null);
        return;
      }
      
      if (data.type === 'note') {
        const noteId = data.id;
        const noteToMove = notes.find(note => note.id === noteId);
        
        if (noteToMove) {
          let updatedNote;
          let targetFolderId = targetFolder.id;
          let successMessage = `Note moved to ${targetFolder.name}`;
          
          // Handle special folder types
          if (targetFolder.folder_type === 1) {
            // Standard folder - directly add the note to this folder
            updatedNote = { ...noteToMove, folder_id: targetFolderId };
          } 
          else if (targetFolder.folder_type === 2) {
            // Organizer folder - we need to handle this case differently
            // First, fetch all folders to ensure we have the latest data
            const allFolders = await getFolders(user?.sub || '');
            const subfolders = allFolders.filter(f => f.folder_id === targetFolder.id);
            
            if (subfolders.length > 0) {
              // Use the first subfolder
              targetFolderId = subfolders[0].id;
              updatedNote = { ...noteToMove, folder_id: targetFolderId };
              successMessage = `Note moved to ${targetFolder.name} (${subfolders[0].name})`;
              
              // Update folders state with the latest data
              setFolders(allFolders.filter(folder => Number(folder.folder_id) === 0 && folder.folder_type !== 4));
            } else {
              // Create a default subfolder
              const newSubfolderName = "Default Subfolder";
              const nextY = getNextY();
              
              // Create the subfolder first
              const subfolder = await addFolder(
                {
                  name: newSubfolderName,
                  folder_type: 1, // standard folder type
                  y: nextY,
                  color: 'medium', // default color
                  crossed_out: false,
                  checklist: false
                },
                user?.sub || '',
                targetFolder.id // parent folder ID
              );
              
              // Then move the note to the new subfolder
              targetFolderId = subfolder.id;
              updatedNote = { ...noteToMove, folder_id: targetFolderId };
              successMessage = `Note moved to ${targetFolder.name} (${newSubfolderName})`;
              
              // Refresh folders to include the new subfolder
              const updatedFolders = await getFolders(user?.sub || '');
              setFolders(updatedFolders.filter(folder => Number(folder.folder_id) === 0 && folder.folder_type !== 4));
            }
          }
          else if (targetFolder.folder_type === 3) {
            // Mindmap folder - add note directly
            // Store the note's position in a separate property or use existing x, y properties
            updatedNote = { 
              ...noteToMove, 
              folder_id: targetFolderId,
              // Use existing x, y properties for positioning in mindmap
              x: Math.random() * 500, // Random initial position
              y: Math.random() * 500
            };
          }
          else {
            // Default case for other folder types
            updatedNote = { ...noteToMove, folder_id: targetFolderId };
          }
          
          // Update in the database
          await updateNote(noteId.toString(), updatedNote, user?.sub || '');
          
          // Update state
          setNotes(prevNotes => 
            prevNotes.map(note => String(note.id) === String(noteId) ? updatedNote : note)
          );
          
          // We don't automatically navigate to the folder view anymore
          // This allows the user to continue working in the current view
          
          showToast({
            message: successMessage,
            duration: 2000,
            color: 'success'
          });
        }
      } else if (data.type === 'folder') {
        // Handle folder-to-folder drop
        const folderId = data.id;
        const folderToMove = folders.find(folder => String(folder.id) === String(folderId));
        
        if (folderToMove) {
          // Prevent circular references (a folder cannot be moved into its own subfolder)
          // This would require a recursive check of all descendants, but for simplicity,
          // we're just preventing direct circular references for now
          
          // Update the folder's parent ID
          const updatedFolder = { ...folderToMove, folder_id: targetFolder.id };
          
          // Update in the database
          await updateFolder(folderId.toString(), updatedFolder, user?.sub || '');
          
          // Update state - remove from current view since it's now a subfolder
          setFolders(prevFolders => prevFolders.filter(folder => String(folder.id) !== String(folderId)));
          
          showToast({
            message: `Folder moved to ${targetFolder.name}`,
            duration: 2000,
            color: 'success'
          });
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error);
      showToast({
        message: 'Failed to move item',
        duration: 2000,
        color: 'danger'
      });
    }
    
    setDraggedItem(null);
  };
  
  // Handle drag end
  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTargetId(null);
  };
  
  const onFolderClick = (folder: Folder) => {
    if (folder.password) {
      setUnlockFolderId(folder.id);
      setUnlockPassword('');
      setUnlockError('');
      setUnlockIntent('view');
      return;
    }
    navigateToFolder(folder);
  };

  const navigateToFolder = (folder: Folder) => {
    const encodedName = encodeURIComponent(folder.name);
    if (folder.folder_type === 1) {
      history.push(`/app/folder/${encodedName}`);
    } else if (folder.folder_type === 2) {
      history.push(`/app/organizerfolder/${encodedName}`);
    } else if (folder.folder_type === 3) {
      history.push(`/app/mindmapfolder/${encodedName}`);
    } else if (folder.folder_type === 5) {
      history.push(`/app/calcfolder/${encodedName}`);
    } else {
      console.error("Unknown folder type:", folder.folder_type);
      showToast({
        message: "Unknown folder type!",
        duration: 2000,
        color: "danger",
      });
    }
  };
  
  const onRefresh = async (event: CustomEvent) => {
    // Ensure the event is properly typed and has the complete method
    if (!event.detail) {
      console.error('Refresh event detail is undefined');
      return;
    }
    try {
      if (user && user.sub) {
        const notes = await getNotes(user.sub);
        const folders = await getFolders(user.sub);
        const filteredNotes = notes.filter(note => note.folder_id === "0");
        const filteredFolders = folders.filter(folder => folder.folder_id === "0" && folder.folder_type !== 4);

        // Sort notes and folders using the consistent sorting function
        filteredNotes.sort(sortByYDescending);
        filteredFolders.sort(sortByYDescending);

        setNotes(filteredNotes);
        setFolders(filteredFolders);
        
        showToast({
          message: 'Refreshed successfully',
          duration: 1000,
          color: 'success'
        });
        // Recalculate after refreshing
        if (currentFolder) {
          calculateResult(currentFolder, notes);
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      showToast({
        message: 'Failed to refresh',
        duration: 2000,
        color: 'danger'
      });
    } finally {
      event.detail.complete();
    }
  };

  const onTurnNoteIntoFolder = (folderType: number) => {
    if (!selectedNote) {
      console.error("No note selected!");
      showToast({
        message: "No note selected to turn into a folder!",
        duration: 2000,
        color: "danger",
      });
      return;
    }

    const folderName = selectedNote.title || "Untitled Folder";
    // Use the note's existing y-position instead of generating a new one
    const noteY = selectedNote.y || 0;
    
    // Store the note ID to delete after folder creation
    const noteIdToDelete = selectedNote.id;
    const parentFolderId = currentFolderId || 0;
    
    // Create the folder with the same y-position as the note
    handleAddFolder(
      folderName,
       folderDescription,
      user,
      parentFolderId.toString(), // parent folder ID is 0 for root level
      folderType,
      1,
      noteY, // Use the note's y-position
      showToast,
      setFolders,
      setFolderName,
       setFolderDescription,
      () => {
        // Delete the original note after the folder is created
        onDeleteNote(noteIdToDelete);
        folderModal.current!.dismiss();
      }
    );
  };

  const handleDropdownSelection = (selectedValue: string) => {
    setDropdownValue(selectedValue);
    if (selectedValue === "option1") {
      onTurnNoteIntoFolder(1); // Normal Folder
    } else if (selectedValue === "option2") {
      onTurnNoteIntoFolder(2); // Organizer Folder
    } else if (selectedValue === "option3") {
      onTurnNoteIntoFolder(3); // Mindmap Folder
    }
    modal.current?.dismiss();
  };

  // Combined handler for reordering both notes and folders
  const handleReorderItems = async (event: CustomEvent) => {
    try {
      // Create a combined array of notes and folders
      const combinedItems: ReorderableItem[] = [];
      
      // Include notes that belong to the current folder
      const folderNotes = notes.filter(note => note.folder_id === currentFolderId);
      const rootFolders = folders;
      
      // Sort all items by their y position
      [...folderNotes, ...rootFolders].forEach(item => {
        combinedItems.push(item);
      });
      combinedItems.sort(sortByYDescending);
      
      // Get the moved item
      const movedItem = combinedItems[event.detail.from];
      
      // Create a new array without the moved item
      const newCombinedItems = [...combinedItems];
      newCombinedItems.splice(event.detail.from, 1);
      
      // Insert the moved item at the new position
      newCombinedItems.splice(event.detail.to, 0, movedItem);
      
      // Calculate new positions for all items (largest y at top)
      const updatedItems = newCombinedItems.map((item, index) => ({
        ...item,
        // Assign higher y values to items at the beginning of the array
        y: newCombinedItems.length - index + 100
      }));
      
      // Separate notes and folders again
      const updatedNotes: Note[] = [];
      const updatedFolders: Folder[] = [];
      
      updatedItems.forEach(item => {
        if (isNote(item)) {
          updatedNotes.push(item);
        } else if (isFolder(item)) {
          updatedFolders.push(item);
        }
      });
      
      // Update state first for immediate UI feedback
      // Keep notes that don't belong to the current folder
      const otherFolderNotes = notes.filter(note => note.folder_id !== currentFolderId);
      setNotes([...updatedNotes, ...otherFolderNotes]);
      setFolders(updatedFolders);
      
      // Complete the reorder event immediately to improve UI responsiveness
      event.detail.complete();
      
      // Update database in the background without blocking the UI
      // Only update the moved item and affected items for better performance
      const updatePromises: Promise<any>[] = [];
      
      // Only update items that actually changed position
      const changedItems = updatedItems.filter((item, index) => {
        const originalIndex = combinedItems.findIndex(original => 
          isNote(item) && isNote(original) ? item.id === original.id : 
          isFolder(item) && isFolder(original) ? item.id === original.id : false
        );
        return originalIndex !== index;
      });
      
      // Create update promises for changed items
      changedItems.forEach(item => {
        if (isNote(item)) {
          updatePromises.push(updateNote(item.id, { ...item, y: item.y }, user?.sub || ''));
        } else if (isFolder(item)) {
          updatePromises.push(updateFolder(item.id, { ...item, y: item.y }, user?.sub || ''));
        }
      });
      
      // Execute all updates in parallel
      Promise.all(updatePromises).catch(error => {
        console.error('Error updating item positions:', error);
        showToast({
          message: 'Failed to save some item positions',
          duration: 2000,
          color: 'warning'
        });
      });
    } catch (error) {
      console.error('Error updating item positions:', error);
      showToast({
        message: 'Failed to save item positions',
        duration: 2000,
        color: 'danger'
      });
      // Revert the reorder if it failed
      event.detail.complete(false);
    }
  };

  // Helper function to get note value (operations removed)
  const getNoteValue = (note: Note): number => {
    // If note has no calc_number, return 0
    if (note.calc_number === undefined || note.calc_number === null) {
      return 0;
    }
    return note.calc_number;
  };
  
  // Calculate result based on folder's calc_method, notes, and sub-calc folders
  const calculateResult = (folder: Folder, notesToCalculate: Note[]) => {
    // Filter out notes without a calculation number and exclude crossed-out notes
    const notesWithNumbers = notesToCalculate.filter(note => 
      note.folder_id === folder.id && 
      note.calc_number !== undefined && 
      note.calc_number !== null &&
      !note.crossed_out // Exclude crossed-out notes
    );
    
    // Find all sub-calc folders (folders with folder_type === 5) and exclude crossed-out ones
    const subCalcFolders = folders.filter(f => 
      f.folder_id === folder.id && 
      f.folder_type === 5 && 
      f.calc_number !== undefined && 
      f.calc_number !== null &&
      !f.crossed_out // Exclude crossed-out folders
    );
    
    // Combine notes and sub-calc folders for calculation
    const allCalculatables = [
      ...notesWithNumbers.map(note => ({
        type: 'note' as const,
        value: getNoteValue(note),
        id: note.id,
        title: note.title
      })),
      ...subCalcFolders.map(folder => ({
        type: 'folder' as const,
        value: folder.calc_number || 0,
        id: folder.id,
        title: folder.name
      }))
    ];
    
    let calculatedValue: number | undefined;
    
    if (folder.calc_method === 'sum' || !folder.calc_method) {
      // Calculate sum of all values (notes + sub-calc folders)
      const sum = allCalculatables.reduce((total, item) => {
        return total + item.value;
      }, 0);
      calculatedValue = sum;
      setCalcNumberState(sum);
      
      // Log the calculation details for debugging
      console.log('Calculation details:', {
        includedNotes: allCalculatables.filter(i => i.type === 'note'),
        includedSubFolders: allCalculatables.filter(i => i.type === 'folder'),
        excludedNotes: notesToCalculate.filter(note => 
          note.folder_id === folder.id && 
          note.calc_number !== undefined && 
          note.calc_number !== null &&
          note.crossed_out
        ),
        excludedSubFolders: folders.filter(f => 
          f.folder_id === folder.id && 
          f.folder_type === 5 && 
          f.calc_number !== undefined && 
          f.calc_number !== null &&
          f.crossed_out
        ),
        total: sum
      });
      // If showing goal, we want to make sure it's visible for sum calculation
      if (folder.calc_method === 'sum') {
        setShowGoal(false);
      }
    } else if (folder.calc_method === 'average') {
      // Calculate average (sum divided by count) with operations applied
      if (notesWithNumbers.length === 0) {
        calculatedValue = 0; // Avoid division by zero
        setCalcNumberState(0);
      } else {
        const sum = notesWithNumbers.reduce((total, note) => {
          return total + getNoteValue(note);
        }, 0);
        const average = sum / notesWithNumbers.length;
        // Round to 2 decimal places for cleaner display
        const roundedAverage = Math.round(average * 100) / 100;
        calculatedValue = roundedAverage;
        setCalcNumberState(roundedAverage);
      }
      // Hide goal for average calculation
      setShowGoal(false);
    } else if (folder.calc_method === 'percentage') {
      // Calculate sum and apply percentage
      const sum = notesWithNumbers.reduce((total, note) => {
        return total + getNoteValue(note);
      }, 0);
      
      // Apply the percentage (default to 100% if not set)
      const percentage = percentageValue || 100;
      const result = (sum * percentage) / 100;
      
      // Round to 2 decimal places for cleaner display
      const roundedResult = Math.round(result * 100) / 100;
      calculatedValue = roundedResult;
      setCalcNumberState(roundedResult);
      // Hide goal for percentage calculation
      setShowGoal(false);
    } else if (folder.calc_method === 'goal') {
      // Calculate sum for goal tracking
      const sum = notesWithNumbers.reduce((total, note) => {
        return total + getNoteValue(note);
      }, 0);
      
      // Set the current sum as the result
      calculatedValue = sum;
      setCalcNumberState(sum);
      
      // Show the goal tracker for this calculation method
      setShowGoal(true);
    }
    
    // Update the UI with the calculated value and details
    if (calculatedValue !== undefined) {
      setResult(calculatedValue);
      
      // Show calculation breakdown in console for debugging
      const calculationDetails = allCalculatables.map(item => ({
        type: item.type,
        title: item.title,
        value: item.value
      }));
      
      console.log('Calculation breakdown:', {
        items: calculationDetails,
        total: calculatedValue,
        method: folder.calc_method || 'sum'
      });
    }
    
    // Save the calculated value to the backend
    if (calculatedValue !== undefined && user?.sub && folder.id) {
      // Create a modified calc_method string that includes additional data
      let enhancedCalcMethod = folder.calc_method || 'sum';
      
      // For percentage method, append the percentage value to the method string
      if (folder.calc_method === 'percentage') {
        enhancedCalcMethod = `percentage:${percentageValue || 100}`;
      }
      
      // For goal method, append the target goal value to the method string
      if (folder.calc_method === 'goal') {
        enhancedCalcMethod = `goal:${targetGoal || 1000}`;
      }
      
      // Update the folder with the new calc_number and enhanced calc_method
      updateFolder(
        folder.id,
        { 
          ...folder, 
          calc_number: calculatedValue,
          calc_method: enhancedCalcMethod
        },
        user.sub
      ).catch(error => {
        console.error('Error saving calculation to backend:', error);
        showToast({
          message: 'Failed to save calculation to backend',
          duration: 2000,
          color: 'warning'
        });
      });
    }
  };

  // Handle changing the calculation method
  const handleCalcMethodChange = async (method: string) => {
    if (!currentFolder || !user?.sub) return;
    
    try {
      // Create an enhanced calc_method that includes any necessary parameters
      let enhancedCalcMethod = method;
      
      // For percentage method, include the current percentage value
      if (method === 'percentage') {
        enhancedCalcMethod = `percentage:${percentageValue || 100}`;
      }
      
      // For goal method, include the current target goal value
      if (method === 'goal') {
        enhancedCalcMethod = `goal:${targetGoal || 1000}`;
      }
      
      // Update the folder's calc_method in the database
      await updateFolder(
        currentFolder.id,
        { ...currentFolder, calc_method: enhancedCalcMethod },
        user.sub
      );
      
      // Update local state - but keep the base method name for UI purposes
      setCurrentFolder({...currentFolder, calc_method: method});
      
      // Recalculate based on the new method
      calculateResult({...currentFolder, calc_method: method}, notes);
      
      showToast({
        message: 'Calculation method updated',
        duration: 2000,
        color: 'success'
      });
    } catch (error) {
      console.error('Error updating calculation method:', error);
      showToast({
        message: 'Failed to update calculation method',
        duration: 2000,
        color: 'danger'
      });
    }
  };

  const handleTabChange = (tab: 'notes' | 'media') => {
    if (tab === 'media') {
      history.push('/app/media');
    } else {
      history.push('/app/list');
    }
  };

  const startRecording = async () => {
    if (mediaRecorder.current) {
      return; // Already recording
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      mediaRecorder.current = recorder;
      
      recorder.ondataavailable = (event: Event) => {
        const blobEvent = event as BlobEvent;
        if (blobEvent.data.size > 0) {
          audioChunks.current.push(blobEvent.data);
        }
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio(audioUrl);
        audioChunks.current = [];
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording with 100ms timeslice to ensure we don't miss any audio
      recorder.start(100);
      setIsRecording(true);
      
      // Set a timeout to stop recording after 5 minutes (max duration)
      setTimeout(() => {
        if (mediaRecorder.current?.state === 'recording') {
          stopRecording();
        }
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      showToast({
        message: 'Failed to access microphone. Please check permissions.',
        duration: 3000,
        color: 'danger'
      });
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      try {
        mediaRecorder.current.stop();
        setIsRecording(false);
        mediaRecorder.current = null;
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }
  };

  const saveVoiceMessage = async () => {
    if (!selectedNote?.id || !recordedAudio || !user?.sub) return;

    setIsUploading(true);

    try {
      // Convert the recorded audio URL to a Blob
      const response = await fetch(recordedAudio);
      const audioBlob = await response.blob();

      // Create a File from the Blob
      const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });

      // Upload the voice message and get the URL
      const uploadResponse = await uploadVoiceMessage(selectedNote.id, audioFile, user.sub);

      let voiceMessageUrl: string | undefined = undefined;
      if (uploadResponse && uploadResponse.success) {
        if (uploadResponse.files && uploadResponse.files.length > 0 && uploadResponse.files[0].fileUrl) {
          voiceMessageUrl = uploadResponse.files[0].fileUrl;
        } else if (uploadResponse.voiceMessageUrl) {
          voiceMessageUrl = uploadResponse.voiceMessageUrl;
        }
      }

      if (voiceMessageUrl) {
        const updatedNote = {
          ...selectedNote,
          voice_message_url: voiceMessageUrl
        };
        setSelectedNote(updatedNote);
        setNotes(prevNotes => prevNotes.map(n => n.id === updatedNote.id ? updatedNote : n));
        setRecordedAudio(null);
        showToast({
          message: 'Voice message saved successfully',
          duration: 2000,
          color: 'success'
        });
        // Save to backend
        await updateNote(updatedNote.id, updatedNote, user.sub);
      } else {
        showToast({
          message: 'Failed to save voice message: No URL returned',
          duration: 3000,
          color: 'danger'
        });
      }
    } catch (error) {
      showToast({
        message: 'Failed to save voice message',
        duration: 3000,
        color: 'danger'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteVoiceMessage = async () => {
    if (!selectedNote?.id || !user?.sub) return;
    
    try {
      // Create an updated note with voice_message_url set to empty string
      const updatedNote = {
        ...selectedNote,
        voice_message_url: ''
      };
      
      await handleUpdateNote(
        updatedNote,
        user,
        setNotes,
        setSelectedNote,
        () => {
          // Clear any recorded audio
          setRecordedAudio(null);
          // Show success message
          showToast({
            message: 'Voice message deleted',
            duration: 2000,
            color: 'success'
          });
        },
        false
      );
    } catch (error) {
      console.error('Error deleting voice message:', error);
      showToast({
        message: 'Failed to delete voice message',
        duration: 2000,
        color: 'danger'
      });
    }
  };

  

  const toggleCoWorkerSelection = (coWorkerKey: string) => {
    const details = coWorkerDetails.find((d: any) => d.user_key === coWorkerKey);
    const coWorkerId = details?.user_id || coWorkerKey;
    if (selectedCoWorkers.includes(coWorkerId)) {
      setSelectedCoWorkers(selectedCoWorkers.filter(id => id !== coWorkerId));
    } else {
      setSelectedCoWorkers([...selectedCoWorkers, coWorkerId]);
    }
  };

  

  // Main useEffect for loading data
  useEffect(() => {
    const fetchData = async () => {
      if (user && user.sub) {
        try {
          // Fetch all folders and notes for the user
          const foldersResponse = await getFolders(user.sub);
          const notesResponse = await getNotes(user.sub);
          
          // Log all folders to help with debugging
          console.log('All folders:', foldersResponse);
          console.log('Looking for folder with name:', decodedName);
          
          // First try to find the folder by exact name and type 5 (calc folder)
          let currentFolder = foldersResponse.find(folder => 
            folder.name === decodedName && folder.folder_type === 5
          );
          
          // If not found by type 5, try with any folder type
          if (!currentFolder) {
            console.log('Folder not found with type 5, trying any folder with matching name');
            currentFolder = foldersResponse.find(folder => folder.name === decodedName);
            
            if (currentFolder) {
              console.log('Found folder with name but different type:', currentFolder);
              // Use this folder even if it's not type 5
            } else {
              // If still not found, try a case-insensitive match
              const lowerCaseName = decodedName.toLowerCase();
              currentFolder = foldersResponse.find(folder => 
                folder.name.toLowerCase() === lowerCaseName
              );
              
              if (currentFolder) {
                console.log('Found folder with case-insensitive name match:', currentFolder);
              }
            }
          }
          
          if (currentFolder) {
            console.log('Found folder to use:', currentFolder);
            // Parse the calc_method field to extract any embedded values
            if (currentFolder.calc_method) {
              // Handle percentage calculation method format: "percentage:100"
              if (currentFolder.calc_method.startsWith('percentage:')) {
                const parts = currentFolder.calc_method.split(':');
                if (parts.length > 1) {
                  const percentageValue = parseFloat(parts[1]);
                  if (!isNaN(percentageValue)) {
                    setPercentageValue(percentageValue);
                    console.log(`Extracted percentage value: ${percentageValue}`);
                  }
                  // Update the calc_method to just the base method for UI purposes
                  currentFolder.calc_method = 'percentage';
                }
              }
              // Handle goal calculation method format: "goal:1000"
              else if (currentFolder.calc_method.startsWith('goal:')) {
                const parts = currentFolder.calc_method.split(':');
                if (parts.length > 1) {
                  const goalValue = parseFloat(parts[1]);
                  if (!isNaN(goalValue)) {
                    setTargetGoal(goalValue);
                    console.log(`Extracted goal value: ${goalValue}`);
                  }
                  // Update the calc_method to just the base method for UI purposes
                  currentFolder.calc_method = 'goal';
                }
              }
            }
            
            setCurrentFolderId(currentFolder.id);
            setCurrentFolder(currentFolder);
            
            // Filter notes and folders for direct children
            const filteredNotes = notesResponse.filter(note => note.folder_id === currentFolder.id);
            console.log(`Found ${filteredNotes.length} notes for this folder`);
            
            const filteredFolders = foldersResponse.filter(folder => folder.folder_id === currentFolder.id && folder.folder_type !== 4);
            console.log(`Found ${filteredFolders.length} subfolders for this folder`);
            // Debug output for testing
            console.log('Current Folder:', { id: currentFolder.id, name: currentFolder.name });
            console.log('Filtered Notes to display:', filteredNotes);
            console.log('Filtered Folders to display:', filteredFolders);
            filteredNotes.sort(sortByYDescending);
            filteredFolders.sort(sortByYDescending);
            setNotes(filteredNotes);
            setFolders(filteredFolders);
            
            // Calculate the sum of all note calc_number values based on calc_method
            // Make sure we're only using the filtered notes for this folder
            calculateResult(currentFolder, filteredNotes);
          } else {
            // If folder not found, set empty arrays
            setNotes([]);
            setFolders([]);
            showToast({
              message: 'Folder not found',
              duration: 2000,
              color: 'danger'
            });
          }
        } catch (error) {
          console.error('Error fetching data:', error);
          showToast({
            message: 'Failed to load notes and folders',
            duration: 2000,
            color: 'danger'
          });
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [decodedName, user]);

  return (
    <IonPage ref={page}>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>{decodedName}</IonTitle>
        </IonToolbar>
        <IonToolbar color="primary">
          <IonSearchbar />
        </IonToolbar>
      </IonHeader>
      
      <IonContent 
        ref={contentRef}
        fullscreen
        scrollEvents={true}
        onIonScrollStart={() => {}}
        onIonScroll={() => {}}
        onIonScrollEnd={() => {}}
      >
        <IonRefresher 
          slot="fixed"
          onIonRefresh={onRefresh}
        >
          <IonRefresherContent />
        </IonRefresher>
        
        {/* Main content area */}
        <div className="ion-padding">
        <IonToolbar color={'light'}>
          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* First row with calculation method dropdown centered and larger */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <IonLabel className="calculation-method" style={{ marginRight: '10px', fontSize: '1.1em', alignSelf: 'center' }}>Calculation Method:</IonLabel>
              <IonSelect
                value={currentFolder?.calc_method || 'sum'}
                onIonChange={(e) => handleCalcMethodChange(e.detail.value)}
                interface="alert"
                className="calculation-select"
                style={{ 
                  minWidth: '180px', 
                  fontSize: '1.1em',
                  '--padding-start': '12px',
                  '--padding-end': '12px',
                  '--placeholder-color': '#1a1a1a',
                  '--placeholder-opacity': '1'
                }}
              >
                <IonSelectOption value="sum">Sum</IonSelectOption>
                <IonSelectOption value="average">Average (Grade)</IonSelectOption>
                <IonSelectOption value="percentage">Percentage</IonSelectOption>
                <IonSelectOption value="goal">Savings Goal</IonSelectOption>
                {/* Add more calculation methods in the future */}
              </IonSelect>
            </div>
            
            {/* Second row with percentage input (only visible when percentage method is selected) */}
            {currentFolder?.calc_method === 'percentage' && (
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <IonLabel className="calculation-label" style={{ marginRight: '10px', fontSize: '1.1em', alignSelf: 'center' }}>Percentage:</IonLabel>
                <IonInput
                  className="calculation-input"
                  type="number"
                  value={percentageValue}
                  onIonChange={(e) => {
                    const newValue = e.detail.value ? parseFloat(e.detail.value) : 100;
                    setPercentageValue(newValue);
                    // Recalculate immediately when percentage changes
                    if (currentFolder) {
                      const notesInCurrentFolder = notes.filter(note => note.folder_id === currentFolder.id);
                      calculateResult(currentFolder, notesInCurrentFolder);
                    }
                  }}
                  style={{ 
                    maxWidth: '100px',
                    '--padding-start': '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
                <span style={{ marginLeft: '5px', alignSelf: 'center' }}>%</span>
              </div>
            )}
            
            {/* Goal input (only visible when goal method is selected) */}
            {currentFolder?.calc_method === 'goal' && (
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <IonLabel className="calculation-label" style={{ marginRight: '10px', fontSize: '1.1em', alignSelf: 'center' }}>Target Goal:</IonLabel>
                <IonInput
                  className="calculation-input"
                  type="number"
                  value={targetGoal}
                  onIonChange={(e) => {
                    const newValue = e.detail.value ? parseFloat(e.detail.value) : 1000;
                    setTargetGoal(newValue);
                  }}
                  style={{ 
                    maxWidth: '120px',
                    '--padding-start': '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
              </div>
            )}
            
            {/* Third row with result */}
            <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <IonLabel className="result-text" style={{ fontSize: '1.5em', fontWeight: 'bold', margin: '10px 0', display: 'block' }}>
                  {result !== undefined ? result : '0'}
                </IonLabel>
                {folders.some(f => f.folder_id === currentFolder?.id && f.folder_type === 5) && (
                  <IonText color="medium" style={{ fontSize: '0.8em' }}>
                    <p>Includes {folders.filter(f => f.folder_id === currentFolder?.id && f.folder_type === 5).length} sub-calc folders</p>
                  </IonText>
                )}
              </div>
              
              {/* Progress bar for goal tracking */}
              {showGoal && calcNumberState !== undefined && (
                <div style={{ width: '100%', maxWidth: '300px', marginTop: '5px' }}>
                  <div style={{ 
                    width: '100%', 
                    height: '20px', 
                    backgroundColor: '#e0e0e0',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.min(100, (calcNumberState / targetGoal) * 100)}%`,
                      height: '100%',
                      backgroundColor: calcNumberState >= targetGoal ? 'var(--ion-color-success)' : 'var(--ion-color-primary)',
                      borderRadius: '10px',
                      transition: 'width 0.3s ease-in-out'
                    }} />
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '0.8em',
                    color: 'var(--ion-color-medium)',
                    marginTop: '2px'
                  }}>
                    <span>0</span>
                    <span>
                      {Math.round((calcNumberState / targetGoal) * 100)}% 
                      {calcNumberState >= targetGoal && '✓'}
                    </span>
                    <span>{targetGoal}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </IonToolbar>
      </div>

        {activeTab === 'notes' ? (
          <>
            {loading && (
              [...Array(10)].map((_, index) => (
                <IonCard key={index}>
                  <IonCardContent>
                    <IonItem>
                      <IonAvatar slot="start">
                        <IonSkeletonText />
                      </IonAvatar>
                      <IonLabel>
                        <IonSkeletonText animated style={{ width: '150px' }} />
                        <p>
                          <IonSkeletonText />
                        </p>
                      </IonLabel>
                      <IonChip color="primary" slot="end">
                      </IonChip>
                    </IonItem>
                  </IonCardContent>
                </IonCard>
              ))
            )}

            {/* Combined reorder group for both folders and notes */}
            <IonReorderGroup disabled={false} onIonItemReorder={handleReorderItems}>
              {/* Display only folders and notes matching the current folder's ID */}
              {[...folders, ...notes]
                .sort(sortByYDescending)
                .map((item) => {
                  if (isFolder(item)) {
                    // Render folder
                    const folder = item;
                    const isDropTarget = dropTargetId === folder.id;
                    
                    return (
                      <IonItem key={`folder-${folder.id}`}>
                        <div 
                          style={{
                            width: "100%",
                            ...(isDropTarget ? {...dragStyles.folderDropZone, ...dragStyles.folderDropZoneActive} : {})
                          }}
                          onDragOver={(e) => handleDragOver(e, folder.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, folder)}
                        >
                          <IonCard 
                            className="folder-card"
                            style={{ 
                              width: "100%",
                              '--background': 'var(--notable-folder-bg, #d4e3ff)',
                              transition: 'all 0.2s'
                            }}
                            draggable
                            onDragStart={(e) => handleFolderDragStart(e, folder)}
                            onMouseOver={(e) => {
                              const card = e.currentTarget as HTMLElement;
                              card.style.setProperty('background', 'var(--notable-hoverBg, #e6f0ff)');
                              card.style.boxShadow = '0 2px 8px var(--notable-overlay, rgba(0,0,0,0.05))';
                            }}
                            onMouseOut={(e) => {
                              const card = e.currentTarget as HTMLElement;
                              card.style.setProperty('background', 'var(--notable-folder-bg, #d4e3ff)');
                              card.style.boxShadow = 'none';
                            }}
                            onClick={() => onFolderClick(folder)}
                          >
                            <IonCardHeader>
                              <IonCardTitle>
                                <div 
                                  style={{ display: 'inline-block', cursor: 'pointer' }}
                                >
                                  <IonIcon
                                    icon={
                                      folder.folder_type === 2
                                        ? fileTrayFullOutline
                                        : folder.folder_type === 3
                                        ? analyticsOutline
                                        : folder.folder_type === 5 
                                        ? calculatorOutline
                                        : folderOutline
                                    }
                                    style={{ fontSize: "2em", marginRight: folder.password ? "2px" : "8px" }} 
                                  />
                                  {folder.password && (
                                    <IonIcon
                                      icon={lockClosedOutline}
                                      style={{ fontSize: "1.3em", color: "var(--ion-color-medium)", marginRight: "8px", verticalAlign: 'middle' }}
                                    />
                                  )}
                                </div>
                                <span 
                                  className="folder-title"
                                  style={{ 
                                    textDecoration: folder.crossed_out ? 'line-through' : 'none',
                                    display: 'inline-block',
                                    verticalAlign: 'middle',
                                    color: folder.color === 'standard' ? 'var(--ion-text-color, #000000)' : undefined
                                  }}
                                >
                                  <span className="colored-folder-title" style={{ color: folder.color && folder.color !== 'null' ? `var(--ion-color-${folder.color})` : undefined }}>
  {renderTextWithHashtags(folder.name, folder.color)}
</span>
                                  {/* Display number of sub calc folders if any */}
                                                                   {folders.filter(f => f.folder_id === folder.id && f.folder_type === 5).length > 0 && (
                                    <span style={{ 
                                      fontSize: '0.8em', 
                                      backgroundColor: 'var(--ion-color-primary)',
                                      color: 'white',
                                      borderRadius: '12px',
                                      padding: '2px 8px',
                                      marginLeft: '8px',
                                      display: 'inline-block',
                                      verticalAlign: 'middle'
                                    }}>
                                      {folders.filter(f => f.folder_id === folder.id && f.folder_type === 5).length} calc folders
                                    </span>
                                  )}
                                  
                                  {/* Display calc_number for calc folders */}
                                  {folder.folder_type === 5 && folder.calc_number !== undefined && folder.calc_number !== null && (
                                    <span style={{ 
                                      fontSize: '0.85em', 
                                      backgroundColor: 'var(--ion-color-warning)',
                                      color: 'white',
                                      borderRadius: '12px',
                                      padding: '2px 8px',
                                      marginLeft: '8px',
                                      display: 'inline-block',
                                    }}>
                                      {folder.calc_number}
                                    </span>
                                  )}
                                </span>
                              </IonCardTitle>
                              {/* Place the co-workers block here */}
                            </IonCardHeader>
                            <IonCardContent>
                              <IonButton onClick={async (e) => {
                                e.stopPropagation();
                                if (folder.password) {
                                  setUnlockFolderId(folder.id);
                                  setUnlockPassword('');
                                  setUnlockError('');
                                  setUnlockIntent('edit');
                                } else {
                                  onEditFolder(folder);
                                }
                              }}>
                                Edit Folder
                              </IonButton>
                            </IonCardContent>
                          </IonCard>
                        </div>
                        <IonReorder slot="end">
                          <IonIcon icon={reorderThreeOutline} style={{ fontSize: "1.5em", cursor: "grab" }} />
                        </IonReorder>
                      </IonItem>
                    );
                  } else if (isNote(item)) {
                    // Render note
                    const note = item;
                    const isBeingDragged = draggedItem?.type === 'note' && String(draggedItem.id) === String(note.id);
                    
                    function renderTextWithCheckboxes(
  text: string,
  noteId: string,
  onCheckboxToggle: (noteId: string, updatedText: string) => void,
  parentColor?: string
) {
  if (!text) return null;

  // Regular expression to match checkbox patterns: [] or [x]
  const checkboxRegex = /\[(x| )\]([^\[]*?)(?=\[|$)/g;

  // If no checkboxes in text, return the plain text with hashtags
  if (!text.includes('[') || !text.match(checkboxRegex)) {
    return renderTextWithHashtags(text, parentColor);
  }

  // Split the text into regular text and checkbox items
  const parts: JSX.Element[] = [];
  let nonCheckboxText = '';
  const checkboxItems: { isChecked: boolean; text: string; matchIndex: number; matchLength: number }[] = [];

  // First, extract all checkbox items
  let match: RegExpExecArray | null;
  const regex = /\[(x| )\]([^\[]*?)(?=\[|$)/g;

  while ((match = regex.exec(text)) !== null) {
    checkboxItems.push({
      isChecked: match[1] === 'x',
      text: match[2],
      matchIndex: match.index,
      matchLength: match[0].length
    });
  }

  // If there are checkbox items, extract the text before the first checkbox
  if (checkboxItems.length > 0) {
    nonCheckboxText = text.substring(0, checkboxItems[0].matchIndex);
  } else {
    nonCheckboxText = text;
  }

  // Add the non-checkbox text first if it exists
  if (nonCheckboxText.trim()) {
    parts.push(
      <div key="non-checkbox-text">{renderTextWithHashtags(nonCheckboxText, parentColor)}</div>
    );
  }

  // Add each checkbox item as a separate row
  checkboxItems.forEach((item, index) => {
    parts.push(
      <div 
        key={`checkbox-${index}`} 
        className="checkbox-row"
        style={{ 
          display: 'flex', 
          alignItems: 'flex-start',
          marginTop: '4px',
          cursor: 'pointer'
        }}
        onClick={(e) => {
          e.stopPropagation(); // Prevent note from opening
          e.preventDefault(); // Prevent default behavior

          // Create updated text with toggled checkbox - flip the current state
          const newIsChecked = !item.isChecked;
          const updatedText = text.substring(0, item.matchIndex) + 
            `[${newIsChecked ? 'x' : ' '}]${item.text}` + 
            text.substring(item.matchIndex + item.matchLength);

          onCheckboxToggle(noteId, updatedText);
        }}
      >
        <input 
          type="checkbox" 
          className="checkbox-input"
          checked={item.isChecked}
          onChange={(e) => {
            e.stopPropagation();
            e.preventDefault();
            // Create updated text with toggled checkbox - flip the current state
            const newIsChecked = !item.isChecked;
            const updatedText = text.substring(0, item.matchIndex) + 
              `[${newIsChecked ? 'x' : ' '}]${item.text}` + 
              text.substring(item.matchIndex + item.matchLength);

            onCheckboxToggle(noteId, updatedText);
          }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering parent onClick
            e.preventDefault(); // Prevent default behavior
          }}
          style={{ marginRight: '8px', marginTop: '3px', flexShrink: 0 }}
        />
        <span style={{ 
          textDecoration: item.isChecked ? 'line-through' : 'none',
          flex: 1
        }}>
          {renderTextWithHashtags(item.text, parentColor)}
        </span>
      </div>
    );
  });

  // Find text after the last checkbox
  if (checkboxItems.length > 0) {
    const lastItem = checkboxItems[checkboxItems.length - 1];
    const textAfterLastCheckbox = text.substring(lastItem.matchIndex + lastItem.matchLength);

    if (textAfterLastCheckbox.trim()) {
      parts.push(
        <div key="text-after-checkboxes" style={{ marginTop: '4px' }}>
          {renderTextWithHashtags(textAfterLastCheckbox, parentColor)}
        </div>
      );
    }
  }

  return <>{parts}</>;
}
                    return (
                      <IonItemSliding key={`note-${note.id}`} ref={(el) => handleDrag(el, () => onDeleteNote(note.id))}>
                        <IonItemOptions side="end">
                          <IonItemOption color="danger" onClick={() => onDeleteNote(note.id)}>
                            <IonIcon slot="icon-only" icon={trashBinOutline} />
                          </IonItemOption>
                        </IonItemOptions>
                        <IonItem>
                          <div 
                            draggable 
                            onDragStart={(e) => handleNoteDragStart(e, note)}
                            onDragEnd={handleDragEnd}
                            style={{
                              width: "100%",
                              cursor: "grab",
                              ...(isBeingDragged ? dragStyles.noteBeingDragged : {})
                            }}
                          >
                            <IonCard 
                              className="note-card"
                              style={{ 
                                width: "100%",
                                '--background': 'var(--notable-note-bg, #e0e7ef)',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => {
                                const card = e.currentTarget as HTMLElement;
                                card.style.setProperty('background', 'var(--notable-hoverBg, #e6f0ff)');
                                card.style.boxShadow = '0 2px 8px var(--notable-overlay, rgba(0,0,0,0.05))';
                              }}
                              onMouseOut={(e) => {
                                const card = e.currentTarget as HTMLElement;
                                card.style.setProperty('background', 'var(--notable-note-bg, #e0e7ef)');
                                card.style.boxShadow = 'none';
                              }}
                              onClick={() => onEditNote(note)}
                            >
                              <IonCardHeader>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                  {note.file_link && typeof note.file_link === 'string' && note.file_link.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) && (
                                    <img 
                                      src={`/NoteAPI${note.file_link}`}
                                      alt="Note attachment"
                                      style={{
                                        width: '80px',
                                        height: '80px',
                                        objectFit: 'cover',
                                        borderRadius: '8px'
                                      }}
                                    />
                                  )}
                                  <div style={{ flex: 1 }}>
                                    <IonCardTitle>
                                      <div style={{ 
                                        textDecoration: note.crossed_out ? 'line-through' : 'none',
                                        display: 'inline-block'
                                      }}>
                                        <span style={{
  color: note.color ? `var(--ion-color-${note.color})` : undefined,
  textDecoration: note.crossed_out ? 'line-through' : 'none',
}}>
  {note.title}
</span>
                                        {/* Display calculation number if available */}
                                        {note.calc_number !== undefined && note.calc_number !== null && (
                                          <span style={{
                                            fontSize: '0.85em',
                                            backgroundColor: note.crossed_out ? 'var(--ion-color-medium)' : 'var(--ion-color-success)',
                                            color: 'white',
                                            borderRadius: '12px',
                                            padding: '2px 8px',
                                            marginLeft: '8px',
                                            display: 'inline-block',
                                            verticalAlign: 'middle',
                                            textDecoration: note.crossed_out ? 'line-through' : 'none'
                                          }}>
                                            {note.calc_number}
                                          </span>
                                        )}
                                        {/* Description text */}
                                        {note.text && (
                                          <div className="note-description" style={{
  textDecoration: note.crossed_out ? 'line-through' : 'none',
}}>
  {note.text?.includes('[') && note.text?.includes(']')
    ? renderTextWithCheckboxes(
        note.text,
        note.id,
        (noteId: string, updatedText: string) => {
          setNotes(prevNotes => prevNotes.map(n => String(n.id) === String(noteId) ? { ...n, text: updatedText } : n));
          updateNote(noteId, { ...note, text: updatedText }, user?.sub || '');
        },
        note.color // Pass the note color here
      )
    : renderTextWithHashtags(note.text || '', note.color)
  }
</div>
                                        )}
                                      </div>
                                    </IonCardTitle>
                                    <IonCardContent>
                                      {note.image_url && (
  <div style={{ marginBottom: '8px', textAlign: 'center' }}>
    <img
      src={note.image_url}
      alt={note.title || 'Note image'}
      style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--ion-color-medium-tint)', cursor: 'pointer' }}
      onClick={e => {
        e.stopPropagation();
        setImageModalUrl(note.image_url || null);
        setShowImageModal(true);
      }}
    />
  </div>
)}
                                      
                                      {note.file_link && typeof note.file_link === 'string' && !note.file_link.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) && (
                                        <div style={{ marginTop: '8px' }}>
                                          <a 
                                            href={note.file_link}
                                            download={note.file_link.substring(note.file_link.lastIndexOf('/') + 1)}
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            style={{ textDecoration: 'none' }} 
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <IonChip color="primary">
                                              <IonIcon icon={documentAttachOutline} />
                                              <IonLabel>Download Attachment</IonLabel>
                                            </IonChip>
                                          </a>
                                        </div>
                                      )}
                                      {note.file_link && Array.isArray(note.file_link) && note.file_link.length > 0 && (
                                        <div style={{ marginTop: '8px' }}>
                                          {note.file_link.map((link, index) => (
                                            <a 
                                              key={index}
                                              href={link}
                                              download={link.substring(link.lastIndexOf('/') + 1)}
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              style={{ textDecoration: 'none', display: 'inline-block', marginRight: '8px', marginBottom: '8px' }} 
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <IonChip color="primary">
                                                <IonIcon icon={documentAttachOutline} />
                                                <IonLabel>Attachment {index + 1}</IonLabel>
                                              </IonChip>
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </IonCardContent>
                                  </div>
                                </div>
                              </IonCardHeader>
                            </IonCard>
                          </div>
                          <IonReorder slot="end">
                            <IonIcon icon={reorderThreeOutline} style={{ fontSize: "1.5em", cursor: "grab" }} />
                          </IonReorder>
                        </IonItem>
                      </IonItemSliding>
                    );
                  }
                  return null;
                })
              }
            </IonReorderGroup>

            <IonFab vertical="bottom" horizontal="start" slot="fixed">
              <IonFabButton onClick={() => {
                setTitle('');
                setText('');
                cardModal.current?.present();
              }}>
                <IonIcon icon={addOutline} />
              </IonFabButton>
            </IonFab>
          </>
        ) : (
          <IonCard style={{ margin: '16px' }}>
            <IonCardHeader>
              <IonCardTitle>Media Library</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonButton expand="block" onClick={() => history.push('/app/media')}>
                <IonIcon icon={musicalNoteOutline} slot="start" />
                Open Media Folder
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        <IonModal 
          ref={modal} 
          isOpen={selectedNote !== null} 
          onDidDismiss={handleModalDismiss}
          presentingElement={presentingElement!}
        >
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => modal.current!.dismiss()}>Close</IonButton>
              </IonButtons>
              <IonTitle>Edit Note</IonTitle>
            </IonToolbar>
            <IonToolbar>
              <IonSegment value={modalTab} onIonChange={(e) => setModalTab(e.detail.value as 'notes' | 'attachments' | 'settings')}>
                <IonSegmentButton value="notes">Notes</IonSegmentButton>
                <IonSegmentButton value="attachments">Attachments</IonSegmentButton>
                <IonSegmentButton value="settings">Settings</IonSegmentButton>
              </IonSegment>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {modalTab === 'notes' && (
              <>
                <IonItem>
                  <IonLabel position="stacked">Title</IonLabel>
                  <IonInput value={title} onIonChange={(e) => setTitle(e.detail.value!)} />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Text</IonLabel>
                  <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                    <IonTextarea 
                      value={text} 
                      onIonChange={(e) => setText(e.detail.value!)} 
                      style={{ flex: 1, marginRight: '8px' }}
                    />
                    <IonButton 
                      size="small" 
                      color="warning" 
                      onClick={() => {
                        if (selectedNote?.text) {
                          // Uncheck all checkboxes by replacing [x] with [ ]
                          const uncheckedText = selectedNote.text.replace(/\[x\]/gi, '[ ]');
                          setText(uncheckedText);
                          
                          // Update the note in state
                          const updatedNote = { ...selectedNote, text: uncheckedText };
                          setSelectedNote(updatedNote);
                          
                          // Show success message
                          showToast({
                            message: 'All checkboxes unchecked',
                            duration: 2000,
                            color: 'success'
                          });
                        }
                      }}
                      disabled={!selectedNote?.text?.includes('[x]')}
                      style={{ margin: '0 0 16px 0' }}
                    >
                      Uncheck All
                    </IonButton>
                  </div>
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Calculation Value</IonLabel>
                  <IonInput
                    type="number"
                    value={noteNumber !== null ? noteNumber : ''}
                    onIonChange={(e) => setNoteNumber(e.detail.value ? parseInt(e.detail.value) : null)}
                    placeholder="Enter a number for calculations"
                  />
                </IonItem>
                {selectedNote?.image_url && (
                  <IonItem lines="none" style={{ marginTop: '10px', marginBottom: '10px', textAlign: 'center' }}>
                    <img src={selectedNote.image_url} alt="Note attachment" style={{ maxWidth: '100%', maxHeight: '200px', border: '1px solid var(--ion-color-medium)', borderRadius: '4px' }} />
                  </IonItem>
                )}
                <IonButton expand="block" onClick={onUpdateNote}>Update Note</IonButton>
                <IonButton expand="block" color="danger" onClick={() => onDeleteNote(selectedNote!.id)}>Delete Note</IonButton>
              </>
            )}
            {modalTab === 'attachments' && (
              <div className="ion-padding">
                {/* Handle single string file_link (legacy format) */}
                {selectedNote?.file_link && typeof selectedNote.file_link === 'string' && (
                  <>
                    <IonListHeader>
                      <IonLabel color="medium">Current Attachment</IonLabel>
                    </IonListHeader>
                    <IonItem lines="none" className="ion-margin-bottom">
                      <IonButton 
                        fill="outline" 
                        href={selectedNote.file_link} 
                        download={selectedNote.file_link.substring(selectedNote.file_link.lastIndexOf('/') + 1)}
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <IonIcon icon={codeDownloadOutline} slot="start" />
                        Download File ({selectedNote.file_link.split('/').pop()})
                      </IonButton>
                    </IonItem>
                  </>
                )}
                
                {/* Handle array of file_links (new format) */}
                {selectedNote?.file_link && Array.isArray(selectedNote.file_link) && selectedNote.file_link.length > 0 && (
                  <>
                    <IonListHeader>
                      <IonLabel color="medium">Current Attachments</IonLabel>
                    </IonListHeader>
                    {selectedNote.file_link.map((link, index) => (
                      <IonItem key={index} lines="none" className="ion-margin-bottom">
                        <IonButton 
                          fill="outline" 
                          href={link} 
                          download={link.substring(link.lastIndexOf('/') + 1)}
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <IonIcon icon={codeDownloadOutline} slot="start" />
                          Download File {index + 1} ({link.split('/').pop()})
                        </IonButton>
                      </IonItem>
                    ))}
                  </>
                )}
                {/* Section for uploading new files starts below */}
                <IonItem>
                  <IonLabel position="stacked">Add a Number</IonLabel>
                  <IonInput 
                    type="number" 
                    step="0.01"
                    placeholder="Enter a number (decimals allowed)"
                    value={calcNumberState}
                    onIonChange={(e) => setCalcNumberState(e.detail.value ? parseFloat(e.detail.value) : undefined)}
                  />
                </IonItem>

                <IonItem lines="none" className="ion-margin-top">
                  <IonLabel>Upload File or Image</IonLabel>
                  <input 
                    type="file" 
                    id="file-upload" 
                    style={{ display: 'none' }} 
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt,.mp3,.wav"
                  />
                  <IonButton fill="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                    <IonIcon icon={documentAttachOutline} slot="start" />
                    Choose Files
                  </IonButton>
                  <IonButton fill="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                    <IonIcon icon={imageOutline} slot="start" />
                    Add Image
                  </IonButton>
                </IonItem>

                {uploadedFiles.length > 0 && (
                  <IonList className="ion-margin-top">
                    <IonListHeader>
                      <IonLabel>Attachments</IonLabel>
                    </IonListHeader>
                    {uploadedFiles.map((item) => (
                      <IonItem key={item.id}>
                        <IonIcon 
                          icon={item.type === 'image' ? imageOutline : documentAttachOutline} 
                          slot="start" 
                          color="primary"
                        />
                        <IonLabel>
                          <h3>{item.file.name}</h3>
                          <p>{Math.round(item.file.size / 1024)} KB</p>
                        </IonLabel>
                        {item.type === 'image' && (
                          <img 
                            src={item.previewUrl} 
                            alt="Preview" 
                            style={{
                              width: '50px',
                              height: '50px',
                              objectFit: 'cover',
                              marginLeft: '10px'
                            }} 
                          />
                        )}
                        <IonButton 
                          fill="clear" 
                          color="danger" 
                          slot="end"
                          onClick={() => handleRemoveFile(item.id)}
                        >
                          <IonIcon icon={closeCircleOutline} />
                        </IonButton>
                      </IonItem>
                    ))}
                  </IonList>
                )}

                <IonButton 
                  expand="block" 
                  className="ion-margin-top"
                  onClick={handleUploadFiles}
                  disabled={uploadedFiles.length === 0 || isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Save Attachments'}
                </IonButton>

                <IonItem lines="none" className="ion-margin-top">
                  <IonLabel>Voice Message</IonLabel>
                  {!isRecording ? (
                    <IonButton 
                      onClick={startRecording} 
                      color="primary" 
                      fill="outline"
                    >
                      <IonIcon icon={micOutline} slot="start" />
                      Record
                    </IonButton>
                  ) : (
                    <IonButton 
                      onClick={stopRecording} 
                      color="danger" 
                      fill="outline"
                    >
                      <IonIcon icon={micOffOutline} slot="start" />
                      Stop
                    </IonButton>
                  )}
                </IonItem>

                {(recordedAudio || selectedNote?.voice_message_url) && (
                  <div className="ion-margin-top">
                    <audio controls>
                      <source 
                        src={recordedAudio || (selectedNote?.voice_message_url || '')} 
                        type="audio/webm" 
                      />
                      Your browser does not support the audio element.
                    </audio>
                    {recordedAudio && (
                      <IonButton
                        expand="block"
                        color="primary"
                        fill="solid"
                        className="ion-margin-top"
                        onClick={saveVoiceMessage}
                        disabled={isUploading}
                      >
                        {isUploading ? 'Saving...' : 'Save Voice Message'}
                      </IonButton>
                    )}
                    <IonButton 
                      expand="block" 
                      color="danger" 
                      fill="outline"
                      className="ion-margin-top"
                      onClick={deleteVoiceMessage}
                    >
                      Delete Recording
                    </IonButton>
                  </div>
                )}
              </div>
            )}
            {modalTab === 'settings' && (
              <div style={{ marginTop: "16px" }}>
                <IonItem>
                  <IonLabel>Color</IonLabel>
                  <IonSelect value={selectedNote?.color || 'medium'} onIonChange={e => {
                    if (selectedNote && user) {
                      const updatedNote = { 
                        ...selectedNote, 
                        color: e.detail.value === 'medium' ? null : e.detail.value 
                      };
                      handleUpdateNote(
                        updatedNote,
                        user,
                        setNotes,
                        setSelectedNote,
                        () => {},
                        true // isSettingsChange
                      );
                    }
                  }}>
                    <IonSelectOption value="primary">Primary</IonSelectOption>
                    <IonSelectOption value="secondary">Secondary</IonSelectOption>
                    <IonSelectOption value="tertiary">Tertiary</IonSelectOption>
                    <IonSelectOption value="success">Success</IonSelectOption>
                    <IonSelectOption value="warning">Warning</IonSelectOption>
                    <IonSelectOption value="danger">Danger</IonSelectOption>
                    <IonSelectOption value="light">Light</IonSelectOption>
                    <IonSelectOption value="medium">Default</IonSelectOption>
                    <IonSelectOption value="dark">Dark</IonSelectOption>
                  </IonSelect>
                </IonItem>
                <IonItem>
                  <IonLabel>Crossed Out</IonLabel>
                  <IonToggle
                    checked={!!selectedNote?.crossed_out}
                    onIonChange={e => {
                      if (selectedNote && user) {
                        const updatedNote = { ...selectedNote, crossed_out: e.detail.checked };
                        handleUpdateNote(
                          updatedNote,
                          user,
                          setNotes,
                          (note) => setSelectedNote(note),
                          () => {},
                          true // isSettingsChange
                        );
                      }
                    }}
                  />
                </IonItem>
                <IonSelect
  value={dropdownValue}
  placeholder="Select an option"
  onIonChange={(e) => {
    const selectedValue = e.detail.value;
    setDropdownValue(selectedValue);
    if (selectedValue === "option4") {
      onTurnNoteIntoFolder(5); // Only allow Calc Folder
    }
    modal.current?.dismiss();
  }}
>
  <IonSelectOption value="option4">Turn Note into Calc Folder</IonSelectOption>
</IonSelect>
              </div>
            )}
          </IonContent>
        </IonModal>

        <IonModal 
          ref={cardModal} 
          presentingElement={presentingElement!}
          onDidDismiss={() => {
            setTitle('');
            setText('');
          }}
        >
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => cardModal.current!.dismiss()}>Close</IonButton>
              </IonButtons>
              <IonTitle>Add Note</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Title</IonLabel>
              <IonInput value={title} onIonChange={(e) => setTitle(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Text</IonLabel>
              <IonTextarea value={text} onIonChange={(e) => setText(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Calculation Value</IonLabel>
              <IonInput
                type="number"
                value={noteNumber !== null ? noteNumber : ''}
                onIonChange={(e) => setNoteNumber(e.detail.value ? parseInt(e.detail.value) : null)}
                placeholder="Enter a number for calculations"
              />
            </IonItem>
            <IonButton expand="block" onClick={onAddNote}>Add Note</IonButton>
          </IonContent>
        </IonModal>

        <IonModal 
          ref={folderModal} 
          isOpen={selectedFolder !== null} 
          onDidDismiss={() => {
            setSelectedFolder(null);
            setFolderName('');
            setFolderColor('null');
            setIsCrossedOut(false);
            setIsChecklistEnabled(false);
            setFolderModalTab('folder');
            setFolderPassword('');
            setOldFolderPassword('');
            setPasswordFolderId(null);
          }}
          presentingElement={presentingElement!}
        >
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => folderModal.current!.dismiss()}>Close</IonButton>
              </IonButtons>
              <IonTitle>{selectedFolder ? 'Edit Folder' : 'Add Folder'}</IonTitle>
            </IonToolbar>
            <IonToolbar>
              <IonSegment value={folderModalTab} onIonChange={(e) => {
  const tab = e.detail.value as 'folder' | 'settings' ;
  setFolderModalTab(tab);
  
}}>
                <IonSegmentButton value="folder">Folder</IonSegmentButton>
                <IonSegmentButton value="settings">Settings</IonSegmentButton>
                
              </IonSegment>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {folderModalTab === 'folder' && (
              <>
                <IonItem>
                  <IonLabel position="stacked">Folder Name</IonLabel>
                  <IonInput value={folderName} onIonChange={(e) => setFolderName(e.detail.value!)} />
                </IonItem>
                <IonButton expand="block" onClick={selectedFolder ? onUpdateFolder : onAddFolder}>
                  {selectedFolder ? 'Update Folder' : 'Add Folder'}
                </IonButton>
                {selectedFolder && (
                  <IonButton expand="block" color="danger" onClick={() => onDeleteFolder(selectedFolder.id)}>
                    Delete Folder
                  </IonButton>
                )}
              </>
            )}
            {folderModalTab === 'settings' && selectedFolder && (
              <div style={{ marginTop: "16px" }}>
                {selectedFolder?.password && (
                  <IonItem>
                    <IonLabel position="stacked">Old Password</IonLabel>
                    <IonInput
                      type="password"
                      value={oldFolderPassword}
                      onIonChange={e => setOldFolderPassword(e.detail.value!)}
                      placeholder="Enter current password"
                    />
                  </IonItem>
                )}
                <IonItem>
                  <IonLabel position="stacked">New Password</IonLabel>
                  <IonInput
                    type="password"
                    value={folderPassword}
                    onIonChange={e => setFolderPassword(e.detail.value!)}
                    placeholder="Set or update folder password"
                  />
                </IonItem>
                {selectedFolder && selectedFolder.password && (
                  <IonButton
                    expand="block"
                    color="danger"
                    style={{ marginTop: 8, marginBottom: 12 }}
                    onClick={async () => {
                      if (!oldFolderPassword) {
                        showToast({ message: 'Please enter the old password to delete', duration: 2000, color: 'danger' });
                        return;
                      }
                      try {
                        const old_password_hash = await hashStringSHA256(oldFolderPassword);
                        if (user && user.sub) {
                          await updateFolderPassword(selectedFolder.id, '', user.sub, old_password_hash);
                          // Update folders state and selectedFolder to remove password instantly
                          setFolders(prev => prev.map(f => f.id === selectedFolder.id ? { ...f, password: '' } : f));
                          setSelectedFolder(prev => prev && prev.id === selectedFolder.id ? { ...prev, password: '' } : prev);
                          showToast({ message: 'Password deleted!', duration: 2000, color: 'success' });
                          setFolderPassword('');
                          setOldFolderPassword('');
                          setPasswordFolderId(selectedFolder.id);
                        } else {
                          showToast({ message: 'User not authenticated', duration: 2000, color: 'danger' });
                        }
                      } catch (err: any) {
                        if (err?.response?.status === 403) {
                          showToast({ message: 'Old password does not match', duration: 2000, color: 'danger' });
                        } else {
                          showToast({ message: 'Failed to delete password', duration: 2000, color: 'danger' });
                        }
                      }
                    }}
                  >
                    Delete Password
                  </IonButton>
                )}
                <IonButton
                  expand="block"
                  color="primary"
                  onClick={async () => {
                    if (!folderPassword) {
                      showToast({ message: 'Please enter a password', duration: 2000, color: 'danger' });
                      return;
                    }
                    try {
                      const password_hash = await hashStringSHA256(folderPassword);
                      let old_password_hash = undefined;
                      if (selectedFolder.password) {
                        if (!oldFolderPassword) {
                          showToast({ message: 'Please enter the old password', duration: 2000, color: 'danger' });
                          return;
                        }
                        old_password_hash = await hashStringSHA256(oldFolderPassword);
                      }
                      if (user && user.sub) {
                        await updateFolderPassword(
                          selectedFolder.id,
                          password_hash,
                          user.sub,
                          old_password_hash
                        );
                        // Update folders state and selectedFolder to immediately reflect new password
                        setFolders(prev => prev.map(f => f.id === selectedFolder.id ? { ...f, password: password_hash } : f));
                        setSelectedFolder(prev => prev && prev.id === selectedFolder.id ? { ...prev, password: password_hash } : prev);
                        showToast({ message: 'Password saved!', duration: 2000, color: 'success' });
                        setFolderPassword('');
                        setOldFolderPassword('');
                        setPasswordFolderId(selectedFolder.id);
                      } else {
                        showToast({ message: 'User not authenticated', duration: 2000, color: 'danger' });
                      }
                    } catch (err: any) {
                      if (err?.response?.status === 403) {
                        showToast({ message: 'Old password does not match', duration: 2000, color: 'danger' });
                      } else {
                        showToast({ message: 'Failed to save password', duration: 2000, color: 'danger' });
                      }
                    }
                  }}
                  style={{ marginBottom: 12 }}
                >
                  Save Password
                </IonButton>
                <IonItem>
                  <IonLabel>Color</IonLabel>
                  <IonSelect value={folderColor} onIonChange={(e) => {
                    setFolderColor(e.detail.value);
                    if (selectedFolder) {
                      const updatedFolder = {
                        ...selectedFolder,
                        color: e.detail.value === 'white' ? null : e.detail.value,
                        crossed_out: isCrossedOut,
                        checklist: isChecklistEnabled
                      };
                      handleUpdateFolder(updatedFolder, user, folderName, folderDescription, folderType, setFolders, setSelectedFolder, () => {
                        folderModal.current!.dismiss();
                      });
                    }
                  }}>
                    <IonSelectOption value="white">White</IonSelectOption>
                    <IonSelectOption value="primary">Primary</IonSelectOption>
                    <IonSelectOption value="secondary">Secondary</IonSelectOption>
                    <IonSelectOption value="tertiary">Tertiary</IonSelectOption>
                    <IonSelectOption value="success">Success</IonSelectOption>
                    <IonSelectOption value="warning">Warning</IonSelectOption>
                    <IonSelectOption value="danger">Danger</IonSelectOption>
                    <IonSelectOption value="light">Light</IonSelectOption>
                    <IonSelectOption value="medium">Medium</IonSelectOption>
                    <IonSelectOption value="dark">Dark</IonSelectOption>
                  </IonSelect>
                </IonItem>
                <IonItem>
                  <IonLabel>Crossed Out</IonLabel>
                  <IonToggle 
                    checked={isCrossedOut} 
                    onIonChange={(e) => {
                      setIsCrossedOut(e.detail.checked);
                      if (selectedFolder) {
                        const updatedFolder = {
                          ...selectedFolder,
                          crossed_out: e.detail.checked,
                          color: folderColor,
                          checklist: isChecklistEnabled
                        };
                        handleUpdateFolder(updatedFolder, user, folderName, folderDescription, folderType, setFolders, setSelectedFolder, () => {
                          folderModal.current!.dismiss();
                        });
                      }
                    }} 
                  />
                </IonItem>
                <IonItem>
                  <IonLabel>Enable Checkboxes</IonLabel>
                  <IonToggle 
                    checked={isChecklistEnabled} 
                    onIonChange={(e) => {
                      setIsChecklistEnabled(e.detail.checked);
                      if (selectedFolder) {
                        const updatedFolder = {
                          ...selectedFolder,
                          checklist: e.detail.checked,
                          color: folderColor,
                          crossed_out: isCrossedOut
                        };
                        handleUpdateFolder(updatedFolder, user, folderName, folderDescription, folderType, setFolders, setSelectedFolder, () => {
                          folderModal.current!.dismiss();
                        });
                      }
                    }} 
                  />
                </IonItem>
              </div>
            )}
          </IonContent>
        </IonModal>
      {/* Main content */}
      
      {/* Unlock Folder Modal */}
      <IonModal isOpen={!!unlockFolderId} onDidDismiss={() => { setUnlockFolderId(null); setUnlockPassword(''); setUnlockError(''); }}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Enter Folder Password</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Password</IonLabel>
            <IonInput
              type="password"
              value={unlockPassword}
              onIonChange={e => setUnlockPassword(e.detail.value!)}
              placeholder="Enter password to unlock folder"
            />
          </IonItem>
          {unlockError && <div style={{color: 'red', marginTop: 8}}>{unlockError}</div>}
          <IonButton expand="block" style={{marginTop: 16}}
            onClick={async () => {
              const folder = folders.find(f => f.id === unlockFolderId);
              if (!folder) return;
              if (!unlockPassword) {
                setUnlockError('Please enter the password');
                return;
              }
              const hash = await hashStringSHA256(unlockPassword);
              if (folder.password === hash) {
                setUnlockFolderId(null);
                setUnlockPassword('');
                setUnlockError('');
                if (unlockIntent === 'edit') {
                  onEditFolder(folder);
                } else {
                  navigateToFolder(folder);
                }
                setUnlockIntent(null);
              } else {
                setUnlockError('Incorrect password');
              }
            }}
          >
            Unlock
          </IonButton>
          <IonButton 
            expand="block" 
            color="medium" 
            onClick={() => { 
              setUnlockFolderId(null); 
              setUnlockPassword(''); 
              setUnlockError(''); 
            }}
          >
            Cancel
          </IonButton>
        </IonContent>
      </IonModal>
    </IonContent>
  {/* Image preview modal for larger view and download */}
<IonModal 
  isOpen={showImageModal} 
  onDidDismiss={() => setShowImageModal(false)}
  mode="ios"
  backdropDismiss={true}
>
  <IonPage>
    <IonHeader>
      <IonToolbar color="dark">
        <IonButtons slot="start">
          <IonButton onClick={() => setShowImageModal(false)}>
            <IonIcon slot="icon-only" icon={closeOutline} />
          </IonButton>
        </IonButtons>
        <IonTitle>Image Preview</IonTitle>
        <IonButtons slot="end">
          <IonButton 
            href={imageModalUrl || '#'} 
            download={imageModalUrl ? imageModalUrl.split('/').pop() || 'image' : 'image'}
            target="_blank"
            disabled={!imageModalUrl}
          >
            <IonIcon slot="start" icon={codeDownloadOutline} />
            Download
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent fullscreen className="ion-no-padding" style={{ backgroundColor: '#000' }}>
      {imageModalUrl && (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' }}>
          <img
            src={imageModalUrl}
            alt="Full size preview"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      )}
    </IonContent>
  </IonPage>
</IonModal>

</IonPage>
  );
};

export default CalcFolder;