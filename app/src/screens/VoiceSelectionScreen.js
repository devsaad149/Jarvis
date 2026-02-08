import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const VOICE_OPTIONS = [
    { id: 'female_warm', name: 'Zara', description: 'Warm and friendly female voice' },
    { id: 'male_professional', name: 'Atlas', description: 'Professional male voice' },
    { id: 'female_energetic', name: 'Nova', description: 'Energetic and upbeat female voice' },
    { id: 'male_calm', name: 'Echo', description: 'Calm and soothing male voice' },
];

const VoiceSelectionScreen = ({ navigation, route }) => {
    const [selectedVoice, setSelectedVoice] = useState('female_warm');
    const { assistantName, language } = route.params || {};

    const handleContinue = () => {
        navigation.navigate('Permissions', { assistantName, language, voice: selectedVoice });
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Choose Voice Style</Text>
                <Text style={styles.subtitle}>
                    Select a voice personality for {assistantName || 'your assistant'}.
                </Text>

                {VOICE_OPTIONS.map((voice) => (
                    <TouchableOpacity
                        key={voice.id}
                        style={[
                            styles.voiceItem,
                            selectedVoice === voice.id && styles.voiceItemActive
                        ]}
                        onPress={() => setSelectedVoice(voice.id)}
                    >
                        <View style={styles.voiceInfo}>
                            <Text style={[
                                styles.voiceName,
                                selectedVoice === voice.id && styles.voiceNameActive
                            ]}>
                                {voice.name}
                            </Text>
                            <Text style={styles.voiceDescription}>{voice.description}</Text>
                        </View>
                        {selectedVoice === voice.id && (
                            <Text style={styles.checkmark}>✓</Text>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleContinue}>
                <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        padding: 20,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        paddingTop: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 14,
        color: '#a0a0a0',
        marginBottom: 30,
        lineHeight: 22,
    },
    voiceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2d2d44',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#3d3d54',
    },
    voiceItemActive: {
        backgroundColor: '#3d3d54',
        borderColor: '#6c5ce7',
    },
    voiceInfo: {
        flex: 1,
    },
    voiceName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#a0a0a0',
        marginBottom: 4,
    },
    voiceNameActive: {
        color: '#fff',
    },
    voiceDescription: {
        fontSize: 12,
        color: '#666',
    },
    checkmark: {
        color: '#6c5ce7',
        fontSize: 20,
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: '#6c5ce7',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 40,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});

export default VoiceSelectionScreen;
