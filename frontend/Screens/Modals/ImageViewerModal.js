import React from 'react';
import { 
  View, 
  Image, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  StatusBar 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ImageViewerModal = ({ visible, imageSource, onClose }) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalContainer}>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onClose}
        >
          <Ionicons name="close" size={30} color="#fff" />
        </TouchableOpacity>
        <Image 
          source={imageSource} 
          style={styles.fullImage}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '90%',
  },
  closeButton: {
    position: 'absolute',
    top: StatusBar.currentHeight || 40,
    right: 20,
    zIndex: 1,
  },
});

export default ImageViewerModal;
