import React, { useEffect, useRef, useState } from "react";
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonSegment, IonSegmentButton, IonItem, IonLabel, IonInput,
  IonTextarea, IonSelect, IonSelectOption, IonToggle, IonSpinner, IonAvatar, IonList,
  IonIcon
} from "@ionic/react";
import { peopleOutline, checkmarkCircleOutline, refresh } from "ionicons/icons";
import { hashStringSHA256 } from "../pages/hash";
import { Folder, getFolders, getNotes, updateFolder, updateFolderCoWorkers, updateFolderPassword } from "../pages/apiService";
import { handleUpdateFolder } from "../pages/apiCalls";
import { useAuth0 } from '@auth0/auth0-react';

type User = { sub: string };

interface FolderModalProps {
  folder: any; // Folder | null
  isOpen: boolean;
  onDismiss: () => void;
  folderModalTab: 'folder' | 'settings' | 'co-workers';
  setFolderModalTab: (tab: 'folder' | 'settings' | 'co-workers') => void;
  folderName: string;
  setFolderName: (name: string) => void;
  folderDescription: string;
  setFolderDescription: (desc: string) => void;
  folderColor: string;
  setFolderColor: (color: string) => void;
  isCrossedOut: boolean;
  setIsCrossedOut: (val: boolean) => void;
  isChecklistEnabled: boolean;
  setIsChecklistEnabled: (val: boolean) => void;
  folderPassword: string;
  setFolderPassword: (val: string) => void;
  oldFolderPassword: string;
  setOldFolderPassword: (val: string) => void;
  onUpdateFolder: (updatedFolder: Folder) => void;
  onAddFolder: () => void;
  onDeleteFolder: (id: string) => void;
  isLoadingCoWorkers: boolean;
  coWorkerDetails: any[];
  availableCoWorkers: string[];
  selectedCoWorkers: string[];
  toggleCoWorkerSelection: (key: string) => void;
  saveCoWorkersToFolder: () => void;
  // ...add any other props you need
  ref?: React.Ref<HTMLIonModalElement>;
  user?: User; // <-- Add this line
}

