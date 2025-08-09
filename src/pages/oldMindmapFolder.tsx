import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonMenuButton,
  IonFab,
  IonFabButton,
  IonModal,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  useIonToast,
  IonReorder,
  IonReorderGroup,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonToggle,
  IonAlert,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonAvatar,
  IonList,
  IonListHeader,
  IonSpinner,
  IonText,
} from "@ionic/react";
import { 
  folderOutline, 
  addOutline, 
  add, 
  remove, 
  createOutline,
  checkmarkDoneCircleOutline,
  codeDownloadOutline,
  closeCircleOutline,
  documentAttachOutline,
  imageOutline,
  micOutline,
  checkmarkCircleOutline,
  closeOutline,
  peopleOutline,
  trashOutline,
  playOutline,
  stopOutline,
  analyticsOutline,
  calculatorOutline,
  fileTrayFullOutline
} from "ionicons/icons";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useHistory } from "react-router-dom";
import { useAuth0, User } from '@auth0/auth0-react';
import { Note, Folder, getFolders } from './apiService';

// Extend Note interface to include voice recordings
interface NoteWithMedia extends Note {
  voice_recordings?: string[];
}

// Type guard to check if a note has voice recordings
const isNoteWithMedia = (note: Note): note is NoteWithMedia => {
  return (note as NoteWithMedia).voice_recordings !== undefined;
};

// Import remaining functions
import { getNotes, addNote, updateNote, deleteNote, deleteFolder, updateFolder, uploadNoteImage, uploadVoiceMessage, updateFolderPassword, getUserCoWorkers, updateFolderCoWorkers, getCoWorkerDetails, CoWorkerDetail, apiUrl, uploadFiles } from './apiService';
import '../components/FolderModal.css';
import { handleAddFolder, handleAddNote, handleDeleteFolder, handleDeleteNote, handleUpdateFolder, handleUpdateNote, handleUploadFilesToServer } from "./apiCalls";
import { hashStringSHA256 } from "./hash";
import FolderModal from "../components/FolderModal";
import { themes } from '../themeColors';


interface Position {
  x: number;
  y: number;
}

