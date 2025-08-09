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
  IonSpinner,
} from "@ionic/react";
import { addOutline, folderOutline, trashBinOutline, reorderThreeOutline, saveOutline, sendOutline, calculatorOutline, fileTrayFullOutline, musicalNoteOutline, createOutline, analyticsOutline, trashOutline, pinOutline, attachOutline, micOutline, documentAttachOutline, codeDownloadOutline, imageOutline, closeCircleOutline, lockClosedOutline, personAddOutline, peopleOutline, checkmarkCircleOutline, closeOutline, checkmarkDoneCircleOutline, searchSharp, downloadOutline } from "ionicons/icons";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getNotes, addNote, updateNote, deleteNote, Note, getFolders, addFolder, Folder, deleteFolder, updateFolder, uploadNoteImage, uploadVoiceMessage, uploadFiles, updateFolderPassword, getUserCoWorkers, updateFolderCoWorkers, getCoWorkerDetails, CoWorkerDetail, apiUrl } from './apiService';


import { Capacitor } from '@capacitor/core';
import './List.css';
import handleDrag from "./draggingHandler";
import { useAuth0 } from '@auth0/auth0-react';
import { useHistory } from "react-router-dom";
import axios from 'axios';
import { handleAddFolder, handleAddNote, handleDeleteFolder, handleDeleteNote, handleUpdateFolder, handleUpdateNote, handleUploadFilesToServer } from "./apiCalls";
import { hashStringSHA256 } from "./hash";

// Define a union type for items that can be reordered
type ReorderableItem = Note | Folder;

// Helper function to determine if an item is a Note
const isNote = (item: ReorderableItem): item is Note => {
  return (item as Note).text !== undefined;
};

// EXTEND NOTE INTERFACE LOCALLY (for frontend typing)
type NoteWithMedia = Note & {
  attachments?: { name: string, url: string }[];
  images?: string[];
  voice_recordings?: string[];
};

// Helper function to determine if an item is a Folder
const isFolder = (item: ReorderableItem): item is Folder => {
  return (item as Folder).folder_type !== undefined;
};

// Interface for the exported folder structure with all optional properties marked accordingly
interface ExportedFolder {
  id: string;
  name: string;
  folder_id?: string;
  folder_type?: number;
  x?: number | null;
  y?: number | null;
  width?: number;
  height?: number;
  crossed_out?: boolean;
  color?: string | null;
  checklist?: boolean;
  calc_number?: number | null;
  calc_method?: string | null;
  calc_metadata?: any;
  description?: string;
  co_workers?: string[] | null;
  connected_to?: string[] | null;
  pinboard_id?: number;
  notes?: Array<Omit<Note, 'user_id'>>;
  subfolders?: ExportedFolder[];
}

// Function to export a folder and its contents as JSON
const exportFolderAsJson = async (
  folder: Folder,
  allFolders: Folder[],
  allNotes: Note[],
  userId: string
): Promise<ExportedFolder> => {
  // Get all notes for this folder
  const folderNotes = allNotes
    .filter(note => note.folder_id && note.folder_id.toString() === folder.id.toString())
    .map(note => {
      // Remove user_id and any backend-only fields
      const { user_id, ...noteWithId } = note;
      return noteWithId;
    });

  // Get all direct subfolders
  const subFolders = allFolders.filter(f => f.folder_id && f.folder_id.toString() === folder.id.toString());

  // Recursively export subfolders
  const exportedSubfolders = await Promise.all(
    subFolders.map(subFolder => exportFolderAsJson(subFolder, allFolders, allNotes, userId))
  );

  // Explicitly construct the exported folder object
  return {
    id: folder.id,
    name: folder.name,
    folder_id: folder.folder_id,
    folder_type: folder.folder_type,
    x: folder.x ?? null,
    y: folder.y ?? null,
    width: folder.width,
    height: folder.height,
    crossed_out: folder.crossed_out,
    color: folder.color,
    checklist: folder.checklist,
    calc_number: folder.calc_number,
    calc_method: folder.calc_method,
    calc_metadata: folder.calc_metadata,
    description: folder.description,
    co_workers: folder.co_workers,
    connected_to: folder.connected_to ?? [],
    pinboard_id: folder.pinboard_id,
    notes: folderNotes,
    subfolders: exportedSubfolders
  };
};


