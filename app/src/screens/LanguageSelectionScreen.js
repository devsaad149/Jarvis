import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
];

const LanguageSelectionScreen = ({ navigation, route }) => {
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const { assistantName } = route.params || { assistantName: 'JARVIS' };

    const handleContinue = () => {
        navigation.navigate('VoiceSelection', { assistantName, language: selectedLanguage });
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Choose Your Language</Text>
                <Text style={styles.subtitle}>
                    Select the primary language for {assistantName} to communicate with you.
                </Text>

                <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
                    {LANGUAGES.map((lang) => (
                        <TouchableOpacity
                            key={lang.code}
                            style={[
                                styles.languageItem,
                                selectedLanguage === lang.code && styles.languageItemActive
                            ]}
                            onPress={() => setSelectedLanguage(lang.code)}
                        >
                            <Text style={styles.flag}>{lang.flag}</Text>
                            <Text style={[
                                styles.languageName,
                                selectedLanguage === lang.code && styles.languageNameActive
                            ]}>
                                {lang.name}
                            </Text>
                            {selectedLanguage === lang.code && (
                                <Text style={styles.checkmark}>✓</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
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
    languageList: {
        flex: 1,
    },
    languageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2d2d44',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#3d3d54',
    },
    languageItemActive: {
        backgroundColor: '#3d3d54',
        borderColor: '#6c5ce7',
    },
    flag: {
        fontSize: 24,
        marginRight: 12,
    },
    languageName: {
        flex: 1,
        fontSize: 16,
        color: '#a0a0a0',
    },
    languageNameActive: {
        color: '#fff',
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

export default LanguageSelectionScreen;