interface Connection {
  from: { type: 'folder' | 'note', id: string };
  to: { type: 'folder' | 'note', id: string };
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Extend Note interface to include voice recordings
interface NoteWithMedia extends Note {
  voice_recordings?: string[];
}

export const MindmapFolder: React.FC = () => {
  const { folderName: folderNameParam } = useParams<{ folderName: string }>();
  const decodedFolderName = decodeURIComponent(folderNameParam);
  const history = useHistory();
  const { user } = useAuth0() as { user: User | undefined };
  const [showToast] = useIonToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [editingNote, setEditingNote] = useState<NoteWithMedia | null>(null);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [modalTab, setModalTab] = useState<'notes' | 'attachments' | 'settings'>('notes');
  const [noteColor, setNoteColor] = useState<string>('null');
  const [isCrossedOut, setIsCrossedOut] = useState<boolean>(false);
  const [calcNumberState, setCalcNumberState] = useState<number | undefined>(undefined);
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; file: File; previewUrl: string; type: 'image' | 'file' }[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [imageModalUrl, setImageModalUrl] = useState<string>('');
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [dropdownValue, setDropdownValue] = useState<string>('');
  const [presentingElement, setPresentingElement] = useState<HTMLElement | null>(null);
  
  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setFolderName(folder.name || '');
    setFolderDescription(folder.description || '');
    setFolderColor(folder.color || 'null');
    setFolderType(folder.folder_type || 1);
    setIsChecklistEnabled(!!folder.checklist);
    setIsFolderCrossedOut(!!folder.crossed_out);
    setShowFolderModal(true);
  };
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioSource, setAudioSource] = useState<MediaElementAudioSourceNode | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [folderModalTab, setFolderModalTab] = useState<'folder' | 'settings' | 'co-workers'>('folder');
  const [folderName, setFolderName] = useState('');
  const [folderType, setFolderType] = useState<number>(1);
  const [folderColor, setFolderColor] = useState<string>('null');
  const [folderDescription, setFolderDescription] = useState('');
  const [isChecklistEnabled, setIsChecklistEnabled] = useState(false);
  const [isFolderCrossedOut, setIsFolderCrossedOut] = useState(false);
  const [showCoWorkerModal, setShowCoWorkerModal] = useState(false);
  const [coWorkerDetails, setCoWorkerDetails] = useState<any[]>([]);
  const [availableCoWorkers, setAvailableCoWorkers] = useState<any[]>([]);
  const [selectedCoWorkers, setSelectedCoWorkers] = useState<string[]>([]);
  const [selectedFolderForCoWorkers, setSelectedFolderForCoWorkers] = useState<any>(null);
  const [isLoadingCoWorkers, setIsLoadingCoWorkers] = useState(false);
  const [unlockFolderId, setUnlockFolderId] = useState<string | null>(null);
  const [unlockIntent, setUnlockIntent] = useState<'edit' | null>(null);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState<Position>({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{ type: 'folder' | 'note', id: string } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minimapScale, setMinimapScale] = useState(0.1);
  const [bounds, setBounds] = useState<Bounds>({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const page = useRef(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const modal = useRef<HTMLIonModalElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editModal = useRef<HTMLIonModalElement>(null);
  const folderModal = useRef<HTMLIonModalElement>(null);
  const coWorkerModal = useRef<HTMLIonModalElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [folderPassword, setFolderPassword] = useState('');
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [draggedNote, setDraggedNote] = useState<Note | null>(null);
  const [oldFolderPassword, setOldFolderPassword] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [presentToast] = useIonToast();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [passwordFolderId, setPasswordFolderId] = useState<string | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [noteNumber, setNoteNumber] = useState<number | null>(null);
const connectionsInitialized = useRef(false);
const getTheme = () => {
  const themeName = localStorage.getItem('theme') || 'darkFox';
  return themes[themeName as keyof typeof themes];
};
const [theme, setTheme] = useState(getTheme());


useEffect(() => {
  
  const onStorage = () => setTheme(getTheme());
  window.addEventListener('storage', onStorage);
  const interval = setInterval(() => setTheme(getTheme()), 500);
  return () => {
    window.removeEventListener('storage', onStorage);
    clearInterval(interval);
  };
}, []);


  // Voice recording state
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // Handle drag over notes
  const handleNoteDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle drop on notes
  const handleNoteDrop = async (e: React.DragEvent, targetNote: Note) => {
    e.preventDefault();
    if (!draggedNote || draggedNote.id === targetNote.id) return;

    try {
      // Update positions to swap notes
      const updatedNotes = notes.map(note => {
        if (note.id === draggedNote.id) {
          return { ...note, y: targetNote.y };
        } else if (note.id === targetNote.id) {
          return { ...note, y: draggedNote.y };
        }
        return note;
      });

      // Update both notes
      await Promise.all([
        updateNote(
          draggedNote.id,
          updatedNotes.find(n => n.id === draggedNote.id) as Note,
          user?.sub || ''
        ),
        updateNote(
          targetNote.id,
          updatedNotes.find(n => n.id === targetNote.id) as Note,
          user?.sub || ''
        )
      ]);

      setNotes(updatedNotes);
      
      showToast({
        message: 'Notes swapped successfully',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
    } catch (error) {
      presentToast({
        message: 'Failed to swap notes',
        color: 'danger',
        duration: 2000
      });
    } finally {
      setDraggedNote(null);
      setDropTargetId(null);
    }
  };

  useEffect(() => {
    setPresentingElement(page.current);
  }, []);
useEffect(() => {
  if (user?.sub) {
    // Load all co-worker details for display
    getCoWorkerDetails(user.sub).then(details => {
      setCoWorkerDetails(details);
    });
    // Load all available co-workers for selection
    getUserCoWorkers(user.sub).then(coWorkers => {
      setAvailableCoWorkers(coWorkers);
    });
  }
}, [user]);
  useEffect(() => {
     
  const fetchData = async () => {
    if (user && user.sub) {
      const allNotes = await getNotes(user.sub);
      const allFolders = await getFolders(user.sub);
      setFolders(allFolders);

      // Only reconstruct connections once
      if (!connectionsInitialized.current) {
        const loadedConnections: Connection[] = [];

        // ...existing code in useEffect for reconstructing connections...
allNotes.forEach(note => {
  if (Array.isArray(note.connected_to)) {
    note.connected_to.forEach(targetId => {
      if (allNotes.some(n => n.id.toString() === targetId.toString())) {
        loadedConnections.push({ from: { type: 'note', id: note.id }, to: { type: 'note', id: targetId } });
      } else if (allFolders.some(f => f.id === targetId)) {
        loadedConnections.push({ from: { type: 'note', id: note.id }, to: { type: 'folder', id: targetId } });
      }
    });
  }
});

        allFolders.forEach(folder => {
          if (Array.isArray(folder.connected_to)) {
            folder.connected_to.forEach(targetId => {
              if (allNotes.some(n => n.id === targetId)) {
                loadedConnections.push({ from: { type: 'folder', id: folder.id }, to: { type: 'note', id: targetId } });
              } else if (allFolders.some(f => f.id === targetId)) {
                loadedConnections.push({ from: { type: 'folder', id: folder.id }, to: { type: 'folder', id: targetId } });
              }
            });
          }
        });

        setConnections(loadedConnections);
        connectionsInitialized.current = true;
      }

      const currentFolder = allFolders.find(folder => folder.name === decodedFolderName);
      if (currentFolder) {
        setCurrentFolderId(currentFolder.id);
        const folderNotes = allNotes.filter(note => note.folder_id === currentFolder.id);
        setNotes(folderNotes);
      } else {
        showToast({
          message: 'Folder not found',
          duration: 2000,
          color: 'danger'
        });
      }
    }
  };
  fetchData();
  // Only run on mount and decodedFolderName/user change
  // DO NOT include notes/folders in the dependency array!
}, [user, decodedFolderName, showToast]);

  // Calculate bounds whenever notes change
  useEffect(() => {
    if (notes.length === 0) {
      setBounds({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
      return;
    }

    const newBounds = notes.reduce((acc, note) => {
      const x = note.x || 0;
      const y = note.y || 0;
      return {
        minX: Math.min(acc.minX, x),
        minY: Math.min(acc.minY, y),
        maxX: Math.max(acc.maxX, x + 300), // 300 is maxWidth of notes
        maxY: Math.max(acc.maxY, y + 100)  // Approximate height of notes
      };
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    setBounds(newBounds);
  }, [notes]);

  const handleReorder = (event: CustomEvent) => {
    const movedNote = notes[event.detail.from];
    const newNotes = [...notes];
    newNotes.splice(event.detail.from, 1);
    newNotes.splice(event.detail.to, 0, movedNote);
    setNotes(newNotes);
    event.detail.complete();
  };


   const onEditFolder = (folder: Folder, bypassPasswordCheck = false) => {
  // If the folder has a password and we're not bypassing the check
  if (folder.password && !bypassPasswordCheck) {
    setUnlockFolderId(folder.id);
    setUnlockIntent('edit');
    return;
  }

  // Set up modal state as usual
  setFolderName(folder.name);
  setFolderType(folder.folder_type || 1);
  setFolderColor(folder.color || 'null');
  setFolderDescription(folder.description || '');
  setIsCrossedOut(!!folder.crossed_out);
  setIsChecklistEnabled(folder.checklist);
  setSelectedFolder(folder);
  folderModal.current?.present();
};
    

    const handleUncheckAll = (note: Note) => {
  // Replace all [x] with [ ]
  const updatedText = note.text?.replace(/\[x\]/g, '[ ]');
  if (updatedText !== note.text) {
    const updatedNoteData = {
      ...note,
      text: updatedText,
      color: note.color,
      crossed_out: note.crossed_out
    };

    updateNote(note.id, updatedNoteData, user?.sub || '').then(() => {
      setNotes(prevNotes => prevNotes.map(n => n.id === note.id ? updatedNoteData : n));
      setEditingNote(updatedNoteData);
      setText(updatedText);
      showToast({
        message: 'All checkboxes unchecked',
        duration: 2000,
        color: 'success',
      });
    });
  }
};

const handleModalDismiss = async () => {
  if (editingNote) {
    const hasTitleChanged = title !== editingNote.title;
    const hasTextChanged = text !== editingNote.text;
    const hasCalcNumberChanged = calcNumberState !== (editingNote.calc_number ?? undefined);

    if (hasTitleChanged || hasTextChanged || hasCalcNumberChanged) {
      const updatedNote = {
        ...editingNote,
        title,
        text,
        calc_number: calcNumberState,
        color: editingNote.color,
        crossed_out: editingNote.crossed_out,
      };

      try {
        await updateNote(editingNote.id, updatedNote, user?.sub || '');
        setNotes(prevNotes =>
          prevNotes.map(n => n.id === editingNote.id ? updatedNote : n)
        );
        showToast({
          message: 'Note auto-saved!',
          duration: 2000,
          color: 'success',
        });
      } catch (error) {
        console.error('Error saving note:', error);
        showToast({
          message: 'Failed to save note',
          duration: 2000,
          color: 'danger',
        });
      }
    }

    setEditingNote(null);
  }

  // Reset form state
  setTitle('');
  setText('');
  setCalcNumberState(undefined);
  setUploadedFiles([]);
  setRecordedAudio(null);
  setDropdownValue('');
  setModalTab('notes');
};

const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files;
  if (files && files.length > 0) {
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        // Convert image to base64 and upload using the dedicated API
        const base64 = await fileToBase64(file);
        if (editingNote && user?.sub) {
          // Use the correct API for image upload
          const result = await uploadNoteImage(editingNote.id, base64, user.sub);
          if (result.success && result.imageUrl) {
            const updatedNote = { ...editingNote, image_url: result.imageUrl };
            await updateNote(editingNote.id, updatedNote, user.sub);
            setNotes(prevNotes => prevNotes.map(n => n.id === editingNote.id ? updatedNote : n));
            setEditingNote(updatedNote);
            showToast({
              message: 'Image added successfully',
              duration: 2000,
              color: 'success'
            });
          } else {
            showToast({
              message: 'Image upload failed',
              duration: 2000,
              color: 'danger'
            });
          }
        }
      } else {
        // Only add non-image files to uploadedFiles
        setUploadedFiles(prev => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            file,
            previewUrl: URL.createObjectURL(file),
            type: 'file' as const
          }
        ]);
      }
    }
  }
};


const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};
  const handleRemoveFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  };

  const handleClearCalcNumber = () => {
    setCalcNumberState(undefined);
  };

const handleClearAttachmentField = async (field: 'image_url' | 'file_link' | 'voice_message_url') => {
  if (editingNote) {
    const updatedNote = { ...editingNote };
    updatedNote[field] = undefined;
    await updateNote(editingNote.id, updatedNote, user?.sub || '');
    setNotes(prevNotes => 
      prevNotes.map(n => n.id === editingNote.id ? updatedNote : n)
    );
    setEditingNote(updatedNote);
  }
};

 const handleUploadFiles = async () => {
  if (uploadedFiles.length === 0) return;

  setIsUploading(true);
  try {
    if (editingNote && user?.sub) {
      let updatedNote = { ...editingNote };

      // Process image files: convert to base64 and set image_url
      const imageFiles = uploadedFiles.filter(file => file.type === 'image');
      if (imageFiles.length > 0) {
        // Only use the first image for image_url (or handle multiple as needed)
        const base64 = await fileToBase64(imageFiles[0].file);
        updatedNote.image_url = base64;
      }

      // Process non-image files: upload and add to file_link
      const nonImageFiles = uploadedFiles.filter(file => file.type === 'file');
      if (nonImageFiles.length > 0) {
        const formData = new FormData();
        nonImageFiles.forEach((file, index) => {
          formData.append('files', file.file, file.file.name || `file_${index}`);
        });
        formData.append('noteId', editingNote.id.toString());
        formData.append('userId', user.sub);

        const result = await uploadFiles(editingNote.id, formData, user.sub);

        if (result.success && result.files && result.files.length > 0) {
          if (!Array.isArray(updatedNote.file_link)) {
            updatedNote.file_link = [];
          }
          result.files.forEach((file: { fileType: string; fileUrl: string }) => {
            if (!file.fileType.startsWith('image/')) {
              (updatedNote.file_link as string[]).push(file.fileUrl);
            }
          });
        }
      }

      // Update the note in the backend
      await updateNote(editingNote.id, updatedNote, user.sub);

      // Update local state
      setNotes(prevNotes =>
        prevNotes.map(n => n.id === editingNote.id ? updatedNote : n)
      );
      setEditingNote(updatedNote);
      setUploadedFiles([]);
      showToast({
        message: 'Attachments uploaded successfully',
        duration: 2000,
        color: 'success'
      });
    }
  } catch (error) {
    console.error('Error uploading files:', error);
    showToast({
      message: error instanceof Error ? error.message : 'Failed to upload files. Please try again.',
      duration: 3000,
      color: 'danger'
    });
  } finally {
    setIsUploading(false);
  }
};
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus'
      };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio(audioUrl);
        audioChunksRef.current = [];
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      showToast({
        message: 'Failed to start recording',
        duration: 2000,
        color: 'danger'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Debounced save function
  const debouncedSave = useCallback(async (note: Note) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (user?.sub) {
        try {
          const currentNote = notes.find(n => n.id === note.id);
          if (currentNote) {
            await updateNote(note.id, {
              ...note,
              x: currentNote.x,
              y: currentNote.y
            }, user.sub);
          }
        } catch (error) {
          console.error('Error updating note position:', error);
          showToast({
            message: 'Failed to save note position',
            duration: 2000,
            color: 'danger'
          });
        }
      }
    }, 500); // Wait 500ms after the last movement before saving
  }, [notes, user]);

  const handleNoteMouseDown = (note: Note, event: React.MouseEvent) => {
    if (isConnecting) {
      if (!connectionStart) {
        setConnectionStart({ type: 'note', id: note.id.toString() });
      } else {
        const newConnection = { from: connectionStart, to: { type: 'note' as const, id: note.id.toString() } };
        setConnections([...connections, newConnection]);
        saveConnectionToBackend(connectionStart, { type: 'note', id: note.id.toString() });
        setConnectionStart(null);
        setIsConnecting(false);
      }
      event.stopPropagation();
      return;
    }

    setSelectedNote(note);
    // Calculate offset considering canvas offset and zoom
    const offsetX = (event.clientX / zoom) - ((note.x || 0) + canvasOffset.x);
    const offsetY = (event.clientY / zoom) - ((note.y || 0) + canvasOffset.y);
    setDragStart({ x: offsetX, y: offsetY });
    setIsDragging(true);
  };

  const handleNoteMouseMove = (note: Note, event: React.MouseEvent) => {
    if (!selectedNote || note.id.toString() !== selectedNote.id.toString() || !isDragging) return;

    // Calculate new position considering canvas offset and zoom
    const newX = (event.clientX / zoom) - dragStart.x - canvasOffset.x;
    const newY = (event.clientY / zoom) - dragStart.y - canvasOffset.y;

    const updatedNotes = notes.map(n => 
      n.id.toString() === note.id.toString()
        ? { ...n, x: newX, y: newY }
        : n
    );
    setNotes(updatedNotes);

    debouncedSave(note);
  };

  const handleNoteMouseUp = async (note: Note) => {
    if (user?.sub && selectedNote) {
      try {
        const currentNote = notes.find(n => n.id === note.id);
        if (currentNote) {
          const updatedNote = await updateNote(note.id, {
            ...note,
            x: currentNote.x,
            y: currentNote.y
          }, user.sub);
          setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
        }
      } catch (error) {
        console.error('Error updating note position:', error);
        showToast({
          message: 'Failed to save note position',
          duration: 2000,
          color: 'danger'
        });
      }
    }
    setIsDragging(false);
    setSelectedNote(null);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (selectedNote && isDragging) {
        // Calculate new position considering canvas offset and zoom
        const newX = (event.clientX / zoom) - dragStart.x - canvasOffset.x;
        const newY = (event.clientY / zoom) - dragStart.y - canvasOffset.y;

        setNotes(notes.map(n => 
          n.id === selectedNote.id 
            ? { ...n, x: newX, y: newY }
            : n
        ));
      } else if (isPanning && !isDragging) {
        setCanvasOffset({
          x: (event.clientX - panStart.x) / zoom,
          y: (event.clientY - panStart.y) / zoom
        });
      }
    };

    const handleGlobalMouseUp = async () => {
      if (selectedNote && user?.sub) {
        try {
          const currentNote = notes.find(n => n.id === selectedNote.id);
          if (currentNote) {
            const updatedNote = await updateNote(selectedNote.id, {
              ...selectedNote,
              x: currentNote.x,
              y: currentNote.y
            }, user.sub);
            setNotes(notes.map(n => n.id === selectedNote.id ? updatedNote : n));
          }
        } catch (error) {
          console.error('Error updating note position:', error);
          showToast({
            message: 'Failed to save note position',
            duration: 2000,
            color: 'danger'
          });
        }
      }
      setIsDragging(false);
      setSelectedNote(null);
      setIsPanning(false);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [selectedNote, isDragging, isPanning, dragStart, panStart, notes, user, zoom, canvasOffset]);

  const handleCanvasDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleCanvasDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

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
    
  const handleAddNote = async (currentTitle: string, currentText: string, user: User | undefined, currentFolderId: string, nextY: number, showToast: unknown, setNotes: React.Dispatch<React.SetStateAction<Note[]>>, setTitle: React.Dispatch<React.SetStateAction<string>>, setText: React.Dispatch<React.SetStateAction<string>>, p0: () => void) => {
    if (!currentFolderId || !user?.sub) {
      presentToast({
        message: 'Cannot add note: Folder not found or user not authenticated',
        duration: 2000,
        color: 'danger'
      });
      return;
    }

    const x = window.innerWidth / 2 - 150;
    const y = window.innerHeight / 2 - 50;

    const note = {
      title,
      text,
      folder_id: currentFolderId.toString(),
      x,
      y,
      crossed_out: false,
      color: 'standard'
    };

    try {
      const newNote = await addNote(note, user.sub, currentFolderId);
      if (newNote) {
        setNotes([...notes, newNote]);
        setTitle('');
        setText('');
        modal.current?.dismiss();
      }
    } catch (error) {
      console.error('Error adding note:', error);
      presentToast({
        message: 'Failed to add note',
        duration: 2000,
        color: 'danger'
      });
    }
  };

  const navigateToFolder = (folder: Folder) => {
  const encodedName = encodeURIComponent(folder.name);
  const folderType = typeof folder.folder_type === 'string' ? parseInt(folder.folder_type) : folder.folder_type;

  if (folderType === 1) {
    history.push(`/app/folder/${encodedName}`);
  } else if (folderType === 2) {
    history.push(`/app/organizerfolder/${encodedName}`);
  } else if (folderType === 3) {
    history.push(`/app/mindmapfolder/${encodedName}`); // <-- Use name, not id
  } else if (folderType === 5) {
    history.push(`/app/calcfolder/${encodedName}`);
  } else {
    console.error("Unknown folder type:", folderType);
    showToast({
      message: "Unknown folder type!",
      duration: 2000,
      color: "danger",
    });
  }
};

  const drawConnections = () => {
    return connections.map((connection, index) => {
      let fromObj, toObj;

      // ...existing code in drawConnections...
if (connection.from.type === 'folder') {
  fromObj = folders.find(f => f.id === connection.from.id);
} else {
  fromObj = notes.find(n => n.id === connection.from.id);
}
if (connection.to.type === 'folder') {
  toObj = folders.find(f => f.id === connection.to.id);
} else {
  toObj = notes.find(n => n.id === connection.to.id);
}

      if (!fromObj || !toObj) return null;

      const fromX = (fromObj.x || 0) + canvasOffset.x + 75; // 75 = half minWidth for center
      const fromY = (fromObj.y || 0) + canvasOffset.y + 20; // 20 = approx. vertical center
      const toX = (toObj.x || 0) + canvasOffset.x + 75;
      const toY = (toObj.y || 0) + canvasOffset.y + 20;

      const themeName = localStorage.getItem('theme') || 'darkFox';
      const lineColor = themeName === 'darkFox' ? '#fff' : theme.primary;

      return (
        <svg
          key={index}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1
          }}
        >
          <line
            x1={fromX}
            y1={fromY}
            x2={toX}
            y2={toY}
            stroke={lineColor}
            strokeWidth="2"
          />
        </svg>
      );
    });
  };

  const handleCanvasMouseDown = (event: React.MouseEvent) => {
    if (!isDragging && event.target === canvasRef.current) {
      setIsPanning(true);
      setPanStart({
        x: event.clientX - (canvasOffset.x * zoom),
        y: event.clientY - (canvasOffset.y * zoom)
      });
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent) => {
    if (isPanning && !isDragging) {
      setCanvasOffset({
        x: (event.clientX - panStart.x) / zoom,
        y: (event.clientY - panStart.y) / zoom
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  // Handle zoom with buttons
  const handleZoom = (delta: number) => {
    const oldZoom = zoom;
    const newZoom = Math.max(0.1, Math.min(2, zoom + delta));
    
    // Calculate the center point of the viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    // Calculate the offset needed to maintain the center point
    const scaleFactor = newZoom / oldZoom;
    const newOffsetX = centerX - (centerX - canvasOffset.x) * scaleFactor;
    const newOffsetY = centerY - (centerY - canvasOffset.y) * scaleFactor;

    setZoom(newZoom);
    setCanvasOffset({ x: newOffsetX, y: newOffsetY });
  };

  // Folder dragging logic
  const [selectedFolderForDrag, setSelectedFolderForDrag] = useState<Folder | null>(null);
  const [isFolderDragging, setIsFolderDragging] = useState(false);
  const [folderDragStart, setFolderDragStart] = useState<Position>({ x: 0, y: 0 });

  const handleFolderMouseDown = (folder: Folder, event: React.MouseEvent) => {
    if (isConnecting) {
      if (!connectionStart) {
        setConnectionStart({ type: 'folder', id: folder.id.toString() });
      } else {
        const newConnection = { from: connectionStart, to: { type: 'folder' as const, id: folder.id.toString() } };
        setConnections([...connections, newConnection]);
        saveConnectionToBackend(connectionStart, { type: 'folder', id: folder.id.toString() });
        setConnectionStart(null);
        setIsConnecting(false);
      }
      event.stopPropagation();
      return;
    }

    setSelectedFolderForDrag(folder);
    const offsetX = (event.clientX / zoom) - ((folder.x || 0) + canvasOffset.x);
    const offsetY = (event.clientY / zoom) - ((folder.y || 0) + canvasOffset.y);
    setFolderDragStart({ x: offsetX, y: offsetY });
    setIsFolderDragging(true);
  };

  const handleFolderMouseMove = (folder: Folder, event: React.MouseEvent) => {
    if (!selectedFolderForDrag || folder.id.toString() !== selectedFolderForDrag.id.toString() || !isFolderDragging) return;

    const newX = (event.clientX / zoom) - folderDragStart.x - canvasOffset.x;
    const newY = (event.clientY / zoom) - folderDragStart.y - canvasOffset.y;

    setFolders(prevFolders =>
      prevFolders.map(f =>
        f.id.toString() === folder.id.toString()
          ? { ...f, x: newX, y: newY }
          : f
      )
    );
  };

  const handleFolderMouseUp = async (folder: Folder) => {
    if (user?.sub && selectedFolderForDrag) {
      try {
        const currentFolder = folders.find(f => f.id === folder.id);
        if (currentFolder) {
          const updatedFolder = await updateFolder(folder.id, {
            ...folder,
            x: currentFolder.x,
            y: currentFolder.y
          }, user.sub);
          setFolders(folders.map(f => f.id === folder.id ? updatedFolder : f));
        }
      } catch (error) {
        console.error('Error updating folder position:', error);
        showToast({
          message: 'Failed to save folder position',
          duration: 2000,
          color: 'danger'
        });
      }
    }
    setIsFolderDragging(false);
    setSelectedFolderForDrag(null);
  };

  // Update minimap scale when bounds or window size changes
  useEffect(() => {
    const updateMinimapScale = () => {
      if (minimapRef.current && canvasRef.current) {
        const minimapRect = minimapRef.current.getBoundingClientRect();
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        
        // Add padding to the bounds
        const padding = 100;
        const scale = Math.min(
          (minimapRect.width - padding) / width,
          (minimapRect.height - padding) / height
        );
        
        setMinimapScale(scale);
      }
    };

    window.addEventListener('resize', updateMinimapScale);
    updateMinimapScale();

    return () => window.removeEventListener('resize', updateMinimapScale);
  }, [bounds]);

  


  const handleNoteClick = (note: Note) => {
  if (isEditMode) {
    setEditingNote(note);
    setTitle(note.title);
    setText(note.text);
    setCalcNumberState(note.calc_number);
    setNoteColor(note.color || 'standard');
    setIsCrossedOut(note.crossed_out || false);
    setModalTab('notes');
    editModal.current?.present();
  }
};
const saveConnectionToBackend = async (
  from: { type: 'folder' | 'note', id: string },
  to: { type: 'folder' | 'note', id: string }
) => {
  console.log('saveConnectionToBackend called:', { from, to });

  if (from.type === 'note') {
    const note = notes.find(n => n.id.toString() === from.id);
    console.log('Found note:', note);
    if (note) {
      const updatedConnectedTo = Array.isArray(note.connected_to)
        ? [...new Set([...note.connected_to, to.id])]
        : [to.id];
      console.log('Updated connected_to array for note:', updatedConnectedTo);

      const payload = { ...note, connected_to: updatedConnectedTo };
      console.log('Payload being sent to updateNote:', payload);

      const updatedNote = await updateNote(note.id.toString(), payload, user?.sub || '');
      console.log('API response for updated note:', updatedNote);

      setNotes(prev => prev.map(n => n.id.toString() === note.id.toString() ? updatedNote : n));
    }
  } else if (from.type === 'folder') {
    const folder = folders.find(f => f.id.toString() === from.id);
    console.log('Found folder:', folder);
    if (folder) {
      const updatedConnectedTo = Array.isArray(folder.connected_to)
        ? [...new Set([...folder.connected_to, to.id])]
        : [to.id];
      console.log('Updated connected_to array for folder:', updatedConnectedTo);

      const payload = { ...folder, connected_to: updatedConnectedTo };
      console.log('Payload being sent to updateFolder:', payload);

      const updatedFolder = await updateFolder(folder.id.toString(), payload, user?.sub || '');
      console.log('API response for updated folder:', updatedFolder);

      setFolders(prev => prev.map(f => f.id.toString() === folder.id.toString() ? updatedFolder : f));
    }
  }
};

  const handleFolderClick = (folder: any) => {
    if (isEditMode) {
      // In edit mode, open the FolderModal for editing
      handleEditFolder(folder);
    } else {
      // In view mode, open the folder or show its contents
      setSelectedFolder(folder);
      setModalTab('notes');
      setFolderName(folder.name);
      setFolderType(folder.folder_type);
      setFolderColor(folder.color || 'null');
      setFolderDescription(folder.description || '');
      setIsChecklistEnabled(!!folder.checklist);
      setIsFolderCrossedOut(!!folder.crossed_out);
      folderModal.current?.present();
    }
  };

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

  const handleUpdateNote = async (
    updatedNoteData: { text: string; color: string; crossed_out: boolean; id: string; title: string; user_id?: string; folder_id?: string | null; pinboard_id?: string | null; x?: number | null; y?: number | null; image_url?: string; voice_message_url?: string; file_link?: string | string[]; calc_number?: number; calc_method?: string; note_type?: "standard" | "checklist" | "calculation" | "pinboard"; co_workers?: string[]; },
    user: User | undefined,
    setNotes: React.Dispatch<React.SetStateAction<Note[]>>,
    setSelectedNote: React.Dispatch<React.SetStateAction<Note | null>>,
    onSuccess: () => void
  ) => {
    if (!editingNote || !user?.sub) return;

    try {
      const updatedNote = await updateNote(editingNote.id, {
        ...editingNote,
        title: editingNote.title,
        text: editingNote.text
      }, user.sub);
      
      setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n));
      if (modalTab !== 'settings') {
        editModal.current?.dismiss();
        setEditingNote(null);
      }
      showToast({
        message: 'Note updated successfully',
        duration: 2000,
        color: 'success'
      });
    } catch (error) {
      console.error('Error updating note:', error);
      showToast({
        message: 'Failed to update note',
        duration: 2000,
        color: 'danger'
      });
    }
  };

  const handleDeleteNote = async (id: string, user: User | undefined, setNotes: React.Dispatch<React.SetStateAction<Note[]>>, setSelectedNote: React.Dispatch<React.SetStateAction<Note | null>>, p0: () => Promise<boolean>) => {
    if (!editingNote || !user?.sub) return;

    try {
      await deleteNote(editingNote.id, user.sub);
      setNotes(notes.filter(n => n.id !== editingNote.id));
      editModal.current?.dismiss();
      setEditingNote(null);
      setShowDeleteAlert(false);
      showToast({
        message: 'Note deleted successfully',
        duration: 2000,
        color: 'success'
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      showToast({
        message: 'Failed to delete note',
        duration: 2000,
        color: 'danger'
      });
    }
  };

const onUpdateFolder = async (updatedFolder: Folder) => {
  const response = await updateFolder(updatedFolder.id, updatedFolder, user?.sub || '');

  setFolders(prev => prev.map(f => f.id === updatedFolder.id ? response : f));
  setSelectedFolder(response);
  if (!selectedFolder) return;
  
};



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
      (parentColor && parentColor !== 'standard' && parentColor !== 'null'
        ? `var(--ion-color-${parentColor})`
        : 'inherit')
  }}
>
  {segment.text}
</span>
        )
      ))}
    </span>
  );
};


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
  textDecoration: item.isChecked || (notes.find(n => n.id.toString() === noteId.toString())?.crossed_out) ? 'line-through' : 'none',
  flex: 1,
  color: parentColor && parentColor !== 'standard' && parentColor !== 'null'
    ? `var(--ion-color-${parentColor})`
    : undefined
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
  
  const onUpdateNote = async () => {
    if (editingNote && user?.sub) {
      const updatedNote = {
        ...editingNote,
        title,
        text,
        calc_number: calcNumberState,
        color: noteColor === 'null' || noteColor === 'standard' ? '' : noteColor,
        crossed_out: isCrossedOut
      };
      try {
        await updateNote(editingNote.id.toString(), updatedNote, user.sub);
        setNotes(prevNotes => 
          prevNotes.map(n => n.id.toString() === editingNote.id.toString() ? updatedNote : n)
        );
        setEditingNote(null);
        editModal.current?.dismiss();
        showToast({
          message: 'Note updated successfully',
          duration: 2000,
          color: 'success'
        });
      } catch (error) {
        showToast({
          message: 'Failed to update note',
          duration: 2000,
          color: 'danger'
        });
      }
    }
  };
  

  const onAddNote = async () => {
    if (!currentFolderId) {
      showToast({
        message: 'Cannot add note: Folder not found',
        duration: 2000,
        color: 'danger'
      });
      return;
    }
    
    // Capture current values to ensure they don't get lost
    const currentTitle = title;
    const currentText = text;
    const nextY = getNextY();
    
    // Dismiss the modal is now handled by setShowAddNoteModal(false)
    // cardModal.current!.dismiss();
    
    // Add the note with the captured values
    handleAddNote(
      currentTitle,
      currentText,
      user,
      currentFolderId,
      nextY,
      showToast,
      setNotes,
      setTitle,
      setText,
      () => {
        setNoteColor('null');
        setIsCrossedOut(false);
      }
    );
  };

  const onTurnNoteIntoFolder = (folderType: number) => {
    const note = editingNote;
    if (!note) {
      console.error("No note selected!");
      showToast({
        message: "No note selected to turn into a folder!",
        duration: 2000,
        color: "danger",
      });
      return;
    }

    const folderName = note.title || "Untitled Folder";
    const noteY = note.y || 0;
    const noteIdToDelete = note.id.toString();

    handleAddFolder(
      folderName,
      '', // Pass empty string for folderDescription since it's not available here
      user,
      note.folder_id ? note.folder_id.toString() : null, // Convert to string or null
      folderType,
      1,
      noteY,
      showToast,
      setFolders,
      setFolderName,
      setFolderDescription,
      () => {
        // Delete the original note after the folder is created
        onDeleteNote(noteIdToDelete);
        if (editModal.current) editModal.current.dismiss();
      }
);
};

      const onDeleteNote = (id: string) => {
        handleDeleteNote(id, user, setNotes, setSelectedNote, () => modal.current!.dismiss());
      };
      
      const onAddFolder = () => {
          const nextY = getNextY();
          handleAddFolder(
            folderName,
            folderDescription,
            user,
            currentFolderId, // parent folder ID is null for root level
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
        


    const onDeleteFolder = (id: string) => {
        handleDeleteFolder(id, user, setFolders);
        folderModal.current?.dismiss();
      };

      const handleCheckboxToggle = (noteId: string, updatedText: string) => {
        const noteToUpdate = notes.find(note => note.id.toString() === noteId);
        if (!noteToUpdate) return;

        const updatedNote = {
          ...noteToUpdate,
          text: updatedText
        };

        setNotes(prevNotes => 
          prevNotes.map(note => note.id.toString() === noteId ? updatedNote : note)
        );
        updateNote(noteId, updatedNote, user?.sub || '');
      };

      


  function refreshFolderData(currentFolderId: string) {
    // Implementation would go here
    console.log('Refreshing folder data for:', currentFolderId);
  }

  function saveCoWorkersToFolder(): void {
    throw new Error("Function not implemented.");
  }

  return (
    <IonPage ref={page}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>
            <IonIcon icon={folderOutline} style={{ marginRight: "8px" }} />
            {decodedFolderName}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => handleZoom(-0.1)}>
              <IonIcon icon={remove} />
            </IonButton>
            <IonButton onClick={() => handleZoom(0.1)}>
              <IonIcon icon={add} />
            </IonButton>
            <IonButton onClick={() => setIsConnecting(!isConnecting)}>
              {isConnecting ? 'Cancel Connection' : 'Connect Notes'}
            </IonButton>
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
              <IonIcon icon={createOutline} style={{ marginRight: '8px' }} />
              <IonToggle
                checked={isEditMode}
                onIonChange={(e) => setIsEditMode(e.detail.checked)}
              />
            </div>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div
          ref={canvasRef}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            width: `${100 / zoom}vw`,
            height: `${100 / zoom}vh`,
            overflow: 'hidden',
            cursor: isPanning ? 'grabbing' : 'grab',
            backgroundColor: theme.background, // Use theme background
            zIndex: 1,
            transform: `translate(-50%, -50%) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
        >
          {drawConnections()}

          {/* Render Folders */}
          {folders
  .filter(folder => folder.folder_id === currentFolderId)
  .map((folder) => (
    <div
      key={`folder-${folder.id}`}
      style={{
        position: 'absolute',
        left: folder.x || 0,
        top: folder.y || 0,
        backgroundColor: theme.folderBg, // Use theme folder background
        color: theme.text,
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        cursor: isEditMode ? 'pointer' : (isConnecting ? 'crosshair' : 'move'),
        zIndex: 2,
        border: '2px solid #4a9eff',
        minWidth: '150px',
        maxWidth: '300px',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'transform 100ms ease-out',
        transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
        opacity: folder.crossed_out ? 0.5 : 1,
      }}
      onMouseDown={(e) => !isEditMode && handleFolderMouseDown(folder, e)}
      onMouseMove={(e) => !isEditMode && handleFolderMouseMove(folder, e)}
      onMouseUp={() => !isEditMode && handleFolderMouseUp(folder)}
      onClick={() => {
        if (isEditMode) {
          onEditFolder(folder);
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          style={{ fontSize: 24, cursor: 'pointer' }}
          onClick={e => {
            e.stopPropagation();
            console.log('Folder icon click handler called', { 
              isEditMode,
              folder,
              selectedFolder
            });
            if (isEditMode) {
              
              console.log('Presenting folder modal in edit mode from icon');
            } else {
              navigateToFolder(folder);
            }
          }}
        />
        
      </div>
      <span
  style={{
    fontWeight: 'bold',
    fontSize: 18,
    cursor: isEditMode ? 'pointer' : 'default',
    textDecoration: folder.crossed_out ? 'line-through' : undefined,
  }}
>
  {renderTextWithHashtags(folder.name, folder.color)}
</span>
{folder.description && (
  <div
    style={{
      marginTop: 6,
      fontSize: 14,
      textDecoration: folder.crossed_out ? 'line-through' : undefined,
      color:
        folder.color && folder.color !== 'standard' && folder.color !== 'null'
          ? `var(--ion-color-${folder.color})`
          : '#bbb'
    }}
  >
    {folder.description}
  </div>
)}
{folder.co_workers && folder.co_workers.length > 0 && (
  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
    <IonIcon icon={peopleOutline} style={{ color: '#4a9eff', fontSize: 18 }} />
    {folder.co_workers.map((coWorkerId: string) => {
      // Try to find by user_id, fallback to user_key if needed
      let coWorker = coWorkerDetails.find(cw => cw.user_id === coWorkerId);
      if (!coWorker) {
        coWorker = coWorkerDetails.find(cw => cw.user_key === coWorkerId);
      }
      return (
        <span
          key={coWorkerId}
          style={{
            background: '#23243a',
            color: '#fff',
            borderRadius: 8,
            padding: '2px 8px',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          {coWorker?.image_url && (
            <img
              src={coWorker.image_url}
              alt={coWorker.username || 'Co-worker'}
              style={{ width: 20, height: 20, borderRadius: '50%', marginRight: 4 }}
            />
          )}
          {coWorker?.username || 'Unknown'}
        </span>
      );
    })}
  </div>
)}
    </div>
  ))}

          {/* Render Notes */}
          {notes.map((note) => {
            const noteWithMedia = note as NoteWithMedia;
            return (
            <div
              key={note.id}
              style={{
                position: 'absolute',
                left: note.x || 0,
                top: note.y || 0,
                backgroundColor: '#2c2c2c',
                color: note.color && note.color !== 'standard' && note.color !== 'null'
                  ? `var(--ion-color-${note.color})`
                  : 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                cursor: isEditMode ? 'pointer' : (isConnecting ? 'crosshair' : 'move'),
                zIndex: isDragging && selectedNote?.id === note.id ? 3 : 2,
                border: connectionStart && connectionStart.type === 'note' && connectionStart.id === note.id ? '2px solid #4a9eff' : '1px solid #404040',
                minWidth: '150px',
                maxWidth: '300px',
                userSelect: 'none',
                transition: isDragging ? 'none' : 'transform 100ms ease-out',
                transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
                textDecoration: note.crossed_out ? 'line-through' : undefined,
                opacity: note.crossed_out ? 0.5 : 1,
              }}
              onMouseDown={(e) => !isEditMode && handleNoteMouseDown(note, e)}
              onMouseMove={(e) => !isEditMode && handleNoteMouseMove(note, e)}
              onMouseUp={() => !isEditMode && handleNoteMouseUp(note)}
              onClick={() => handleNoteClick(note)}
            >
              <div style={{ 
                width: '100%', 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <h3
                  style={{
                    margin: 0,
                    color:
                      note.color && note.color !== 'standard' && note.color !== 'null'
                        ? `var(--ion-color-${note.color})`
                        : 'white'
                  }}
                >
                  {note.title}
                </h3>
                
                {/* Image Preview */}
                {note.image_url && (
                  <div style={{ margin: '5px 0', borderRadius: '4px', overflow: 'hidden' }}>
                    <img 
                      src={note.image_url} 
                      alt="Note attachment" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '150px', 
                        objectFit: 'contain',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageModalUrl(note.image_url || '');
                        setShowImageModal(true);
                      }}
                    />
                  </div>
                )}

                {/* Document Preview */}
                {note.file_link && (
                  <div style={{ margin: '5px 0' }}>
                    {Array.isArray(note.file_link) ? (
                      note.file_link.map((fileUrl, idx) => (
                        <div key={idx} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          marginBottom: '5px',
                          padding: '5px',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          borderRadius: '4px'
                        }}>
                          <IonIcon icon={documentAttachOutline} style={{ marginRight: '8px' }} />
                          <a 
                            href={fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              color: '#4a9eff',
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '200px'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {fileUrl.split('/').pop() || 'Download File'}
                          </a>
                        </div>
                      ))
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        padding: '5px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '4px'
                      }}>
                        <IonIcon icon={documentAttachOutline} style={{ marginRight: '8px' }} />
                        <a 
                          href={note.file_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            color: '#4a9eff',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '200px'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {note.file_link.split('/').pop() || 'Download File'}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Note Text */}
                <div style={{ margin: 0, color: '#cccccc' }}>
                  {note.text?.includes('[') && note.text?.includes(']')
                    ? renderTextWithCheckboxes(note.text, note.id, handleCheckboxToggle, note.color)
                    : renderTextWithHashtags(note.text || '', note.color)
                  }
                </div>
{note.voice_message_url && (
  <div style={{ margin: '5px 0' }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      marginBottom: '5px',
      padding: '5px',
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: '4px'
    }}>
      <IonIcon icon={micOutline} style={{ marginRight: '8px' }} />
      <audio
        controls
        preload="metadata"
        style={{
          width: '100%',
          height: '40px',
          borderRadius: '4px',
          backgroundColor: 'var(--ion-color-light)'
        }}
        src={note.voice_message_url}
      />
    </div>
  </div>
)}
              </div>
            </div>
          )})}
        </div>

        {/* Minimap */}
        <div
          ref={minimapRef}
          style={{
            position: 'fixed',
            top: '60px',
            left: '10px',
            width: '200px',
            height: '150px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid #404040',
            borderRadius: '4px',
            overflow: 'hidden',
            zIndex: 10
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              transform: `scale(${minimapScale})`,
              transformOrigin: '0 0'
            }}
          >
            {/* Minimap connections */}
            {connections.map((connection, index) => {
              const fromNote = notes.find(n => n.id === connection.from.id);
              const toNote = notes.find(n => n.id === connection.to.id);
              
              if (!fromNote || !toNote) return null;

              return (
                <svg
                  key={index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                  }}
                >
                  <line
                    x1={fromNote.x || 0}
                    y1={fromNote.y || 0}
                    x2={toNote.x || 0}
                    y2={toNote.y || 0}
                    stroke="white"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                </svg>
              );
            })}
            {/* Minimap notes */}
            {notes.map((note) => (
              <div
                key={note.id}
                style={{
                  position: 'absolute',
                  left: note.x || 0,
                  top: note.y || 0,
                  width: '30px',
                  height: '20px',
                  backgroundColor: '#4a9eff',
                  borderRadius: '2px',
                  opacity: 0.7
                }}
              />
            ))}
            {/* Viewport indicator */}
            <div
              style={{
                position: 'absolute',
                left: -canvasOffset.x,
                top: -canvasOffset.y,
                width: `${100 / zoom}%`,
                height: `${100 / zoom}%`,
                border: '1px solid white',
                opacity: 0.5,
                pointerEvents: 'none'
              }}
            />
          </div>
        </div>

        <IonFab vertical="bottom" horizontal="end" slot="fixed" style={{ zIndex: 4 }}>
          <IonFabButton onClick={() => modal.current?.present()}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
               </IonFab>

        <IonModal ref={modal} onDidDismiss={handleModalDismiss}>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => modal.current?.dismiss()}>Close</IonButton>
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

        {/* Image Preview Modal */}
        <IonModal isOpen={showImageModal} onDidDismiss={() => setShowImageModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Image Preview</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowImageModal(false)}>
                  <IonIcon icon={closeCircleOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            '--background': '#1a1a1a',
            '--color': 'white'
          }}>
            <img 
              src={imageModalUrl} 
              alt="Preview" 
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain'
              }}
            />
          </IonContent>
        </IonModal>

        {/* Edit Note Modal */}
        <IonModal 
          ref={editModal} 
          isOpen={editingNote !== null} 
          onDidDismiss={() => {
            setEditingNote(null);
            setModalTab('notes');
            handleModalDismiss();
          }}
          presentingElement={presentingElement!}
        >
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => editModal.current!.dismiss()}>Close</IonButton>
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
                                <IonInput value={title} onIonChange={e => setTitle(e.detail.value!)} />
                              </IonItem>
                              <IonItem>
                                                               <IonLabel position="stacked">Text</IonLabel>
                                <IonTextarea value={text} onIonChange={e => setText(e.detail.value!)} />
                              </IonItem>
                              {text?.includes('[') && text?.includes(']') && (
                                <IonItem>
                                  <IonButton
  color="warning"
  onClick={() => editingNote && handleUncheckAll(editingNote)}
  expand="block"
  style={{ marginTop: '10px' }}
>
  <IonIcon slot="start" icon={checkmarkDoneCircleOutline} />
  Uncheck All Boxes
</IonButton>
                                </IonItem>
                              )}
                              {editingNote?.image_url && (
                                <IonItem lines="none" style={{ marginTop: '10px', marginBottom: '10px', textAlign: 'center' }}>
                                  <div style={{ position: 'relative', width: '100%' }}>
                                    <img 
                                      src={editingNote.image_url} 
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
                                          setImageModalUrl(editingNote.image_url || '');
                                          setShowImageModal(true);
                                        }, 100);
                                      }}
                                    />
                                    <div style={{ position: 'absolute', top: '5px', right: '5px', display: 'flex', gap: '5px' }}>
                                      <IonButton 
                                        size="small" 
                                        fill="solid" 
                                        color="primary"
                                        href={editingNote.image_url}
                                        download={editingNote.image_url?.split('/').pop() || 'image'}
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
                              {Array.isArray(editingNote?.file_link) && editingNote?.file_link.length > 0 && (
                                <>
                                  <IonListHeader>
                                    <IonLabel color="medium">Current File Attachments</IonLabel>
                                  </IonListHeader>
                                  {editingNote.file_link.map((fileUrl, index) => (
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
                                          if (editingNote && Array.isArray(editingNote.file_link)) {
                                            const updatedFiles = [...editingNote.file_link];
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
                              )}
                              {/* Voice Messages */}
                              {editingNote && isNoteWithMedia(editingNote) && (
                                <>
                                  <IonListHeader>
                                    <IonLabel color="medium">Voice Messages</IonLabel>
                                  </IonListHeader>
                                  
                                  {/* Record Voice Message Button */}
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    marginBottom: '5px',
                                    padding: '5px',
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    borderRadius: '4px'
                                  }}>
                                    <IonIcon icon={micOutline} style={{ marginRight: '8px' }} />
                                    <button
                                      style={{
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#4a9eff',
                                        cursor: 'pointer',
                                        padding: '0',
                                        margin: '0'
                                      }}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                          const mediaRecorder = new MediaRecorder(stream);
                                          setIsRecording(true);
                                          audioChunks.current = [];
                                          
                                          mediaRecorder.ondataavailable = (event) => {
                                            if (event.data.size > 0) {
                                              audioChunks.current.push(event.data);
                                            }
                                          };
                                          
                                          mediaRecorder.onstop = async () => {
                                            const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                                            const file = new File([audioBlob], 'voice_message.webm', { type: 'audio/webm' });
                                            
                                            try {
                                              const response = await uploadVoiceMessage(editingNote.id, file, user?.sub || '');
                                              if (response.success && response.voiceMessageUrl) {
                                                const updatedNote = { ...editingNote };
                                                updatedNote.voice_recordings = [...(updatedNote.voice_recordings || []), response.voiceMessageUrl];
                                                await updateNote(editingNote.id, updatedNote, user?.sub || '');
                                                setNotes(prevNotes => 
                                                  prevNotes.map(n => n.id === editingNote.id ? updatedNote : n)
                                                );
                                                setEditingNote(updatedNote);
                                                showToast({
                                                  message: 'Voice message saved successfully',
                                                  duration: 2000,
                                                  color: 'success',
                                                });
                                              }
                                            } catch (error) {
                                              console.error('Error uploading voice message:', error);
                                              showToast({
                                                message: 'Failed to upload voice message',
                                                duration: 2000,
                                                color: 'danger'
                                              });
                                            } finally {
                                              setIsRecording(false);
                                              audioChunks.current = [];
                                            }
                                          };
                                          
                                          mediaRecorder.start();
                                          setTimeout(() => {
                                            mediaRecorder.stop();
                                            stream.getTracks().forEach(track => track.stop());
                                          }, 5000); // Automatically stop after 5 seconds, or implement your own stop logic
                                        } catch (error) {
                                          console.error('Error starting recording:', error);
                                          showToast({
                                            message: 'Failed to start recording',
                                            duration: 2000,
                                            color: 'danger'
                                          });
                                        }
                                      }}
                                    >
                                      {isRecording ? 'Recording...' : 'Record Voice Message'}
                                    </button>
                                  </div>

                                  {editingNote.voice_message_url && (
  <div>
    <IonListHeader>
      <IonLabel color="medium">Voice Message</IonLabel>
    </IonListHeader>
    <IonItem lines="none" className="ion-margin-bottom">
      <IonIcon icon={micOutline} slot="start" />
      <audio
        controls
        preload="metadata"
        style={{
          width: '100%',
          height: '40px',
          borderRadius: '4px',
          backgroundColor: 'var(--ion-color-light)'
        }}
        src={editingNote.voice_message_url}
      />
      <IonButton
        fill="clear"
        color="danger"
        onClick={() => {
          const updatedNote = { ...editingNote, voice_message_url: undefined };
          updateNote(editingNote.id, updatedNote, user?.sub || '').then(() => {
            setNotes(prevNotes =>
              prevNotes.map(n => n.id === editingNote.id ? updatedNote : n)
            );
            setEditingNote(updatedNote);
          });
        }}
        style={{ marginLeft: '10px' }}
      >
        <IonIcon slot="icon-only" icon={trashOutline} />
      </IonButton>
    </IonItem>
  </div>
)}
                                </>
                              )}
                              <IonButton expand="block" onClick={onUpdateNote}>Update Note</IonButton>
                              <IonButton expand="block" color="danger" onClick={() => onDeleteNote(editingNote!.id)}>Delete Note</IonButton>
                            </>
                          )}
                          {modalTab === 'attachments' && editingNote && (
                            <div className="ion-padding">
                              {/* File Attachments */}
                              {Array.isArray(editingNote.file_link) && editingNote?.file_link.length > 0 && (
                                <>
                                  <IonListHeader>
                                    <IonLabel color="medium">Current File Attachments</IonLabel>
                                  </IonListHeader>
                                  {editingNote.file_link.map((fileUrl, index) => (
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
                                          if (editingNote && Array.isArray(editingNote.file_link)) {
                                            const updatedFiles = [...editingNote.file_link];
                                            updatedFiles.splice(index, 1);
                                            if (updatedFiles.length === 0) {
                                              handleClearAttachmentField('file_link');
                                            } else {
                                              const updatedNote = { ...editingNote, file_link: updatedFiles };
                                              updateNote(editingNote.id, updatedNote, user?.sub || '').then(() => {
                                                setNotes(prevNotes => prevNotes.map(n => n.id === editingNote.id ? updatedNote : n));
                                                setEditingNote(updatedNote);
                                              });
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
                              )}

                              {/* File Upload */}
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

                              {/* Voice Recording Controls */}
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

                              {/* New Voice Recording Preview and Save Button */}
                              {recordedAudio && (
                                <div className="ion-margin-top">
                                  <IonLabel color="medium">New Voice Recording</IonLabel>
                                  <div style={{ marginTop: '8px' }}>
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
                                        src={recordedAudio}
                                      />
                                    </div>
                                  </div>
                                  <IonButton 
                                    expand="block" 
                                    color="success"
                                    fill="solid"
                                    className="ion-margin-top"
                                    onClick={async () => {
                                      if (!editingNote || !recordedAudio) return;
                                      const response = await fetch(recordedAudio);
                                      const audioBlob = await response.blob();
                                      const file = new File([audioBlob], 'voice_message.webm', { type: 'audio/webm' });
                                      try {
                                        const uploadResult = await uploadVoiceMessage(editingNote.id, file, user?.sub || '');
                                        if (uploadResult.success && (uploadResult.voiceMessageUrl || (uploadResult.files && uploadResult.files[0]?.fileUrl))) {
                                          const voiceUrl = uploadResult.voiceMessageUrl || (uploadResult.files && uploadResult.files[0]?.fileUrl);
                                          const updatedNote = { ...editingNote, voice_message_url: voiceUrl };
                                                                                await updateNote(editingNote.id, updatedNote, user?.sub || '');
                                          setNotes(prevNotes => prevNotes.map(n => n.id === editingNote.id ? updatedNote : n));
                                          setEditingNote(updatedNote);
                                          setRecordedAudio(null);
                                          showToast({
                                            message: 'Voice message saved successfully',
                                            duration: 2000,
                                            color: 'success'
                                          });
                                        } else {
                                          throw new Error('Failed to upload voice message');
                                        }
                                      } catch (error) {
                                        showToast({
                                          message: error instanceof Error ? error.message : 'Failed to upload voice message',
                                          duration: 2000,
                                          color: 'danger'
                                        });
                                      }
                                    }}
                                  >
                                    <IonIcon slot="start" icon={micOutline} />
                                    Save Voice Recording
                                  </IonButton>
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

                              {editingNote.voice_message_url && (
  <div>
    <IonListHeader>
      <IonLabel color="medium">Voice Message</IonLabel>
    </IonListHeader>
    <IonItem lines="none" className="ion-margin-bottom">
      <IonIcon icon={micOutline} slot="start" />
      <audio
        controls
        preload="metadata"
        style={{
          width: '100%',
          height: '40px',
          borderRadius: '4px',
          backgroundColor: 'var(--ion-color-light)'
        }}
        src={editingNote.voice_message_url}
      />
      <IonButton
        fill="clear"
        color="danger"
        onClick={() => {
          const updatedNote = { ...editingNote, voice_message_url: undefined };
          updateNote(editingNote.id, updatedNote, user?.sub || '').then(() => {
            setNotes(prevNotes =>
              prevNotes.map(n => n.id === editingNote.id ? updatedNote : n)
            );
            setEditingNote(updatedNote);
          });
        }}
        style={{ marginLeft: '10px' }}
      >
        <IonIcon slot="icon-only" icon={trashOutline} />
      </IonButton>
    </IonItem>
  </div>
)}
                            </div>
                          )}
                          {modalTab === 'settings' && editingNote && (
                            <div style={{ marginTop: "16px" }}>
                              <IonItem>
                                <IonLabel>Color</IonLabel>
                                <IonSelect
                                  value={noteColor}
                                  placeholder="Select note color"
                                  onIonChange={async e => {
                                    setNoteColor(e.detail.value);
                                    await onUpdateNote();
                                  }}
                                >
                                  <IonSelectOption value="standard">Standard</IonSelectOption>
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
                                  onIonChange={async e => {
                                    setIsCrossedOut(e.detail.checked);
                                    if (editingNote && user?.sub) {
                                      const updatedNote = { ...editingNote, crossed_out: e.detail.checked };
                                      await updateNote(editingNote.id, updatedNote, user.sub);
                                      setNotes(prevNotes => prevNotes.map(n => n.id === editingNote.id ? updatedNote : n));
                                      setEditingNote(updatedNote);
                                      showToast({
                                        message: e.detail.checked ? 'Note crossed out' : 'Note uncrossed',
                                        duration: 1200,
                                        color: 'success'
                                      });
                                    }
                                  }}
                                />
                              </IonItem>

                              <IonItem>
  <IonLabel>Turn Note Into Folder</IonLabel>
  <IonSelect
    value={dropdownValue}
    placeholder="Select folder type"
    onIonChange={(e) => {
      const selectedValue = e.detail.value;
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
      editModal.current?.dismiss();
    }}
  >
    <IonSelectOption value="option1">Turn Note into Normal Folder</IonSelectOption>
    <IonSelectOption value="option2">Turn Note into Organizer Folder</IonSelectOption>
    <IonSelectOption value="option3">Turn Note into Mindmap Folder</IonSelectOption>
    <IonSelectOption value="option4">Turn Note into Calc Folder</IonSelectOption>
  </IonSelect>
</IonItem>
                            </div>
                          )}
                        </IonContent>
                      </IonModal>
                    </IonContent>
                    
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
              
              {/* Folder Modal */}
        <FolderModal
  ref={folderModal}
  folder={selectedFolder}
  isOpen={selectedFolder !== null}
  onDismiss={() => {
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
  folderModalTab={folderModalTab}
  setFolderModalTab={setFolderModalTab}
  folderName={folderName}
  setFolderName={setFolderName}
  folderDescription={folderDescription}
  setFolderDescription={setFolderDescription}
  folderColor={folderColor}
  setFolderColor={setFolderColor}
  isCrossedOut={isCrossedOut}
  setIsCrossedOut={setIsCrossedOut}
  isChecklistEnabled={isChecklistEnabled}
  setIsChecklistEnabled={setIsChecklistEnabled}
  folderPassword={folderPassword}
  setFolderPassword={setFolderPassword}
  oldFolderPassword={oldFolderPassword}
  setOldFolderPassword={setOldFolderPassword}
  onUpdateFolder={onUpdateFolder}
  onAddFolder={onAddFolder}
  onDeleteFolder={onDeleteFolder}
  isLoadingCoWorkers={isLoadingCoWorkers}
  coWorkerDetails={coWorkerDetails}
  availableCoWorkers={availableCoWorkers}
  selectedCoWorkers={selectedCoWorkers}
  toggleCoWorkerSelection={toggleCoWorkerSelection}
  saveCoWorkersToFolder={saveCoWorkersToFolder}
/>
        
        
            </IonPage>
                );
              };

// This effect must be inside the MindmapFolder component to access notes and folders state.
// Move this useEffect inside the MindmapFolder component, after all state declarations.

// Extend the Window interface to include 'notes' and 'allFolders'
declare global {
  interface Window {
    notes?: any[];
    allFolders?: any[];
    refreshSharedFoldersSidebar?: () => void;
  }
}

function getNextY(): number {
  // Example: Find the max y of existing folders/notes and add an offset
  // If you want to base it on notes, use notes state; for folders, use folders state.
  // Here, we'll use notes as an example:
  if (Array.isArray(window.allFolders) && window.allFolders.length > 0) {
    // If you want to base it on folders
    const maxY = window.allFolders.reduce((max: number, folder: any) => {
      return typeof folder.y === 'number' ? Math.max(max, folder.y) : max;
    }, 0);
    return maxY + 100;
  }
  if (Array.isArray(window.notes) && window.notes.length > 0) {
    // If you want to base it on notes
    const maxY = window.notes.reduce((max: number, note: any) => {
      return typeof note.y === 'number' ? Math.max(max, note.y) : max;
    }, 0);
    return maxY + 100;
  }
  // Fallback: just return 0
  return 0;
}

// This function must be inside the MindmapFolder component, after all state declarations, to access setNotes and setFolders.
// Move this function definition inside the MindmapFolder component, after all useState declarations.