const FolderModal = React.forwardRef<HTMLIonModalElement, FolderModalProps>((props, ref) => {
  const {
    folder, isOpen, onDismiss, folderModalTab, setFolderModalTab,
    folderName, setFolderName, folderDescription, setFolderDescription,
    folderColor, setFolderColor, isCrossedOut, setIsCrossedOut,
    isChecklistEnabled, setIsChecklistEnabled, folderPassword, setFolderPassword,
    oldFolderPassword, setOldFolderPassword, onAddFolder, onDeleteFolder,
    isLoadingCoWorkers, coWorkerDetails, availableCoWorkers, selectedCoWorkers,
    toggleCoWorkerSelection  } = props;
const [folderType, setFolderType] = useState<number>(1);
const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
const folderModal = useRef<HTMLIonModalElement>(null);
const [folders, setFolders] = useState<Folder[]>([]);
  const { user } = useAuth0();
  // Removed duplicate isCrossedOut state, using prop instead


  // These are placeholders to satisfy type checking; in real usage, these are passed as props.
  // The signatures now match React's Dispatch<SetStateAction<T>>.
  function setfolder(value: React.SetStateAction<Folder | null>) {
    throw new Error("Function not implemented.");
  }

  function setPasswordFolderId(id: any) {
    throw new Error("Function not implemented.");
  }



  async function refreshFolderData(currentFolderId: number) {
  if (!user?.sub) return;

  try {
    // Fetch latest folders and notes from backend
    const [allFolders, allNotes] = await Promise.all([
      getFolders(user.sub),
      getNotes(user.sub)
    ]);

    setFolders(allFolders);

    // If you want to update notes for the current folder only:
    // const folderNotes = allNotes.filter(note => note.folder_id === currentFolderId);
    // setNotes(folderNotes);

    // Optionally, update selectedFolder if it's open and was changed
    if (selectedFolder) {
      const updatedSelected = allFolders.find(f => f.id === selectedFolder.id);
      if (updatedSelected) {
        setSelectedFolder(updatedSelected);
        setFolderName(updatedSelected.name || '');
        setFolderDescription(updatedSelected.description || '');
        setFolderColor(updatedSelected.color || 'null');
        setFolderType(updatedSelected.folder_type || 1);
        setIsChecklistEnabled(!!updatedSelected.checklist);
        setIsCrossedOut(!!updatedSelected.crossed_out);
      }
    }
  } catch (error) {
    showToast({
      message: 'Failed to refresh folder data',
      duration: 2000,
      color: 'danger'
    });
  }
}

  function presentToast(arg0: { message: string; color: string; duration: number; }) {
    throw new Error("Function not implemented.");
  }

  // Removed duplicate onUpdateFolder declaration to avoid redeclaration error.
  // Use the onUpdateFolder function passed in via props instead.

  useEffect(() => {
    if (folder) {
      setIsCrossedOut(!!folder.crossed_out);
      setFolderName(folder.name || "");
      setFolderDescription(folder.description || "");
      setFolderColor(folder.color || "null");
      setIsChecklistEnabled(!!folder.checklist);
      // ...other state
    } else {
      setIsCrossedOut(false);
      setFolderName("");
      setFolderDescription("");
      setFolderColor("null");
      setIsChecklistEnabled(false);
      // ...reset other state
    }
  }, [folder]);

  function showToast(arg0: { message: string; duration: number; color: string; }) {
    throw new Error("Function not implemented.");
  }

  const getHashtagColor = (segment: { isHashtagged: boolean; isDoubleHashtag: boolean }, parentColor?: string) => {
    if (!segment.isHashtagged) return undefined;

    // Double hashtags (##text##)
    if (segment.isDoubleHashtag) {
      // If folder is tertiary, use primary; otherwise, use tertiary
      if (parentColor === 'tertiary') {
        return 'var(--ion-color-primary)';
      } else {
        return 'var(--ion-color-tertiary)';
      }
    }

    // Single hashtags (#text#)
    if (parentColor === 'success') {
      return 'var(--ion-color-danger)';
    }
    return 'var(--ion-color-success)';
  };

  const renderHashtagSegments = (segments: any[], totalHashtags: number, parentColor?: string, isStandardCard?: boolean) => (
    <span style={{ display: 'inline', position: 'relative' }}>
      {segments.map((segment, index) => (
        segment.isHashtagged ? (
          <span 
            key={index}
            style={{
              display: 'inline',
              position: 'relative',
              zIndex: 1,
              color: getHashtagColor(segment, parentColor),
              all: 'unset',
              WebkitTextFillColor: getHashtagColor(segment, parentColor)
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

  return (
    <IonModal
      ref={ref}
      isOpen={isOpen}
      onDidDismiss={onDismiss}
    >
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Close</IonButton>
          </IonButtons>
          <IonTitle>{folder ? "Edit Folder" : "Add Folder"}</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment
            value={folderModalTab}
            onIonChange={e => {
              const value = e.detail.value;
              if (value === "folder" || value === "settings" || value === "co-workers") {
                setFolderModalTab(value);
              }
            }}
          >
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
                            <IonButton
  expand="block"
  onClick={() => {
    if (folder) {
      const updatedFolder = {
        ...folder,
        name: folderName,
        description: folderDescription,
        color: folderColor,
        crossed_out: isCrossedOut,
        checklist: isChecklistEnabled,
        // ...other fields
      };
      props.onUpdateFolder(updatedFolder);
      if (ref && typeof ref !== 'function' && ref.current) ref.current.dismiss();
    } else {
      onAddFolder();
      if (ref && typeof ref !== 'function' && ref.current) ref.current.dismiss();
    }
  }}
>
  {folder ? 'Update Folder' : 'Add Folder'}
</IonButton>
                            {folder && (
                              <IonButton expand="block" color="danger" onClick={() => onDeleteFolder(folder.id)}>
                                Delete Folder
                              </IonButton>
                            )}
                          </>
                        )}
                        {folderModalTab === 'co-workers' && folder && (
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
  if (!folder) return;
  try {
    await updateFolderCoWorkers(
      folder.id,
      selectedCoWorkers,
      user?.sub || ''
    );
    let passwordCleared = false;
    let updatedFolder = { ...folder, co_workers: selectedCoWorkers };
    if (selectedCoWorkers.length > 0 && folder.password) {
      updatedFolder = { ...updatedFolder, password: '' };
      passwordCleared = true;
    }
    props.onUpdateFolder(updatedFolder);
    if (passwordCleared) {
      showToast({ message: 'Password cleared because co-workers were added.', duration: 2500, color: 'warning' });
    }
    if (folder?.id) {
      refreshFolderData(folder.id);
    }
    if (ref && typeof ref !== 'function' && ref.current) ref.current.dismiss();
    presentToast({
      message: 'Co-workers updated successfully',
      color: 'success',
      duration: 2000
    });
  } catch (error) {
    console.error('Error updating folder co-workers:', error);
  }
}} disabled={availableCoWorkers.length === 0}>
  Save Co-workers
</IonButton>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {folderModalTab === 'settings' && folder && (
              <>
                {/* Return to Parent Folder Button for Folders */}
                <IonButton
                  expand="block"
                  color="medium"
                  style={{ marginBottom: 12 }}
                  onClick={async () => {
                    try {
                      // Refresh folders to ensure we have the latest data
                      console.log('Attempting to return folder to parent folder');
                      console.log('Current folder folder_id:', folder.folder_id);
                      
                      let parentFolder: Folder | undefined;
                      if (user?.sub) {
                        // Get all folders, not just the filtered ones
                        const allFolders = await getFolders(user.sub);
                        // Store all folders for future reference
                        window.allFolders = allFolders;
                        console.log('All available folders:', allFolders.map((f: Folder) => ({ id: f.id, name: f.name })));
                        
                        // Find parent folder from the complete list
                        parentFolder = allFolders.find((f: Folder) => f.id === folder.folder_id);
                        console.log('Found parent folder:', parentFolder);
                      } else {
                        // Use the stored complete list if available
                        parentFolder = window.allFolders ? 
                          window.allFolders.find((f: Folder) => f.id === folder.folder_id) : 
                          folder.find((f: Folder) => f.id === folder.folder_id);
                        console.log('Using stored folders, parent folder:', parentFolder);
                      }
                      
                      if (!parentFolder) {
                        presentToast({
                          message: 'Parent folder not found',
                          duration: 2000,
                          color: 'warning',
                        });
                        return;
                      }
                      
                      const newFolderId = parentFolder.folder_id || 0;
                      console.log('New folder ID will be:', newFolderId);
                      
                      if (newFolderId === folder.id) {
                        presentToast({
                          message: 'Cannot move to prevent circular reference',
                          duration: 2000,
                          color: 'warning',
                        });
                        return;
                      }
                    
                      const updatedFolder = { ...folder, folder_id: newFolderId };
                      await updateFolder(folder.id, updatedFolder, user?.sub || '');
                      setFolders(prevFolders => prevFolders.filter((f: { id: any; }) => f.id !== folder.id));
                      setfolder(updatedFolder);
                      if (ref && typeof ref !== 'function' && ref.current) ref.current.dismiss();
                      presentToast({
                        message: newFolderId === 0 ? 'Folder moved to root' : 'Folder returned to parent folder',
                        duration: 2000,
                        color: 'success',
                      });
                    } catch (err) {
                      presentToast({
                        message: 'Failed to move folder',
                        duration: 2000,
                        color: 'danger',
                      });
                    }
                  }}
                >
                  Return to Parent Folder
                </IonButton>
              </>
            )}
            {folderModalTab === 'settings' && folder && (
                          <div style={{ marginTop: "16px" }}>
                            {folder?.password && (
                              <IonItem>
                                <IonLabel position="stacked">Old Password</IonLabel>
                                <IonInput
                                  type="password"
                                  value={oldFolderPassword}
                                  onIonChange={e => setOldFolderPassword(e.detail.value!)}
                                  placeholder="Enter current password"
                                  disabled={!!folder?.co_workers && folder.co_workers.length > 0}
                                />
                              </IonItem>
                            )}
                            {(!folder?.co_workers || folder.co_workers.length === 0) && (
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
                            {folder?.password && (
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
                                      await updateFolderPassword(folder.id, '', user.sub, old_password_hash);
                                      // Update folders state and folder to remove password instantly
                                      setfolder(prev => prev && prev.id === folder.id ? { ...prev, password: '' } : prev);
                                      showToast({ message: 'Password deleted!', duration: 2000, color: 'success' });
                                      setFolderPassword('');
                                      setOldFolderPassword('');
                                      setPasswordFolderId(folder.id);
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
                            {(!folder?.co_workers || folder.co_workers.length === 0) && (
                              <IonButton
                                expand="block"
                                color="primary"
                                onClick={async () => {
                                  // Prevent password change if folder has co_workers
                                  if (folder?.co_workers && folder.co_workers.length > 0) {
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
                                    if (folder.password) {
                                      if (!oldFolderPassword) {
                                        showToast({ message: 'Please enter the old password', duration: 2000, color: 'danger' });
                                        return;
                                      }
                                      old_password_hash = await hashStringSHA256(oldFolderPassword);
                                    }
                                    if (user && user.sub) {
                                      await updateFolderPassword(
                                        folder.id,
                                        password_hash,
                                        user.sub,
                                        old_password_hash
                                      );
                                      // Update folders state and folder to immediately reflect new password
                                      setfolder(prev => prev && prev.id === folder.id ? { ...prev, password: password_hash } : prev);
                                      showToast({ message: 'Password saved!', duration: 2000, color: 'success' });
                                      setFolderPassword('');
                                      setOldFolderPassword('');
                                      setPasswordFolderId(folder.id);
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
                                onIonChange={e => {
  setFolderColor(e.detail.value);
  if (folder) {
    const updatedFolder = {
      ...folder,
      color: e.detail.value,
      crossed_out: isCrossedOut,
      checklist: isChecklistEnabled,
      // ...other fields
    };
    props.onUpdateFolder(updatedFolder);
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
                                <IonSelectOption value="standard">Medium</IonSelectOption>
                                <IonSelectOption value="dark">Dark</IonSelectOption>
                              </IonSelect>
                            </IonItem>
                            <IonItem>
                              <IonLabel>Crossed Out</IonLabel>
                              <IonToggle
  checked={isCrossedOut}
  onIonChange={async (e) => {
    setIsCrossedOut(e.detail.checked);
    if (folder) {
      const updatedFolder = {
        ...folder,
        crossed_out: e.detail.checked, // <-- Use the new value!
        color: folderColor,
        checklist: isChecklistEnabled,
      };
      await props.onUpdateFolder(updatedFolder);
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
                                  if (folder) {
                                    const updatedFolder = {
                                      ...folder,
                                      checklist: e.detail.checked,
                                      color: folderColor,
                                      crossed_out: isCrossedOut
                                    };
                                    await props.onUpdateFolder(updatedFolder);
                                    await handleUpdateFolder(updatedFolder, user, folderName, folderDescription, folder.folder_type, setFolders, setfolder, () => {
                                      ref && typeof ref !== 'function' && ref.current && ref.current.dismiss();
                                      refreshFolderData(folder.id); 
                                      
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
  );
});

export default FolderModal;