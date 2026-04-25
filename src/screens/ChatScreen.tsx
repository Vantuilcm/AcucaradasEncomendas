import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, IconButton, useTheme, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

// Tipo de mensagem simulada
interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  imageUrl?: string;
}

export function ChatScreen() {
  const theme = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { orderId, targetName = 'Atendimento' } = route.params || {};

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    // Simular carregamento inicial de histórico
    setMessages([
      {
        id: '1',
        text: 'Olá! Seu pedido já está em preparo.',
        senderId: 'store-1',
        timestamp: new Date(Date.now() - 60000),
      }
    ]);
  }, []);

  const handleSend = () => {
    if (!inputText.trim() && !inputText) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      senderId: user?.id || 'user-1',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === (user?.id || 'user-1');
    
    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage, { backgroundColor: isMe ? theme.colors.primary : '#E0E0E0' }]}>
        <Text style={{ color: isMe ? '#fff' : '#000' }}>{item.text}</Text>
        <Text style={[styles.timestamp, { color: isMe ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }]}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Avatar.Icon size={40} icon="store" style={{ backgroundColor: theme.colors.primary }} />
        <View style={styles.headerInfo}>
          <Text variant="titleMedium">{targetName}</Text>
          <Text variant="bodySmall">Pedido #{orderId?.slice(-6) || '123456'}</Text>
        </View>
      </View>
      
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        inverted={false}
      />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputContainer}>
          <IconButton icon="paperclip" onPress={() => {}} />
          <IconButton icon="camera" onPress={() => {}} />
          <TextInput
            mode="outlined"
            placeholder="Digite uma mensagem..."
            value={inputText}
            onChangeText={setInputText}
            style={styles.textInput}
            dense
          />
          <IconButton
            icon="send"
            iconColor={theme.colors.primary}
            onPress={handleSend}
            disabled={!inputText.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
  },
  headerInfo: {
    marginLeft: 10,
    flex: 1,
  },
  messageList: {
    padding: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
  },
  timestamp: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    marginHorizontal: 5,
  },
});
