// services/NoteService.ts
import { addNote, deleteNote, deleteFolder, getFolders, getNotes, addFolder, Note, updateNote, Folder, updateFolder, uploadFiles, uploadNoteImage } from './apiService';

export const handleAddNote = async (
  title: string,
  text: string,
  user: any,
  folderId: string ,
  nextY: number,
  showToast: (opts: { message: string; duration: number; color: string }) => void,
  setNotes: React.Dispatch<React.SetStateAction<any[]>>,
  setTitle: (val: string) => void,
  setText: (val: string) => void,
  dismissModal: () => void
) => {
  if (!title.trim()) {
    showToast({
      message: 'Please provide a title for the note.',
      duration: 2000,
      color: 'danger',
    });
    return;
  }

  if (!user || !user.sub) {
    showToast({ message: 'You must be logged in to add a note.', duration: 2000, color: 'danger' });
    return;
  }

  try {
    const newNote = {
      title,
      text,
      folder_id: folderId,
      y: nextY,
      x: 0,
      crossed_out: false,
      color: 'null',
      image_url: undefined,
      voice_message_url: undefined,
      file_link: undefined,
      calc_number: undefined
    } as unknown as Omit<Note, 'id' | 'user_id'>;

    const addedNote = await addNote(newNote, user.sub, folderId !== null ? String(folderId) : "0");
    setNotes((prev) => [...prev, addedNote]);
    setTitle('');
    setText('');
    dismissModal();

  } catch (err) {
    console.error('Error adding note:', err);
    showToast({
      message: 'Failed to add note. Please try again.',
      duration: 2000,
      color: 'danger',
    });
  }
};


// When creating or updating notes/folders, use string IDs
const collectDescendantFolderIds = (allFolders: Folder[], rootId: string): string[] => {
  const ids: string[] = [rootId];
  const stack: string[] = [rootId];
  while (stack.length > 0) {
    const currentId = stack.pop()!;
    const children = allFolders.filter(f => f.folder_id === currentId);
    for (const child of children) {
      ids.push(child.id);
      stack.push(child.id);
    }
  }
  return ids;
};

// When deleting notes/folders, use string IDs
const deleteFolderAndContents = async (folderId: string, userId: string, setFolders: React.Dispatch<React.SetStateAction<Folder[]>>) => {
  try {
    const allFolders = await getFolders(userId);
    const allFolderIds = collectDescendantFolderIds(allFolders, folderId);
    const allNotes = await getNotes(userId);
    const notesToDelete = allNotes.filter(note => note.folder_id && allFolderIds.includes(note.folder_id));
    for (const note of notesToDelete) {
      await deleteNote(note.id, userId);
    }
    for (const id of allFolderIds) {
      await deleteFolder(id, userId);
      setFolders(prev => prev.filter(folder => folder.id !== id));
    }
    return true;
  } catch (error) {
    console.error(`Error deleting folder ${folderId} and its contents:`, error);
    throw error;
  }
};

export const handleDeleteFolder = async (
  id: string, // was number
  user: any,
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>,
  dismissModal?: () => void,
  showToast?: (opts: { message: string; duration: number; color: string }) => void
) => {
  try {
    if (user && user.sub) {
      // Use the recursive function to delete the folder and all its contents
      await deleteFolderAndContents(id, user.sub, setFolders);
      
      // Show success message if toast function is provided
      if (showToast) {
        showToast({
          message: 'Folder and its contents deleted successfully',
          duration: 2000,
          color: 'success'
        });
      }
      
      // Dismiss the modal if provided
      if (dismissModal) {
        dismissModal();
      }
    }
  } catch (error) {
    console.error('Error deleting folder:', error);
    
    // Show error message if toast function is provided
    if (showToast) {
      showToast({
        message: 'Failed to delete folder. Please try again.',
        duration: 2000,
        color: 'danger'
      });
    }
  }
};

export const handleFolderClick = (
  folderName: string,
  history: { push: (path: string) => void }
) => {
  history.push(`/app/folder/${encodeURIComponent(folderName)}`);
};

