import axios from 'axios';

export const apiUrl = 'https://api.wolf0fdev.me/notes/api/v1/';

export interface Note {
  id: string; // was number
  title: string;
  text: string;
  user_id?: string;  // Add user_id to Note interface
  folder_id?: string; // was number
  pinboard_id?: number;
  x?: number | null; // Optional, if you want to include x coordinate in the note, can be null for shared notes
  y?: number | null; // Optional, if you want to include y coordinate in the note, can be null for shared notes
  crossed_out: boolean;
  color: string;
  image_url?: string; // URL to an image associated with the note
  voice_message_url?: string; // URL to a voice recording associated with the note
  file_link?: string | string[]; // Link(s) to attached file(s)
  calc_number?: number; // Float value for calculations
  calc_method?: string; // Calculation method for the note
  note_type?: 'standard' | 'checklist' | 'calculation' | 'pinboard'; // Note type for rendering and transformation
  co_workers?: string[]; // Array of co-worker user IDs
  connected_to?: string[];
}

export interface FolderPasswordUpdate {
  password_hash: string;
}

export interface Folder {
  id: string; // was number
  name: string;
  user_id: string;
  folder_id?: string; // was number
  pinboard_id?: number;
  parent_id?: number; // Parent folder ID for folder hierarchy
  folder_type: number;
  x?: number | null; // Allow null for shared folders in sidebar
  y?: number | null; // Allow null for shared folders in sidebar
  width?: number;
  height?: number;
  crossed_out: boolean;
  color: string;
  checklist: boolean;
  password_hash?: string;
  password?: string; // Optional, for frontend password logic
  calc_number?: number; // Float value for calculations
  calc_method?: string; // Calculation method for the folder
  calc_metadata?: string; // JSON string for additional calculation metadata (percentage, goal values, etc.)
  description?: string; // Optional folder description
  co_workers?: string[]; // Array of co-worker user IDs
  connected_to?: string[];
}


