import React, { useEffect, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonPage,
  IonRow,
  IonTitle,
  IonToolbar,
  IonSpinner,
  IonText,
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useAuth0 } from '@auth0/auth0-react';
import authConfig from '../auth_config';

const Login: React.FC = () => {
  const {
    loginWithRedirect,
    handleRedirectCallback,
    isAuthenticated,
    isLoading,
    error,
  } = useAuth0();
  const router = useIonRouter();
  const [isProcessing, setIsProcessing] = useState(false);



  // This effect redirects the user to the main app page if they are authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/app', 'root', 'replace');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogin = async () => {
    // Don't try to log in if we're already processing a login or authenticated
    if (isProcessing || isAuthenticated) return;

    setIsProcessing(true);
    try {
      const currentConfig = authConfig;
      await loginWithRedirect({
        authorizationParams: {
          redirect_uri: currentConfig.redirectUri,
          
          scope: 'openid profile email offline_access',
        },
      });
    } catch (e) {
      console.error('Login failed', e);
      setIsProcessing(false);
    }
  };

  // While the SDK is loading, or we are processing a login, show a spinner
  if (isLoading || isProcessing) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color={'medium'}>
          <IonTitle className='ion-text-center'>Notable</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false} className="ion-padding">
        <IonGrid>
          <IonRow className='ion-justify-content-center'>
            <IonCol size='12' sizeMd='8' sizeLg='6' sizeXl='4'>
              <div className='ion-text-center ion-padding'>
                <img
                  src="/assets/temp_test.png"
                  alt="Notable Logo"
                  style={{ width: '50%', maxWidth: '200px' }}
                />
              </div>
            </IonCol>
          </IonRow>

          <IonRow className='ion-justify-content-center'>
            <IonCol size='12' sizeMd='8' sizeLg='6' sizeXl='4'>
              <IonCard>
                <IonCardContent>
                  {error && (
                    <IonText color="danger">
                      <p className="ion-text-center">{error.message}</p>
                    </IonText>
                  )}
                  <IonButton
                    onClick={handleLogin}
                    expand='block'
                    className='ion-margin-top'
                    disabled={isProcessing}
                  >
                    Continue
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Login;