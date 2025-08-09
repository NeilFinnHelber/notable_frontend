import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import React, { Children } from 'react';
import { Swiper, SwiperSlide, useSwiper } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import intro_temp from '../assets/intro_temp.png';
import './intro.css';

interface ContainerProps { 
    onFinish: () => void;
}

const SwiperButtonNext = ({ children }: any) => {
    const Swiper = useSwiper();
    return <IonButton onClick={() => Swiper.slideNext()}>{children}</IonButton>;
};

const Intro: React.FC<ContainerProps> = ({ onFinish }) => {
    return (
    <Swiper>
        <SwiperSlide><img src={intro_temp} alt="intro_temp" />
        <SwiperButtonNext>Next</SwiperButtonNext>
        </SwiperSlide>

        <SwiperSlide>display a one time intro tutorial, though it can be rewatched
        <SwiperButtonNext>Next</SwiperButtonNext>
        </SwiperSlide>

        <SwiperSlide>add swiperslides for more, well, slides
            <IonButton onClick={() => onFinish()}>Finish</IonButton>
        </SwiperSlide>
        </Swiper>
    );
};

export default Intro;