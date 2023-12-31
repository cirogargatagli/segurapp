import React, {useState, useEffect, useCallback} from 'react';
import {View, ToastAndroid} from 'react-native';
import Voice from '@react-native-voice/voice';
import {Button, Card, Chip, Text} from 'react-native-paper';
import Geolocation from '@react-native-community/geolocation';
import axios, {AxiosResponse} from 'axios';
import Spinner from './Spinner';
import {getColorAlert, getIconAlert} from '../utils/colors';
import {getToken} from '../utils/react-storage';
import {addHours} from 'date-fns';

const VoiceRecognition: React.FC = () => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Initialize the voice recognition module
    Voice.onSpeechStart = () => {
      console.log('Speech started');
    };

    Voice.onSpeechRecognized = e => {
      console.log('Speech recognized:', e);
    };

    Voice.onSpeechEnd = () => {
      console.log('Speech ended');
    };

    Voice.onSpeechError = e => {};

    Voice.onSpeechResults = async (e: any) => {
      console.info('Palabra recibida: ', e.value[0]);
      setLoading(true);
      await Voice.stop();
      setIsListening(false);

      console.log(messages);

      const message = messages.find(
        message =>
          message.description.toUpperCase() == e.value[0].toUpperCase(),
      );

      if (message) {
        sendMessage(message);
      } else {
        ToastAndroid.show('Palabra inválida', ToastAndroid.SHORT);
        setLoading(false);
      }
    };

    return () => {
      // Cleanup and stop voice recognition when the component unmounts
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  useEffect(() => {
    fetchMessages();
  }, []);

  const toggleListening = async () => {
    try {
      if (isListening) {
        await Voice.stop();
        setIsListening(false);
      } else {
        await Voice.start('es-Es');
        setIsListening(true);
      }
    } catch (e) {
      console.error('Voice recognition error:', e);
    }
  };

  const fetchMessages = useCallback(async () => {
    axios({
      url: 'http://10.0.2.2:5152/api/message',
      method: 'GET',
    })
      .then((res: AxiosResponse<Message[]>) => {
        console.log(res.data);
        setMessages(res.data);
      })
      .catch(err => {
        console.log('Error al cargar el listado de mensajes: ', err);
      });
  }, []);

  const sendMessage = async (message: Message) => {
    setLoading(true);
    const user = await getToken();
    var startTime = performance.now();
    Geolocation.getCurrentPosition(
      position => {
        var endTime = performance.now();
        console.info(
          `Obtener la ubicación: ${endTime - startTime} milisegundos.`,
        );

        startTime = performance.now();
        axios({
          url: 'http://10.0.2.2:5152/api/message-users',
          method: 'POST',
          data: {
            emisorId: user.Id,
            message: message,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            occurredAt: addHours(new Date(), -3),
          },
        })
          .then(() => {
            ToastAndroid.show(
              'Mensaje enviado correctamente',
              ToastAndroid.SHORT,
            );
          })
          .catch(err => {
            ToastAndroid.show(
              'Error al enviar el mensaje: ' + err,
              ToastAndroid.SHORT,
            );
          })
          .finally(() => {
            endTime = performance.now();
            console.info(
              `Enviar petición al backend: ${
                endTime - startTime
              } milisegundos.`,
            );
            setLoading(false);
          });
      },
      error => {
        setLoading(false);
        console.log(`Error al obtener la ubicación: ${error.message}`);
      },
      {enableHighAccuracy: true, timeout: 20000, maximumAge: 1000},
    );
  };

  return (
    <>
      <Card
        style={{
          padding: 10,
          marginLeft: 10,
          marginRight: 10,
        }}>
        <Text
          variant="titleMedium"
          style={{
            textAlign: 'center',
          }}>
          Palabras clave
        </Text>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            display: 'flex',
            flexWrap: 'wrap',
            marginTop: 10,
          }}>
          {messages.map((message, i) => (
            <Text
              key={i}
              style={{
                marginTop: 10,
                marginLeft: 15,
              }}>
              <Chip
                icon={getIconAlert(message.description)}
                onPress={() => sendMessage(message)}>
                {' '}
                {message.description}
              </Chip>
            </Text>
          ))}
        </View>
      </Card>

      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
        }}>
        {loading ? (
          <Spinner />
        ) : (
          <>
            <Button
              mode="elevated"
              icon={isListening ? 'text-to-speech-off' : 'text-to-speech'}
              onPress={toggleListening}>
              {isListening ? 'Parar' : 'Comenzar a grabar'}
            </Button>
            {/* {recognizedText && (
              <Text
                style={{
                  marginTop: 10,
                }}>
                <Chip icon="check"> {recognizedText}</Chip>
              </Text>
            )} */}
          </>
        )}
      </View>
    </>
  );
};

export default VoiceRecognition;
