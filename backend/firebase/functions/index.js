const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      name: user.displayName || 'User',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      assistantName: 'JARVIS',
      voiceType: 'female_warm',
      voiceLanguage: 'en-US',
      personality: 'friendly_casual',
      primaryLanguage: 'en',
      preferences: {
        notificationsEnabled: true,
        voiceEnabled: true
      }
    });

    // Initial welcome conversation
    await db.collection('users').doc(user.uid).collection('conversations').add({
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      messages: [
        {
          role: 'assistant',
          content: `Welcome! I'm JARVIS.`,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }
      ]
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
  }
});
