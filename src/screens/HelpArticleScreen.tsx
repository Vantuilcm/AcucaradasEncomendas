import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, IconButton, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { HelpArticle } from '../types/HelpCenter';
import { HelpCenterService } from '../services/HelpCenterService';

type RouteParams = {
  articleId: string;
};

export function HelpArticleScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { articleId } = route.params as RouteParams;
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadArticle();
  }, [articleId]);

  const loadArticle = async () => {
    try {
      setLoading(true);
      setError(null);

      const helpCenterService = new HelpCenterService();
      const articleData = await helpCenterService.getArticleById(articleId);

      if (!articleData) {
        throw new Error('Artigo não encontrado');
      }

      setArticle(articleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar artigo');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando artigo..." />;
  }

  if (!article) {
    return <ErrorMessage message="Artigo não encontrado" onRetry={loadArticle} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {error && <ErrorMessage message={error} onRetry={loadArticle} />}

        <View style={styles.header}>
          <IconButton
            icon={article.category.icon}
            size={48}
            iconColor={theme.colors.primary}
            style={styles.categoryIcon}
          />
          <Text variant="headlineSmall" style={styles.title}>
            {article.title}
          </Text>
          <Text variant="bodyMedium" style={styles.category}>
            {article.category.name}
          </Text>
        </View>

        <View style={styles.content}>
          <Text variant="bodyLarge" style={styles.articleContent}>
            {article.content}
          </Text>

          {article.tags.length > 0 && (
            <View style={styles.tags}>
              {article.tags.map(tag => (
                <Chip key={tag} style={styles.tag} textStyle={styles.tagText}>
                  {tag}
                </Chip>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.date}>
            Última atualização: {new Date(article.updatedAt).toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryIcon: {
    margin: 0,
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  category: {
    color: '#666',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  articleContent: {
    lineHeight: 24,
    marginBottom: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  date: {
    color: '#666',
    textAlign: 'center',
  },
});
