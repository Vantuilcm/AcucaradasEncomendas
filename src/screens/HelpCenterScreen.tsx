import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Searchbar, Card, List, Divider, useTheme, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { HelpCategory, HelpArticle, HelpContact } from '../types/HelpCenter';
import { HelpCenterService } from '../services/HelpCenterService';

export function HelpCenterScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [contacts, setContacts] = useState<HelpContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<{
    articles: HelpArticle[];
    categories: HelpCategory[];
    total: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const helpCenterService = new HelpCenterService();
      const [categoriesData, contactsData] = await Promise.all([
        helpCenterService.getCategories(),
        helpCenterService.getContactInfo(),
      ]);

      setCategories(categoriesData);
      setContacts(contactsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    try {
      setSearchQuery(query);
      if (!query.trim()) {
        setSearchResults(null);
        return;
      }

      setLoading(true);
      const helpCenterService = new HelpCenterService();
      const results = await helpCenterService.searchArticles(query);
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao pesquisar');
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryCard = (category: HelpCategory) => (
    <Card
      key={category.id}
      style={styles.card}
      onPress={() => navigation.navigate('HelpCategory', { categoryId: category.id })}
    >
      <Card.Content style={styles.cardContent}>
        <IconButton
          icon={category.icon}
          size={32}
          iconColor={theme.colors.primary}
          style={styles.categoryIcon}
        />
        <View style={styles.categoryInfo}>
          <Text variant="titleMedium">{category.name}</Text>
          <Text variant="bodyMedium" style={styles.categoryDescription}>
            {category.description}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderSearchResult = (article: HelpArticle) => (
    <List.Item
      key={article.id}
      title={article.title}
      description={article.category.name}
      left={props => <List.Icon {...props} icon="text-box" />}
      onPress={() => navigation.navigate('HelpArticle', { articleId: article.id })}
    />
  );

  if (loading && !searchQuery) {
    return <LoadingState message="Carregando central de ajuda..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {error && <ErrorMessage message={error} onRetry={loadData} />}

        <Searchbar
          placeholder="Pesquisar na central de ajuda"
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
        />

        {searchQuery ? (
          <>
            {loading ? (
              <LoadingState message="Pesquisando..." />
            ) : searchResults ? (
              <View style={styles.searchResults}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Resultados da Pesquisa ({searchResults.total})
                </Text>
                {searchResults.articles.map(renderSearchResult)}
                {searchResults.categories.map(category => (
                  <Card
                    key={category.id}
                    style={styles.card}
                    onPress={() => navigation.navigate('HelpCategory', { categoryId: category.id })}
                  >
                    <Card.Content style={styles.cardContent}>
                      <IconButton
                        icon={category.icon}
                        size={32}
                        iconColor={theme.colors.primary}
                        style={styles.categoryIcon}
                      />
                      <View style={styles.categoryInfo}>
                        <Text variant="titleMedium">{category.name}</Text>
                        <Text variant="bodyMedium" style={styles.categoryDescription}>
                          {category.description}
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            ) : (
              <Text style={styles.noResults}>Nenhum resultado encontrado</Text>
            )}
          </>
        ) : (
          <>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Categorias
            </Text>
            <View style={styles.categories}>{categories.map(renderCategoryCard)}</View>

            <Divider style={styles.divider} />

            <Text variant="titleMedium" style={styles.sectionTitle}>
              Contato e Suporte
            </Text>
            <List.Section>
              {contacts.map(contact => (
                <List.Item
                  key={contact.id}
                  title={contact.label}
                  description={contact.description}
                  left={props => (
                    <List.Icon
                      {...props}
                      icon={
                        contact.type === 'email'
                          ? 'email'
                          : contact.type === 'phone'
                            ? 'phone'
                            : 'whatsapp'
                      }
                    />
                  )}
                  right={props => (
                    <Text {...props} style={styles.contactValue}>
                      {contact.value}
                    </Text>
                  )}
                  disabled={!contact.isAvailable}
                />
              ))}
            </List.Section>
          </>
        )}
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
  searchBar: {
    margin: 16,
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  categories: {
    paddingHorizontal: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    margin: 0,
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryDescription: {
    color: '#666',
  },
  divider: {
    marginVertical: 16,
  },
  searchResults: {
    paddingHorizontal: 16,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 32,
    color: '#666',
  },
  contactValue: {
    color: '#666',
  },
});
