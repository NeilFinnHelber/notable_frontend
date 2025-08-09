import { IonPage, IonContent, IonText, IonImg } from "@ionic/react";
import { useAuth0 } from "@auth0/auth0-react";

const Home: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();

  console.log("User object:", user); // Debugging

  if (isLoading) return <IonText>Loading...</IonText>;

  return (
    <IonPage>
      <IonContent className="ion-padding">
        {isAuthenticated && user ? (
          <>
            <IonText>
              <h2>Welcome, {user.name}!</h2>
              <p>Email: {user.email}</p>
            </IonText>
            {user.picture ? (
              <IonImg
                src={user.picture}
                alt="Profile"
                style={{ width: "50px", height: "50px", borderRadius: "50%" }}
              />
            ) : (
              <IonText>No profile picture available</IonText>
            )}
          </>
        ) : (
          <IonText>Please log in to see your profile info.</IonText>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Home;
