import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonInput,
  IonPage,
  IonRow,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from "@ionic/react";
import React from "react";

const Register: React.FC = () => {
  const router = useIonRouter();

  const doRegister = (event: any) => {
    event.preventDefault();
    console.log("doRegister");
    // Add code here to register the user
    router.goBack();
  };
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color={"medium"}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle className="ion-text-center ion-margin-top ion-margin-bottom">
            Create Account
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent scrollY={false} className="ion-padding">
        <IonGrid>
          <IonRow class="ion-justify-content-center">
            <IonCol size="12" sizeMd="8" sizeLg="6" sizeXl="4">
              <IonCard>
                <IonCardContent>
                  <form onSubmit={doRegister}>
                    <IonInput
                      fill="outline"
                      label="Email"
                      type="email"
                    ></IonInput>
                    <IonInput
                      className=" ion-margin-top"
                      fill="outline"
                      label="Password"
                      type="password"
                    ></IonInput>
                    <IonInput
                      className=" ion-margin-top"
                      fill="outline"
                      label="Re-enter Password"
                      type="password"
                    ></IonInput>

                    <IonButton
                      color={"tertiary"}
                      type="submit"
                      expand="block"
                      className="ion-margin-top"
                    >
                      create my Account
                    </IonButton>
                  </form>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Register;
