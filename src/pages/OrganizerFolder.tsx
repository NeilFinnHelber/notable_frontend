import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
  useIonToast,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonTextarea,
  IonChip,
  IonAvatar,
  useIonAlert,
  IonDatetime,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonReorder,
  IonReorderGroup,
  IonListHeader,
  IonText
} from "@ionic/react";
import { folderOutline, addOutline, trashBinOutline, fileTrayFullOutline, createOutline, reorderThreeOutline, analyticsOutline, calculatorOutline, trashOutline, closeCircleOutline, codeDownloadOutline, documentAttachOutline, imageOutline, micOutline, closeOutline, arrowUpOutline } from "ionicons/icons";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useHistory } from "react-router-dom";
import { getNotes, getFolders, Note, addNote, updateNote, deleteNote, addFolder, updateFolder, deleteFolder, Folder } from "./apiService";
import { handleAddNote, handleAddFolder, doRefresh, handleDeleteFolder, handleDeleteNote, handleEditFolder, handleEditNote, handleFolderClick, handleUpdateFolder, handleUpdateNote } from "./apiCalls";
import { useAuth0 } from '@auth0/auth0-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { handleUploadFilesToServer } from './apiCalls';
import { uploadVoiceMessage } from './apiService';

const formatTextWithHashtags = (text: string, baseColor: string) => {
  if (!text) return text;
  
  // Process double hashtags first
  let processedText = text;
  const doubleHashtagRegex = /##(.*?)##/g;
  processedText = processedText.replace(doubleHashtagRegex, (match, content) => {
    return `<span style="color: #6b46c1">${content}</span>`; // Violet color for double hashtags
  });
  
  // Process single hashtags
  const singleHashtagRegex = /#([^#].*?)#/g;
  processedText = processedText.replace(singleHashtagRegex, (match, content) => {
    const color = baseColor === 'success' ? 'danger' : 'success';
    return `<span style="color: var(--ion-color-${color})">${content}</span>`;
  });
  
  return processedText;
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

// Helper function to render hashtag segments
const renderHashtagSegments = (segments: any[], totalHashtags: number, parentColor?: string) => {
  const getHashtagColor = (segment: { isHashtagged: boolean; isDoubleHashtag: boolean }) => {
    if (!segment.isHashtagged) return null;
    
    // Double hashtags (##text##) get violet
    if (segment.isDoubleHashtag) {
      return '#6b46c1'; // Violet color
    }
    
    // Single hashtags (#text#) get green or red
    if (parentColor === 'success') {
      return 'var(--ion-color-danger)'; // Red color
    }
    
    return 'var(--ion-color-success)'; // Green color
  };
  
  return (
    <span>
      {segments.map((segment, index) => (
        segment.isHashtagged ? (
          <span 
            key={index}
            style={{
              color: getHashtagColor(segment) || undefined
            }}
          >
            {segment.text}
          </span>
        ) : (
          <span key={index}>
            {segment.text}
          </span>
        )
      ))}
    </span>
  );
};

// Helper function to render text with hashtags as React elements
const renderTextWithHashtags = (text: string, parentColor?: string) => {
  if (!text) return null;
  
  // Process the text to identify hashtag segments
  const segments = processHashtags(text);
  const totalHashtags = segments.filter(s => s.isHashtagged).length;
  
  if (segments.length === 0) {
    return <span>{text}</span>;
  }
  
  return renderHashtagSegments(segments, totalHashtags, parentColor);
};

// Helper function to render text with checkboxes
const renderTextWithCheckboxes = (text: string, noteId: string, onCheckboxToggle: (noteId: string, updatedText: string) => void, parentColor?: string) => {
  if (!text) return null;
  
  // Regular expression to match checkbox patterns: [] or [x]
  const checkboxRegex = /\[(x| )\]([^\[]*?)(?=\[|$)/g;
  
  // If no checkboxes in text, return the plain text
  if (!text.includes('[') || !text.match(checkboxRegex)) {
    return <span>{renderTextWithHashtags(text, parentColor)}</span>;
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
    
    // No longer adding Unmark All button here - it will be in the edit modal
  }
  
  return <div className="note-text-with-checkboxes">{parts}</div>;
};

const SortableNote = ({ 
  note, 
  onEdit, 
  onDelete, 
  folder,
  user,
  setNotes,
  setSelectedNote
}: { 
  note: Note; 
  onEdit: () => void;
  onDelete: () => void;
  folder: Folder;
  user: any;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setSelectedNote: React.Dispatch<React.SetStateAction<Note | null>>;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: '100%',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {/* Checkbox for checklist (only show if folder has checklist enabled) */}
      {folder.checklist && (
        <div 
          style={{ 
            width: '36px', 
            height: '36px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer' 
          }}
          onClick={(e) => {
            e.stopPropagation();
            const updatedNote = {
              ...note,
              crossed_out: !note.crossed_out
            };
            
            // If the note is being crossed out and there's a [done] folder, move it there
            if (!note.crossed_out) {
              // Find if there's a [done] folder in the current folder's context
              Promise.all([
                getFolders(user.sub),
                getNotes(user.sub)
              ]).then(([allFolders, allNotes]) => {
                const doneFolder = allFolders.find(f => 
                  f.name === '[done]' && (f.folder_id === folder.folder_id || f.folder_id === folder.id)
                );
                
                if (doneFolder) {
                  // Get notes in the [done] folder to calculate position
                  const notesInDoneFolder = allNotes.filter(n => n.folder_id === doneFolder.id);
                  // Sort by y position to find the highest value
                  notesInDoneFolder.sort((a, b) => (b.y || 0) - (a.y || 0));
                  // Calculate new y position (highest + 1 or 1 if no notes)
                  const newY = notesInDoneFolder.length > 0 ? (notesInDoneFolder[0].y || 0) + 1 : 1;
                  
                  const noteWithDoneFolder = {
                    ...updatedNote,
                    folder_id: doneFolder.id,
                    y: newY // Position at the top of the [done] folder
                  };
                  handleUpdateNote(noteWithDoneFolder, user, setNotes, () => {}, () => {});
                } else {
                  // No [done] folder, just update the crossed_out status
                  handleUpdateNote(updatedNote, user, setNotes, () => {}, () => {});
                }
              }).catch(error => {
                console.error('Error finding [done] folder:', error);
                // Fallback to just updating the crossed_out status
                handleUpdateNote(updatedNote, user, setNotes, () => {}, () => {});
              });
            } else {
              // Note is being uncrossed, just update it normally
              handleUpdateNote(updatedNote, user, setNotes, () => {}, () => {});
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <input
              type="checkbox"
              checked={note.crossed_out}
              readOnly
              style={{ width: 20, height: 20, cursor: 'pointer' }}
            />
          </div>
        </div>
      )}
      {/* Note Card, only this area is clickable for edit */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
        <IonCard
          color={note.color && note.color !== 'null' ? note.color : undefined}
          style={{ width: '100%', margin: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'stretch' }}
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          <IonCardHeader>
            <IonCardTitle>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                textDecoration: note.crossed_out ? 'line-through' : 'none',
                color: note.crossed_out ? '#888' : 'inherit'
              }}>
                <span>
  {renderTextWithHashtags(note.title, note.color || 'null')}
</span>
                {note.calc_number !== null && note.calc_number !== undefined && (
                  <div style={{ 
                    backgroundColor: '#f0f0f0', 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    marginLeft: '8px',
                    fontWeight: 'bold',
                    color: '#333' // Dark color for the calculation number
                  }}>
                    {note.calc_number}
                  </div>
                )}
              </div>
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent style={{ color: note.crossed_out ? '#888' : 'inherit' }}>
            {renderTextWithCheckboxes(
              note.text, 
              String(note.id), 
              (noteId: string, updatedText: string) => {
                // Update the note with the new text that has the toggled checkbox
                const updatedNote = {
                  ...note,
                  text: updatedText
                };
                handleUpdateNote(updatedNote, user, setNotes, () => {}, () => {});
              }, 
              note.color
            )}
          </IonCardContent>

          {/* --- Add this block below --- */}
          {/* Display image attachments */}
          {(Array.isArray(note.image_url) ? note.image_url : note.image_url ? [note.image_url] : []).map((imgUrl, idx) => (
            <div key={idx} style={{ marginTop: '8px', textAlign: 'center' }}>
              <img
                src={imgUrl}
                alt="Attachment"
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
              />
            </div>
          ))}

          {/* Display voice message */}
          {note.voice_message_url && (
            <div style={{ marginTop: '8px', textAlign: 'center' }}>
              <audio controls style={{ width: '100%' }}>
                <source src={note.voice_message_url} />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Display file attachments */}
          {(Array.isArray(note.file_link) ? note.file_link : note.file_link ? [note.file_link] : []).map((fileUrl, idx) => (
            <div key={idx} style={{ marginTop: '8px', textAlign: 'center' }}>
              <a
                href={fileUrl}
                download={typeof fileUrl === 'string' ? fileUrl.split('/').pop() : 'Attachment'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <IonButton fill="outline" size="small">
                  <IonIcon icon={codeDownloadOutline} slot="start" />
                  Download {typeof fileUrl === 'string' ? fileUrl.split('/').pop() : 'Attachment'}
                </IonButton>
              </a>
            </div>
          ))}
        </IonCard>
      </div>
      {/* Delete functionality is now handled through swipe actions or within the note edit modal */}
    </div>
  );
};

const SortableFolder = ({ 
  folder, 
  onClick, 
  onEdit, 
  notes, 
  onEditNote, 
  onDeleteNote,
  noteModal,
  folderModal,
  setTitle,
  setText,
  setCurrentFolderId,
  cardModal,
  user,
  setFolders,
  setSelectedFolder,
  setNotes,
  setSelectedNote
}: { 
  folder: Folder; 
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  notes: Note[];
  onEditNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  noteModal: React.RefObject<HTMLIonModalElement>;
  folderModal: React.RefObject<HTMLIonModalElement>;
  setTitle: (title: string) => void;
  setText: (text: string) => void;
  setCurrentFolderId: (id: string) => void;
  cardModal: React.RefObject<HTMLIonModalElement>;
  user: any;
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  setSelectedFolder: React.Dispatch<React.SetStateAction<Folder | null>>;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setSelectedNote: React.Dispatch<React.SetStateAction<Note | null>>;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleAddNote = () => {
    setTitle("");
    setText("");
    setCurrentFolderId(folder.id.toString());
    cardModal.current!.present();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="folder-container"
    >
      <IonCard
        className="folder-card"
        color={folder.color && folder.color !== 'null' ? folder.color : undefined}
        style={{
          width: "100%",
          margin: 0,
          borderRadius: "4px",
          marginBottom: "8px",
          fontWeight: "bold",
          boxShadow: 'none',
          textDecoration: folder.crossed_out ? 'line-through' : 'none',
          background: folder.color && folder.color !== 'null' ? undefined : '#f4f4f4',
        }}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <IonCardHeader style={{ padding: 0 }}>
          <IonCardTitle style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px', minHeight: '50px' }}>
            <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {folder.checklist && (
                <div 
                  style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}
                  onClick={(e) => {
                    // Completely stop event propagation to prevent folder card click
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  <input
                    type="checkbox"
                    checked={folder.crossed_out}
                    onChange={(e) => {
                      // Completely stop event propagation to prevent folder card click
                      e.stopPropagation();
                      e.preventDefault();
                      
                      const checked = (e.target as HTMLInputElement).checked;
                      const updatedFolder = { ...folder, crossed_out: checked };
                      handleUpdateFolder(
                        updatedFolder,
                        user,
                        updatedFolder.name,
                        folder.description || '',
                        updatedFolder.folder_type,
                        setFolders,
                        setSelectedFolder,
                        () => {}
                      );
                    }}
                    onClick={(e) => {
                      // Completely stop event propagation to prevent folder card click
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      margin: '0px'
                    }}
                  />
                </div>
              )}
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
                style={{ fontSize: "1.5em", marginRight: "8px", color: folder.color && folder.color !== 'null' ? `var(--ion-color-${folder.color})` : undefined }}
              />
              <span
                className="folder-title"
                style={{
                  flex: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginRight: '8px',
                  textAlign: 'left',
                  color: folder.color && folder.color !== 'null' ? `var(--ion-color-${folder.color})` : undefined
                }}
              >
                {renderTextWithHashtags(folder.name, folder.color || 'null')}
              </span>
            </div>
            <IonButton
              fill="clear"
              style={{
                minWidth: '36px',
                marginLeft: '4px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(e);
                folderModal.current?.present();
              }}
            >
              <IonIcon icon={createOutline} />
            </IonButton>
          </IonCardTitle>
          {folder.description && folder.description.trim() !== '' && (
            <IonCardSubtitle 
              style={{ 
                padding: '0 12px 12px 12px', 
                margin: 0,
                textAlign: 'left',
                fontSize: '0.9em',
                color: folder.color && folder.color !== 'null' ? `var(--ion-color-${folder.color})` : 'var(--ion-color-medium)'
              }}
            >
              {folder.description}
            </IonCardSubtitle>
          )}
        </IonCardHeader>
      </IonCard>
      {/* Notes Container */}
      <div style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        marginBottom: "16px",
        minHeight: "100px"
      }}>
        <SortableContext
          items={notes.filter(note => note.folder_id === folder.id).map(note => note.id)}
          strategy={verticalListSortingStrategy}
        >
          {notes.filter(note => note.folder_id === folder.id).map((note) => (
            <SortableNote
              key={note.id}
              note={note}
              folder={folder}
              onEdit={() => {
                onEditNote(note);
                noteModal.current?.present();
              }}
              onDelete={() => onDeleteNote(note.id)}
              user={user}
              setNotes={setNotes}
              setSelectedNote={setSelectedNote}
            />
          ))}
        </SortableContext>
      </div>

      <IonButton
        style={{
          width: "100%",
          maxWidth: "280px",
          backgroundColor: "#e0e0e0",
          color: "black",
          fontWeight: "bold",
          marginTop: "8px",
          borderRadius: "12px"
        }}
        onClick={handleAddNote}
      >
        <IonIcon icon={addOutline} slot="start" />
        Add Note
      </IonButton>
    </div>
    
  );
};

const FolderPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name);
  const { user } = useAuth0();
  const history = useHistory();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [mainOrganizerId, setMainOrganizerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [activeSegment, setActiveSegment] = useState<'details' | 'settings'>('details');
  const [dropdownValue, setDropdownValue] = useState<string>('');
  const [modalTab, setModalTab] = useState<'notes' | 'settings' | 'attachments'>('notes');
  const [calcNumber, setCalcNumber] = useState<number | undefined>(undefined);
  const [isBetweenFolderDrag, setIsBetweenFolderDrag] = useState<boolean>(false);
  const [showToast] = useIonToast();
  
  const modal = useRef<HTMLIonModalElement>(null);
  const cardModal = useRef<HTMLIonModalElement>(null);
  const folderModal = useRef<HTMLIonModalElement>(null);
  const noteModal = useRef<HTMLIonModalElement>(null);
  const [presentingElement, setPresentingElement] = useState<HTMLElement | null>(null);
  const page = useRef(null);
  const folderType = dropdownValue === "option2" ? 2 : 1;
  const [noteColor, setNoteColor] = useState<string>('null');
  const [isCrossedOut, setIsCrossedOut] = useState<boolean>(false);
  const [folderModalTab, setFolderModalTab] = useState<'folder' | 'settings' | 'calculation'>('folder');
  const [folderColor, setFolderColor] = useState<string>('null');
  const [isChecklistEnabled, setIsChecklistEnabled] = useState<boolean>(false);
  const [calcMethod, setCalcMethod] = useState<string>('sum'); // Default calculation method

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    setPresentingElement(page.current);
  }, []);

  // Calculate the result based on note numbers and the selected calculation method
  const calculateResult = useCallback((notesToCalculate: Note[], method: string): number => {
    // Filter out notes without calc_number
    const numbersToCalculate = notesToCalculate
      .filter(note => note.calc_number !== null && note.calc_number !== undefined)
      .map(note => note.calc_number as number);
    
    if (numbersToCalculate.length === 0) return 0;
    
    switch (method) {
      case 'sum':
        return numbersToCalculate.reduce((sum, num) => sum + num, 0);
      case 'average':
        return numbersToCalculate.reduce((sum, num) => sum + num, 0) / numbersToCalculate.length;
      case 'min':
        return Math.min(...numbersToCalculate);
      case 'max':
        return Math.max(...numbersToCalculate);
      case 'product':
        return numbersToCalculate.reduce((product, num) => product * num, 1);
      default:
        return 0;
    }
  }, []);

  // Update folder calculation when notes change or calc method changes
  useEffect(() => {
    const updateFolderCalculation = async () => {
      if (!user?.sub) return;
      
      // Find all CalcFolders (type 4) and update their calculations
      const calcFolders = folders.filter(folder => folder.folder_type === 4);
      
      for (const folder of calcFolders) {
        // Get notes in this folder
        const folderNotes = notes.filter(note => note.folder_id === folder.id);
        
        // Get the calculation method from the folder or use the default
        const method = folder.calc_method || calcMethod;
        
        // Calculate the result
        const result = calculateResult(folderNotes, method);
        
        // If the result has changed, update the folder
        if (folder.calc_number !== result) {
          try {
            const updatedFolder = {
              ...folder,
              calc_number: result
            };
            
            // Update in the backend
            await updateFolder(folder.id, updatedFolder, user.sub);
            
            // Update local state
            setFolders(prevFolders => 
              prevFolders.map(f => 
                f.id === folder.id ? updatedFolder : f
              )
            );
            
            console.log(`Calculation updated for folder ${folder.name}: ${method} = ${result}`);
          } catch (error) {
            console.error('Error updating folder calculation:', error);
          }
        }
      }
    };
    
    updateFolderCalculation();
  }, [notes, calcMethod, folders, calculateResult, user?.sub]);

  const fetchData = async () => {
    if (user && user.sub) {
      try {
        const [foldersResponse, notesResponse] = await Promise.all([
          getFolders(user.sub),
          getNotes(user.sub)
        ]);

        // Find the current folder with folder_type 2 (organizer folder)
        const currentFolder = foldersResponse.find((folder) => {
          console.log('Checking folder:', folder.name, 'type:', folder.folder_type);
          return folder.name === decodedName && folder.folder_type === 2;
        });

        console.log('Found current folder:', currentFolder);

        if (currentFolder) {
          setCurrentFolderId(typeof currentFolder.id === 'string' ? currentFolder.id : String(currentFolder.id));
          setMainOrganizerId(typeof currentFolder.id === 'string' ? currentFolder.id : String(currentFolder.id)); // Set the main organizer ID

          // Get all subfolder IDs for the current folder
          const subfolderIds = foldersResponse
            .filter((folder) => folder.folder_id === currentFolder.id)
            .map((folder) => folder.id);

          console.log('Subfolder IDs:', subfolderIds);

          // Include the current folder in the list of IDs
          const allFolderIds = [currentFolder.id, ...subfolderIds];

          // Filter notes that belong to the current folder and its subfolders
          const filteredNotes = notesResponse.filter((note) =>
            allFolderIds.includes(note.folder_id || "00000000-0000-0000-0000-000000000000")
          );

          // Sort by y position
          filteredNotes.sort((a, b) => (a.y || 0) - (b.y || 0));

          // Get subfolders and sort by x position
          const subfolders = foldersResponse.filter((folder) => {
            console.log('Checking subfolder:', folder.name, 'parent_id:', folder.folder_id, 'current_folder_id:', currentFolder.id);
            return folder.folder_id === currentFolder.id;
          });
          
          console.log('Found subfolders:', subfolders);
          
          // Ensure all subfolders have x positions and sort them
          // Also ensure all subfolders have the same checklist state as the parent folder
          const sortedSubfolders = subfolders
            .map((folder, index) => ({
              ...folder,
              x: folder.x || index + 1,
              checklist: currentFolder.checklist // Inherit checklist state from parent folder
            }))
            .sort((a, b) => (a.x || 0) - (b.x || 0));

          console.log('Sorted subfolders:', sortedSubfolders);
          console.log('Setting folders:', sortedSubfolders);
          console.log('Setting notes:', filteredNotes);

          // Check if there's a [done] folder among the subfolders
          const doneFolder = sortedSubfolders.find(folder => folder.name === '[done]');
          
          // If [done] folder exists, move all crossed-out notes to it
          if (doneFolder) {
            // Find all crossed-out notes that are not already in the [done] folder
            const crossedOutNotes = filteredNotes.filter(note => 
              note.crossed_out && note.folder_id !== doneFolder.id
            );
            
            if (crossedOutNotes.length > 0) {
              // Get existing notes in the [done] folder to calculate position
              const notesInDoneFolder = filteredNotes.filter(note => note.folder_id === doneFolder.id);
              // Sort by y position to find the highest value
              notesInDoneFolder.sort((a, b) => (b.y || 0) - (a.y || 0));
              // Calculate starting y position (highest + 1 or 1 if no notes)
              let nextY = notesInDoneFolder.length > 0 ? (notesInDoneFolder[0].y || 0) + 1 : 1;
              
              // Update each crossed-out note to move it to the [done] folder
              const updatedNotes = [...filteredNotes];
              const promises = crossedOutNotes.map(note => {
                const updatedNote = {
                  ...note,
                  folder_id: doneFolder.id,
                  y: nextY++  // Increment y for each note
                };
                
                // Update in the database
                return updateNote(note.id, updatedNote, user.sub || '')
                  .then(savedNote => {
                    // Update the note in the local array
                    const index = updatedNotes.findIndex(n => n.id === note.id);
                    if (index !== -1) {
                      updatedNotes[index] = savedNote;
                    }
                    return savedNote;
                  });
              });
              
              // Wait for all updates to complete
              Promise.all(promises)
                .then(() => {
                  // Update the state with the new notes array
                  setNotes(updatedNotes);
                })
                .catch(error => {
                  console.error('Error moving crossed-out notes to [done] folder:', error);
                });
            } else {
              // No crossed-out notes to move
              setNotes(filteredNotes);
            }
          } else {
            // No [done] folder, just set the notes as is
            setNotes(filteredNotes);
          }
          
          setFolders(sortedSubfolders);
        } else {
          console.log('Folder not found');
          setCurrentFolderId(null);
          setMainOrganizerId(null);
          setNotes([]);
          setFolders([]);
          showToast({
            message: 'Organizer folder not found',
            duration: 2000,
            color: 'danger'
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        showToast({
          message: "Failed to fetch data",
          duration: 2000,
          color: "danger",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  useIonViewWillEnter(() => {
    fetchData();
  });

  const onAddNote = () => {
    if (!currentFolderId) {
      showToast({
        message: 'Cannot add note: Folder not found',
        duration: 2000,
        color: 'danger'
      });
      return;
    }

    handleAddNote(
      title,
      text,
      user,
      String(currentFolderId),
      1,
      showToast,
      setNotes,
      setTitle,
      setText,
      () => {
        setNoteColor('null');
        setIsCrossedOut(false);
        cardModal.current!.dismiss();
      }
    );
  };
  
  const onUpdateNote = () => {
    if (selectedNote) {
      const updatedNote = {
        ...selectedNote,
        title,
        text,
        color: noteColor,
        crossed_out: isCrossedOut,
        calc_number: calcNumber
      };
      handleUpdateNote(updatedNote, user, setNotes, setSelectedNote, () => {
        setNoteColor('null');
        setIsCrossedOut(false);
        setCalcNumber(undefined);
        noteModal.current!.dismiss();
      });
    }
  };
  
  const onDeleteNote = (id: string) => {
    handleDeleteNote(id, user, setNotes, setSelectedNote, () => noteModal.current!.dismiss());
  };
  
  const onEditNote = (note: Note) => {
    setTitle(note.title);
    setText(note.text);
    setNoteColor(note.color);
    setIsCrossedOut(note.crossed_out);
    setCalcNumber(note.calc_number ?? undefined);
    setSelectedNote(note);
    noteModal.current?.present();
  };
  
  const onEditFolder = (folder: Folder) => {
    setFolderName(folder.name);
    setFolderDescription(folder.description || ''); // Set folder description
    setFolderColor(folder.color);
    setIsCrossedOut(folder.crossed_out);
    setIsChecklistEnabled(folder.checklist);
    setCalcMethod(folder.calc_method || 'sum'); // Set calculation method from folder
    setSelectedFolder(folder);
    folderModal.current?.present();
  };
  
  const onUpdateFolder = () => {
    if (selectedFolder) {
      const updatedFolder = {
        ...selectedFolder,
        name: folderName,
        description: folderDescription, // Include folder description
        folder_type: folderType,
        color: folderColor,
        crossed_out: isCrossedOut,
        checklist: isChecklistEnabled,
        calc_method: calcMethod, // Save calculation method
        x: selectedFolder.x // Preserve the x position
      };
      handleUpdateFolder(updatedFolder, user, folderName, folderDescription, folderType, setFolders, setSelectedFolder, () => {
        // Update all notes in this folder to match the folder's crossed out state
        const updatedNotes = notes.map(note => {
          if (note.folder_id === selectedFolder.id) {
            return {
              ...note,
              crossed_out: isCrossedOut
            };
          }
          return note;
        });
        setNotes(updatedNotes);

        // If this is the main organizer folder, update all subfolders to match its checklist state
        if (selectedFolder.id === mainOrganizerId) {
          setFolders(prevFolders => {
            return prevFolders.map(folder => {
              if (folder.folder_id === mainOrganizerId) {
                return {
                  ...folder,
                  checklist: isChecklistEnabled
                };
              }
              return folder;
            });
          });
        }

        setFolderColor('null');
        setIsCrossedOut(false);
        setIsChecklistEnabled(false);
        folderModal.current!.dismiss();
      });
    }
  };
  
  const onDeleteFolder = (id: number) => {
    handleDeleteFolder(id.toString(), user, setFolders);
    folderModal.current?.dismiss();
  };
  
  const onFolderClick = (folder: Folder) => {
    // Ensure proper URL encoding of folder names with spaces
    const encodedName = encodeURIComponent(folder.name);
    if (folder.folder_type === 1) {
      history.push(`/app/folder/${encodedName}`);
    } else if (folder.folder_type === 2) {
      history.push(`/app/organizerfolder/${encodedName}`);
    } else if (folder.folder_type === 3) {
      history.push(`/app/mindmapfolder/${encodedName}`);
    } else {
      console.error("Unknown folder type:", folder.folder_type);
      showToast({
        message: "Unknown folder type!",
        duration: 2000,
        color: "danger",
      });
    }
  };
  
  const onAddFolder = () => {
    if (!mainOrganizerId) {
      showToast({
        message: 'Cannot add folder: Parent folder not found',
        duration: 2000,
        color: 'danger'
      });
      return;
    }

    // Calculate the next x position
    const nextX = folders.length > 0 
      ? Math.max(...folders.map(f => f.x || 0)) + 1 
      : 1;

    handleAddFolder(
      folderName,
      folderDescription,
      user,
      String(mainOrganizerId), // Use the main organizer ID for new folders as string
      1, // Set folder_type to 1 for normal folders
      nextX,
      1,
      showToast,
      setFolders,
      setFolderName,
      setFolderDescription,
      () => {
        setFolderName("");
        setFolderDescription("");
        setDropdownValue("option1");
        setFolderColor("null");
        setIsCrossedOut(false);
        setIsChecklistEnabled(false);
        folderModal.current!.dismiss();
      }
    );
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
  
    // Use the note's title as the folder name
    const folderName = selectedNote.title || "Untitled Folder";
    // Use the note's text as the folder description
    const folderDescription = selectedNote.text || "";
  
    // Determine the parent folder ID dynamically
    const parentFolderId = currentFolderId || 0;
  
    // Call the existing onAddFolder method to create a folder with the correct parent ID
    setFolderName(folderName); // Set the folder name
    setFolderDescription(folderDescription); // Set the folder description
    handleAddFolder(
      folderName,
      folderDescription,
      user,
      String(parentFolderId),
      folderType,
      1,
      1,
      showToast,
      setFolders,
      setFolderName,
      setFolderDescription,
      () => folderModal.current!.dismiss()
    );
  
    // Optionally, delete the note after turning it into a folder
    onDeleteNote(selectedNote.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFolders((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update x positions starting from 1
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          x: index + 1
        }));

        // Update positions in the database
        updatedItems.forEach(async (folder) => {
          if (user?.sub) {
            try {
              const folderToUpdate = {
                ...folder,
                name: folder.name,
                folder_type: folder.folder_type,
                crossed_out: folder.crossed_out,
                color: folder.color,
                x: folder.x,
                y: folder.y,
                folder_id: folder.folder_id
              };
              await updateFolder(folder.id, folderToUpdate, user.sub);
            } catch (error) {
              console.error('Error updating folder position:', error);
              showToast({
                message: 'Failed to save folder position',
                duration: 2000,
                color: 'danger'
              });
            }
          }
        });

        return updatedItems;
      });
    }
  };

  const handleNoteDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (isBetweenFolderDrag) {
      // Handle moving notes between folders
      const activeNote = notes.find(note => note.id === active.id);
      
      // Check if we're dragging to a folder or to a note
      const targetFolder = folders.find(folder => folder.id === over.id);
      const targetNote = notes.find(note => note.id === over.id);
      
      // If we're dragging to a note, use that note's folder_id
      const targetFolderId = targetFolder ? targetFolder.id : targetNote?.folder_id;

      if (activeNote && targetFolderId) {
        setNotes(prevNotes => {
          const updatedNotes = prevNotes.map(note => {
            if (note.id === activeNote.id) {
              // Calculate the new y position based on existing notes in the target folder
              const targetFolderNotes = prevNotes.filter(n => n.folder_id === targetFolderId);
              const newY = targetFolderNotes.length + 1;
              
              return {
                ...note,
                folder_id: targetFolderId,
                y: newY
              };
            }
            return note;
          });

          // Update the note in the database
          if (user?.sub) {
            const targetFolderNotes = prevNotes.filter(n => n.folder_id === targetFolderId);
            const newY = targetFolderNotes.length + 1;
            
            updateNote(activeNote.id, {
              ...activeNote,
              folder_id: targetFolderId,
              y: newY
            }, user.sub).catch(error => {
              console.error('Error updating note folder:', error);
              showToast({
                message: 'Failed to move note to new folder',
                duration: 2000,
                color: 'danger'
              });
            });
          }

          return updatedNotes;
        });
      }
    } else {
      // Handle rearranging notes within the same folder
      if (active.id !== over.id) {
        setNotes((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);

          const newItems = arrayMove(items, oldIndex, newIndex);
          
          // Update y positions
          const updatedItems = newItems.map((item, index) => ({
            ...item,
            y: index + 1
          }));

          // Update positions in the database
          updatedItems.forEach(async (note) => {
            if (user?.sub) {
              try {
                await updateNote(note.id, {
                  ...note,
                  y: note.y
                }, user.sub);
              } catch (error) {
                console.error('Error updating note position:', error);
              }
            }
          });

          return updatedItems;
        });
      }
    }
  };

  interface UploadedFile {
    id: string;
    file: File;
    previewUrl: string;
    type: 'image' | 'file' | 'audio';
  }

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // For file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      type: file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('audio/')
        ? 'audio'
        : 'file' as 'image' | 'file' | 'audio'
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

    // Use the helper function from apiCalls.tsx
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

  const startRecording = async () => {
    setIsRecording(true);
    audioChunks.current = []; // Reset audio chunks

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio(audioUrl);

        // Optionally, upload the audio file here
        // handleUploadAudio(audioBlob);

        // Stop all tracks to release the mic
        stream.getTracks().forEach(track => track.stop());
      });

      recorder.start();
    } catch (err) {
      setIsRecording(false);
      showToast({
        message: "Microphone access denied or unavailable.",
        duration: 2000,
        color: "danger"
      });
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);

    if (mediaRecorder.current) {
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        setRecordedAudio(URL.createObjectURL(audioBlob));
        saveVoiceMessageToNote(audioBlob); // <-- Upload and update note
      };
      mediaRecorder.current.stop();
    } else {
      console.error("MediaRecorder is not initialized");
    }
  };

  const saveVoiceMessageToNote = async (audioBlob: Blob) => {
    if (!selectedNote || !user?.sub) return;

    setIsUploading(true);

    try {
      // Convert Blob to File
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

      // Use your uploadVoiceMessage API (import if needed)
      const response = await uploadVoiceMessage(selectedNote.id, audioFile, user.sub);

      let voiceMessageUrl = '';
      if (response && response.success) {
        if (response.files && response.files.length > 0) {
          voiceMessageUrl = response.files[0].fileUrl;
        } else if (response.voiceMessageUrl) {
          voiceMessageUrl = response.voiceMessageUrl;
        }
      }

      if (voiceMessageUrl) {
        const updatedNote = {
          ...selectedNote,
          voice_message_url: voiceMessageUrl
        };
        setSelectedNote(updatedNote);
        setNotes(notes => notes.map(n => n.id === updatedNote.id ? updatedNote : n));
        showToast({
          message: 'Voice message saved successfully',
          color: 'success',
          duration: 2000
        });
      } else {
        showToast({
          message: 'Failed to save voice message: No URL returned',
          color: 'danger',
          duration: 3000
        });
      }
    } catch (error) {
      showToast({
        message: 'Failed to save voice message',
        color: 'danger',
        duration: 3000
      });
    } finally {
      setIsUploading(false);
    }
  };

  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);

  const handleClearAttachmentField = async (field: 'file_link' | 'image_url' | 'voice_message_url') => {
    if (!selectedNote) return;
    
    try {
      // If the field is file_link and it's an array, we need to handle it differently
      let updatedValue = null;
      
      // For file_link, we might need to handle arrays
      if (field === 'file_link' && Array.isArray(selectedNote.file_link) && selectedNote.file_link.length > 0) {
        updatedValue = null; // For now, we're clearing all files
        // In the future, we could implement selective removal by index
      }
      
      const updatedNote = {
        ...selectedNote,
        [field]: updatedValue
      };
      
      await handleUpdateNote(updatedNote, user, setNotes, setSelectedNote, () => {});
      
      showToast({
        message: `${field === 'file_link' ? 'File attachment' : field === 'image_url' ? 'Image' : 'Voice message'} removed`,
        duration: 2000,
        color: 'success'
      });
    } catch (error) {
      console.error(`Error clearing ${field}:`, error);
      showToast({
        message: `Failed to remove ${field === 'file_link' ? 'file attachment' : field === 'image_url' ? 'image' : 'voice message'}`,
        duration: 2000,
        color: 'danger'
      });
    }
  };

  const handleClearCalcNumber = () => {
    setCalcNumber(undefined);
    // If we're editing a note, update its calc_number field
    if (selectedNote) {
      const updatedNote = {
        ...selectedNote,
        calc_number: undefined
      };
      handleUpdateNote(updatedNote, user, setNotes, setSelectedNote, () => {});
    }
  };

  return (
    <IonPage ref={page}>
      <IonHeader>
        <IonToolbar color={'primary'}>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>{decodedName}</IonTitle>
        </IonToolbar>
        <IonToolbar color={'primary'}>
          <IonSearchbar />
          <IonItem lines="none">
            <IonLabel className="move-notes-label">Move Notes Between Folders</IonLabel>
            <IonToggle
              checked={isBetweenFolderDrag}
              onIonChange={e => setIsBetweenFolderDrag(e.detail.checked)}
            />
          </IonItem>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollX={true} scrollY={true} className="ion-padding">
        {loading ? (
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
                  <IonChip color="primary" slot="end"></IonChip>
                </IonItem>
              </IonCardContent>
            </IonCard>
          ))
        ) : (
          <DndContext 
            sensors={sensors}
            onDragEnd={(event) => {
              const isFolder = folders.some(f => f.id === event.active.id);
              if (isFolder) {
                handleDragEnd(event);
              } else {
                handleNoteDragEnd(event);
              }
            }}
          >
            <SortableContext
              items={folders.map(folder => folder.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "nowrap",
                  overflowX: "auto",
                  overflowY: "hidden",
                  gap: "16px",
                  padding: "16px",
                  touchAction: "none",
                  WebkitOverflowScrolling: "touch",
                  scrollSnapType: "x mandatory",
                  width: "100%",
                  minHeight: "100%",
                  position: "relative"
                }}
              >
                {folders.map((folder) => (
                  <SortableFolder
                    key={folder.id}
                    folder={folder}
                    notes={notes}
                    onClick={() => {
                      setTitle("");
                      setText("");
                      setCurrentFolderId(folder.id);
                      cardModal.current!.present();
                    }}
                    onEdit={(e) => {
                      e.stopPropagation();
                      setSelectedFolder(folder);
                      setFolderName(folder.name);
                      setFolderColor(folder.color || 'null');
                      setIsCrossedOut(folder.crossed_out);
                      setIsChecklistEnabled(folder.checklist);
                    }}
                    onEditNote={onEditNote}
                    onDeleteNote={onDeleteNote}
                    noteModal={noteModal}
                    folderModal={folderModal}
                    setTitle={setTitle}
                    setText={setText}
                    setCurrentFolderId={setCurrentFolderId}
                    cardModal={cardModal}
                    user={user}
                    setFolders={setFolders}
                    setSelectedFolder={setSelectedFolder}
                    setNotes={setNotes}
                    setSelectedNote={setSelectedNote}
                  />
                ))}

                {/* Add Folder Button */}
                <div
                  style={{
                    flex: "0 0 20%",
                    minWidth: "20%",
                    height: "150px",
                    backgroundColor: "#BEBEBE",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                  onClick={() => {
                    setSelectedFolder(null);
                    setFolderName("");
                    setDropdownValue("option1");
                    setFolderColor("null");
                    setIsCrossedOut(false);
                    setIsChecklistEnabled(false);
                    folderModal.current?.present();
                  }}
                >
                  <IonIcon icon={addOutline} style={{ fontSize: "3em", color: "black" }} />
                  <div style={{ color: "black", fontWeight: "bold", marginLeft: "8px" }}>
                    Add Folder
                  </div>
                </div>
              </div>
            </SortableContext>
          </DndContext>
        )}
      </IonContent>

      {/* Add Note Modal */}
      <IonModal ref={cardModal} trigger="open-modal" presentingElement={presentingElement!}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Add Note</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => cardModal.current?.dismiss()}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Title</IonLabel>
            <IonInput value={title} onIonChange={e => setTitle(e.detail.value!)} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Text</IonLabel>
            <IonTextarea value={text} onIonChange={e => setText(e.detail.value!)} />
          </IonItem>
          <IonButton expand="block" onClick={onAddNote} className="ion-margin-top">
            Add Note
          </IonButton>
        </IonContent>
      </IonModal>

      {/* Edit Note Modal */}
      <IonModal 
        ref={noteModal} 
        isOpen={selectedNote !== null} 
        onDidDismiss={async () => {
          // If we have a selected note with a calc_number, update the parent folder's calc_number
          if (selectedNote && calcNumber !== undefined) {
            const parentFolder = folders.find(f => f.id === selectedNote.folder_id);
            if (parentFolder && parentFolder.folder_type === 4) {
              // The recalculation will happen automatically via the useEffect
              console.log('Note with calculation updated, folder will recalculate');
            }
          }
          
          // Reset state
          setSelectedNote(null);
          setTitle('');
          setText('');
          setNoteColor('null');
          setIsCrossedOut(false);
          setCalcNumber(undefined);
        }}
        presentingElement={presentingElement!}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Edit Note</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => noteModal.current?.dismiss()}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
          <IonToolbar>
            <IonSegment value={modalTab} onIonChange={(e) => setModalTab(e.detail.value as 'notes' | 'settings' | 'attachments')}>
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
                <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                  <IonTextarea 
                    value={text} 
                    onIonChange={e => setText(e.detail.value!)} 
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
                        showToast({
                          message: 'All checkboxes unchecked',
                          duration: 2000,
                          color: 'success'
                        });
                      }
                    }}
                    disabled={!text?.includes('[x]')}
                  >
                    Unmark All
                  </IonButton>
                </div>
              </IonItem>
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
                        e.stopPropagation();
                        noteModal.current?.dismiss();
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
              <IonItem>
                <IonLabel position="stacked">Calculation Number</IonLabel>
                <IonInput
                  type="number"
                  step="0.01"
                  value={(calcNumber !== undefined) ? calcNumber.toString() : ''}
                  onIonChange={(e) => {
                    const value = e.detail.value;
                    if (value !== undefined && value !== '') {
                      setCalcNumber(parseFloat(value ?? ""));
                    } else {
                      setCalcNumber(undefined);
                    }
                  }}
                  placeholder="Enter numerical value (decimals allowed)"
                />
              </IonItem>
              <IonButton expand="block" onClick={onUpdateNote} className="ion-margin-top">
                Update Note
              </IonButton>
              {selectedNote && (
                <IonButton expand="block" color="danger" onClick={() => onDeleteNote(selectedNote.id)} className="ion-margin-top">
                  Delete Note
                </IonButton>
              )}
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
                          if (selectedNote && Array.isArray(selectedNote.file_link)) {
                            const updatedFiles = [...selectedNote.file_link];
                            updatedFiles.splice(index, 1);
                            
                            // If no files left, clear the field completely
                            if (updatedFiles.length === 0) {
                              handleClearAttachmentField('file_link');
                            } else {
                              // Update the note with the remaining files
                              const updatedNote = {
                                ...selectedNote,
                                file_link: updatedFiles
                              };
                              
                              handleUpdateNote(updatedNote, user, setNotes, setSelectedNote, () => {});
                              
                              showToast({
                                message: 'File removed',
                                duration: 2000,
                                color: 'success'
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
                  value={calcNumber}
                  onIonChange={(e) => setCalcNumber(e.detail.value ? parseFloat(e.detail.value) : undefined)}
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
                <IonButton fill="outline" onClick={() => {
                  // Set the accept attribute to images only before clicking
                  const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                  if (fileInput) {
                    fileInput.accept = 'image/*';
                    fileInput.click();
                    // Reset accept attribute after clicking
                    setTimeout(() => {
                      if (fileInput) fileInput.accept = '*';
                    }, 300);
                  }
                }}>
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
                          if (audioElement) {
                            audioElement.src = recordedAudio;
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
                  <div className="ion-margin-top" style={{ display: 'flex', gap: '8px' }}>
                    <IonButton 
                      expand="block" 
                      color="primary"
                      onClick={() => {
                        if (recordedAudio && selectedNote) {
                          // Convert the audio URL to a Blob
                          fetch(recordedAudio)
                            .then(res => res.blob())
                            .then(blob => {
                              saveVoiceMessageToNote(blob);
                              setRecordedAudio(null);
                            })
                            .catch(error => {
                              console.error('Error saving voice message:', error);
                              showToast({
                                message: 'Failed to save voice message',
                                color: 'danger',
                                duration: 3000
                              });
                            });
                        }
                      }}
                      disabled={isUploading}
                    >
                      {isUploading ? 'Saving...' : 'Save Voice Message'}
                    </IonButton>
                    <IonButton 
                      expand="block" 
                      color="danger" 
                      fill="outline"
                      onClick={() => setRecordedAudio(null)}
                    >
                      Delete New Recording
                    </IonButton>
                  </div>
                </div>
              )}
              {selectedNote?.voice_message_url && !recordedAudio && modalTab === 'attachments' && (
                <div className="ion-margin-top">
                  <IonListHeader>
                    <IonLabel color="medium">Voice Message</IonLabel>
                  </IonListHeader>
                  <IonItem lines="none" className="ion-margin-bottom">
                    <div style={{ width: '100%' }}>
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
            <>
              <IonItem>
                <IonLabel>Color</IonLabel>
                <IonSelect value={noteColor} onIonChange={(e) => {
                  setNoteColor(e.detail.value);
                  if (selectedNote) {
                    const updatedNote = {
                      ...selectedNote,
                      color: e.detail.value === 'white' ? null : e.detail.value,
                      crossed_out: isCrossedOut
                    };
                    handleUpdateNote(updatedNote, user, setNotes, setSelectedNote, () => {
                      noteModal.current!.dismiss();
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
                <IonToggle checked={isCrossedOut} onIonChange={(e) => {
                  setIsCrossedOut(e.detail.checked);
                  if (selectedNote) {
                    const updatedNote = {
                      ...selectedNote,
                      crossed_out: e.detail.checked,
                      color: noteColor
                   
                    };
                    handleUpdateNote(updatedNote, user, setNotes, setSelectedNote, () => {
                      noteModal.current!.dismiss();
                    });
                  }
                }} />
              </IonItem>
              
              {/* Return to Parent Folder button */}
              {selectedNote && currentFolderId && (
                <div className="ion-padding-top">
                  <IonButton 
                    expand="block" 
                    color="medium"
                    onClick={() => {
                      if (selectedNote && user?.sub) {
                        // Find the folder the note is currently in
                        const currentFolder = folders.find(f => f.id === selectedNote.folder_id);
                        // Find the parent of the current folder (grandparent for the note)
                        const grandparentFolder = currentFolder
                          ? folders.find(f => f.id === currentFolder.folder_id)
                          : undefined;
                        // The new folder id is the grandparent's id, or 0 (root) if not found
                        const newFolderId = grandparentFolder?.folder_id ?? 0;

                        // Prevent circular reference
                        if (newFolderId === selectedNote.id) {
                          showToast({
                            message: 'Cannot move to prevent circular reference',
                            duration: 2000,
                            color: 'warning'
                          });
                          return;
                        }

                        // Calculate the new y position based on existing notes in the new folder
                        const parentFolderNotes = notes.filter(n => n.folder_id === newFolderId);
                        const newY = parentFolderNotes.length + 1;

                        const updatedNote = {
                          ...selectedNote,
                          folder_id: newFolderId,
                          y: newY
                        };

                        updateNote(selectedNote.id, { ...updatedNote, folder_id: String(updatedNote.folder_id) }, user.sub)
  .then(() => {
    setNotes(prevNotes => prevNotes.map(note =>
      String(note.id) === String(selectedNote.id)
      ? { ...updatedNote, id: selectedNote.id, folder_id: String(updatedNote.folder_id) }
      : note
    ));
                            noteModal.current?.dismiss();
                            showToast({
                              message: newFolderId === 0 ? 'Note moved to root folder' : 'Note returned to parent folder',
                              duration: 2000,
                              color: 'success'
                            });
                          })
                          .catch(error => {
                            console.error('Error moving note to parent folder:', error);
                            showToast({
                              message: 'Failed to move note to parent folder',
                              duration: 2000,
                              color: 'danger'
                            });
                          });
                      }
                    }}
                  >
                    <IonIcon icon={arrowUpOutline} slot="start" />
                    Return to Parent Folder
                  </IonButton>
                </div>
              )}
            </>
          )}

        </IonContent>
      </IonModal>

      {/* Add/Edit Folder Modal */}
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
        }}
        presentingElement={presentingElement!}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>{selectedFolder ? 'Edit Folder' : 'Add Folder'}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => folderModal.current?.dismiss()}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
          <IonToolbar>
            <IonSegment value={folderModalTab} onIonChange={(e) => setFolderModalTab(e.detail.value as 'folder' | 'settings' | 'calculation')}>
              <IonSegmentButton value="folder">Folder</IonSegmentButton>
              <IonSegmentButton value="settings">Settings</IonSegmentButton>
              {selectedFolder && selectedFolder.folder_type === 4 && (
                <IonSegmentButton value="calculation">Calculation</IonSegmentButton>
              )}
            </IonSegment>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {folderModalTab === 'folder' && (
            <>
              <IonItem>
                <IonLabel position="stacked">Folder Name</IonLabel>
                <IonInput value={folderName} onIonChange={e => setFolderName(e.detail.value!)} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Description</IonLabel>
                <IonTextarea 
                  value={folderDescription} 
                  onIonChange={e => setFolderDescription(e.detail.value!)} 
                  placeholder="Enter folder description"
                  rows={3}
                />
                           </IonItem>
              <IonButton expand="block" onClick={selectedFolder ? onUpdateFolder : onAddFolder} className="ion-margin-top">
                {selectedFolder ? 'Update Folder' : 'Add Folder'}
              </IonButton>
              {selectedFolder && (
                <IonButton expand="block" color="danger" onClick={() => onDeleteFolder(Number(selectedFolder.id))} className="ion-margin-top">
                  Delete Folder
                </IonButton>
              )}
            </>
          )}
          {folderModalTab === 'settings' && selectedFolder && (
            <div style={{ marginTop: "16px" }}>
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
              
              {/* Return to Parent Folder button */}
              {selectedFolder && (
                <div className="ion-padding-top">
                  <IonButton 
                    expand="block" 
                    color="medium"
                    onClick={async () => {
                      // Find the parent folder of the selected folder
                      let parentFolderId = 0;
                      if (selectedFolder && selectedFolder.folder_id !== undefined && selectedFolder.folder_id !== null) {
                        // Find the folder the selected folder is currently in
                        const currentFolderObj = (window.allFolders || folders).find((f: Folder) => f.id === selectedFolder.folder_id);
                        if (currentFolderObj) {
                          parentFolderId = currentFolderObj.folder_id ?? 0;
                        } else {
                          parentFolderId = 0;
                        }
                        // Prevent circular reference
                        if (parentFolderId === Number(selectedFolder.id)) {
                          showToast({
                            message: 'Cannot move to prevent circular reference',
                            duration: 2000,
                            color: 'warning',
                          });
                          return;
                        }
                        // Move the folder
                        const updatedFolder = { ...selectedFolder, folder_id: parentFolderId };
                        await updateFolder(
                          selectedFolder.id,
                          {
                            ...updatedFolder,
                            folder_id: String(updatedFolder.folder_id)
                          },
                          user?.sub || ''
                        );
                        setFolders(prevFolders => prevFolders.filter(f => f.id !== selectedFolder.id));
                        setSelectedFolder({
                          ...updatedFolder,
                          folder_id: String(updatedFolder.folder_id)
                        });
                        folderModal.current?.dismiss();
                        showToast({
                          message: parentFolderId === 0 ? 'Folder moved to root' : 'Folder returned to parent folder',
                          duration: 2000,
                          color: 'success',
                        });
                      }
                    }}
                  >
                    <IonIcon icon={arrowUpOutline} slot="start" />
                    Return to Parent Folder
                  </IonButton>
                </div>
              )}
            </div>
          )}
          
          {folderModalTab === 'calculation' && selectedFolder && (
            <div style={{ marginTop: "16px" }}>
              <IonItem>
                <IonLabel>Calculation Method</IonLabel>
                <IonSelect value={calcMethod} onIonChange={(e) => {
                  setCalcMethod(e.detail.value);
                  if (selectedFolder) {
                    const updatedFolder = {
                      ...selectedFolder,
                      calc_method: e.detail.value
                    };
                    handleUpdateFolder(updatedFolder, user, folderName, folderDescription, folderType, setFolders, setSelectedFolder, () => {
                      // Recalculation will happen automatically via the useEffect
                    });
                  }
                }}>
                  <IonSelectOption value="sum">Sum</IonSelectOption>
                  <IonSelectOption value="average">Average</IonSelectOption>
                  <IonSelectOption value="min">Minimum</IonSelectOption>
                  <IonSelectOption value="max">Maximum</IonSelectOption>
                  <IonSelectOption value="product">Product</IonSelectOption>
                </IonSelect>
              </IonItem>
              
              <IonItem>
                <IonLabel>Current Result</IonLabel>
                <IonLabel slot="end">
                  {selectedFolder && selectedFolder.calc_number !== null && selectedFolder.calc_number !== undefined 
                    ? selectedFolder.calc_number.toString() 
                    : 'No calculation'}
                </IonLabel>
              </IonItem>
              
              <div className="ion-padding">
                <p>Notes with numbers in this folder will be automatically calculated using the selected method.</p>
                <p>Add or edit notes with the "Number" field to include them in calculations.</p>
              </div>
            </div>
          )}
        </IonContent>
      </IonModal>

      {/* Image Preview Modal */}
      <IonModal 
        isOpen={showImageModal} 
        onDidDismiss={() => {
          setShowImageModal(false);
          // If we were in a note editing modal before, reopen it
          if (selectedNote) {
            setTimeout(() => {
              noteModal.current?.present();
            }, 100);
          }
        }}
        mode="ios"
        backdropDismiss={true}
      >
        <IonPage>
          <IonHeader>
            <IonToolbar color="dark">
              <IonButtons slot="start">
                <IonButton onClick={() => {
                  setShowImageModal(false);
                  if (selectedNote) {
                    setTimeout(() => {
                      noteModal.current?.present();
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
          <IonContent fullscreen className="ion-no-padding" style={{ backgroundColor: '#000' }}>
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

export default FolderPage;