export const getNotes = async (userId: string, folderId?: string): Promise<Note[]> => {
  try {
    let url = `${apiUrl}`;
    // If folderId is provided, add it as a query parameter
    if (folderId !== undefined) {
      url += `?folderId=${folderId}`;
    }
    
    const response = await axios.get<Note[]>(url, {
      headers: { 'userId': userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching notes:', error);
    throw error;
  }
};

export const addNote = async (note: Omit<Note, 'id' | 'user_id'>, userId: string, folderId: string | null = null): Promise<Note> => {
  try {
    console.log('Adding note with folderId:', folderId, 'Type:', typeof folderId);
    
    // Create the request payload
    const requestBody: any = {
      ...note,
      user_id: userId
    };
    
    // Only include folder_id if it's a valid UUID and not '0' or empty
    if (folderId && folderId !== '0' && folderId !== 'null' && folderId !== 'undefined') {
      console.log('Setting folder_id in note request:', folderId);
      requestBody.folder_id = folderId;
    } else {
      console.log('No valid folder ID provided, setting to null');
      requestBody.folder_id = null; // Explicitly set to null for root folder
    }
    
    console.log('Sending note create request:', JSON.stringify(requestBody, null, 2));
    
    const response = await axios.post<Note>(`${apiUrl}`, requestBody, {
      headers: { 
        'userId': userId,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Note created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error adding note:', error);
    if (typeof error === 'object' && error !== null && 'response' in error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
    }
    throw error;
  }
};

export const addFolderNote = async (note: Omit<Note, 'id' | 'user_id'>, folderId: string, userId: string): Promise<Note> => {
  try {
    const response = await axios.post<Note>(`${apiUrl}`, { ...note,  folder_id: folderId ,user_id: userId }, {
      headers: { 'userId': userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error adding note:', error);
    throw error;
  }
};


export const updateNote = async (id: string, note: Omit<Note, 'id' | 'user_id'>, userId: string): Promise<Note> => {
  try {
    const payloadForApi = { ...note } as any;
    if (!Array.isArray(payloadForApi.connected_to)) {
      payloadForApi.connected_to = [];
    }
    if (note.hasOwnProperty('voice_message_url') && note.voice_message_url === undefined) {
      payloadForApi.voice_message_url = null;
    }
    if (note.hasOwnProperty('file_link') && note.file_link === undefined) {
      payloadForApi.file_link = null;
    }
    if (note.hasOwnProperty('calc_number') && note.calc_number === undefined) {
      payloadForApi.calc_number = null;
    }

    console.log('Original note object for update:', note);
    console.log('Payload being sent to API (with undefined transformed to null):', payloadForApi);
    
    const response = await axios.put<Note>(`${apiUrl}${id}`, payloadForApi, {
      headers: { 'userId': userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating note:', error);
    throw error;
  }
};

export const deleteNote = async (id: string, userId: string): Promise<void> => {
  try {
    await axios.delete(`${apiUrl}${id}`, {
      headers: { 'userId': userId }
    });
  } catch (error) {
    console.error(`Error deleting note with id ${id}:`, error);
    throw error;
  }
};

export const getFolders = async (userId: string): Promise<Folder[]> => {
  const response = await axios.get<Folder[]>(`${apiUrl}folders`, {
      headers: {
          'userId': userId
      }
  });
  return response.data;
};

export const addFolder = async (
  folder: Omit<Folder, 'id' | 'user_id'>,
  userId: string,
  parentFolderIdInput: string
): Promise<Folder> => {
  try {
    const { folder_id, ...folderBaseProperties } = folder;
    const requestPayload: any = {
      ...folderBaseProperties,
      user_id: userId,
      // Always include folder_id, even if null
      folder_id: null // Default to null
    };
    
    console.log('Parent folder ID input:', parentFolderIdInput, typeof parentFolderIdInput);
    
    // Only set folder_id if it's a valid UUID and not '0' or empty
    if (parentFolderIdInput && parentFolderIdInput !== '0' && 
        parentFolderIdInput !== 'null' && parentFolderIdInput !== 'undefined') {
      try {
        // Convert to UUID format if it's not already
        const folderId = parentFolderIdInput.includes('-') ? 
          parentFolderIdInput : 
          `${parentFolderIdInput.substring(0,8)}-${parentFolderIdInput.substring(8,12)}-${parentFolderIdInput.substring(12,16)}-${parentFolderIdInput.substring(16,20)}-${parentFolderIdInput.substring(20)}`;
        
        requestPayload.folder_id = folderId;
        console.log('Setting folder_id in request (formatted):', folderId);
      } catch (e) {
        console.error('Error formatting folder_id:', e);
        requestPayload.folder_id = null;
      }
    }
    
    console.log('Sending folder create request:', JSON.stringify(requestPayload, null, 2));
    
    const response = await axios.post<Folder>(`${apiUrl}folders`, requestPayload, {
      headers: { 
        'userId': userId,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Folder created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error adding folder:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    throw error;
  }
};

export const updateFolder = async (id: string, folder: Omit<Folder, 'id' | 'user_id'>, userId: string): Promise<Folder> => {
  try {
    const response = await axios.put<Folder>(`${apiUrl}folders/${id}`, folder, {
      headers: { 'userId': userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating folder:', error);
    throw error;
  }
};

// Dedicated API call for updating folder password hash
export const updateFolderPassword = async (
  id: string,
  password_hash: string,
  userId: string,
  old_password_hash?: string
): Promise<void> => {
  try {
    const body: any = { Password_Hash: password_hash };
    if (old_password_hash) body.Old_Password_Hash = old_password_hash;
    await axios.post(`${apiUrl}folders/${id}/password`, body, {
      headers: { 'userId': userId }
    });
  } catch (error) {
    console.error('Error updating folder password:', error);
    throw error;
  }
};

export const deleteFolder = async (id: string, userId: string): Promise<void> => {
  try {
    await axios.delete(`${apiUrl}folders/${id}`, {
      headers: { 'userId': userId }
    });
  } catch (error) {
    console.error(`Error deleting folder with id ${id}:`, error);
    throw error;
  }
};

// Image upload functionality for notes
// Expects a base64 data URL for the image
export const uploadNoteImage = async (noteId: string, imageBase64: string, userId: string): Promise<{ message: string; imageUrl: string; success: boolean; }> => {
  try {
    // Payload for the backend, matching the C# UploadImageRequest model property
    const payload = { ImageBase64: imageBase64 };

    // Make the API call to upload the image data
    const response = await axios.post<{ message: string; imageUrl: string; success: boolean; }>(`${apiUrl}${noteId}/image`, payload, {
      headers: {
        'userId': userId,
        'Content-Type': 'application/json' // Content type is JSON
      }
    });
    // Backend returns { message: string, imageUrl: string, success: boolean }
    return response.data;
  } catch (error) {
    console.error(`Error uploading image data for note ${noteId}:`, error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        
        let errorMessage = 'Failed to upload files';
        if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (error.response.status === 404) {
          errorMessage = 'The requested resource was not found.';
        } else if (error.response.status === 413) {
          errorMessage = 'File size is too large. Maximum allowed size is 50MB.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
        
        throw new Error(errorMessage);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        throw new Error('No response from server. Please check your internet connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', error.message);
        throw new Error(`Request setup error: ${error.message}`);
      }
    }
    
    // If the error is not an AxiosError
    throw new Error(error instanceof Error ? error.message : 'An unknown error occurred');
  }
};

// Voice message upload functionality for notes - supports both old and new response formats
export const uploadVoiceMessage = async (noteId: string, file: File, userId: string): Promise<{ 
  success: boolean; 
  message: string; 
  files?: Array<{ fileName: string; fileSize: number; fileType: string; fileUrl: string; uploadedAt: string }>;
  voiceMessageUrl?: string; // For backward compatibility
}> => {
  try {
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', file);

    // Log the voice message upload request details
    console.log('Sending voice message upload request to:', `${apiUrl}${noteId}/voice`);
    console.log('Request headers:', {
      'userId': userId,
      'Content-Type': 'multipart/form-data'
    });
    
    // Make the API call to upload the voice message
    const response = await axios.post(`${apiUrl}${noteId}/voice`, formData, {
      headers: {
        'userId': userId,
        'Content-Type': 'multipart/form-data'
      },
      // Add timeout and other axios options if needed
      timeout: 30000, // 30 seconds timeout
      maxBodyLength: 50 * 1024 * 1024, // 50MB max file size
      maxContentLength: 50 * 1024 * 1024 // 50MB max content length
    });

    console.log('Voice message upload response:', response);
    return response.data;
  } catch (error) {
    console.error(`Error uploading voice message for note ${noteId}:`, error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        
        let errorMessage = 'Failed to upload voice message';
        if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (error.response.status === 404) {
          errorMessage = 'The requested resource was not found.';
        } else if (error.response.status === 413) {
          errorMessage = 'File size is too large. Maximum allowed size is 50MB.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
        
        throw new Error(errorMessage);
      }
    }
    
    // If the error is not an AxiosError
    throw new Error(error instanceof Error ? error.message : 'An unknown error occurred');
  }
};

// File upload functionality for notes
export const updateUsername = async (userId: string, username: string): Promise<{ username: string }> => {
  try {
    const response = await axios.put(`${apiUrl}config/api/v1/${userId}/username`, JSON.stringify(username), {
      headers: {
        'Content-Type': 'application/json',
        'userId': userId
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating username:', error);
    throw error;
  }
};

export const updateImageUrl = async (userId: string, imageUrl: string): Promise<{ image_url: string }> => {
  try {
    const response = await axios.put(`${apiUrl}config/api/v1/${userId}/image-url`, JSON.stringify(imageUrl), {
      headers: {
        'Content-Type': 'application/json',
        'userId': userId
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating image URL:', error);
    throw error;
  }
};

// Update user's theme preference
export const updateUserTheme = async (userId: string, theme: string): Promise<{ theme: string }> => {
  try {
    console.log('[DEBUG] Sending theme update to backend:', { userId, theme });
    // Use the correct backend URL for theme update
    const response = await axios.put(`https://localhost:7281/config/api/v1/${userId}/theme`, JSON.stringify(theme), {
      headers: {
        'Content-Type': 'application/json',
        'userId': userId
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating user theme:', error);
    throw error;
  }
};

// Interface for user config data
export interface ConfigDT {
  userId: string;
  co_workers?: string[];
  image_url?: string;
  co_folders?: number[];
  username?: string;
  user_key?: string;
  theme?: string; // Added theme property to store user's theme preference
}

// Get shared folders (folders with null coordinates and/or co-workers)
export const getSharedFolders = async (userId: string): Promise<Folder[]> => {
  try {
    // First get all folders for the user
    const allFolders = await getFolders(userId);
    
    // Filter for folders that have null coordinates (shared folders) or have co-workers
    const sharedFolders = allFolders.filter(folder => 
      (folder.x === null && folder.y === null) || 
      (folder.co_workers && folder.co_workers.length > 0)
    );
    
    // The endpoint for shared folders may not exist in all versions of the backend
    // So we'll just use the folders we've already filtered
    
    // Sort the shared folders by name for better display
    return sharedFolders.sort((a, b) => {
      if (a.name && b.name) {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
  } catch (error) {
    console.error('Error fetching shared folders:', error);
    return [];
  }
};

// Get user's config data including co-workers
export const getUserConfig = async (userId: string): Promise<ConfigDT | null> => {
  try {
    // Use the shared apiUrl constant for consistency
    const baseUrl = apiUrl.replace('/notes/api/v1/', '');
    const response = await axios.get(`${baseUrl}/config/api/v1/${userId}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user config:', error);
    return null;
  }
};

// Get user's co-workers
export const getUserCoWorkers = async (userId: string): Promise<string[]> => {
  try {
    const config = await getUserConfig(userId);
    return config?.co_workers || [];
  } catch (error) {
    console.error('Error fetching co-workers:', error);
    return [];
  }
};

// Interface for co-worker details
export interface CoWorkerDetail {
  user_id: string;  // User ID (Auth0 ID) for the co-worker
  user_key: string; // User key (for backward compatibility)
  username: string; // Display name
  image_url: string; // Profile image URL
}

// Get co-worker details by looking up each co-worker's config
export const getCoWorkerDetails = async (userId: string): Promise<CoWorkerDetail[]> => {
  try {
    console.log('Getting co-worker details for user:', userId);
    
    // First get the user's config to get the co-worker keys
    const config = await getUserConfig(userId);
    console.log('User config:', config);
    
    if (!config || !config.co_workers || config.co_workers.length === 0) {
      console.log('No co-workers found in config');
      return [];
    }
    
    console.log('Co-worker keys from config:', config.co_workers);
    
    // Use the existing endpoint to get all users
    console.log('Fetching all users...');
    const allUsersResponse = await axios.get(`https://localhost:7281/config/api/v1/users`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const allUsers = allUsersResponse.data;
    console.log('All users response:', allUsers);
    
    const coWorkerDetails: CoWorkerDetail[] = [];
    
    // Match co-worker keys with user details
    for (const coWorkerKey of config.co_workers) {
      console.log('Processing co-worker key:', coWorkerKey);
      
      // Check if this is already a user ID (Auth0 ID contains |)
      if (coWorkerKey.includes('|')) {
        // This is already a user ID, find the user with this ID
        const userWithId = allUsers.find((user: any) => user.user_id === coWorkerKey);
        
        if (userWithId) {
          const detail = {
            user_id: coWorkerKey, // Already a user ID
            user_key: userWithId.user_key,
            username: userWithId.username || userWithId.email || userWithId.name || 'Unknown User',
            image_url: userWithId.image_url || ''
          };
          console.log('Adding co-worker detail from ID:', detail);
          coWorkerDetails.push(detail);
          continue;
        }
      }
      
      // Find the user with this key
      const coWorkerConfig = allUsers.find((user: any) => user.user_key === coWorkerKey);
      console.log('Found co-worker config:', coWorkerConfig);
      
      if (coWorkerConfig) {
        const detail = {
          user_id: coWorkerConfig.user_id, // Store the user ID instead of key
          user_key: coWorkerKey, // Keep key for backward compatibility
          username: coWorkerConfig.username || coWorkerConfig.email || coWorkerConfig.name || 'Unknown User',
          image_url: coWorkerConfig.image_url || ''
        };
        console.log('Adding co-worker detail:', detail);
        coWorkerDetails.push(detail);
      } else {
        // If we can't find the user, still include the key
        // If it looks like an Auth0 ID, use it as the user_id
        const detail = {
          user_id: coWorkerKey.includes('|') ? coWorkerKey : '', 
          user_key: coWorkerKey,
          username: 'Unknown User', // Never use user_id or key as username
          image_url: ''
        };
        console.log('Adding fallback co-worker detail:', detail);
        coWorkerDetails.push(detail);
      }
    }
    
    console.log('Final co-worker details:', coWorkerDetails);
    return coWorkerDetails;
  } catch (error) {
    console.error('Error fetching co-worker details:', error);
    return [];
  }
};

// Update folder co-workers
export const updateFolderCoWorkers = async (folderId: string, coWorkers: string[], userId: string): Promise<string[]> => {
  try {
    console.log('Updating folder co-workers with user IDs:', coWorkers);
    const response = await axios.put(`${apiUrl}folders/${folderId}/co-workers`, coWorkers, {
      headers: {
        'Content-Type': 'application/json',
        'userId': userId
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating folder co-workers:', error);
    throw error;
  }
};

export const uploadFiles = async (noteId: string, formData: FormData, userId: string): Promise<{ success: boolean; message: string; files: Array<{ fileName: string; fileSize: number; fileType: string; fileUrl: string; uploadedAt: string }> }> => {
  try {
    // Log the file upload request details
    console.log('Sending file upload request to:', `${apiUrl}${noteId}/files`);
    console.log('Request headers:', {
      'userId': userId,
      'Content-Type': 'multipart/form-data'
    });
    
    // Log files being uploaded from the FormData
    const filesArray: File[] = [];
    formData.getAll('files').forEach(item => {
      if (item instanceof File) {
        filesArray.push(item);
      }
    });
    
    console.log('Files being uploaded:', filesArray.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size
    })));

    // Make the API call to upload the files
    const response = await axios.post(`${apiUrl}${noteId}/files`, formData, {
      headers: {
        'userId': userId,
        'Content-Type': 'multipart/form-data'
      },
      // Add timeout and other axios options if needed
      timeout: 30000, // 30 seconds timeout
      maxBodyLength: 50 * 1024 * 1024, // 50MB max file size
      maxContentLength: 50 * 1024 * 1024 // 50MB max content length
    });

    console.log('File upload response:', response);
    return response.data;
  } catch (error) {
    console.error(`Error uploading files for note ${noteId}:`, error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        
        let errorMessage = 'Failed to upload files';
        if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (error.response.status === 404) {
          errorMessage = 'The requested resource was not found.';
        } else if (error.response.status === 413) {
          errorMessage = 'File size is too large. Maximum allowed size is 50MB.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
        
        throw new Error(errorMessage);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        throw new Error('No response from server. Please check your internet connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', error.message);
        throw new Error(`Request setup error: ${error.message}`);
      }
    }
    
    // If the error is not an AxiosError
    throw new Error(error instanceof Error ? error.message : 'An unknown error occurred');
  }
};