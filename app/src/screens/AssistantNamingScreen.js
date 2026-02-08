import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

const DEFAULT_NAMES = ['JARVIS', 'Zara', 'Nova', 'Atlas', 'Echo'];

const AssistantNamingScreen = ({ navigation }) => {
    const [assistantName, setAssistantName] = useState('');

    const handleContinue = () => {
        const name = assistantName.trim() || 'JARVIS';
        // TODO: Save to user preferences
        navigation.navigate('LanguageSelection', { assistantName: name });
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Name Your Assistant</Text>
                <Text style={styles.subtitle}>
                    Choose a name for your AI assistant. This is how they'll introduce themselves.
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Enter a name..."
                    placeholderTextColor="#666"
                    value={assistantName}
                    onChangeText={setAssistantName}
                    autoCapitalize="words"
                />

                <Text style={styles.suggestionsLabel}>Popular names:</Text>
                <View style={styles.suggestions}>
                    {DEFAULT_NAMES.map((name) => (
                        <TouchableOpacity
                            key={name}
                            style={[
                                styles.suggestionPill,
                                assistantName === name && styles.suggestionPillActive
                            ]}
                            onPress={() => setAssistantName(name)}
                        >
                            <Text style={[
                                styles.suggestionText,
                                assistantName === name && styles.suggestionTextActive
                            ]}>
                                {name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
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
    input: {
        backgroundColor: '#2d2d44',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#fff',
        marginBottom: 30,
    },
    suggestionsLabel: {
        fontSize: 14,
        color: '#a0a0a0',
        marginBottom: 12,
    },
    suggestions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    suggestionPill: {
        backgroundColor: '#2d2d44',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#3d3d54',
    },
    suggestionPillActive: {
        backgroundColor: '#6c5ce7',
        borderColor: '#6c5ce7',
    },
    suggestionText: {
        color: '#a0a0a0',
        fontSize: 14,
    },
    suggestionTextActive: {
        color: '#fff',
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

export default AssistantNamingScreen;
