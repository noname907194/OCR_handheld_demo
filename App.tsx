import React, {useEffect, useState} from 'react';
import 'fast-text-encoding';

import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';

import {PaddleOcrEngine} from './src/ocr/PaddleOCREngine';

const ocrEngine = new PaddleOcrEngine();

function App(): React.JSX.Element {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [loading, setLoading] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  // Initialize PaddleOCR when the app starts
  useEffect(() => {
    const initializeOCR = async () => {
      try {
        console.log('Initializing PaddleOCR...');

        await ocrEngine.initialize();

        console.log('PaddleOCR initialized successfully');
      } catch (error) {
        console.error('PaddleOCR initialization failed:', error);

        Alert.alert(
          'OCR Initialization Error',
          'PaddleOCR could not be initialized.',
        );
      }
    };

    initializeOCR();

    return () => {
      ocrEngine.destroy().catch(error => {
        console.error('PaddleOCR destroy failed:', error);
      });
    };
  }, []);

  // Clear OCR result
  const clearResult = () => {
    setOcrText('');
    setExecutionTime(null);
    setConfidence(null);
  };

  // Take photo
  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        quality: 1,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          'Camera Error',
          result.errorMessage || 'Unable to open camera.',
        );
        return;
      }

      const uri = result.assets?.[0]?.uri;

      if (!uri) {
        Alert.alert('Error', 'No image was captured.');
        return;
      }

      setImageUri(uri);
      clearResult();

      console.log('Camera image:', uri);
    } catch (error) {
      console.error('Camera error:', error);

      Alert.alert(
        'Camera Error',
        'Something went wrong while opening the camera.',
      );
    }
  };

  // Choose image from gallery
  const choosePhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 1,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          'Gallery Error',
          result.errorMessage || 'Unable to open gallery.',
        );
        return;
      }

      const uri = result.assets?.[0]?.uri;

      if (!uri) {
        Alert.alert('Error', 'No image was selected.');
        return;
      }

      setImageUri(uri);
      clearResult();

      console.log('Selected image:', uri);
    } catch (error) {
      console.error('Gallery error:', error);

      Alert.alert(
        'Gallery Error',
        'Something went wrong while selecting the image.',
      );
    }
  };

  // Analyse image using PaddleOCR
  const analyseImage = async () => {
    if (!imageUri) {
      Alert.alert(
        'No Image',
        'Please take a photo or select an image first.',
      );
      return;
    }

    try {
      setLoading(true);
      clearResult();

      console.log('-----------------------------');
      console.log('PaddleOCR analysis started');
      console.log('Image URI:', imageUri);

      const result = await ocrEngine.recognize(imageUri);

      console.log('-----------------------------');
      console.log('PaddleOCR RESULT');
      console.log('Text:', result.text);
      console.log('Confidence:', result.confidence);
      console.log('Execution time:', result.executionTimeMs);
      console.log('Engine:', result.engine);
      console.log('-----------------------------');

      setOcrText(result.text);
      setConfidence(result.confidence);
      setExecutionTime(result.executionTimeMs);
    } catch (error) {
      console.error('PaddleOCR analysis failed:', error);

      Alert.alert(
        'OCR Error',
        'PaddleOCR failed to analyse the image.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <Text style={styles.title}>
          LIN
        </Text>

        <Text style={styles.subtitle}>
          Product Weight Recognition
        </Text>

        {/* IMAGE PREVIEW */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image
              source={{uri: imageUri}}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                No image selected
              </Text>
            </View>
          )}
        </View>

        {/* CAMERA / GALLERY */}
        <View style={styles.buttonRow}>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={takePhoto}>

            <Text style={styles.buttonText}>
              Take Photo
            </Text>

          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={choosePhoto}>

            <Text style={styles.buttonText}>
              Upload Photo
            </Text>

          </TouchableOpacity>

        </View>

        {/* ANALYSE BUTTON */}
        <TouchableOpacity
          style={[
            styles.analyseButton,
            (!imageUri || loading) && styles.disabledButton,
          ]}
          disabled={!imageUri || loading}
          onPress={analyseImage}>

          <Text style={styles.analyseText}>
            {loading ? 'Analysing...' : 'Analyse'}
          </Text>

        </TouchableOpacity>

        {/* OCR RESULT */}
        <View style={styles.resultContainer}>

          <Text style={styles.sectionTitle}>
            OCR Result
          </Text>

          {ocrText ? (
            <Text style={styles.resultText}>
              {ocrText}
            </Text>
          ) : (
            <Text style={styles.noResult}>
              No OCR result yet
            </Text>
          )}

        </View>

        {/* METRICS */}
        {executionTime !== null && (
          <View style={styles.metricsContainer}>

            <Text style={styles.sectionTitle}>
              OCR Metrics
            </Text>

            <View style={styles.metricRow}>

              <Text style={styles.metricLabel}>
                Engine
              </Text>

              <Text style={styles.metricValue}>
                PaddleOCR
              </Text>

            </View>

            <View style={styles.metricRow}>

              <Text style={styles.metricLabel}>
                Execution Time
              </Text>

              <Text style={styles.metricValue}>
                {executionTime} ms
              </Text>

            </View>

            <View style={styles.metricRow}>

              <Text style={styles.metricLabel}>
                Confidence
              </Text>

              <Text style={styles.metricValue}>
                {confidence !== null
                  ? confidence.toFixed(3)
                  : 'N/A'}
              </Text>

            </View>

          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },

  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 25,
    color: '#666666',
  },

  imageContainer: {
    width: '100%',
    height: 350,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderText: {
    color: '#888888',
    fontSize: 16,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: '#333333',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  analyseButton: {
    marginTop: 15,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },

  disabledButton: {
    backgroundColor: '#aaaaaa',
  },

  analyseText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },

  resultContainer: {
    marginTop: 25,
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  resultText: {
    fontSize: 17,
    lineHeight: 26,
  },

  noResult: {
    color: '#888888',
    fontSize: 15,
  },

  metricsContainer: {
    marginTop: 15,
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },

  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },

  metricLabel: {
    fontSize: 15,
    color: '#555555',
  },

  metricValue: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default App;