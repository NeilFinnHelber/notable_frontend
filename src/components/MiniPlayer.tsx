import React, { useState } from 'react';
import { usePlayback } from './PlaybackContext';
import { IonIcon, IonButton, IonThumbnail, IonText } from '@ionic/react';
import { playOutline, pauseOutline, playSkipForwardOutline, closeOutline } from 'ionicons/icons';

const MiniPlayer: React.FC = () => {
  const {
    selectedVideo,
    isPlaying,
    setIsPlaying,
    handlePlayVideo,
    handleNext,
    setSelectedVideo,
    videoRef
  } = usePlayback();

  // Position state for draggable mini player
  const [position, setPosition] = useState({ top: 20, right: 20 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  if (!selectedVideo) return null;

  // Draggable handlers
  const onDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true);
    setOffset({
      x: e.clientX - position.right,
      y: e.clientY - position.top,
    });
  };
  const onDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setPosition({
      top: e.clientY - offset.y,
      right: window.innerWidth - (e.clientX - offset.x),
    });
  };
  const onDragEnd = () => setDragging(false);

  return (
    <div
      style={{
        position: 'fixed',
        top: position.top,
        right: position.right,
        zIndex: 2000,
        background: 'var(--ion-color-light)',
        borderRadius: 12,
        boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
        padding: 12,
        minWidth: 260,
        minHeight: 80,
        display: 'flex',
        alignItems: 'center',
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      onMouseDown={onDragStart}
      onMouseMove={onDrag}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
    >
      <IonThumbnail style={{ minWidth: 56, minHeight: 56, marginRight: 12 }}>
        <img
          src={selectedVideo.thumbnailUrl || `https://localhost:7281/notes/api/v1/videos/${selectedVideo.id}/thumbnail`}
          alt={selectedVideo.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
        />
      </IonThumbnail>
      <div style={{ flex: 1, minWidth: 0 }}>
        <IonText>
          <div style={{ fontWeight: 600, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedVideo.title}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--ion-color-medium)' }}>{selectedVideo.artist || ''}</div>
        </IonText>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
          <IonButton fill="clear" size="small" onClick={() => setIsPlaying(!isPlaying)}>
            <IonIcon icon={isPlaying ? pauseOutline : playOutline} />
          </IonButton>
          <IonButton fill="clear" size="small" onClick={handleNext}>
            <IonIcon icon={playSkipForwardOutline} />
          </IonButton>
          <IonButton fill="clear" size="small" color="danger" onClick={() => setSelectedVideo(null)}>
            <IonIcon icon={closeOutline} />
          </IonButton>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
