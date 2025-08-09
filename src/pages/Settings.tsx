import { IonContent, IonHeader, IonIcon, IonLabel, IonPage, IonTabBar, IonTabButton, IonTitle, IonToolbar, IonList, IonItem, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButtons, IonButton, IonFab, IonFabButton, IonModal, IonInput, IonSelect, IonSelectOption, useIonToast } from '@ionic/react';
import { folderOutline, musicalNoteOutline, pinOutline, fileTrayFullOutline, analyticsOutline, documentTextOutline, add, folderOpen } from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import { getNotes, getFolders, Note, Folder } from './apiService';
import { handleAddFolder as addFolderHandler } from './apiCalls';
import { useAuth0 } from '@auth0/auth0-react';
import './settings.css';

interface Position {
  x: number;
  y: number;
}

type PinnableItem = (Note | Folder) & {
  position?: Position;
};

const isNote = (item: PinnableItem): item is Note => {
  return 'title' in item;
};

const Settings: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { user } = useAuth0();
  const [showToast] = useIonToast();
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [pinnedItems, setPinnedItems] = useState<PinnableItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<{ index: number; startX: number } | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomStart, setZoomStart] = useState({ x: 0, y: 0, scale: 1 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          
          <IonTitle>Settings</IonTitle>
          
        </IonToolbar>
      </IonHeader>
      
      <IonTabBar>
        <IonTabButton tab="notes" onClick={() => history.push('/app/list')}>
          <IonIcon icon={folderOutline} />
          <IonLabel>Notes</IonLabel>
        </IonTabButton>
        <IonTabButton tab="media" onClick={() => history.push('/app/media/downloaded')}>
          <IonIcon icon={musicalNoteOutline} />
          <IonLabel>Media</IonLabel>
        </IonTabButton>
        <IonTabButton tab="settings" selected={true}>
          <IonIcon icon={pinOutline} />
          <IonLabel>Settings</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonPage>
  );
};

export default Settings;