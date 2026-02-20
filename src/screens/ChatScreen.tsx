import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import {
  Text,
  TextInput,
  IconButton,
  Avatar,
  useTheme,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { ChatService } from '../services/ChatService';
import { ChatMessage } from '../types/Chat';
import { loggingService } from '../services/LoggingService';

export default function ChatScreen() {
  const theme = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { orderId, orderNumber } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const chatService = ChatService.getInstance();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!orderId) return;

    setLoading(true);
    const unsub = chatService.subscribeToMessages(orderId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
      // Rolar para o fim após carregar mensagens
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    });

    return () => unsub();
  }, [orderId]);

  const handleSend = async () => {
    if (!inputText.trim() || !user || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      // Determinar papel do remetente com base no activeRole ou role do AuthContext
      const role = (user as any).activeRole || (user as any).role || 'customer';
      
      await chatService.sendMessage(
        orderId,
        user.id,
        role,
        user.name || 'Usuário',
        textToSend
      );
    } catch (error) {
      loggingService.error('Erro ao enviar mensagem', error as Error);
      setInputText(textToSend); // Restaurar texto em caso de erro
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.senderId === user?.id;
    const senderLabel = String(item.senderName || 'U').substring(0, 2).toUpperCase();
    
    return (
      <View style={[
        styles.messageContainer,
        isMine ? styles.myMessageContainer : styles.theirMessageContainer
      ]}>
        {!isMine && (
          <Avatar.Text 
            size={32} 
            label={senderLabel} 
            style={styles.avatar}
          />
        )}
        <Surface style={[
          styles.messageBubble,
          isMine ? styles.myBubble : styles.theirBubble
        ]}>
          {!isMine && (
            <Text style={styles.senderName}>{item.senderName || 'Usuário'}</Text>
          )}
          <Text style={[styles.messageText, isMine && styles.myMessageText]}>
            {item.text}
          </Text>
          <Text style={[styles.timestamp, isMine && styles.myTimestamp]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Surface>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
          <View style={styles.headerInfo}>
            <Text variant="titleMedium">Pedido #{orderNumber}</Text>
            <Text variant="bodySmall">Chat de Atendimento</Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <Surface style={styles.inputArea} elevation={4}>
          <TextInput
            mode="flat"
            placeholder="Digite sua mensagem..."
            value={inputText}
            onChangeText={setInputText}
            style={[styles.input, { maxHeight: 100 }]}
            multiline
            underlineColor="transparent"
            activeUnderlineColor="transparent"
          />
          <IconButton
            icon="send"
            mode="contained"
            disabled={!inputText.trim() || sending}
            onPress={handleSend}
            containerColor={theme.colors.primary}
            iconColor="#fff"
          />
        </Surface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerInfo: {
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  theirMessageContainer: {
    alignSelf: 'flex-start',
  },
  avatar: {
    marginRight: 8,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#FF69B4',
    borderTopRightRadius: 2,
  },
  theirBubble: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 2,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#666',
  },
  messageText: {
    fontSize: 15,
    color: '#333',
  },
  myMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
    color: '#999',
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
    paddingHorizontal: 16,
  },
});
