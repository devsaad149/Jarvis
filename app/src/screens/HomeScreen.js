import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Linking } from 'react-native';
import axios from 'axios';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Calendar from 'expo-calendar';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

// Backend URL - use relative path for production (Vercel), localhost for local dev
const BACKEND_URL = Platform.OS === 'web'
    ? (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000' : '')
    : 'http://10.0.2.2:8000';

const HomeScreen = ({ route }) => {
    const { assistantName = 'JARVIS' } = route.params || {};
    const [messages, setMessages] = useState([
        { id: '1', role: 'assistant', content: `Hey! I'm ${assistantName}, your personal AI assistant. How can I help you today?` }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollViewRef = useRef();

    const [volume, setVolume] = useState(0); // Debug volume

    useEffect(() => {
        // Request audio permissions
        Audio.requestPermissionsAsync();
    }, []);

    const playAudioResponse = (text) => {
        try {
            // Stop any current speech
            Speech.stop();
            // Speak the text
            Speech.speak(text, {
                language: 'en',
                pitch: 1.0,
                rate: 0.9,
            });
        } catch (error) {
            console.error('TTS Error:', error);
        }
    };

    const checkCalendar = async () => {
        try {
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            if (status !== 'granted') return "Permission denied";

            const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            if (calendars.length === 0) return "No calendars found";

            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + 7); // Next 7 days

            const events = await Calendar.getEventsAsync(
                calendars.map(c => c.id),
                startDate,
                endDate
            );

            return JSON.stringify(events.map(e => ({
                title: e.title,
                startDate: e.startDate,
                endDate: e.endDate,
                allDay: e.allDay
            })));
        } catch (error) {
            console.error('Calendar Error:', error);
            return "Error fetching events";
        }
    };

    // --- Voice Recording & VAD Logic ---
    const [recording, setRecording] = useState();
    const [isRecording, setIsRecording] = useState(false);
    const [isCleaningUp, setIsCleaningUp] = useState(false); // Prevent overlapping recordings
    const silenceTimer = useRef(null);

    // Web VAD Refs
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const resultRef = useRef(null); // To stop the loop
    const streamRef = useRef(null);

    const SILENCE_THRESHOLD_DB = -30;
    const SILENCE_DURATION_MS = 1000; // Reduced to 1.0s for faster response

    const startRecording = async () => {
        try {
            // Prevent starting if already cleaning up
            if (isCleaningUp) {
                console.log('Still cleaning up previous recording, please wait...');
                return;
            }

            // CRITICAL FIX: Clean up any existing recording first to prevent
            // "Only one Recording object can be prepared at a given time" error
            if (recording) {
                console.log('Cleaning up existing recording...');
                setIsCleaningUp(true);
                try {
                    await recording.stopAndUnloadAsync();
                    console.log('Previous recording cleaned up successfully');
                } catch (e) {
                    console.log('Cleanup of previous recording:', e);
                }

                // CRITICAL: Clear the state BEFORE creating new recording
                setRecording(undefined);

                // Wait to ensure cleanup is complete and state is updated
                await new Promise(resolve => setTimeout(resolve, 200));
                setIsCleaningUp(false);
            }

            console.log('Requesting permissions...');
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
                (status) => {
                    // Mobile VAD
                    if (status.isRecording && status.metering) {
                        checkSilence(status.metering);
                    }
                },
                100
            );

            setRecording(recording);
            setIsRecording(true);

            // Web-based VAD for silence detection
            if (Platform.OS === 'web') {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                audioContextRef.current = audioContext;
                const analyser = audioContext.createAnalyser();
                analyserRef.current = analyser; // Store analyser for later use
                const microphone = audioContext.createMediaStreamSource(stream);
                microphone.connect(analyser);
                analyser.fftSize = 512;
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                const checkWebVolume = () => {
                    if (!isRecording && !audioContextRef.current) return; // Stop if recording ended

                    analyser.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                    setVolume(Math.round(average)); // Update debug volume

                    if (average < 10) { // Silence Threshold for Web
                        if (!silenceTimer.current) {
                            silenceTimer.current = setTimeout(() => {
                                stopRecording();
                            }, SILENCE_DURATION_MS); // Use global constant
                        }
                    } else {
                        if (silenceTimer.current) {
                            clearTimeout(silenceTimer.current);
                            silenceTimer.current = null;
                        }
                    }
                    resultRef.current = requestAnimationFrame(checkWebVolume);
                };
                checkWebVolume();
            }
        } catch (error) {
            console.error('Failed to start recording', error);
            if (Platform.OS === 'web') {
                alert(`Failed to start recording: ${error.message}`);
            }
            setIsRecording(false);
            setRecording(undefined);
        }
    };

    const checkSilence = (metering) => {
        if (metering < SILENCE_THRESHOLD_DB) {
            if (!silenceTimer.current) {
                silenceTimer.current = setTimeout(() => {
                    stopRecording();
                }, SILENCE_DURATION_MS);
            }
        } else {
            if (silenceTimer.current) {
                clearTimeout(silenceTimer.current);
                silenceTimer.current = null;
            }
        }
    };

    const stopRecording = async () => {
        // CRITICAL: Store recording reference FIRST before any cleanup
        const currentRecording = recording;

        // Clear silence timer
        if (silenceTimer.current) {
            clearTimeout(silenceTimer.current);
            silenceTimer.current = null;
        }

        // Stop Web VAD
        if (resultRef.current) cancelAnimationFrame(resultRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());

        audioContextRef.current = null;
        streamRef.current = null;

        if (!currentRecording) {
            console.log('No recording to stop');
            setIsRecording(false);
            return;
        }

        setIsRecording(false);
        try {
            await currentRecording.stopAndUnloadAsync();
            const uri = currentRecording.getURI();

            // Upload and Transcribe
            setIsLoading(true);
            const formData = new FormData();

            if (Platform.OS === 'web') {
                const audioBlob = await fetch(uri).then(r => r.blob());
                formData.append('audio', audioBlob, 'voice.m4a');
            } else {
                formData.append('audio', {
                    uri,
                    type: 'audio/m4a',
                    name: 'voice.m4a',
                });
            }

            // Use fetch for file upload with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for transcription

            const response = await fetch(`${BACKEND_URL}/api/transcribe`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await response.json();

            // Check if response was successful
            if (!response.ok) {
                console.error('Transcription API error:', data);
                if (Platform.OS === 'web') {
                    alert(`Transcription failed: ${data.detail || 'Unknown error'}. Please check if GROQ_API_KEY is set in Vercel.`);
                }
                setIsLoading(false);
                setRecording(undefined);
                return;
            }

            if (data.success && data.transcription && data.transcription.trim().length > 0) {
                // Determine if we should await this or let it run
                // Awaiting ensures loading state persists correctly if handleSend manages it
                await handleSend(data.transcription);
            } else {
                console.log("Transcription empty or failed", data);
                if (Platform.OS === 'web') alert("Couldn't hear anything. Please try again.");
                setIsLoading(false);
            }

            setRecording(undefined);
        } catch (error) {
            console.error('Stop recording error:', error);
            if (Platform.OS === 'web') {
                // Don't alert "Aborted" if it's just a timeout/cleanup, but do alert real errors
                if (error.name !== 'AbortError') {
                    alert(`Voice command error: ${error.message}. Check console for details.`);
                }
            }
            setIsLoading(false);
            setRecording(undefined);
        }
    };
    // -----------------------------------

    const handleSend = async (manualText = null) => {
        const textToSend = (typeof manualText === 'string' ? manualText : inputText);
        if (!textToSend.trim() || isLoading) return;

        const userMessage = { id: Date.now().toString(), role: 'user', content: textToSend };
        setMessages(prev => [...prev, userMessage]);
        if (!manualText) setInputText('');
        setIsLoading(true);

        // Prepare history (last 10 messages)
        const history = messages.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        try {
            const response = await axios.post(`${BACKEND_URL}/api/chat`, {
                message: textToSend,
                context: { assistantName },
                history: history
            }, { timeout: 30000 });

            let aiText = response.data.response;

            // Check for Weather Command
            const weatherMatch = aiText.match(/\[CMD: WEATHER \| (.*?)\]/);
            if (weatherMatch) {
                const locationArg = weatherMatch[1].trim();
                let weatherData = "Unable to fetch weather.";

                try {
                    let query = locationArg;
                    if (locationArg.toLowerCase() === 'here' || !locationArg) {
                        const { status } = await Location.requestForegroundPermissionsAsync();
                        if (status === 'granted') {
                            const location = await Location.getCurrentPositionAsync({});
                            query = `${location.coords.latitude},${location.coords.longitude}`;
                        }
                    }

                    const wRes = await axios.get(`https://wttr.in/${query}?format=3`);
                    weatherData = wRes.data; // format=3 returns "Location: Temp" string
                } catch (e) {
                    console.error("Weather error:", e);
                }

                if (weatherData) {
                    // Invisibly send back data
                    const wResponse = await axios.post(`${BACKEND_URL}/api/chat`, {
                        message: `[SYSTEM_DATA] Weather report: ${weatherData}`,
                        context: { assistantName }
                    });
                    aiText = wResponse.data.response;
                }
            }

            // Check for Add Task Command
            const addTaskMatch = aiText.match(/\[CMD: ADD_TASK \| (.*?)\]/);
            if (addTaskMatch) {
                const task = addTaskMatch[1].trim();
                try {
                    const existingTasks = await AsyncStorage.getItem('user_tasks');
                    const tasks = existingTasks ? JSON.parse(existingTasks) : [];
                    tasks.push({ id: Date.now(), text: task, completed: false });
                    await AsyncStorage.setItem('user_tasks', JSON.stringify(tasks));

                    const tResponse = await axios.post(`${BACKEND_URL}/api/chat`, {
                        message: `[SYSTEM_DATA] Task added: "${task}"`,
                        context: { assistantName }
                    });
                    aiText = tResponse.data.response;
                } catch (e) {
                    console.error("Task Add Error:", e);
                }
            }

            // Check for List Tasks Command
            if (aiText.includes('[CMD: LIST_TASKS]')) {
                try {
                    const existingTasks = await AsyncStorage.getItem('user_tasks');
                    const tasks = existingTasks ? JSON.parse(existingTasks) : [];
                    const taskList = tasks.length > 0
                        ? tasks.map(t => `- ${t.text}`).join('\n')
                        : "No tasks found.";

                    const tResponse = await axios.post(`${BACKEND_URL}/api/chat`, {
                        message: `[SYSTEM_DATA] User's Todo List:\n${taskList}`,
                        context: { assistantName }
                    });
                    aiText = tResponse.data.response;
                } catch (e) {
                    console.error("Task List Error:", e);
                }
            }

            // Check for Spotify Command
            const spotifyMatch = aiText.match(/\[CMD: SPOTIFY \| (.*?)\]/);
            if (spotifyMatch) {
                const query = spotifyMatch[1].trim();
                try {
                    const url = `spotify:search:${encodeURIComponent(query)}`;

                    if (Platform.OS === 'web') {
                        window.open(`https://open.spotify.com/search/${encodeURIComponent(query)}`, '_blank');
                    } else {
                        const canOpen = await Linking.canOpenURL(url);
                        if (canOpen) {
                            await Linking.openURL(url);
                        } else {
                            await Linking.openURL(`https://open.spotify.com/search/${encodeURIComponent(query)}`);
                        }
                    }

                    const sResponse = await axios.post(`${BACKEND_URL}/api/chat`, {
                        message: `[SYSTEM_DATA] Opening Spotify for: "${query}"`,
                        context: { assistantName },
                        history: history
                    });
                    aiText = sResponse.data.response;
                } catch (e) {
                    console.error("Spotify Error:", e);
                }
            }

            // Check for LinkedIn Command
            const linkedinMatch = aiText.match(/\[CMD: LINKEDIN \| (.*?)\]/);
            if (linkedinMatch) {
                const query = linkedinMatch[1].trim();
                try {
                    const isUrl = query.startsWith('http');

                    if (Platform.OS === 'web') {
                        const targetUrl = isUrl ? query : `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query)}`;
                        window.open(targetUrl, '_blank');
                    } else {
                        const targetUrl = isUrl ? query : `linkedin://search?keywords=${encodeURIComponent(query)}`;
                        const webFallback = isUrl ? query : `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query)}`;

                        const canOpen = await Linking.canOpenURL(targetUrl);
                        if (canOpen) {
                            await Linking.openURL(targetUrl);
                        } else {
                            await Linking.openURL(webFallback);
                        }
                    }

                    const lResponse = await axios.post(`${BACKEND_URL}/api/chat`, {
                        message: `[SYSTEM_DATA] Opening LinkedIn search for: "${query}"`,
                        context: { assistantName },
                        history: history
                    });
                    aiText = lResponse.data.response;
                } catch (e) {
                    console.error("LinkedIn Error:", e);
                }
            }

            // Check for Calendar Command (Existing)
            if (aiText.includes('[CMD: CALENDAR]')) {
                const events = await checkCalendar();
                // Send events back to AI invisibly
                const eventResponse = await axios.post(`${BACKEND_URL}/api/chat`, {
                    message: `[SYSTEM_DATA] Here are the user's calendar events for the next 7 days: ${events}`,
                    context: { assistantName }
                });
                aiText = eventResponse.data.response;
            }

            const aiResponse = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiText
            };
            setMessages(prev => [...prev, aiResponse]);
            playAudioResponse(aiText);

        } catch (error) {
            console.error('Chat error:', error);
            // ... (keep existing error handling)
            const errorMessage = "Sorry, I'm having trouble connecting.";
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{assistantName}</Text>
            </View>

            <ScrollView
                style={styles.messagesContainer}
                ref={scrollViewRef}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map((msg) => (
                    <View
                        key={msg.id}
                        style={[
                            styles.messageBubble,
                            msg.role === 'user' ? styles.userBubble : styles.assistantBubble
                        ]}
                    >
                        <Text style={[
                            styles.messageText,
                            msg.role === 'user' ? styles.userText : styles.assistantText
                        ]}>
                            {msg.content}
                        </Text>
                    </View>
                ))}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#6c5ce7" />
                        <Text style={styles.loadingText}>Thinking...</Text>
                    </View>
                )}
            </ScrollView>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor="#666"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={() => handleSend()}
                    editable={!isLoading}
                />

                <TouchableOpacity
                    style={[
                        styles.micButton,
                        isRecording && styles.micButtonActive,
                        (isLoading || isCleaningUp) && styles.micButtonDisabled
                    ]}
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={isLoading || isCleaningUp}
                >
                    {/* Simple Icon or Text for now */}
                    <Text style={styles.micButtonText}>{isRecording ? '🔴' : '🎤'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={isLoading}
                >
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>
            {Platform.OS === 'web' && isRecording && (
                <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 10 }}>
                    Mic Volume: {volume} (Silence &lt; 10)
                </Text>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#2d2d44',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    messagesContainer: {
        flex: 1,
        padding: 16,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
    },
    userBubble: {
        backgroundColor: '#6c5ce7',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        backgroundColor: '#2d2d44',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    userText: {
        color: '#fff',
    },
    assistantText: {
        color: '#e0e0e0',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        padding: 12,
    },
    loadingText: {
        color: '#a0a0a0',
        marginLeft: 8,
        fontSize: 14,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#2d2d44',
    },
    input: {
        flex: 1,
        backgroundColor: '#2d2d44',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#fff',
        color: '#fff',
        marginRight: 10,
    },
    micButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#2d2d44',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    micButtonActive: {
        backgroundColor: '#ff4b4b',
    },
    micButtonDisabled: {
        opacity: 0.5,
    },
    micButtonText: {
        fontSize: 20,
    },
    sendButton: {
        backgroundColor: '#6c5ce7',
        borderRadius: 24,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#4a4a6a',
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});

export default HomeScreen;
