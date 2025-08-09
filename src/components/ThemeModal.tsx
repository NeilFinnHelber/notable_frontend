import React, { useState } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardContent, IonCardTitle, IonCardSubtitle } from '@ionic/react';
import { colorPaletteOutline, checkmarkCircle } from 'ionicons/icons';
import { themes, ThemeName, applyTheme, ThemeColors } from '../themeColors';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}

const themeNames: { name: ThemeName; label: string; description: string; imagePath: string }[] = [
  { name: 'arcticFox', label: 'Arctic Fox', description: 'Clean, bright theme with cool blue accents', imagePath: 'src/assets/arcticfox.jpg' },
  { name: 'darkFox', label: 'Silver Fox', description: 'Sleek dark theme with vibrant highlights', imagePath: 'src/assets/silverfox.jpg' },
  { name: 'redFox', label: 'Red Fox', description: 'Warm theme with fiery orange accents', imagePath: 'src/assets/redfox.jpg' },
  { name: 'corsacFox', label: 'Corsac Fox', description: 'Earthy sand-colored theme with desert vibes', imagePath: 'src/assets/corsacfox.jpg' },
];

const ColorSwatch: React.FC<{ color: string; title?: string }> = ({ color, title }) => (
  <div 
    title={title}
    style={{ 
      width: '20px', 
      height: '20px', 
      backgroundColor: color, 
      borderRadius: '4px', 
      border: '1px solid rgba(0,0,0,0.1)',
      display: 'inline-block',
      marginRight: '4px'
    }}
  ></div>
);

export const ThemeModal: React.FC<ThemeModalProps> = ({ isOpen, onClose, selectedTheme, onThemeChange }) => {
  const [previewTheme, setPreviewTheme] = useState<ThemeName | null>(null);
  
  // Preview a theme on hover without applying it
  const handleThemeHover = (theme: ThemeName) => {
    setPreviewTheme(theme);
  };
  
  // Reset preview when mouse leaves
  const handleMouseLeave = () => {
    setPreviewTheme(null);
  };
  
  // Apply theme when clicked
  const handleThemeSelect = (theme: ThemeName) => {
    onThemeChange(theme);
    setPreviewTheme(null);
  };
  // Create a theme preview component
  const ThemePreview = ({ theme, isActive, isHovered }: { theme: ThemeColors, isActive: boolean, isHovered?: boolean }) => {
    return (
      <div style={{ 
        padding: '10px', 
        borderRadius: '8px',
        backgroundColor: theme.background,
        color: theme.text,
        height: '100%',
        position: 'relative',
        border: isActive ? `2px solid ${theme.primary}` : '2px solid transparent',
        boxShadow: isActive ? `0 0 8px ${theme.primary}` : (isHovered ? `0 0 5px ${theme.secondary}` : 'none'),
        transition: 'all 0.3s ease'
      }}>
        {isActive && (
          <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
            <IonIcon icon={checkmarkCircle} style={{ color: theme.primary, fontSize: '24px' }} />
          </div>
        )}
        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '8px', 
            backgroundColor: theme.folderBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: `1px solid ${theme.border}`
          }}>📁</div>
          <div style={{ 
            backgroundColor: isHovered ? theme.hoverBg : theme.surface, 
            padding: '6px 10px', 
            borderRadius: '4px',
            color: isHovered ? theme.hoverText : theme.text,
            flexGrow: 1,
            fontSize: '14px',
            transition: 'all 0.3s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>Folder</div>
        </div>
        <div style={{ 
          backgroundColor: theme.noteBg, 
          padding: '10px', 
          borderRadius: '8px',
          marginBottom: '10px',
          fontSize: '12px',
          color: theme.text,
          boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ 
            backgroundColor: theme.surface, 
            padding: '4px 8px', 
            borderRadius: '4px',
            marginBottom: '6px',
            color: theme.text,
            fontSize: '14px',
            fontWeight: 'bold'
          }}>Note Title</div>
          <div style={{ 
            width: '100%', 
            height: '2px', 
            backgroundColor: theme.border,
            marginBottom: '6px'
          }}></div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <div style={{ 
              width: '60px', 
              height: '8px', 
              backgroundColor: theme.primary,
              borderRadius: '4px'
            }}></div>
            <div style={{ 
              width: '40px', 
              height: '8px', 
              backgroundColor: theme.secondary,
              borderRadius: '4px'
            }}></div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ 
              width: '30px', 
              height: '8px', 
              backgroundColor: theme.accent,
              borderRadius: '4px'
            }}></div>
            <div style={{ 
              width: '70px', 
              height: '8px', 
              backgroundColor: theme.textMuted,
              borderRadius: '4px'
            }}></div>
          </div>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '6px', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ 
            backgroundColor: isHovered ? theme.hoverBg : 'transparent', 
            color: isHovered ? theme.hoverText : theme.text, 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '12px',
            transition: 'all 0.3s ease'
          }}>Hover Item</div>
          <div style={{ 
            backgroundColor: theme.primary, 
            color: '#fff', 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}>Button</div>
        </div>
      </div>
    );
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="theme-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle className="theme-modal-title"><IonIcon icon={colorPaletteOutline} style={{ marginRight: 8 }} />Fox Themes</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonGrid>
          <IonRow>
            {themeNames.map(({ name, label, description, imagePath }) => {
              const isSelected = selectedTheme === name;
              const isPreview = previewTheme === name;
              const isActive = isSelected || isPreview;
              
              return (
                <IonCol size="12" sizeMd="6" key={name}>
                  <IonCard 
                    onClick={() => handleThemeSelect(name)}
                    onMouseEnter={() => handleThemeHover(name)}
                    onMouseLeave={handleMouseLeave}
                    style={{ 
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                      height: '100%'
                    }}
                  >
                    <IonCardHeader>
                      <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={imagePath} alt={`${label} theme icon`} style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} /> {label}
                      </IonCardTitle>
                      <IonCardSubtitle style={{ marginTop: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', minHeight: '24px' }}>
                        {themes[name] && (
                          <>
                            <ColorSwatch color={themes[name].background} title={`Background: ${themes[name].background}`} />
                            <ColorSwatch color={themes[name].text} title={`Text: ${themes[name].text}`} />
                            <ColorSwatch color={themes[name].primary} title={`Primary: ${themes[name].primary}`} />
                            <ColorSwatch color={themes[name].secondary} title={`Secondary: ${themes[name].secondary}`} />
                            <ColorSwatch color={themes[name].accent} title={`Accent: ${themes[name].accent}`} />
                          </>
                        )}
                        {!themes[name] && description} {/* Fallback to text description if theme colors not found */}
                      </IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <ThemePreview theme={themes[name]} isActive={isSelected} isHovered={isPreview} />
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              );
            })}
          </IonRow>
        </IonGrid>
        <div style={{ textAlign: 'right', margin: 16 }}>
          <IonButton onClick={onClose} color="primary">Close</IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};
