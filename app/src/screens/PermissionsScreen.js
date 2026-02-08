import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const PERMISSIONS = [
    { id: 'microphone', name: 'Microphone', description: 'For voice commands and conversations', icon: '🎤' },
    { id: 'calendar', name: 'Calendar', description: 'To manage your schedule', icon: '📅' },
    { id: 'notifications', name: 'Notifications', description: 'For reminders and alerts', icon: '🔔' },
];

import * as Calendar from 'expo-calendar';

const PermissionsScreen = ({ navigation, route }) => {
    const { assistantName, language, voice } = route.params || {};

    const handleSetup = async () => {
        try {
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            if (status === 'granted') {
                const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
                console.log('Calendars:', calendars.length);
            }
        } catch (error) {
            console.error('Permission Error:', error);
        }

        navigation.reset({
            index: 0,
            routes: [{ name: 'Home', params: { assistantName, language, voice } }],
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Permissions</Text>
                <Text style={styles.subtitle}>
                    {assistantName || 'JARVIS'} needs a few permissions to help you best.
                </Text>

                {PERMISSIONS.map((perm) => (
                    <View key={perm.id} style={styles.permissionItem}>
                        <Text style={styles.icon}>{perm.icon}</Text>
                        <View style={styles.permInfo}>
                            <Text style={styles.permName}>{perm.name}</Text>
                            <Text style={styles.permDescription}>{perm.description}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSetup}>
                <Text style={styles.buttonText}>Allow & Continue</Text>
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
    permissionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2d2d44',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    icon: {
        fontSize: 24,
        marginRight: 14,
    },
    permInfo: {
        flex: 1,
    },
    permName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    permDescription: {
        fontSize: 12,
        color: '#666',
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

export default PermissionsScreen;
