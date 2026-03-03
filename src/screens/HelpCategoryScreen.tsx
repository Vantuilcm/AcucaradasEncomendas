import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, useTheme, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { HelpCategory, HelpArticle } from '../types/HelpCenter';
import { HelpCenterService } from '../services/HelpCenterService';

type RouteParams = {
  categoryId: string;
};

export function HelpCategoryScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { categoryId } = route.params as RouteParams;
  const [category, setCategory] = useState<HelpCategory | null>(null);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const helpCenterService = new HelpCenterService();
      const [categoryData, articlesData] = await Promise.all([
        helpCenterService
          .getCategories()
          .then(categories => categories.find(c => c.id === categoryId)),
        helpCenterService.getArticlesByCategory(categoryId),
      ]);

      if (!categoryData) {
        throw new Error('Categoria não encontrada');
      }

      setCategory(categoryData);
      setArticles(articlesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando categoria..." />;
  }

  if (!category) {
    return <ErrorMessage message="Categoria não encontrada" onRetry={loadData} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {error && <ErrorMessage message={error} onRetry={loadData} />}

        <View style={styles.header}>
          <IconButton
            icon={category.icon}
            size={48}
            iconColor={theme.colors.primary}
            style={styles.categoryIcon}
          />
          <Text variant="headlineSmall" style={styles.categoryName}>
            {category.name}
          </Text>
          <Text variant="bodyLarge" style={styles.categoryDescription}>
            {category.description}
          </Text>
        </View>

        <List.Section>
          {articles.map(article => (
            <List.Item
              key={article.id}
              title={article.title}
              description={article.content.substring(0, 100) + '...'}
              left={props => <List.Icon {...props} icon="text-box" />}
              onPress={() => navigation.navigate('HelpArticle', { articleId: article.id })}
            />
          ))}
        </List.Section>
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
  categoryName: {
    marginBottom: 8,
    textAlign: 'center',
  },
  categoryDescription: {
    color: '#666',
    textAlign: 'center',
  },
});
