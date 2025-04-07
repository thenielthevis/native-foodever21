import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { updateUserProfile } from '../../Redux/Actions/Auth.actions';
import axios from 'axios';
import { API_URL } from '@env';
import { auth } from '../../firebaseConfig';


const EditProfile = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, backendUser } = route.params;
 
  const [username, setUsername] = useState(backendUser?.username || user?.displayName || '');
  const [image, setImage] = useState(null);
  const [imageURI, setImageURI] = useState(backendUser?.userImage || user?.photoURL || null);
  const [mobileNumber, setMobileNumber] = useState(backendUser?.mobileNumber || '');
  const [address, setAddress] = useState(backendUser?.address || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
 
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
     
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
        return;
      }
     
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
     
      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('Selected image:', result.assets[0].uri);
        setImageURI(result.assets[0].uri);
        setImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
 
  const uploadImage = async () => {
    if (!image) return null;
   
    try {
      console.log('Uploading image to server...');
     
      const formData = new FormData();
      formData.append('image', {
        uri: image.uri,
        type: 'image/jpeg',
        name: 'profile-image.jpg',
      });
     
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('Not authenticated');
      }
     
      const token = await firebaseUser.getIdToken(true);
     
      const uploadResponse = await axios.post(
        `${API_URL}/auth/upload-avatar`,
        formData,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          timeout: 30000
        }
      );
     
      console.log('Image upload response:', uploadResponse.data);
     
      return uploadResponse.data.secure_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload profile image');
    }
  };
 
  const handleSave = async () => {
    if (!username.trim()) {
      setError('Username cannot be empty');
      return;
    }
   
    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }
   
    try {
      setLoading(true);
      setError('');
     
      console.log('Firebase UID from route params:', user?.uid);
      console.log('Backend User ID:', backendUser?._id);
     
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage();
      }
     
      const updateData = {
        username,
        firebaseUid: user?.uid,
        mobileNumber: mobileNumber.trim(),
        address: address.trim()
      };
     
      if (imageUrl) {
        updateData.userImage = imageUrl;
      }
     
      const response = await updateUserProfile(updateData);
     
      if (response.error) {
        console.error('Update profile failed:', response);
        setError(response.message || 'Failed to update profile');
        Alert.alert(
          'Update Failed',
          `Could not update profile: ${response.message}`,
          [{ text: 'OK' }]
        );
      } else {
        console.log('Profile updated successfully:', response);
        Alert.alert(
          'Success',
          'Profile updated successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('An unexpected error occurred');
      Alert.alert(
        'Error',
        'An unexpected error occurred while updating your profile',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <LinearGradient
      colors={['#8B4513', '#A0522D', '#CD853F']} // Warm earthy food-inspired colors
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <StatusBar backgroundColor="#8B4513" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.rightPlaceholder} />
      </View>
     
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
            {imageURI ? (
              <Image
                source={{ uri: imageURI }}
                style={styles.profileImage}
                defaultSource={require('../../assets/defaults/profile-pic.png')} // Add a default image
              />
            ) : (
              <View style={styles.placeholderImage}>
                <FontAwesome name="user" size={40} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.editIconContainer}>
              <FontAwesome name="camera" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>
         
          <Text style={styles.changePhotoText}>Tap to change photo</Text>
         
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              <FontAwesome name="user" size={14} color="#8B4513" style={styles.inputIcon} />
              Username
            </Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor="#999"
            />
          </View>
         
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              <FontAwesome name="phone" size={14} color="#8B4513" style={styles.inputIcon} />
              Mobile Number
            </Text>
            <TextInput
              style={styles.input}
              value={mobileNumber}
              onChangeText={setMobileNumber}
              placeholder="Enter mobile number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>
         
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              <FontAwesome name="map-marker" size={14} color="#8B4513" style={styles.inputIcon} />
              Address
            </Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your address"
              placeholderTextColor="#999"
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
         
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
         
          <TouchableOpacity
            style={styles.saveButtonContainer}
            onPress={handleSave}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#c0c0c0', '#a0a0a0'] : ['#FF8C42', '#F9A826']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <FontAwesome name="check" size={16} color="#FFF" style={styles.buttonIcon} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  rightPlaceholder: {
    width: 24,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#8B4513',
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8B4513',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF8C42',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  changePhotoText: {
    color: '#8B4513',
    marginBottom: 20,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#8B4513',
    marginBottom: 8,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    backgroundColor: '#FFFAF5',
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#5D4037',
  },
  multilineInput: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 15,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 8,
    borderRadius: 8,
    width: '100%',
  },
  saveButtonContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
});


export default EditProfile;