// Helper function to process text with hashtags and return segments
const processHashtags = (text: string): { text: string; isHashtagged: boolean; isDoubleHashtag: boolean; hashtagIndex: number }[] => {
  if (!text) return [];
  
  const segments: { text: string; isHashtagged: boolean; isDoubleHashtag: boolean; hashtagIndex: number }[] = [];
  let lastIndex = 0;
  let hashtagCount = 0;
  
  // Process text character by character
  let i = 0;
  while (i < text.length) {
    // Check for double hashtag
    if (text[i] === '#' && text[i + 1] === '#') {
      // Look for closing ##
      let endIndex = -1;
      for (let j = i + 2; j < text.length - 1; j++) {
        if (text[j] === '#' && text[j + 1] === '#') {
          endIndex = j;
          break;
        }
      }
      
      if (endIndex !== -1) {
        // Add text before the hashtag if any
        if (i > lastIndex) {
          segments.push({
            text: text.substring(lastIndex, i),
            isHashtagged: false,
            isDoubleHashtag: false,
            hashtagIndex: -1
          });
        }
        
        // Add the double-hashtagged content
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
    }
    // Check for single hashtag
    else if (text[i] === '#' && (i === 0 || text[i - 1] !== '#') && (i === text.length - 1 || text[i + 1] !== '#')) {
      // Look for closing single hashtag
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
        // Add text before the hashtag if any
        if (i > lastIndex) {
          segments.push({
            text: text.substring(lastIndex, i),
            isHashtagged: false,
            isDoubleHashtag: false,
            hashtagIndex: -1
          });
        }
        
        // Add the single-hashtagged content
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
  
  // Add any remaining text
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

// Helper function to render text with hashtags and newlines
const renderTextWithHashtags = (text: string, parentColor?: string, isStandardCard?: boolean) => {
  if (!text) return null;
  
  // First, split the text by newlines
  const lines = text.split('\n');
  
  // If there's only one line, process it normally
  if (lines.length === 1) {
    const segments = processHashtags(text);
    const totalHashtags = segments.filter(s => s.isHashtagged).length;
    
    if (segments.length === 0) {
      return <span style={{ display: 'inline' }}>{text}</span>;
    }
    
    return renderHashtagSegments(segments, totalHashtags, parentColor, isStandardCard);
  }
  
  // If there are multiple lines, render each line separately with line breaks
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
              <span style={{ display: 'inline' }}>{line}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Helper function to render segments with hashtags (used by renderTextWithHashtags)
const renderHashtagSegments = (segments: any[], totalHashtags: number, parentColor?: string, isStandardCard?: boolean) => {
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
      {segments.map((segment, index) => (
        segment.isHashtagged ? (
          <span 
            key={index}
            style={{
              display: 'inline',
              position: 'relative',
              zIndex: 1,
              color: getHashtagColor(segment) || undefined,
              all: 'unset',
              WebkitTextFillColor: getHashtagColor(segment) || undefined
            }}
          >
            {segment.text}
          </span>
        ) : (
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
        )
      ))}
    </span>
  );
};

// Helper function to render text with checkboxes
const renderTextWithCheckboxes = (text: string, noteId: string, onCheckboxToggle: (noteId: string, updatedText: string) => void, parentColor?: string) => {
  if (!text) return null;
  
  // Regular expression to match checkbox patterns: [] or [x]
  const checkboxRegex = /\[(x| )\]([^\[]*?)(?=\[|$)/g;
  
  // If no checkboxes in text, return the plain text
  if (!text.includes('[') || !text.match(checkboxRegex)) {
    return <span>{text}</span>;
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
};

// Interface for drag data
interface DragData {
  type: 'note' | 'folder';
  id: number;
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

const List: React.FC = () => {
  // State for drag and drop
  const [draggedItem, setDraggedItem] = useState<DragData | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const { user } = useAuth0();
  const [loading, setLoading] = useState<boolean>(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showAlert] = useIonAlert();
  const [showToast] = useIonToast();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteNumber, setNoteNumber] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [calcNumberState, setCalcNumberState] = useState<number | undefined>();

  // State for image modal
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  
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

  // Function to handle folder download
  const handleDownloadFolder = async (folder: Folder, allFolders: Folder[], allNotes: Note[], userId: string) => {
    try {
  // ...existing code...
  const exportData = await exportFolderAsJson(folder, allFolders, allNotes, userId);
      
      // Create a blob with the JSON data
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `folder_${folder.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.json`;
      
      // Trigger the download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Show success toast
      showToast({
        message: 'Folder and all subfolders downloaded successfully',
        duration: 2000,
        color: 'success'
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting folder:', error);
      
      // Show error toast
      showToast({
        message: 'Failed to download folder. Please try again.',
        duration: 3000,
        color: 'danger'
      });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to export folder' 
      };
    }
  };

const handleImportFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const importedData = JSON.parse(text);

    // Recursively assign userId and import folders/notes
    const importRecursively = async (folderData: any, parentFolderId: string | null = null) => {
      // Prepare folder object, include all possible fields
      const {
        id, // ignore original id
        notes,
        subfolders,
        ...folderFields
      } = folderData;

      // Build the folder object for creation
      const folderToCreate = {
  name: folderFields.name,
  folder_type: folderFields.folder_type ?? 1,
  color: folderFields.color ?? null,
  crossed_out: folderFields.crossed_out ?? false,
  checklist: folderFields.checklist ?? false,
  description: folderFields.description ?? '',
  x: folderFields.x ?? null,
  y: folderFields.y ?? null,
  calc_number: folderFields.calc_number ?? null,
  calc_method: folderFields.calc_method ?? null,
  calc_metadata: folderFields.calc_metadata ?? null,
  co_workers: folderFields.co_workers ?? [],
  connected_to: Array.isArray(folderFields.connected_to)
    ? folderFields.connected_to
    : [],
  pinboard_id: folderFields.pinboard_id ?? null,
  user_id: user?.sub,
  folder_id: parentFolderId === null ? undefined : parentFolderId,
};


      // Create the folder in the backend
      const newFolder = await addFolder(
        folderToCreate,
        user?.sub || '',
        parentFolderId || "00000000-0000-0000-0000-000000000000"
      );

      // Import notes for this folder
      if (Array.isArray(notes)) {
        for (const note of notes) {
          const noteToCreate = {
            ...note,
            user_id: user?.sub,
            folder_id: newFolder.id,
          };
          delete noteToCreate.id; // Remove original id if present
          await addNote(
            noteToCreate,
            user?.sub || '',
            newFolder.id
          );
        }
      }

      // Import subfolders recursively
      if (Array.isArray(subfolders)) {
        for (const sub of subfolders) {
          await importRecursively(sub, newFolder.id);
        }
      }
    };

    await importRecursively(importedData);
// After successful import
window.dispatchEvent(new Event('notable-reload-mindmap'));
window.notableShouldReloadMindmap = true;
    showToast({
      message: 'Folder imported successfully!',
      duration: 2000,
      color: 'success'
    });

    // Optionally refresh data
    const notes = await getNotes(user?.sub || '');
    const folders = await getFolders(user?.sub || '');
    setNotes(notes);
    setFolders(folders);

  } catch (err) {
    console.error('Import failed:', err);
    showToast({
      message: 'Failed to import folder.',
      duration: 2000,
      color: 'danger'
    });
  }
};
  const modal = useRef<HTMLIonModalElement>(null);
  const folderModal = useRef<HTMLIonModalElement>(null);
  const coWorkerModal = useRef<HTMLIonModalElement>(null);
  const cardModal = useRef<HTMLIonModalElement>(null);
  const [presentingElement, setPresentingElement] = useState<HTMLIonFabButtonElement | null>(null);
  const page = useRef(null);
  const history = useHistory();

  const [activeTab, setActiveTab] = useState<'notes' | 'media' | 'settings'>('notes');
  const [dropdownValue, setDropdownValue] = useState<string>("");
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [folderName, setFolderName] = useState('');
  const [folderType, setFolderType] = useState<number>(1);
  const [folderDescription, setFolderDescription] = useState('');
  // Update folderType when dropdown changes
  useEffect(() => {
    setFolderType(dropdownValue === "option2" ? 2 : 1);
  }, [dropdownValue]);

  const [modalTab, setModalTab] = useState<'notes' | 'attachments' | 'settings'>('notes');
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioStream = useRef<MediaStream | null>(null);
  const [folderModalTab, setFolderModalTab] = useState<'folder' | 'settings' | 'co-workers'>('folder');
  const [folderPassword, setFolderPassword] = useState('');
  const [oldFolderPassword, setOldFolderPassword] = useState('');
  const [passwordFolderId, setPasswordFolderId] = useState<number | null>(null);
const [unlockFolderId, setUnlockFolderId] = useState<string | null>(null);
const [unlockPassword, setUnlockPassword] = useState('');
const [unlockError, setUnlockError] = useState('');
const [unlockIntent, setUnlockIntent] = useState<'view' | 'edit' | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string>('');
  const [currentFolderType, setCurrentFolderType] = useState<number>(0);
  const [showCoWorkerModal, setShowCoWorkerModal] = useState<boolean>(false);
  const [selectedFolderForCoWorkers, setSelectedFolderForCoWorkers] = useState<Folder | null>(null);
  const [availableCoWorkers, setAvailableCoWorkers] = useState<string[]>([]);
  const [selectedCoWorkers, setSelectedCoWorkers] = useState<string[]>([]);
  const [coWorkerDetails, setCoWorkerDetails] = useState<CoWorkerDetail[]>([]);
  const [isLoadingCoWorkers, setIsLoadingCoWorkers] = useState<boolean>(false);
  const [presentToast] = useIonToast();

  const [userMap, setUserMap] = useState<{ [key: string]: CoWorkerDetail }>({});
  const [searchText, setSearchText] = useState<string>('');
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [filteredFolders, setFilteredFolders] = useState<Folder[]>([]);

  // Function to load user data (only called once at initialization, no automatic refresh)
  const loadUserData = async () => {
    if (!user?.sub) return;
    
    try {
      console.log('Loading user data...');
      // First get co-worker details for the current user
      const details = await getCoWorkerDetails(user.sub);
      const map: { [key: string]: CoWorkerDetail } = {};
      details.forEach(detail => {
        if (detail.user_id) {
          map[detail.user_id] = detail;
        }
      });
      
      // Then fetch all users from the system to ensure we have everyone
      const response = await axios.get('https://localhost:7281/config/api/v1/users', {
        headers: { 'Accept': 'application/json' }
      });
      
      const allUsers = response.data;
      console.log('Fetched all users:', allUsers.length);
      
      // Add all users to the map
      allUsers.forEach((user: any) => {
        if (user.user_id) {
          // Always update with the latest data, don't skip existing entries
          map[user.user_id] = {
            user_id: user.user_id,
            user_key: user.user_key || '',
            username: user.username || user.email || user.name || 'Unknown User',
            image_url: user.image_url || ''
          };
        }
      });
      
      console.log('Updated user map with profile data');
      setUserMap(map);
    } catch (error) {
      console.error('Error loading user details:', error);
    }
  };
  
  // Initial fetch of user data when component mounts or user changes
  useEffect(() => {
    if (user?.sub) {
      loadUserData();
    }
  }, [user]);
  
  useEffect(() => {
    setPresentingElement(page.current);
  }, []);
  
  // Expose setSelectedFolder and checkFolderPassword to the window object for direct access from sidebar
  useEffect(() => {
    // Create a wrapper function that handles all the necessary state updates for editing a folder
    window.setSelectedFolder = (folder: Folder) => {
      if (folder) {
        console.log('Setting selected folder from global function:', folder);
        
        // Check if the folder has a password
        if (folder.password) {
          console.log('Folder is password protected, showing unlock modal');
          // Trigger the unlock modal with edit intent
          setUnlockFolderId(folder.id);
          setUnlockIntent('edit');
          setUnlockPassword('');
          setUnlockError('');
        } else {
          // If no password, directly open the edit modal
          setSelectedFolder(folder);
          setFolderName(folder.name || '');
          setFolderColor(folder.color || 'null');
          setIsCrossedOut(folder.crossed_out || false);
          setIsChecklistEnabled(folder.checklist || false);
          setFolderModalTab('folder'); // Default to the folder tab
          setFolderDescription(folder.description || '');
        }
      } else {
        console.error('Cannot set selected folder: folder object is null or undefined');
      }
    };
    
    // Create a function to handle password-protected folders
    window.checkFolderPassword = (folder: Folder, intent: 'view' | 'edit') => {
      if (folder && folder.password) {
        console.log(`Checking password for folder: ${folder.name}, intent: ${intent}`);
        setUnlockFolderId(folder.id);
        setUnlockIntent(intent);
        setUnlockPassword('');
        setUnlockError('');
      } else {
        console.error('Cannot check folder password: folder is null or has no password');
      }
    };
    
    return () => {
      // Clean up by setting to no-op functions
      window.setSelectedFolder = () => {};
      window.checkFolderPassword = () => {};
    };
  }, []);
  
  // When entering a folder, we'll load data once but not set up any polling
  useEffect(() => {
    // Only load data when inside a folder and user is logged in
    if (!currentFolderId || !user?.sub) return;
    
    // Check if there is a global unlockFolderRequest for this folder
    if (typeof window !== 'undefined' && (window as any).unlockFolderRequest) {
      const req = (window as any).unlockFolderRequest;
      // Match on folderId (string or number)
      if (req.folderId && req.intent && req.folderId.toString() === currentFolderId.toString()) {
        const folder = folders.find(f => f.id.toString() === req.folderId.toString());
        if (folder && folder.password) {
          setUnlockFolderId(folder.id);
          setUnlockIntent(req.intent);
          setUnlockPassword('');
          setUnlockError('');
          // Clear the global request so it doesn't trigger again
          (window as any).unlockFolderRequest = null;
        }
      }
    }

    console.log(`Loading initial data for folder: ${currentFolderId}`);
    
    // Load folder data once when entering the folder
    const loadFolderData = async () => {
      try {
        if (!user?.sub) return;
        
        try {
          const folderNotes = await getNotes(user.sub, currentFolderId);
          const allFolders = await getFolders(user.sub);
          const subFolders = allFolders.filter(folder => folder.folder_id === currentFolderId);
          
          // Sort using the consistent sorting function
          folderNotes.sort(sortByYDescending);
          subFolders.sort(sortByYDescending);
          
          // Only update state if no modal is open
          if (!selectedNote && !selectedFolder) {
            setNotes(folderNotes);
            setFolders(subFolders);
          }
        } catch (error) {
          // If backend fails, load offline notes
          
          
          
        }
      } catch (error) {
        console.error('Error loading folder data:', error);
      }
    };
    
    loadFolderData();
  }, [currentFolderId, user?.sub, folders]);

  
  useIonViewWillEnter(() => {
    const fetchData = async () => {
      // Ensure offline notes file exists on mobile
      
      if (user && user.sub) {
        try {
          const notes = await getNotes(user.sub);
          const folders = await getFolders(user.sub);
          // Only show notes and folders with folder_id '00000000-0000-0000-0000-000000000000'
          const ROOT_ID = "00000000-0000-0000-0000-000000000000";
          const filteredNotes = notes.filter(note => note.folder_id === ROOT_ID);
          const filteredFolders = folders.filter(folder => 
            folder.folder_id === ROOT_ID && 
            folder.folder_type !== 4 && 
            folder.x !== null && 
            folder.y !== null && 
            (!folder.co_workers || folder.co_workers.length === 0)
          );

          // Sort notes and folders using the consistent sorting function
          filteredNotes.sort(sortByYDescending);
          filteredFolders.sort(sortByYDescending);

          if (!selectedNote && !selectedFolder) {
            setNotes(filteredNotes);
            setFolders(filteredFolders);
          }
        } catch (error) {
          // If backend fails, load offline notes
          
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  });

  // Consistent sorting function to use throughout the app
  const sortByYDescending = (a: { y?: number | null }, b: { y?: number | null }) => {
    // Handle null values for y coordinates (shared folders)
    // Null y values should appear at the bottom of the list
    if (a.y === null && b.y === null) {
      // If both have null y, sort alphabetically if they have names
      if ((a as any).name && (b as any).name) {
        return (a as any).name.localeCompare((b as any).name);
      }
      return 0; // Keep original order if no names
    }
    
    // If only one has null y, put it at the bottom
    if (a.y === null) return 1; // a goes after b
    if (b.y === null) return -1; // b goes after a
    
    // Sort by y value in descending order (largest y at top)
    // Use a large default value for items without y to ensure consistency
    const aY = a.y !== undefined ? a.y : -9999;
    const bY = b.y !== undefined ? b.y : -9999;
    return bY - aY;
  };
  
  const getNextY = (): number => {
    // Get the maximum y value from notes and folders, filtering out null values
    const maxNoteY = notes.length > 0 ? 
      Math.max(...notes
        .filter(note => note.y !== null) // Filter out null y values
        .map(note => note.y || 0)
      ) : 0;
    
    const maxFolderY = folders.length > 0 ? 
      Math.max(...folders
        .filter(folder => folder.y !== null) // Filter out null y values
        .map(folder => folder.y || 0)
      ) : 0;
    // Add a larger increment to ensure new items appear at the top
    return Math.max(maxNoteY, maxFolderY) + 100;
  };
  
  const onAddNote = () => {
    const nextY = getNextY();
    handleAddNote(
      title,
      text,
      user,
      "00000000-0000-0000-0000-000000000000", // parent folder ID is 0 for root level
      nextY,
      showToast,
      setNotes,
      setTitle,
      setText,
      () => {
        setNoteColor('light');
        setIsCrossedOut(false);
        cardModal.current!.dismiss();
      }
    );
  };

  const onAddFolder = () => {
    const nextY = getNextY();
    handleAddFolder(
      folderName,
      folderDescription,
      user,
      "00000000-0000-0000-0000-000000000000", // parent folder ID is 0 for root level
      folderType,
      1,
      nextY,
      showToast,
      setFolders,
      setFolderName,
      setFolderDescription,
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

  // Function to start voice recording
  const startRecording = async () => {
    try {
      // Reset audio chunks
      audioChunks.current = [];
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.current = stream;
      
      // Create new media recorder
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      
      // Handle data available event
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      // Handle recording stop event
      recorder.onstop = () => {
        // Create blob from audio chunks
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        
        // Create URL for the audio blob
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio(audioUrl);
        
        // Stop all tracks in the stream
        if (audioStream.current) {
          audioStream.current.getTracks().forEach(track => track.stop());
          audioStream.current = null;
        }
        
        // Save the recorded audio to the note if needed
        if (selectedNote) {
          saveVoiceMessageToNote(audioBlob);
        }
      };
      
      // Start recording
      recorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      presentToast({
        message: 'Failed to access microphone. Please check your browser permissions.',
        color: 'danger',
        duration: 3000
      });
      setIsRecording(false);
    }
  };
  
  // Function to stop voice recording
  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };
  
  // Function to save voice message to note - handles both old and new response formats
  const saveVoiceMessageToNote = async (audioBlob: Blob) => {
    if (!selectedNote || !user?.sub) return;
    
    try {
      // Set uploading state
      setIsUploading(true);
      
      // Convert Blob to File object
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      
      // Upload voice message
      const response = await uploadVoiceMessage(selectedNote.id, audioFile, user.sub);
      
      // Handle both new format (files array) and old format (voiceMessageUrl)
      let voiceMessageUrl = '';
      
      if (response && response.success) {
        // New format with files array
        if (response.files && response.files.length > 0) {
          voiceMessageUrl = response.files[0].fileUrl;
        } 
        // Old format with voiceMessageUrl
        else if (response.voiceMessageUrl) {
          voiceMessageUrl = response.voiceMessageUrl;
        }
        
        if (voiceMessageUrl) {
          // Update the note with the new voice message URL
          const updatedNote = {
            ...selectedNote,
            voice_message_url: voiceMessageUrl
          };
          
          // Update the note in the state
          setSelectedNote(updatedNote);
          setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n));
          
          presentToast({
            message: 'Voice message saved successfully',
            color: 'success',
            duration: 2000
          });
        } else {
          console.error('Voice message upload succeeded but no URL was returned:', response);
          presentToast({
            message: 'Failed to save voice message: No URL returned',
            color: 'danger',
            duration: 3000
          });
        }
      } else {
        console.error('Voice message upload failed:', response);
        presentToast({
          message: 'Failed to save voice message',
          color: 'danger',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error saving voice message:', error);
      presentToast({
        message: `Failed to save voice message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'danger',
        duration: 3000
      });
    } finally {
      // Reset uploading state
      setIsUploading(false);
    }
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
    try {
      // Use the imported apiUrl from apiService.ts
      if (apiUrl.startsWith('http')) {
        const url = new URL(apiUrl);
        return `${url.protocol}//${url.host}/notes/api/v1/`; // e.g., 'https://localhost:7281/notes/api/v1/'
      } else {
        // If apiUrl is relative, use window.location to construct the full URL
        return `${window.location.origin}/notes/api/v1/`;
      }
    } catch (error) {
      console.error('Error constructing base API URL:', error);
      // Fallback to a safe default
      return window.location.origin + '/notes/api/v1/';
    }
  };

  const onUpdateNote = async () => {
    if (selectedNote) {
      const updatedNote = {
        ...selectedNote,
        title,
        text, // Assuming 'text' state variable holds the text for update
        calc_number: calcNumberState, // Add calc_number state
        color: selectedNote.color,
        crossed_out: selectedNote.crossed_out
      };
      handleUpdateNote(updatedNote, user, setNotes, setSelectedNote, () => {
        setNoteColor('null');
        setIsCrossedOut(false);
        modal.current!.dismiss();
      });
    }
  };
  
  // Function to handle checkbox toggle in note text
  const handleCheckboxToggle = useCallback((noteId: string, updatedText: string) => {
    // Find the note to update
    const noteToUpdate = notes.find(note => note.id === noteId);
    if (!noteToUpdate) return;
    
    // Create updated note with new text
    const updatedNote = {
      ...noteToUpdate,
      text: updatedText
    };
    
    // Update in state first for immediate UI feedback
    setNotes(prevNotes => 
      prevNotes.map(note => note.id === noteId ? updatedNote : note)
    );
    
    // Update in database
    handleUpdateNote(updatedNote, user, setNotes, () => setSelectedNote(null), () => {
      // Show a brief success toast
      showToast({
        message: 'Checkbox updated',
        duration: 1000,
        color: 'success'
      });
    });
  }, [notes, user, showToast]);

  const handleModalDismiss = async () => {
    if (selectedNote) {
      const hasTitleChanged = title !== selectedNote.title;
      const hasTextChanged = text !== selectedNote.text;
      // Ensure calcNumberState is compared correctly, considering it can be undefined
      const hasCalcNumberChanged = (calcNumberState !== undefined ? calcNumberState : null) !== (selectedNote.calc_number !== undefined ? selectedNote.calc_number : null);

      if (hasTitleChanged || hasTextChanged || hasCalcNumberChanged) {
        const updatedNote = {
          ...selectedNote,
          title,
          text,
          calc_number: calcNumberState,
          // Retain original color and crossed_out status unless they are explicitly changed elsewhere
          color: selectedNote.color,
          crossed_out: selectedNote.crossed_out,
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
          // Reset local states if needed, or they will persist for the next modal opening
          // setTitle(''); // Decide if you want to clear these or let onEditNote repopulate
          // setText('');
          // setCalcNumberState(undefined);
        });
        
        // If calc_number has changed, update the parent folder's calc_number as well
        if (hasCalcNumberChanged && calcNumberState !== undefined && selectedNote.folder_id) {
          // Find the parent folder
          const parentFolder = folders.find(f => f.id === selectedNote.folder_id);
          if (parentFolder && parentFolder.calc_number !== calcNumberState) {
            // Create updated folder with the note's calc_number
            const updatedFolder = {
              ...parentFolder,
              calc_number: calcNumberState,
              calc_method: selectedNote.calc_method || parentFolder.calc_method || ''
            };
            
            try {
              // Update the folder in the backend
              await updateFolder(parentFolder.id, updatedFolder, user?.sub || '');
              
              // Update folders state
              setFolders(prevFolders => 
                prevFolders.map(f => f.id === parentFolder.id ? updatedFolder : f)
              );
              
              console.log('Updated folder calc_number to:', calcNumberState);
            } catch (error) {
              console.error('Error updating folder calc_number:', error);
            }
          }
        }
      } else {
        // No changes, just close the modal by clearing selectedNote
        setSelectedNote(null);
      }
    } else {
      // Fallback if selectedNote is somehow null, though onDidDismiss on this modal implies it was open
      setSelectedNote(null);
    }
  };

  const onDeleteNote = (id: string) => {
    handleDeleteNote(String(id), user, setNotes, setSelectedNote, () => modal.current!.dismiss());
  };

  const onEditNote = (note: Note) => {
    // When opening modal, set local state from note
    setTitle(note.title);
    setText(note.text);
    setNoteColor(note.color);
    setIsCrossedOut(note.crossed_out);
    setCalcNumberState(note.calc_number);
    setSelectedNote(note);
  };

  // Remove any useEffect or logic that sets title/text/etc. from selectedNote after modal is open
  // (No code needed here, just ensuring no such logic exists)


  // Navigate to the appropriate folder route based on folder type
  // (Removed duplicate navigateToFolder function to fix redeclaration error)

  const onEditFolder = (folder: Folder, bypassPasswordCheck = false) => {
    // Check if the folder has a password and we're not bypassing the check
    if (folder.password && !bypassPasswordCheck) {
      setUnlockFolderId(folder.id);
      setUnlockIntent('edit');
      return;
    }

    // When opening modal, set local state from folder
    setFolderName(folder.name);
    setFolderType(folder.folder_type || 1);
    // Set color to white for calc (2) and mindmap (3) folders, otherwise use the folder's color
    const color = [2, 3].includes(folder.folder_type) ? 'white' : (folder.color || '');
    setFolderColor(color);
    setFolderDescription(folder.description || '');
    setIsCrossedOut(folder.crossed_out);
    setIsChecklistEnabled(folder.checklist);
    setSelectedFolder(folder);
    folderModal.current?.present();
  };

  // Remove any useEffect or logic that sets folderName/folderColor/etc. from selectedFolder after modal is open
  // (No code needed here, just ensuring no such logic exists)


  // State declarations moved to the top of the component
  
  // Removed all automatic refresh functionality to prevent text deletion during edits
  // No polling, no automatic updates - data will only be loaded when explicitly requested
  // This ensures user input is never overwritten by background updates

  const loadCoWorkersForFolder = async (folder: Folder) => {
    if (!user?.sub) return;
    
    setIsLoadingCoWorkers(true);
    setSelectedFolderForCoWorkers(folder);
    
    try {
      console.log('Loading co-workers for folder:', folder);
      
      // Get co-worker details including names, images, and user IDs
      const details = await getCoWorkerDetails(user?.sub || '');
      console.log('Co-worker details:', details);
      setCoWorkerDetails(details);
      
      // Get all available co-workers for the user (user keys)
      const coWorkers = await getUserCoWorkers(user.sub);
      console.log('Available co-workers (keys):', coWorkers);
      setAvailableCoWorkers(coWorkers);
      
      // Set the selected co-workers to the folder's current co-workers (user IDs)
      const folderCoWorkers = (folder as any).co_workers || [];
      console.log('Folder co-workers (IDs):', folderCoWorkers);
      
      // Make sure we're using user IDs, not keys
      const mappedCoWorkers = folderCoWorkers.map((coWorker: string) => {
        // If this looks like an Auth0 ID (contains |), it's already a user ID
        if (coWorker.includes('|')) {
          return coWorker;
        }
        // Otherwise, try to find the corresponding user ID from our details
        const detail = details.find(d => d.user_key === coWorker);
        return detail?.user_id || coWorker;
      });
      
      console.log('Mapped co-workers to IDs:', mappedCoWorkers);
      setSelectedCoWorkers(mappedCoWorkers);
    } catch (error) {
      console.error('Error fetching co-workers:', error);
      presentToast({
        message: 'Failed to load co-workers',
        color: 'danger',
        duration: 3000
      });
    } finally {
      setIsLoadingCoWorkers(false);
    }
  };
  
  // Switch to co-workers tab in folder modal
  const switchToCoWorkersTab = async () => {
    if (!selectedFolder) return;
    
    setFolderModalTab('co-workers');
    await loadCoWorkersForFolder(selectedFolder);
  };

  // Function to save co-workers to a folder
  const saveCoWorkersToFolder = async () => {
    if (!selectedFolderForCoWorkers) return;
    
    try {
      // First update co-workers in the backend
      await updateFolderCoWorkers(
        selectedFolderForCoWorkers.id,
        selectedCoWorkers,
        user?.sub || ''
      );
      
      // Check if we're adding co-workers to a folder that didn't have any before
      const isBecomingCoWorkerFolder = 
        (!selectedFolderForCoWorkers.co_workers || selectedFolderForCoWorkers.co_workers.length === 0) && 
        selectedCoWorkers.length > 0;
      
      // If the folder is becoming a co-worker folder, set x and y to null
      // This will make it appear in the shared folders section of the sidebar
      if (isBecomingCoWorkerFolder) {
        console.log('Folder is becoming a co-worker folder, setting x and y to null');
        
        // Update the folder in the backend to set x and y to null
        const updatedFolderData = {
          ...selectedFolderForCoWorkers,
          co_workers: selectedCoWorkers,
          x: null,
          y: null
        };
        
        // Update the folder in the backend
        await updateFolder(
          selectedFolderForCoWorkers.id,
          updatedFolderData,
          user?.sub || ''
        );
        
        // Update the folder in the local state
        const updatedFolders = folders.map(f => {
          if (f.id === selectedFolderForCoWorkers.id) {
            return { ...f, co_workers: selectedCoWorkers, x: null, y: null } as Folder;
          }
          return f;
        });
        
        setFolders(updatedFolders);
      } else {
        // Just update co-workers without changing x and y
        const updatedFolders = folders.map(f => {
          if (f.id === selectedFolderForCoWorkers.id) {
            return { ...f, co_workers: selectedCoWorkers } as Folder;
          }
          return f;
        });
        
        setFolders(updatedFolders);
      }
      
      setShowCoWorkerModal(false);

      // Refresh shared folders in the sidebar to immediately show the updated folder
      if (typeof window.refreshSharedFolders === 'function' && user?.sub) {
        try {
          await window.refreshSharedFolders(user.sub);
          console.log('Refreshed shared folders in sidebar');
        } catch (error) {
          console.error('Error refreshing shared folders:', error);
        }
      }

      presentToast({
        message: 'Co-workers updated successfully',
        color: 'success',
        duration: 2000
      });
    } catch (error) {
      console.error('Error updating folder co-workers:', error);
      presentToast({
        message: 'Failed to update co-workers',
        color: 'danger',
        duration: 3000
      });
    }
  };

  // Function to toggle a co-worker selection
  const toggleCoWorkerSelection = (coWorkerKey: string) => {
    // Find the user ID for this co-worker key
    const coWorkerDetail = coWorkerDetails.find(d => d.user_key === coWorkerKey);
    const coWorkerId = coWorkerDetail?.user_id || coWorkerKey;
    
    console.log(`Toggling co-worker: ${coWorkerKey}, user ID: ${coWorkerId}`);
    
    if (selectedCoWorkers.includes(coWorkerId)) {
      setSelectedCoWorkers(selectedCoWorkers.filter(id => id !== coWorkerId));
    } else {
      setSelectedCoWorkers([...selectedCoWorkers, coWorkerId]);
    }
  };

  const onUpdateFolder = async () => {
    if (selectedFolder) {
      // Preserve the original folder_type when updating a folder
      const updatedFolder = {
        ...selectedFolder,
        name: folderName,
        // Keep the original folder_type instead of using the default folderType
        folder_type: selectedFolder.folder_type,
        color: folderColor,
        crossed_out: isCrossedOut,
        checklist: isChecklistEnabled,
        description: folderDescription
      };
      
      console.log('Updating folder, preserving original type:', selectedFolder.folder_type);
      
      // Pass the original folder_type to handleUpdateFolder
      await handleUpdateFolder(updatedFolder, user, folderName, folderDescription, selectedFolder.folder_type, setFolders, setSelectedFolder, () => {
        setFolderColor('null');
        setIsCrossedOut(false);
        setIsChecklistEnabled(false);
        folderModal.current!.dismiss();
      });

      // Always refresh the shared folders sidebar after updating a folder
      // This ensures color, crossed-out, and other property changes are immediately visible
      if (typeof window.refreshSharedFolders === 'function' && user?.sub) {
        try {
          await window.refreshSharedFolders(user.sub);
          console.log('Refreshed shared folders in sidebar after folder update');
        } catch (error) {
          console.error('Error refreshing shared folders after folder update:', error);
        }
      }
    }
  };

  const onDeleteFolder = (id: string) => {
    handleDeleteFolder(id.toString(), user, setFolders);
    folderModal.current?.dismiss();
  };
  
  // Handle dragging a note
  const handleNoteDragStart = (e: React.DragEvent, note: Note) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'note', id: note.id }));
    setDraggedItem({ type: 'note', id: Number(note.id) });
    
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
    setDraggedItem({ type: 'folder', id: Number(folder.id) });
    
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
      if (data.type === 'folder' && data.id === Number(targetFolder.id)) {
        showToast({
          message: 'Cannot move a folder into itself',
          duration: 2000,
          color: 'warning'
        });
        setDraggedItem(null);
        return;
      }
      
      // Prevent dropping folders into mindmap folders
      if (data.type === 'folder' && targetFolder.folder_type === 3) {
        showToast({
          message: 'Cannot move folders into a mindmap folder',
          duration: 2000,
          color: 'warning'
        });
        setDraggedItem(null);
        return;
      }
      
      if (data.type === 'note') {
        const noteId = data.id;
        const noteToMove = notes.find(note => Number(note.id) === Number(noteId));
        
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
              setFolders(allFolders.filter(folder => folder.folder_id === "00000000-0000-0000-0000-000000000000" && folder.folder_type !== 4));
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
                (targetFolder.id) // parent folder ID
              );
              
              // Then move the note to the new subfolder
              targetFolderId = subfolder.id;
              updatedNote = { ...noteToMove, folder_id: targetFolderId };
              successMessage = `Note moved to ${targetFolder.name} (${newSubfolderName})`;
              
              // Refresh folders to include the new subfolder
              const updatedFolders = await getFolders(user?.sub || '');
              setFolders(updatedFolders.filter(folder => folder.folder_id === "00000000-0000-0000-0000-000000000000" && folder.folder_type !== 4));
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
        const folderId = String(data.id);
        const folderToMove = folders.find(folder => String(folder.id) === folderId);
        
        if (folderToMove) {
          // Prevent circular references (a folder cannot be moved into its own subfolder)
          // This would require a recursive check of all descendants, but for simplicity,
          // we're just preventing direct circular references for now
          
          // Update the folder's parent ID
          const updatedFolder = { ...folderToMove, folder_id: targetFolder.id };
          
          // Update in the database
          await updateFolder(folderId, updatedFolder, user?.sub || '');
          
          // Update state - remove from current view since it's now a subfolder
          setFolders(prevFolders => prevFolders.filter(folder => String(folder.id) !== folderId));
          
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

  const handleUncheckAll = (note: Note) => {
    // Replace all [x] with [ ]
    const updatedText = note.text?.replace(/\[x\]/g, '[ ]');
    if (updatedText !== note.text) {
      const updatedNoteData = {
        ...note,
        text: updatedText
      };
      
      handleUpdateNote(updatedNoteData, user, setNotes, setSelectedNote, () => {
        // Update the text in the modal
        setText(updatedText);
        showToast({
          message: 'All checkboxes unchecked',
          duration: 2000,
          color: 'success',
        });
      });
    }
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
  
  const onRefresh = async (event: any) => {
    try {
      if (user && user.sub) {
        const notes = await getNotes(user.sub);
        const folders = await getFolders(user.sub);
        const ROOT_ID = "00000000-0000-0000-0000-000000000000";
        const filteredNotes = notes.filter(note => note.folder_id === ROOT_ID);
        const filteredFolders = folders.filter(folder => folder.folder_id === ROOT_ID && folder.folder_type !== 4);

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
    
    // Create the folder with the same y-position as the note
    handleAddFolder(
      folderName,
      '', // Pass empty string for folderDescription since it's not available here
      user,
      String(selectedNote.folder_id ?? "00000000-0000-0000-0000-000000000000"), // Use the note's parent folder ID as string, default to "0"
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
    } else if (selectedValue === "option4") {
      onTurnNoteIntoFolder(5); // Calc Folder
    }
    modal.current?.dismiss();
  };

  // Combined handler for reordering both notes and folders
  const handleReorderItems = async (event: CustomEvent) => {
    try {
      // Create a combined array of notes and folders
      const combinedItems: ReorderableItem[] = [];

    
      const rootNotes = notes.filter(note => note.folder_id === "00000000-0000-0000-0000-000000000000");
      const rootFolders = folders;
      
      // Sort all items by their y position
      [...rootNotes, ...rootFolders].forEach(item => {
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
      // Keep notes that aren't at the root level
      const nonRootNotes = notes.filter(note => Number(note.folder_id) !== 0);
      if (!selectedNote && !selectedFolder) {
        setNotes([...updatedNotes, ...nonRootNotes]);
        setFolders(updatedFolders);
      }
      
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

  const handleTabChange = (tab: 'notes' | 'media') => {
    if (tab === 'media') {
      history.push('/app/media');
    } else {
      history.push('/app/list');
    }
  };

  const handleClearCalcNumber = () => {
    setCalcNumberState(undefined);
    if (selectedNote) {
      const updatedNoteData = {
        ...selectedNote,
        title: title, 
        text: text,   
        calc_number: undefined, 
      };

      // Optimistically update UI for calcNumberState (already done by setCalcNumberState)
      // and for selectedNote to ensure consistency before API call
      setSelectedNote(updatedNoteData);

      handleUpdateNote(updatedNoteData, user, setNotes, setSelectedNote, () => {
        showToast({
          message: 'Calculation number cleared',
          duration: 2000,
          color: 'success',
        });
      });
    }
  };

  const handleClearAttachmentField = (fieldName: 'image_url' | 'file_link' | 'voice_message_url') => {
    if (selectedNote) {
      const updatedNoteData = {
        ...selectedNote,
        title: title, 
        text: text,   
        calc_number: calcNumberState, 
        [fieldName]: undefined,
      };

      // Optimistically update UI
      setSelectedNote(updatedNoteData);
      if (fieldName === 'voice_message_url') {
        setRecordedAudio(null); // Clear local recording preview if it matches
      }

      // Persist change (optional: can also be done on main save/dismiss)
      handleUpdateNote(updatedNoteData, user, setNotes, setSelectedNote, () => {
        showToast({
          message: `${fieldName.replace('_', ' ')} cleared`,
          duration: 2000,
          color: 'success',
        });
      });
    }
  };

  function refreshFolderData(currentFolderId: string) {
    throw new Error("Function not implemented.");
  }

  return (
    <IonPage ref={page}>
      <IonHeader>
        <IonToolbar color={'primary'}>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Notable</IonTitle>
        </IonToolbar>
        <IonToolbar color={'primary'}>
          <div style={{ display: 'flex', width: '100%' }}>
            <IonSearchbar
              value={searchText}
              onIonChange={(e) => setSearchText(e.detail.value || '')}
              placeholder="Search notes and folders..."
              animated={true}
              showClearButton="always"
              style={{ flex: 1 }}
            />
            <IonButton
              onClick={() => {
                // Trigger search with current searchText value
                console.log('Search button clicked with query:', searchText);
                // The filtering is already handled by the filter function in the JSX below
              }}
              style={{ marginLeft: '8px' }}
            >
              <IonIcon icon={searchSharp} />
            </IonButton>
            <IonButton
  onClick={() => document.getElementById('import-folder-input')?.click()}
  style={{ marginLeft: '8px' }}
>
  <IonIcon icon={codeDownloadOutline} />
  Import Folder
</IonButton>
<input
  id="import-folder-input"
  type="file"
  accept="application/json"
  style={{ display: 'none' }}
  onChange={handleImportFolder}
/>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(ev) => onRefresh(ev)}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

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
              {/* Combine and sort folders and notes by y position (descending) */}
              {/* Filter out co-worker folders (folders with co_workers or null coordinates) */}
              {[...folders.filter(folder => 
                  folder.x !== null && 
                  folder.y !== null && 
                  (!folder.co_workers || folder.co_workers.length === 0) &&
                  folder.folder_id === "00000000-0000-0000-0000-000000000000"
                ), 
                ...notes.filter(note => note.folder_id === "00000000-0000-0000-0000-000000000000")]
                .filter(item => {
                  const searchLower = searchText.toLowerCase();
                  if (searchLower === '') return true;
                  
                  if (isFolder(item)) {
                    return item.name.toLowerCase().includes(searchLower);
                  } else if (isNote(item)) {
                    return (
                      item.title.toLowerCase().includes(searchLower) ||
                      item.text.toLowerCase().includes(searchLower)
                    );
                  }
                  return false;
                })
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
                            ...(isDropTarget ? {...dragStyles.folderDropZone} : {})
                          }}
                          onDragOver={(e) => handleDragOver(e, folder.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, folder)}
                        >
                          <IonCard 
                              className={`folder-card${(!folder.color || folder.color === 'null' || folder.color === 'white') ? ' standard-folder-card' : ''}`}
                            style={{ width: "100%" }}
                            draggable
                            onDragStart={(e) => handleFolderDragStart(e, folder)}
                            onDragEnd={handleDragEnd}
                          >
                            <IonCardHeader>
                              <IonCardTitle>
                                <div 
                                  onClick={() => onFolderClick(folder)}
                                  style={{ display: 'inline-block', cursor: 'pointer' }}
                                >
                                  <div style={{ position: 'relative', display: 'inline-block' }}>
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
                                    {/* Add visual indicator for co-worker folders (folder_type === 2) */}
                                    {folder.folder_type === 2 && (
                                      <>
                                        {/* Show updating indicator when the folder is being updated */}
                                        {/* Removed updating indicator */}
                                        {/* Show new updates indicator */}
                                        {/* Removed new updates indicator */}
                                      </>
                                    )}
                                    {/* Add download button */}
                                    <IonButton 
  fill="clear" 
  size="small" 
  onClick={async (e) => {
    e.stopPropagation();
    // Fetch ALL folders and notes for the user before exporting
    const allFolders = await getFolders(user?.sub || '');
const allNotes = await getNotes(user?.sub || '');
    handleDownloadFolder(folder, allFolders, allNotes, user?.sub || '');
  }}
                                      style={{
                                        '--padding-start': '4px',
                                        '--padding-end': '4px',
                                        '--padding-top': '4px',
                                        '--padding-bottom': '4px',
                                        marginLeft: '8px',
                                        '--background': 'transparent',
                                        '--background-hover': 'transparent',
                                        '--background-activated': 'transparent',
                                        '--box-shadow': 'none',
                                        '--ripple-color': 'transparent',
                                        display: 'inline-flex',
                                        verticalAlign: 'middle'
                                      }}
                                    >
                                      <IonIcon 
                                        icon={downloadOutline} 
                                        style={{
                                          color: 'var(--ion-color-medium)',
                                          fontSize: '1.2em',
                                          '--ionicon-stroke-width': '40px'
                                        }} 
                                        title="Download folder as JSON"
                                      />
                                    </IonButton>
                                  </div>
                                  {folder.password && (
                                    <IonIcon
                                      icon={lockClosedOutline}
                                      style={{ fontSize: "1.3em", color: "var(--ion-color-medium)", marginRight: "8px", verticalAlign: 'middle' }}
                                    />
                                  )}
                                </div>
                                <span style={{ 
                                  textDecoration: folder.crossed_out ? 'line-through' : 'none',
                                  color: folder.color ? `var(--ion-color-${folder.color})` : 'inherit'
                                }} className={!folder.color ? 'standard-folder-text' : ''}>
                                  {renderTextWithHashtags(folder.name, folder.color, !folder.color)}
                                  {/* Display number of notes in this folder */}
                                  {notes.filter(n => n.folder_id === folder.id).length > 0 && (
                                    <span style={{ 
                                      fontSize: '0.8em', 
                                      backgroundColor: 'var(--ion-color-tertiary)',
                                      color: 'white',
                                      borderRadius: '12px',
                                      padding: '2px 8px',
                                      marginLeft: '8px',
                                      display: 'inline-block',
                                      verticalAlign: 'middle'
                                    }}>
                                      {notes.filter(n => n.folder_id === folder.id).length} notes
                                    </span>
                                  )}
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
                                      backgroundColor: 'var(--ion-color-primary)',
                                      color: 'white',
                                      borderRadius: '12px',
                                      padding: '2px 8px',
                                      marginLeft: '8px',
                                      display: 'inline-block',
                                      verticalAlign: 'middle',
                                      fontWeight: 'bold'
                                    }}>
                                      {folder.calc_number}
                                    </span>
                                  )}
                                </span>
                              </IonCardTitle>
                            </IonCardHeader>
                            <IonCardContent>
                              {/* Display co-workers if the folder has any */}
                              {(folder as any).co_workers && (folder as any).co_workers.length > 0 && (
                                <div className="co-workers-container" style={{ marginBottom: '12px' }}>
                                  <div style={{ fontSize: '0.85em', color: 'var(--ion-color-medium)', marginBottom: '6px' }}>
                                    Co-workers:
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {(folder as any).co_workers.map((coWorkerId: string, index: number) => {
                                      const coWorker = userMap[coWorkerId];
                                      return (
                                        <div key={index} style={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          background: 'var(--notable-surface, #f1f1f1)', 
                                          borderRadius: '12px', 
                                          padding: '2px 8px', 
                                          maxWidth: '120px',
                                          overflow: 'hidden',
                                          whiteSpace: 'nowrap',
                                          textOverflow: 'ellipsis',
                                        }} className="co-worker-badge">
                                          <IonAvatar style={{ width: '24px', height: '24px', marginRight: '6px' }}>
                                            <img 
                                              src={(coWorker && coWorker.image_url) ? coWorker.image_url : 'https://ionicframework.com/docs/img/demos/avatar.svg'} 
                                              alt={coWorker && coWorker.username ? coWorker.username : 'Co-worker'} 
                                            />
                                          </IonAvatar>
                                          <span style={{ fontSize: '0.9em', overflow: 'hidden', textOverflow: 'ellipsis' }} className="co-worker-name">
                                            {coWorker && coWorker.username ? coWorker.username : 'Unknown User'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
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
                    const isBeingDragged = draggedItem?.type === 'note' && draggedItem.id === Number(note.id);
                    
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
                               className={`note-card${(!note.color || note.color === 'null' || note.color === 'white') ? ' standard-note-card' : ''}`}
                              style={{ width: "100%" }}
                              onClick={(e) => {
                              // Check if the click originated from a checkbox or its container
                              const target = e.target as HTMLElement;
                              const isCheckboxClick = target.tagName === 'INPUT' || 
                                target.classList.contains('checkbox-row') ||
                                target.parentElement?.classList.contains('checkbox-row');
                              
                              if (!isCheckboxClick) {
                                onEditNote(note);
                              }
                            }}>
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
                                      <span style={{ 
                                        textDecoration: note.crossed_out ? 'line-through' : 'none',
                                        color: note.color ? `var(--ion-color-${note.color})` : 'inherit'
                                      }} className={!note.color ? 'standard-note-text' : ''}>
                                        {renderTextWithHashtags(note.title, note.color, !note.color)}
                                        {/* Display calculation number if available */}
                                        {note.calc_number !== undefined && note.calc_number !== null && (
                                          <span style={{ 
                                            fontSize: '0.85em', 
                                            backgroundColor: 'var(--ion-color-success)',
                                            color: 'white',
                                            borderRadius: '12px',
                                            padding: '2px 8px',
                                            marginLeft: '8px',
                                            display: 'inline-block',
                                            verticalAlign: 'middle'
                                          }}>
                                            {note.calc_number}
                                          </span>
                                        )}
                                      </span>
                                    </IonCardTitle>
                                    <IonCardContent>
                                      {/* Render all images for the note (multiple support) */}
{/* Only one image per note (image_url) */}
{note.image_url ? (
  <div style={{ marginBottom: '8px', textAlign: 'center' }}>
    <img
      src={note.image_url}
      alt={note.title || 'Note image'}
      style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--ion-color-medium)' }}
    />
  </div>
) : null}
                                      <IonLabel>
                                        <div style={{ 
                                          color: note.color ? `var(--ion-color-${note.color})` : 'inherit',
                                          textDecoration: note.crossed_out ? 'line-through' : 'none',
                                          display: 'flex',
                                          flexDirection: 'column'
                                        }} className={!note.color ? 'standard-note-text' : ''}>
                                          {note.text?.includes('[') ?
                                            // If text contains checkboxes, process them
                                            renderTextWithCheckboxes(note.text, note.id, handleCheckboxToggle, note.color)
                                            :
                                            // Otherwise just process hashtags
                                            renderTextWithHashtags(note.text || '', note.color, !note.color)
                                          }
                                        </div>
                                      </IonLabel>
                                      {/* Render all attachments for the note (multiple support) */}
{(
  (note as NoteWithMedia).attachments && (note as NoteWithMedia).attachments!.length > 0
    ? (note as NoteWithMedia).attachments!
    : Array.isArray(note.file_link) && note.file_link.length > 0
      ? note.file_link.filter(link => !!link).map(link => ({ name: (link && typeof link === 'string' ? link.split('/').pop() : 'Attachment') || 'Attachment', url: link }))
      : (typeof note.file_link === 'string' && note.file_link)
        ? [{ name: note.file_link.split('/').pop() || 'Attachment', url: note.file_link }]
        : []
).map((att: { name: string, url: string }, idx: number) => (
  <div key={idx} style={{ marginTop: '8px' }}>
    <a 
      href={att.url}
      download={att.name}
      target="_blank" 
      rel="noopener noreferrer" 
      style={{ textDecoration: 'none' }} 
      onClick={(e) => e.stopPropagation()}
    >
      <IonChip color="primary">
        <IonIcon icon={documentAttachOutline} />
        <IonLabel>Download {att.name}</IonLabel>
      </IonChip>
    </a>
  </div>
))}

{/* Render all voice recordings for the note (multiple support) */}
{(((note as NoteWithMedia).voice_recordings && (note as NoteWithMedia).voice_recordings!.length > 0
  ? (note as NoteWithMedia).voice_recordings!
  : note.voice_message_url ? [note.voice_message_url] : [])
).map((voiceUrl: string, idx: number) => (
  <div key={idx} style={{ marginTop: '8px' }}>
    <audio controls style={{ width: '100%' }}>
      <source src={voiceUrl} />
      Your browser does not support the audio element.
    </audio>
  </div>
))}
                                      {/* Display voice message indicator if the note has a voice message */}
                                      {note.voice_message_url && (
                                        <div style={{ marginTop: '8px' }}>
                                          <IonChip color="tertiary" onClick={(e) => {
                                            e.stopPropagation();
                                            onEditNote(note);
                                            // Switch to attachments tab when opening the note
                                            setModalTab('attachments');
                                          }}>
                                            <IonIcon icon={micOutline} />
                                            <IonLabel>Voice Message</IonLabel>
                                          </IonChip>
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
                  <IonTextarea value={text} onIonChange={(e) => setText(e.detail.value!)} />
                </IonItem>
                {text?.includes('[') && text?.includes(']') && (
                  <IonItem>
                    <IonButton
                      color="warning"
                      onClick={() => selectedNote && handleUncheckAll(selectedNote)}
                      expand="block"
                      style={{ marginTop: '10px' }}
                    >
                      <IonIcon slot="start" icon={checkmarkDoneCircleOutline} />
                      Uncheck All Boxes
                    </IonButton>
                  </IonItem>
                )}
                {selectedNote?.image_url && (
                  <IonItem lines="none" style={{ marginTop: '10px', marginBottom: '10px', textAlign: 'center' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <img 
                        src={selectedNote.image_url} 
                        alt="Note attachment" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '200px', 
                          border: '1px solid var(--ion-color-medium)', 
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }} 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent bubbling to parent modal
                          // Close the note modal first to prevent modal-over-modal issues
                          modal.current?.dismiss();
                          // Short timeout to ensure modal is closed before opening image viewer
                          setTimeout(() => {
                            setImageModalUrl(selectedNote.image_url || '');
                            setShowImageModal(true);
                          }, 100);
                        }}
                      />
                      <div style={{ position: 'absolute', top: '5px', right: '5px', display: 'flex', gap: '5px' }}>
                        <IonButton 
                          size="small" 
                          fill="solid" 
                          color="primary"
                          href={selectedNote.image_url}
                          download={selectedNote.image_url?.split('/').pop() || 'image'}
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IonIcon icon={codeDownloadOutline} slot="icon-only" />
                        </IonButton>
                        <IonButton 
                          size="small" 
                          fill="solid" 
                          color="danger" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearAttachmentField('image_url');
                          }}
                        >
                          <IonIcon icon={closeCircleOutline} slot="icon-only" />
                        </IonButton>
                      </div>
                    </div>
                  </IonItem>
                )}
                <IonButton expand="block" onClick={onUpdateNote}>Update Note</IonButton>
                <IonButton expand="block" color="danger" onClick={() => onDeleteNote(selectedNote!.id)}>Delete Note</IonButton>
              </>
            )}
            {modalTab === 'attachments' && (
              <div className="ion-padding">
                {/* Display multiple file attachments */}
                {(Array.isArray(selectedNote?.file_link) && selectedNote?.file_link.length > 0) ? (
                  <>
                    <IonListHeader>
                      <IonLabel color="medium">Current File Attachments</IonLabel>
                    </IonListHeader>
                    {selectedNote.file_link.map((fileUrl, index) => (
                      <IonItem key={index} lines="none" className="ion-margin-bottom">
                        <IonButton 
                          fill="outline" 
                          href={fileUrl || undefined} 
                          download={typeof fileUrl === 'string' ? fileUrl.substring(fileUrl.lastIndexOf('/') + 1) : 'Attachment'}
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <IonIcon icon={codeDownloadOutline} slot="start" />
                          Download File ({typeof fileUrl === 'string' ? (fileUrl.split('/').pop() || 'Attachment') : 'Attachment'})
                        </IonButton>
                        <IonButton 
                          fill="clear" 
                          color="danger" 
                          onClick={() => {
                            // Remove this specific file from the array
                            if (selectedNote && Array.isArray(selectedNote.file_link)) {
                              const updatedFiles = [...selectedNote.file_link];
                              updatedFiles.splice(index, 1);
                              // If array is empty after removal, set to null/undefined
                              if (updatedFiles.length === 0) {
                                handleClearAttachmentField('file_link');
                              } else {
                                // Otherwise update with the remaining files
                                // This would need a new handler to update just this specific array
                                // For now we'll just clear all files if any are removed
                                handleClearAttachmentField('file_link');
                              }
                            }
                          }}
                          style={{ marginLeft: '10px' }}
                        >
                          <IonIcon slot="icon-only" icon={trashOutline} />
                        </IonButton>
                      </IonItem>
                    ))}
                  </>
                ) : selectedNote?.file_link && typeof selectedNote.file_link === 'string' ? (
                  <>
                    <IonListHeader>
                      <IonLabel color="medium">Current File Attachment</IonLabel>
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
                      <IonButton 
                        fill="clear" 
                        color="danger" 
                        onClick={() => handleClearAttachmentField('file_link')}
                        style={{ marginLeft: '10px' }}
                      >
                        <IonIcon slot="icon-only" icon={trashOutline} />
                      </IonButton>
                    </IonItem>
                  </>
                ) : null}
                {/* Section for uploading new files starts below */}
                <IonItem>
                  <IonLabel position="stacked">Number for Calculation</IonLabel>
                  <IonInput 
                    type="number" 
                    step="0.01"
                    placeholder="Enter a number (decimals allowed)"
                    value={calcNumberState}
                    onIonChange={(e) => setCalcNumberState(e.detail.value ? parseFloat(e.detail.value) : undefined)}
                  />
                  <IonButton fill="clear" color="medium" onClick={handleClearCalcNumber} slot="end">
                    <IonIcon icon={closeCircleOutline} />
                  </IonButton>
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

                {/* Only show voice recording controls in the attachments tab */}
                {selectedNote && modalTab === 'attachments' && (
                  <IonItem lines="none" className="ion-margin-top">
                    <IonLabel>Voice Message</IonLabel>
                    {!isRecording ? (
                      <IonButton 
                        onClick={startRecording}
                        color="primary"
                        fill="outline"
                      >
                        <IonIcon icon={micOutline} slot="start" />
                        Start Recording
                      </IonButton>
                    ) : (
                      <div>
                        <IonButton color="danger" onClick={stopRecording}>
                          <IonIcon icon={micOutline} slot="start" />
                          Stop Recording
                        </IonButton>
                        <IonText color="medium">
                          <p>Recording in progress...</p>
                        </IonText>
                      </div>
                    )}
                  </IonItem>
                )}


                {recordedAudio && modalTab === 'attachments' && (
                  <div className="ion-margin-top">
                    <IonLabel color="medium">New Voice Recording</IonLabel>
                    <div style={{ marginTop: '8px' }}>
                      {/* Using a wrapper div with specific dimensions to control the audio player size */}
                      <div style={{ width: '100%', maxWidth: '100%', height: '40px' }}>
                        <audio 
                          controls
                          preload="metadata"
                          id="new-recording-player"
                          style={{ 
                            width: '100%', 
                            height: '40px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--ion-color-light)'
                          }}
                          ref={(audioElement) => {
                            // Set up the audio element when it's created
                            if (audioElement) {
                              // Set the source programmatically
                              audioElement.src = recordedAudio;
                              // Store the default playback rate
                              audioElement.defaultPlaybackRate = 1.0;
                            }
                          }}
                        >
                          <source src={recordedAudio} type="audio/webm" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    </div>
                    <div className="ion-padding-top">
                      <IonLabel color="medium">Playback Speed:</IonLabel>
                      <div className="ion-padding-top" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
                          <IonButton 
                            key={`new-speed-${speed}`}
                            size="small"
                            fill="outline"
                            onClick={() => {
                              const audioElement = document.getElementById('new-recording-player') as HTMLAudioElement;
                              if (audioElement) {
                                audioElement.playbackRate = speed;
                              }
                            }}
                          >
                            {speed}x
                          </IonButton>
                        ))}
                      </div>
                    </div>
                    <IonButton 
                      expand="block" 
                      color="danger" 
                      fill="outline"
                      className="ion-margin-top"
                      onClick={() => setRecordedAudio(null)}
                    >
                      Delete New Recording
                    </IonButton>
                  </div>
                )}
                {selectedNote?.voice_message_url && !recordedAudio && modalTab === 'attachments' && (
                  <div className="ion-margin-top">
                    <IonListHeader>
                      <IonLabel color="medium">Voice Message</IonLabel>
                    </IonListHeader>
                    <IonItem lines="none" className="ion-margin-bottom">
                      <div style={{ width: '100%' }}>
                        {/* Using a wrapper div with specific dimensions to control the audio player size */}
                        <div style={{ width: '100%', maxWidth: '100%', height: '40px' }}>
                          <audio 
                            controls 
                            preload="metadata"
                            style={{ 
                              width: '100%', 
                              height: '40px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--ion-color-light)'
                            }}
                            src={selectedNote.voice_message_url}
                            id={`audio-player-${selectedNote.id}`}
                          />
                        </div>
                      </div>
                      <IonButton 
                        fill="clear" 
                        color="danger" 
                        onClick={() => handleClearAttachmentField('voice_message_url')}
                        style={{ marginLeft: '10px' }}
                      >
                        <IonIcon slot="icon-only" icon={trashOutline} />
                      </IonButton>
                    </IonItem>
                    <div className="ion-padding-top">
                      <IonLabel color="medium">Playback Speed:</IonLabel>
                      <div className="ion-padding-top" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
                          <IonButton 
                            key={`speed-${speed}`}
                            size="small"
                            fill="outline"
                            onClick={() => {
                              const audioElement = document.getElementById(`audio-player-${selectedNote.id}`) as HTMLAudioElement;
                              if (audioElement) {
                                audioElement.playbackRate = speed;
                              }
                            }}
                          >
                            {speed}x
                          </IonButton>
                        ))}
                      </div>
                    </div>
                    <IonButton 
                      expand="block" 
                      color="danger" 
                      fill="outline"
                      className="ion-margin-top"
                      onClick={() => handleClearAttachmentField('voice_message_url')}
                    >
                      Delete Saved Voice Message
                    </IonButton>
                  </div>
                )}
              </div>
            )}
            {modalTab === 'settings' && (
              <div style={{ marginTop: "16px" }}>
                <IonItem>
                  <IonLabel>Color</IonLabel>
                  <IonSelect value={selectedNote?.color || 'standard'} onIonChange={e => {
                    if (selectedNote) {
                      // Get the current theme from the body's data-theme attribute
                      const currentTheme = document.body.getAttribute('data-theme') || '';
                      
                      // Set the color based on the selection and current theme
                      let noteColor = e.detail.value;
                      
                      // Handle the standard option - set to null to use theme-specific styling
                      if (e.detail.value === 'standard') {
                        noteColor = null;
                      }
                      
                      const updatedNote = { 
                        ...selectedNote, 
                        color: noteColor,
                        crossed_out: selectedNote.crossed_out
                      };
                      
                      updateNote(selectedNote.id, updatedNote, user?.sub || '')
                        .then(() => {
                          setNotes(prevNotes => 
                            prevNotes.map(n => n.id === selectedNote.id ? updatedNote : n)
                          );
                          setSelectedNote(updatedNote);
                          
                          // Force refresh of theme colors
                          const theme = document.body.getAttribute('data-theme');
                          document.body.setAttribute('data-theme', '');
                          setTimeout(() => {
                            document.body.setAttribute('data-theme', theme || '');
                          }, 10);
                        });
                    }
                  }}>
                    <IonSelectOption value="standard">Standard</IonSelectOption>
                    <IonSelectOption value="primary">Primary</IonSelectOption>
                    <IonSelectOption value="secondary">Secondary</IonSelectOption>
                    <IonSelectOption value="tertiary">Tertiary</IonSelectOption>
                    <IonSelectOption value="success">Success</IonSelectOption>
                    <IonSelectOption value="warning">Warning</IonSelectOption>
                    <IonSelectOption value="danger">Danger</IonSelectOption>
                    <IonSelectOption value="light">Light</IonSelectOption>
                    <IonSelectOption value="standard">Medium</IonSelectOption>
                    <IonSelectOption value="dark">Dark</IonSelectOption>
                  </IonSelect>
                </IonItem>
                <IonItem>
                  <IonLabel>Cross Out Note</IonLabel>
                  <IonToggle
                    checked={selectedNote?.crossed_out || false}
                    onIonChange={e => {
                      if (selectedNote) {
                        const updatedNote = { 
                          ...selectedNote, 
                          crossed_out: e.detail.checked,
                          color: selectedNote.color
                        };
                        updateNote(selectedNote.id, updatedNote, user?.sub || '')
                          .then(() => {
                            setNotes(prevNotes => 
                              prevNotes.map(n => n.id === selectedNote.id ? updatedNote : n)
                            );
                            setSelectedNote(updatedNote);
                          });
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
                    if (selectedValue === "option1") {
                      onTurnNoteIntoFolder(1);
                    } else if (selectedValue === "option2") {
                      onTurnNoteIntoFolder(2);
                    } else if (selectedValue === "option3") {
                      onTurnNoteIntoFolder(3); // Mindmap Folder
                    } else if (selectedValue === "option4") {
                      onTurnNoteIntoFolder(5); // Calc Folder
                    }
                    modal.current?.dismiss();
                  }}
                >
                  <IonSelectOption value="option1">Turn Note into Normal Folder</IonSelectOption>
                  <IonSelectOption value="option2">Turn Note into Organizer Folder</IonSelectOption>
                  <IonSelectOption value="option3">Turn Note into Mindmap Folder</IonSelectOption>
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
                const newTab = e.detail.value as 'folder' | 'settings' | 'co-workers';
                setFolderModalTab(newTab);
                if (newTab === 'co-workers' && selectedFolder) {
                  loadCoWorkersForFolder(selectedFolder);
                }
              }}>
                <IonSegmentButton value="folder">Folder</IonSegmentButton>
                <IonSegmentButton value="settings">Settings</IonSegmentButton>
                <IonSegmentButton value="co-workers">Co-workers</IonSegmentButton>
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
                <IonItem>
                  <IonLabel position="stacked">Description</IonLabel>
                  <IonTextarea value={folderDescription} onIonChange={(e) => setFolderDescription(e.detail.value!)} rows={3} autoGrow={true} />
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
            {folderModalTab === 'co-workers' && selectedFolder && (
              <div className="ion-padding">
                {isLoadingCoWorkers ? (
                  <div className="ion-text-center ion-padding">
                    <IonSpinner name="crescent" />
                    <p>Loading co-workers...</p>
                  </div>
                ) : (
                  <>
                    <div className="ion-margin-bottom">
                      <h4>Manage Co-workers</h4>
                      <p>Select co-workers to collaborate on this folder:</p>
                    </div>

                    {coWorkerDetails.length === 0 ? (
                      <div className="ion-text-center ion-padding">
                        <IonIcon icon={peopleOutline} style={{ fontSize: '48px', color: 'var(--ion-color-medium)' }} />
                        <p>You don't have any co-workers yet.</p>
                        <p>Add co-workers in your profile settings first.</p>
                      </div>
                    ) : (
                      <IonList>
                        {availableCoWorkers.map(coWorkerKey => {
                          // Find details for this co-worker key
                          const details = coWorkerDetails.find(d => d.user_key === coWorkerKey);
                          const coWorkerId = details?.user_id || coWorkerKey;
                          const isSelected = selectedCoWorkers.includes(coWorkerId);
                          
                          return (
                            <IonItem key={coWorkerKey} onClick={() => toggleCoWorkerSelection(coWorkerKey)} button detail={false}>
                              {details?.image_url ? (
                                <IonAvatar slot="start">
                                  <img src={details.image_url} alt={details.username || 'Co-worker'} />
                                </IonAvatar>
                              ) : (
                                <IonIcon 
                                  slot="start" 
                                  icon={isSelected ? checkmarkCircleOutline : peopleOutline}
                                  color={isSelected ? 'success' : 'medium'}
                                  style={{ fontSize: '32px' }}
                                />
                              )}
                              <IonLabel>
                                <h2>{details?.username || 'Unknown User'}</h2>
                                <p style={{ fontSize: '0.85em', color: 'var(--ion-color-medium)' }}>
                                  {details?.username ? 'Co-worker' : 'Pending user'}
                                </p>
                              </IonLabel>
                              {isSelected && (
                                <IonIcon slot="end" icon={checkmarkCircleOutline} color="success" />
                              )}
                            </IonItem>
                          );
                        })}
                      </IonList>
                    )}

                    <div className="ion-padding ion-margin-top">
                      <IonButton expand="block" onClick={async () => {
                        if (!selectedFolder) return;
                        
                        try {
                          await updateFolderCoWorkers(
                            selectedFolder.id,
                            selectedCoWorkers,
                            user?.sub || ''
                          );
                          
                          // If adding co-workers, clear the password
                          let passwordCleared = false;
                          const updatedFolders = folders.map(f => {
                            if (f.id === selectedFolder.id) {
                              let updated: Folder = { ...f, co_workers: selectedCoWorkers };
                              if (selectedCoWorkers.length > 0 && f.password) {
                                updated = { ...updated, password: '' };
                                passwordCleared = true;
                              }
                              return updated;
                            }
                            return f;
                          });
                          
                          setFolders(updatedFolders);
                          if (passwordCleared) {
                            setSelectedFolder(prev => prev && prev.id === selectedFolder.id ? { ...prev, password: '' } : prev);
                            showToast({ message: 'Password cleared because co-workers were added.', duration: 2500, color: 'warning' });
                          }
                          
                          // If we're inside a folder, refresh the data to show updated co-worker access
                          if (currentFolderId) {
                            refreshFolderData(currentFolderId);
                          }
                          
                          // Close the modal
                          folderModal.current?.dismiss();
                          
                          presentToast({
                            message: 'Co-workers updated successfully',
                            color: 'success',
                            duration: 2000
                          });
                        } catch (error) {
                          console.error('Error updating folder co-workers:', error);
                          presentToast({
                            message: 'Failed to update co-workers',
                            color: 'danger',
                            duration: 3000
                          });
                        }
                      }} disabled={availableCoWorkers.length === 0}>
                        Save Co-workers
                      </IonButton>
                    </div>
                  </>
                )}
              </div>
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
                      disabled={!!selectedFolder?.co_workers && selectedFolder.co_workers.length > 0}
                    />
                  </IonItem>
                )}
                {(!selectedFolder?.co_workers || selectedFolder.co_workers.length === 0) && (
                  <IonItem>
                    <IonLabel position="stacked">New Password</IonLabel>
                    <IonInput
                      type="password"
                      value={folderPassword}
                      onIonChange={e => setFolderPassword(e.detail.value!)}
                      placeholder="Set or update folder password"
                    />
                  </IonItem>
                )}
                {selectedFolder?.password && (
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
                          setPasswordFolderId(Number(selectedFolder.id));
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
                {(!selectedFolder?.co_workers || selectedFolder.co_workers.length === 0) && (
                  <IonButton
                    expand="block"
                    color="primary"
                    onClick={async () => {
                      // Prevent password change if folder has co_workers
                      if (selectedFolder?.co_workers && selectedFolder.co_workers.length > 0) {
                        showToast({ message: 'Co-worker folders cannot have passwords.', duration: 2000, color: 'danger' });
                        return;
                      }
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
                          setPasswordFolderId(Number(selectedFolder.id));
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
                )}
                <IonItem>
                  <IonLabel>Color</IonLabel>
                  <IonSelect
                    value={folderColor}
                    placeholder="Select folder color"
                    onIonChange={async (e) => {
                      setFolderColor(e.detail.value);
                      if (selectedFolder) {
                        const updatedFolder = {
                          ...selectedFolder,
                          color: e.detail.value === 'white' ? null : e.detail.value,
                          crossed_out: isCrossedOut,
                          checklist: isChecklistEnabled
                        };
                        await handleUpdateFolder(updatedFolder, user, folderName, folderDescription, folderType, setFolders, setSelectedFolder, () => {
                          folderModal.current!.dismiss();
                        });
                        
                        // Immediately refresh shared folders in sidebar to show color change
                        if (typeof window.refreshSharedFolders === 'function' && user?.sub) {
                          try {
                            await window.refreshSharedFolders(user.sub);
                            console.log('Refreshed shared folders in sidebar after color change');
                          } catch (error) {
                            console.error('Error refreshing shared folders:', error);
                          }
                        }
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
                    onIonChange={async (e) => {
                      setIsCrossedOut(e.detail.checked);
                      if (selectedFolder) {
                        const updatedFolder = {
                          ...selectedFolder,
                          crossed_out: e.detail.checked,
                          color: folderColor,
                          checklist: isChecklistEnabled
                        };
                        await handleUpdateFolder(updatedFolder, user, folderName, folderDescription, folderType, setFolders, setSelectedFolder, () => {
                          folderModal.current!.dismiss();
                        });
                        
                        // Immediately refresh shared folders in sidebar to show crossed-out change
                        if (typeof window.refreshSharedFolders === 'function' && user?.sub) {
                          try {
                            await window.refreshSharedFolders(user.sub);
                            console.log('Refreshed shared folders in sidebar after crossed-out change');
                          } catch (error) {
                            console.error('Error refreshing shared folders:', error);
                          }
                        }
                      }
                    }} 
                  />
                </IonItem>
                <IonItem>
                  <IonLabel>Enable Checkboxes</IonLabel>
                  <IonToggle 
                    checked={isChecklistEnabled} 
                    onIonChange={async (e) => {
                      setIsChecklistEnabled(e.detail.checked);
                      if (selectedFolder) {
                        const updatedFolder = {
                          ...selectedFolder,
                          checklist: e.detail.checked,
                          color: folderColor,
                          crossed_out: isCrossedOut
                        };
                        await handleUpdateFolder(updatedFolder, user, folderName, folderDescription, folderType, setFolders, setSelectedFolder, () => {
                          folderModal.current!.dismiss();
                        });
                        
                        // Immediately refresh shared folders in sidebar to show checklist change
                        if (typeof window.refreshSharedFolders === 'function' && user?.sub) {
                          try {
                            await window.refreshSharedFolders(user.sub);
                            console.log('Refreshed shared folders in sidebar after checklist change');
                          } catch (error) {
                            console.error('Error refreshing shared folders:', error);
                          }
                        }
                      }
                    }} 
                  />
                </IonItem>
              </div>
            )}
          </IonContent>
        </IonModal>
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
            onEditFolder(folder, true); // Pass true to bypass password check
          } else {
            navigateToFolder(folder);
          }
          setUnlockIntent(null);
        } else {
          setUnlockError('Incorrect password');
        }
      }}
    >Unlock</IonButton>
    <IonButton expand="block" color="medium" onClick={() => { setUnlockFolderId(null); setUnlockPassword(''); setUnlockError(''); }}>Cancel</IonButton>
  </IonContent>
</IonModal>

{/* Image preview modal for larger view and download */}
<IonModal 
  isOpen={showImageModal} 
  onDidDismiss={() => {
    setShowImageModal(false);
    // If we were in a note editing modal before, reopen it
    if (selectedNote) {
      setTimeout(() => {
        modal.current?.present();
      }, 100);
    }
  }}
  mode="ios" // Force iOS style which is more likely to be full screen
  backdropDismiss={true}
>
  <IonPage>
    <IonHeader>
      <IonToolbar color="dark">
        <IonButtons slot="start">
          <IonButton onClick={() => {
            setShowImageModal(false);
            // If we were in a note editing modal before, reopen it
            if (selectedNote) {
              setTimeout(() => {
                modal.current?.present();
              }, 100);
            }
          }}>
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
    <IonContent fullscreen className="ion-no-padding" style={{ 
      backgroundColor: '#000'
    }}>
      {imageModalUrl && (
        <div style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '0'
        }}>
          <img
            src={imageModalUrl}
            alt="Full size preview"
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
        </div>
      )}
    </IonContent>
  </IonPage>
</IonModal>

</IonPage>
  );
};

export default List;