import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Title, Paragraph, List, Divider, Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../components/ThemeProvider';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AdminPanelScreen = () => {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const navigateToSection = (section: string) => {
    if (!section) {
      Alert.alert('Em breve', 'Esta funcionalidade estará disponível nas próximas atualizações.');
      return;
    }
    switch (section) {
      case 'preview':
        (navigation as any).navigate('StorePreview');
        break;
      case 'products':
        (navigation as any).navigate('ProductManagement');
        break;
      case 'new_product':
        (navigation as any).navigate('AddEditProduct');
        break;
      case 'settings':
        (navigation as any).navigate('EditProfile');
        break;
      case 'hours':
        (navigation as any).navigate('StoreHours');
        break;
      default:
        break;
    }
  };

  const MenuItem = ({ title, subtitle, icon, route, color = theme.colors.primary }: any) => (
    <TouchableOpacity 
      onPress={() => navigateToSection(route)}
      style={styles.menuItem}
      activeOpacity={0.7}
    >
      <Surface style={styles.menuSurface} elevation={1}>
        <View style={styles.menuItemContent}>
          <View style={styles.menuLeft}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
              <MaterialCommunityIcons name={icon} size={24} color={color} />
            </View>
            <View>
              <Text style={styles.menuTitle}>{title}</Text>
              {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#CCC" />
        </View>
      </Surface>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Surface style={styles.premiumHeader} elevation={2}>
          <View style={styles.headerContent}>
            <Title style={styles.headerTitle}>Minha Loja</Title>
            <Paragraph style={styles.headerSubtitle}>Encante seus clientes com uma vitrine irresistível.</Paragraph>
          </View>
          <MaterialCommunityIcons name="storefront-outline" size={48} color={theme.colors.primary} />
        </Surface>

        <View style={styles.aiInsightContainer}>
          <Surface style={styles.aiInsightSurface} elevation={2}>
            <View style={styles.aiHeader}>
              <MaterialCommunityIcons name="robot-outline" size={20} color="#E91E63" />
              <Text style={styles.aiTitle}>Sugestão Açucaradas</Text>
            </View>
            <Text style={styles.aiText}>
              Adicionar a tag <Text style={styles.aiHighlight}>'Sem Lactose'</Text> nos seus produtos pode aumentar suas buscas em até 20%.
            </Text>
          </Surface>
        </View>

        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>🍬 Meu Cardápio</Text>
          <MenuItem title="Meus Doces" subtitle="Gerencie seus produtos" icon="cupcake" route="products" color="#9C27B0" />
          <MenuItem title="Nova Criação" subtitle="Adicione um novo produto" icon="plus-circle-outline" route="new_product" color="#E91E63" />

          <Text style={styles.sectionTitle}>📸 Minha Vitrine</Text>
          <MenuItem title="Ver como Cliente" subtitle="Visualize sua loja" icon="eye-outline" route="preview" color="#2196F3" />
          <MenuItem title="Detalhes da Loja" subtitle="Nome, logo e banner" icon="store-edit-outline" route="settings" color="#FF9800" />

          <Text style={styles.sectionTitle}>🎉 Promoções</Text>
          <MenuItem title="Cupons de Desconto" subtitle="Crie ofertas exclusivas" icon="ticket-percent-outline" route="" color="#4CAF50" />
          <MenuItem title="Combos" subtitle="Agrupe produtos" icon="package-variant" route="" color="#FF5722" />

          <Text style={styles.sectionTitle}>⏰ Atendimento</Text>
          <MenuItem title="Horários de Funcionamento" subtitle="Defina quando você atende" icon="clock-outline" route="hours" color="#607D8B" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  premiumHeader: {
    padding: 24,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
    paddingRight: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  
  aiInsightContainer: { paddingHorizontal: 16, marginBottom: 8 },
  aiInsightSurface: { borderRadius: 16, backgroundColor: '#FCE4EC', padding: 16, borderWidth: 1, borderColor: '#F8BBD0' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  aiTitle: { fontSize: 14, fontWeight: 'bold', color: '#E91E63', marginLeft: 8 },
  aiText: { fontSize: 14, color: '#880E4F', lineHeight: 20 },
  aiHighlight: { fontWeight: 'bold' },

  menuContainer: { paddingHorizontal: 16, marginTop: 10, zIndex: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 12, marginLeft: 4 },
  menuItem: { marginBottom: 12, elevation: 1 },
  menuSurface: { borderRadius: 16, backgroundColor: '#fff', padding: 12 },
  menuItemContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuTitle: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  menuSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
});

export default AdminPanelScreen;