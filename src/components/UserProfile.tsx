import React, { useState, useEffect } from 'react';
import { IonContent, IonPage, IonAvatar, IonInput, IonButton, IonText, IonCard, IonCardContent, IonItem, IonLabel, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, IonSpinner } from '@ionic/react';
import { useAuth0 } from '@auth0/auth0-react';

const apiUrl = 'https://localhost:7281';

interface ConfigDT {
  userId: string;
  co_workers?: string[];
  image_url?: string;
  co_folders?: number[];
  username?: string;
  user_key?: string;
}

export const UserProfile: React.FC = () => {
  const [config, setConfig] = useState<ConfigDT | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [friendKey, setFriendKey] = useState('');
  const [friendRequestStatus, setFriendRequestStatus] = useState<string>('');

  useEffect(() => {
    fetchUserConfig();
  }, []);

  const { user } = useAuth0();
  
  const fetchUserConfig = async () => {
    try {
      if (!user?.sub) {
        console.error('No user ID available');
        return;
      }
      const userId = user.sub;
      console.log('Fetching config for userId:', userId);
      
      let response = await fetch(`${apiUrl}/config/api/v1/${userId}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      let configNeedsUpdate = false;

      // If config doesn't exist, create it
      if (response.status === 404) {
        console.log('Config not found, creating new config...');
        const newConfig = {
          user_id: userId,
          username: user.name || '',
          image_url: user.picture || '',
          co_workers: [],
          co_folders: []
        };

        console.log('Sending POST request with config:', newConfig);

        response = await fetch(`${apiUrl}/config/api/v1/${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(newConfig)
        });

        console.log('POST response status:', response.status);
        const responseText = await response.text();
        console.log('POST response text:', responseText);

        if (!response.ok) {
          throw new Error(`Failed to create config: ${response.status} - ${responseText}`);
        }

        // After successful POST, fetch the config again
        response = await fetch(`${apiUrl}/config/api/v1/${userId}`, {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch config after creation: ${response.status}`);
        }
      }
      
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      if (!responseText) {
        throw new Error('Empty response received');
      }
      
      const data = JSON.parse(responseText);
      console.log('Parsed data:', data);
      
      // Check if we need to update the config with OAuth data
      if (!data.username && user.name) {
        console.log('Username missing, updating with OAuth name:', user.name);
        await fetch(`${apiUrl}/config/api/v1/${userId}/username`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(user.name)
        });
        data.username = user.name;
        configNeedsUpdate = true;
      }
      
      if (!data.image_url && user.picture) {
        console.log('Image URL missing, updating with OAuth picture:', user.picture);
        await fetch(`${apiUrl}/config/api/v1/${userId}/image`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(user.picture)
        });
        data.image_url = user.picture;
        configNeedsUpdate = true;
      }
      
      // If we updated the config, fetch it again to ensure we have the latest data
      if (configNeedsUpdate) {
        console.log('Config was updated with OAuth data, refreshing...');
        response = await fetch(`${apiUrl}/config/api/v1/${userId}`, {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const updatedText = await response.text();
          if (updatedText) {
            const updatedData = JSON.parse(updatedText);
            console.log('Updated config data:', updatedData);
            setConfig(updatedData);
            setNewUsername(updatedData.username || '');
            return;
          }
        }
      }
      
      setConfig(data);
      setNewUsername(data.username || '');
    } catch (error) {
      console.error('Error fetching/creating user config:', error);
      setConfig(null);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    const file = target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      if (!user?.sub) {
        console.error('No user ID available');
        return;
      }
      const userId = user.sub;
      let updateNeeded = false;
      
      // Update username if changed
      if (newUsername !== config?.username) {
        updateNeeded = true;
        console.log('Updating username to:', newUsername);
        await fetch(`${apiUrl}/config/api/v1/${userId}/username`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newUsername)
        });
      }

      // Update image if changed
      if (selectedImage && selectedImage !== config?.image_url) {
        updateNeeded = true;
        console.log('Updating profile image');
        await fetch(`${apiUrl}/config/api/v1/${userId}/image`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(selectedImage)
        });
      }

      // Refresh the config data
      await fetchUserConfig();
      
      // Show success message if updates were made
      if (updateNeeded) {
        // Create a success toast or alert
        alert('Profile updated successfully!');
        
        // Force refresh the app to update the menu with new profile data
        // This is a simple approach - in a more sophisticated app, you might use a state management system
        window.location.reload();
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Error saving profile changes. Please try again.');
    }
  };

  if (!user?.sub) return <IonText className="ion-padding">Please log in to view your profile.</IonText>;
  if (!config) return (
    <div className="ion-text-center ion-padding">
      <IonSpinner />
      <IonText className="ion-padding-start">Loading...</IonText>
    </div>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Profile Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardContent>
            <div className="ion-text-center">
              <IonAvatar style={{ width: '120px', height: '120px', margin: '0 auto 20px', border: '3px solid var(--ion-color-primary)' }}>
                <img src={selectedImage || config.image_url} alt="Profile" />
              </IonAvatar>
              
              <div className="ion-margin-bottom">
                <IonButton 
                  expand="block" 
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  Upload Image
                  <input
                    id="fileInput"
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </IonButton>

                {(selectedImage || config.image_url) && (
                  <IonButton 
                    expand="block"
                    color="danger"
                    className="ion-margin-top"
                    onClick={async () => {
                      try {
                        const response = await fetch(`${apiUrl}/config/api/v1/${user?.sub}/image-url`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'userId': user?.sub || ''
                          },
                          body: 'null'
                        });
                        
                        if (response.ok) {
                          setSelectedImage(null);
                          await fetchUserConfig();
                        }
                      } catch (error) {
                        console.error('Error removing profile image:', error);
                      }
                    }}
                  >
                    Remove Image
                  </IonButton>
                )}
              </div>

              <IonItem lines="full" className="ion-margin-vertical">
                <IonLabel position="floating">Username</IonLabel>
                <IonInput
                  value={newUsername}
                  onIonChange={e => setNewUsername(e.detail.value!)}
                />
              </IonItem>

              <div className="ion-margin-vertical">
                <IonText color="primary">
                  <h2 className="ion-padding-bottom">Shared Folders</h2>
                  <p>
                    {config.co_folders?.length 
                      ? `Shared folders: ${config.co_folders.join(', ')}` 
                      : 'No shared folders'}
                  </p>
                </IonText>
              </div>

              <div className="ion-margin-vertical">
                <IonText color="primary">
                  <h2 className="ion-padding-bottom">Co-workers</h2>
                </IonText>
                {config.co_workers && config.co_workers.length > 0 ? (
                  <div className="ion-padding-bottom">
                    {config.co_workers.map((coWorkerKey) => (
                      <IonItem key={coWorkerKey} lines="full">
                        <IonLabel>
                          <p style={{ fontFamily: 'monospace' }}>{coWorkerKey}</p>
                        </IonLabel>
                        <IonButton
                          slot="end"
                          color="danger"
                          fill="clear"
                          onClick={async () => {
                            try {
                              const response = await fetch(`${apiUrl}/config/api/v1/${user?.sub}/co-workers/${encodeURIComponent(coWorkerKey)}`, {
                                method: 'DELETE',
                                headers: {
                                  'Accept': 'application/json',
                                  'Content-Type': 'application/json',
                                  'userId': user?.sub || ''
                                }
                              });

                              if (response.ok) {
                                await fetchUserConfig();
                              } else {
                                const error = await response.text();
                                console.error('Error removing co-worker:', error);
                              }
                            } catch (error) {
                              console.error('Error removing co-worker:', error);
                            }
                          }}
                        >
                          Remove
                        </IonButton>
                      </IonItem>
                    ))}
                  </div>
                ) : (
                  <p className="ion-padding-bottom">No co-workers</p>
                )}
              </div>

              <div className="ion-margin-vertical">
                <IonText color="primary">
                  <h2 className="ion-padding-bottom">Your User Key</h2>
                  <p style={{ fontFamily: 'monospace', fontSize: '1.2em' }}>
                    {config.user_key || 'No key available'}
                  </p>
                  <p className="ion-padding-top ion-text-wrap" style={{ fontSize: '0.9em', color: 'var(--ion-color-medium)' }}>
                    Share this key with friends to let them add you as a co-worker
                  </p>
                </IonText>
              </div>

              <div className="ion-margin-vertical ion-padding-top">
                <IonText color="primary">
                  <h2 className="ion-padding-bottom">Add Co-worker</h2>
                </IonText>
                <IonItem lines="full">
                  <IonLabel position="floating">Enter Co-worker's User Key</IonLabel>
                  <IonInput
                    value={friendKey}
                    onIonChange={e => setFriendKey(e.detail.value!)}
                    placeholder="Enter user key"
                  />
                </IonItem>
                {friendRequestStatus && (
                  <IonText color={friendRequestStatus.includes('Error') ? 'danger' : 'success'} className="ion-padding-vertical">
                    <p className="ion-text-center">{friendRequestStatus}</p>
                  </IonText>
                )}
                <IonButton 
                  expand="block" 
                  className="ion-margin-top"
                  onClick={async () => {
                    if (!friendKey.trim()) {
                      setFriendRequestStatus('Error: Please enter a user key');
                      return;
                    }
                    try {
                      const response = await fetch(`${apiUrl}/config/api/v1/${user?.sub}/co-workers`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify([...(config.co_workers || []), friendKey.trim()])
                      });
                      
                      if (response.ok) {
                        setFriendRequestStatus('Co-worker added successfully!');
                        setFriendKey('');
                        fetchUserConfig(); // Refresh the config
                      } else {
                        const error = await response.text();
                        setFriendRequestStatus(`Error: ${error}`);
                      }
                    } catch (error) {
                      setFriendRequestStatus('Error: Failed to add co-worker');
                      console.error('Error adding co-worker:', error);
                    }
                  }}
                >
                  Add Co-worker
                </IonButton>
              </div>

              <IonButton 
                expand="block" 
                onClick={handleSave}
                className="ion-margin-top"
              >
                Save Changes
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};