export const doRefresh = async (
  user: any,
  setNotes: React.Dispatch<React.SetStateAction<any[]>>,
  setFolders: React.Dispatch<React.SetStateAction<any[]>>,
  event: any
) => {
  if (user && user.sub) {
    try {
      const notes = await getNotes(user.sub);
      const folders = await getFolders(user.sub);
      const filteredNotes = notes.filter(note => !note.folder_id);
      setNotes(filteredNotes);
      setFolders(folders);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      event.detail.complete();
    }
  }
};

  
/**
 * Adds a new folder, assigning the correct parent folder ID.
 * @param folderName - Name of the new folder
 * @param folderDescription - Description of the new folder
 * @param user - User object (must have .sub)
 * @param parentFolderId - The ID of the parent folder (for subfolders)
 * @param folderType - Type of the folder
 * @param x - X position (optional, for UI)
 * @param y - Y position (used for sorting/display)
 * @param showToast - Toast callback for notifications
 * @param setFolders - State setter for folders
 * @param setFolderName - State setter for folder name input
 * @param setFolderDescription - State setter for folder description input
 * @param dismissModal - Callback to close the modal
 * @param password_hash - Optional password hash for the folder
 */
export const handleAddFolder = async (
  folderName: string,
  folderDescription: string,
  user: any,
  parentFolderId: string | null,
  folderType: number,
  x: number,
  y: number,
  showToast: (opts: { message: string; duration: number; color: string }) => void,
  setFolders: React.Dispatch<React.SetStateAction<any[]>>,
  setFolderName: (s: string) => void,
  setFolderDescription: (s: string) => void,
  dismissModal: () => void,
  password_hash?: string | null
) => {
    if (!folderName.trim()) {
      showToast({
        message: 'Please provide a name for the folder.',
        duration: 2000,
        color: 'danger',
      });
      return;
    }
  
    try {
      if (user && user.sub) {
        console.log('Creating folder with parent ID:', parentFolderId, 'Type:', typeof parentFolderId);
        
        // Create the new folder object with all properties
        const newFolder = { 
          name: folderName,
          description: folderDescription, 
          folder_type: folderType, 
          x, 
          y,
          crossed_out: false,
          color: 'null',
          // Don't include folder_id in the initial object, let addFolder handle it
          checklist: false,
          password_hash: password_hash ?? undefined
        };
        
        // Convert parentFolderId to string if it's not null/undefined
        const parentFolderIdStr = parentFolderId ? String(parentFolderId) : '0';
        console.log('Calling addFolder with parentFolderId:', parentFolderIdStr, 'Type:', typeof parentFolderIdStr);
        
        // Pass the folder object and parent folder ID separately
        const addedFolder = await addFolder(newFolder, user.sub, parentFolderIdStr);
        
        // Log the response to verify folder_id was set correctly
        console.log('Added folder response:', {
          id: addedFolder.id,
          name: addedFolder.name,
          folder_id: addedFolder.folder_id,
          parentFolderId: parentFolderIdStr
        });
        
        console.log('Successfully created folder:', {
          id: addedFolder.id,
          name: addedFolder.name,
          folder_id: addedFolder.folder_id,
          parentFolderId: parentFolderIdStr
        });
        
        // Update the local state with the new folder
        setFolders(prev => [...prev, addedFolder]);
        setFolderName('');
        setFolderDescription('');
        dismissModal();
        
        return addedFolder;
      }
    } catch (error) {
      console.error('Error adding folder:', error);
      
      let errorMessage = 'Failed to add folder. Please try again.';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: { message?: string } } };
        console.error('Error response data:', err.response?.data);
        errorMessage = err.response?.data?.message || errorMessage;
      }
      
      showToast({
        message: errorMessage,
        duration: 3000,
        color: 'danger',
      });
      
      // Re-throw the error so it can be caught by the caller if needed
      throw error;
    }
  };
  
  export const handleUpdateNote = async (
    noteToUpdate: Note | null, // Renamed from selectedNote for clarity within this function
    user: any,
    setNotes: React.Dispatch<React.SetStateAction<Note[]>>,
    // title and text parameters are removed as they are part of noteToUpdate
    setSelectedNote: (note: Note | null) => void,
    dismissModal: () => void,
    isSettingsChange: boolean = false // This might still be useful for specific UI logic
  ) => {
    if (noteToUpdate === null) return;
  
    try {
      if (user && user.sub) {
        // The noteToUpdate object already contains all fields correctly set by the calling component.
        // No need to reconstruct it here by mixing selectedNote with separate title/text.
        const payload = {
          ...noteToUpdate,
          user_id: user.sub, // Ensure user_id is set for the backend
        };
        console.log('Sending note update with calc_number:', payload.calc_number);
        const savedNoteFromAPI = await updateNote(noteToUpdate.id, payload, user.sub);
        console.log('Received updated note from API:', savedNoteFromAPI);
        console.log('API response calc_number:', savedNoteFromAPI.calc_number);
        setNotes(prevNotes => prevNotes.map(n => (n.id === noteToUpdate.id ? savedNoteFromAPI : n)));
        if (!isSettingsChange) {
          setSelectedNote(savedNoteFromAPI); // Update selectedNote state with the version from API
          dismissModal();
        } else {
          // If it IS a settings change (e.g. color update from modal's settings tab),
          // we still want to update the selectedNote state so the UI reflects the change immediately.
          setSelectedNote(savedNoteFromAPI);
        }
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };
  
  export const handleDeleteNote = async (
    id: string,
    user: any,
    setNotes: React.Dispatch<React.SetStateAction<Note[]>>,
    setSelectedNote: (note: Note | null) => void,
    dismissModal: () => void
  ) => {
    try {
      if (user && user.sub) {
        await deleteNote(id, user.sub);
        setNotes(prev => prev.filter(note => String(note.id) !== id));
        setSelectedNote(null);
        dismissModal();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };
  
  export const handleEditNote = (
    note: Note,
    setTitle: (s: string) => void,
    setText: (s: string) => void,
    setSelectedNote: (note: Note) => void
  ) => {
    setTitle(note.title);
    setText(note.text);
    setSelectedNote(note);
  };
  
  export const handleEditFolder = (
    folder: Omit<Folder, 'id' | 'user_id'>,
    setFolderName: (s: string) => void,
    setSelectedFolder: (f: Folder) => void,
    presentModal: () => void
  ) => {
    setFolderName(folder.name);
    setSelectedFolder({
      ...folder,
      id: "-1", // Provide a default or temporary id as string
      user_id: '', // Provide a default or temporary user_id
    });
    presentModal();
  };
  
  export const handleUpdateFolder = async (
selectedFolder: Folder | null, user: any, folderName: string, folderDescription: string, folderType: number, setFolders: React.Dispatch<React.SetStateAction<Folder[]>>, setSelectedFolder: (f: Folder | null) => void, dismissModal: () => void  ) => {
    if (selectedFolder === null) return;
  
    try {
      if (user && user.sub) {
        // Create a copy of the selected folder to update
        const updatedFolder = { 
          ...selectedFolder,
          name: folderName,
          // Preserve the original folder_type - this is critical
          // Only use the passed folderType parameter if we're explicitly changing folder types
          // For name-only updates, keep the original type
          folder_type: selectedFolder.folder_type,
          crossed_out: selectedFolder.crossed_out,
          color: selectedFolder.color,
          x: selectedFolder.x,
          checklist: selectedFolder.checklist
        };
        
        console.log('Updating folder with type:', updatedFolder.folder_type);
        
        const folder = await updateFolder(selectedFolder.id, updatedFolder, user.sub);
        setFolders(prev =>
          prev.map(f => (f.id === selectedFolder.id ? folder : f))
        );
        setSelectedFolder(null);
        dismissModal();
      }
    } catch (error) {
      console.error('Error updating folder:', error);
    }
  };

export const handleUploadFilesToServer = async (
  files: FileList, 
  selectedNote: Note | null, 
  user: any, 
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>, 
  showToast: (opts: { message: string; duration: number; color: string; position?: 'top' | 'bottom' }) => void, 
  setUploadedFiles: React.Dispatch<React.SetStateAction<{ id: string; file: File; previewUrl: string; type: 'image' | 'file' | 'audio' }[]>>, 
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  if (!selectedNote || !selectedNote.id || !files.length || !user || !user.sub) {
    showToast({
      message: 'Cannot upload: Note not selected or user not authenticated.',
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    setIsUploading(false);
    return;
  }

  setIsUploading(true);
  let allUploadsSuccessful = true;
  let successfulUploadsCount = 0;
  const totalFiles = files.length;

  for (const file of Array.from(files)) {
    try {
      if (file.type.startsWith('image/')) {
        // Handle image upload
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });

        const imageResult = await uploadNoteImage(selectedNote.id, base64String, user.sub);
        if (imageResult && imageResult.success && imageResult.imageUrl) {
          setNotes(prevNotes =>
            prevNotes.map(n =>
              n.id === selectedNote.id ? { ...n, image_url: imageResult.imageUrl } : n // Assign to note's image_url (snake_case)
            )
          );
          successfulUploadsCount++;
        } else {
          allUploadsSuccessful = false;
          console.error('Image upload failed or did not return expected imageUrl:', imageResult);
        }
      } else {
        // Handle other file types
        const formData = new FormData();
        formData.append('files', file); // Backend expects 'files' collection

        const fileResult = await uploadFiles(selectedNote.id, formData, user.sub);
        if (fileResult && fileResult.success && fileResult.files && fileResult.files.length > 0) {
          const uploadedFileData = fileResult.files[0]; // Get the first uploaded file
          setNotes(prevNotes =>
            prevNotes.map(n => {
              // If file_link is already an array, append to it
              if (Array.isArray(n.file_link)) {
                return {
                  ...n,
                  file_link: [...n.file_link, uploadedFileData.fileUrl]
                };
              }
              // If file_link is a single string, convert to array with both old and new links
              else if (n.file_link && typeof n.file_link === 'string') {
                return {
                  ...n,
                  file_link: [n.file_link, uploadedFileData.fileUrl]
                };
              }
              // If no existing file_link, create a new array with just this link
              else {
                return {
                  ...n,
                  file_link: [uploadedFileData.fileUrl]
                };
              }
            })
          );
          successfulUploadsCount++;
        } else {
          allUploadsSuccessful = false;
          console.error('File upload failed or did not return expected data:', fileResult);
        }
      }
    } catch (error) {
      allUploadsSuccessful = false;
      console.error(`Error uploading file ${file.name}:`, error);
      showToast({
        message: `Upload failed for ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 5000,
        color: 'danger',
        position: 'bottom'
      });
      // Optionally, break loop on first error or continue processing other files
    }
  }

  setIsUploading(false);
  setUploadedFiles([]); // Clear the selection regardless of outcome for this batch

  if (successfulUploadsCount > 0 && allUploadsSuccessful) {
    showToast({
      message: `${successfulUploadsCount} file(s) uploaded successfully!`,
      duration: 3000,
      color: 'success',
      position: 'bottom'
    });
  } else if (successfulUploadsCount > 0 && !allUploadsSuccessful) {
    showToast({
      message: `${successfulUploadsCount}/${totalFiles} files uploaded. Some uploads failed.`,
      duration: 5000,
      color: 'warning',
      position: 'bottom'
    });
  } else if (!allUploadsSuccessful && totalFiles > 0) {
    showToast({
      message: 'All file uploads failed.',
      duration: 5000,
      color: 'danger',
      position: 'bottom'
    });
  }
  // No general getNotes() refetch; relying on precise local state updates.
};

export { getFolders, getNotes };
