import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, Divider, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { ProducerService } from '../services/ProducerService';
import { Producer } from '../types/Producer';
import { loggingService } from '../services/LoggingService';

export default function ScheduleDeliveryScreen() {
  const navigation = useNavigation<any>();
  const { items, total } = useCart();

  const [loading, setLoading] = useState(true);
  const [producer, setProducer] = useState<Producer | null>(null);
  const [maxLeadTime, setMaxLeadTime] = useState(0);
  
  // Estados para controle do agendamento
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [deliveryType, setDeliveryType] = useState('scheduled');
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');

  useEffect(() => {
    loadProducerInfo();
  }, []);

  const loadProducerInfo = async () => {
    try {
      if (items.length > 0) {
        // Encontrar maior lead time entre os produtos no carrinho
        const leadTimes = items.map(item => (item as any).leadTimeDays || 0);
        const max = Math.max(...leadTimes, 0);
        setMaxLeadTime(max);

        const producerId = items[0].producerId;
        const data = await ProducerService.getInstance().getProducerById(producerId);
        setProducer(data);
      }
    } catch (error) {
      loggingService.error('Erro ao carregar info do produtor no agendamento', error instanceof Error ? error : undefined);
    } finally {
      setLoading(false);
    }
  };

  // Dados para o componente de calendário
  const today = new Date();
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + maxLeadTime);
    return d.toISOString().split('T')[0];
  })();

  const getHolidays = () => producer?.availability?.holidays || [];

  const getAvailableTimeSlots = () => {
    if (!selectedDate || !producer) return [];

    const config = producer.schedulingConfig || {
      slotIntervalMinutes: 60,
      allowSpecificTime: true
    };

    const workingHours = producer.availability?.workingHours || {
      start: '08:00',
      end: '18:00'
    };

    const slots = [];
    const [startH, startM] = workingHours.start.split(':').map(Number);
    const [endH, endM] = workingHours.end.split(':').map(Number);
    
    let current = new Date(selectedDate);
    current.setHours(startH, startM, 0, 0);
    
    const end = new Date(selectedDate);
    end.setHours(endH, endM, 0, 0);

    const interval = config.slotIntervalMinutes || 60;

    while (current < end) {
      const next = new Date(current.getTime() + interval * 60000);
      if (next > end) break;

      const label = `${current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const value = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      slots.push({ label, value });
      current = next;
    }

    return slots;
  };

  const filterTimeSlotsByCurrentTime = (
    timeSlots: { label: string; value: string }[],
  ): { label: string; value: string }[] => {
    const minLeadTime = producer?.schedulingConfig?.minLeadTimeHours || 2;
    
    if (selectedDate === minDate) {
      const currentTimestamp = today.getTime();
      const bufferMs = minLeadTime * 60 * 60 * 1000;

      return timeSlots.filter(slot => {
        const [h, m] = slot.value.split(':').map(Number);
        const slotDate = new Date(selectedDate);
        slotDate.setHours(h, m, 0, 0);
        return slotDate.getTime() > currentTimestamp + bufferMs;
      });
    }
    return timeSlots;
  };

  const availableTimeSlots = filterTimeSlotsByCurrentTime(getAvailableTimeSlots());

  const computePreparationConfig = () => {
    const minLeadHours = producer?.schedulingConfig?.minLeadTimeHours || 2;
    let maxPreparationMinutes = 0;

    items.forEach(item => {
      const anyItem = item as any;
      const prepField = anyItem.preparationTime ?? anyItem.tempoPreparacao;
      const parsed = typeof prepField === 'string' ? parseInt(prepField, 10) : prepField;
      if (typeof parsed === 'number' && !isNaN(parsed) && parsed > maxPreparationMinutes) {
        maxPreparationMinutes = parsed;
      }
    });

    const hoursFromPrep = maxPreparationMinutes > 0 ? Math.ceil(maxPreparationMinutes / 60) : 0;
    const preparationHours = hoursFromPrep > 0 ? hoursFromPrep : minLeadHours;
    const type: 'normal' | 'extended' | 'custom' = maxLeadTime > 0 ? 'extended' : 'normal';

    return { preparationHours, preparationTimeType: type };
  };

  const preparationConfig = computePreparationConfig();

  const isWorkingDay = (date: Date) => {
    if (!producer?.availability?.workingDays) return date.getDay() !== 0; // Default block Sunday
    return producer.availability.workingDays.includes(date.getDay());
  };

  const withinMaxDays = (date: Date) => {
    const maxDays = producer?.schedulingConfig?.maxDaysInAdvance || 30;
    const max = new Date();
    max.setDate(max.getDate() + maxDays);
    return date >= today && date <= max;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF69B4" />
        <Text style={{ marginTop: 10 }}>Carregando disponibilidade do produtor...</Text>
      </View>
    );
  }

  // Gerenciar a exibição do seletor de horário nativo
  const showTimePickerModal = () => {
    setTimePickerOpen(true);
  };

  // Validar e continuar para checkout
  const handleContinue = () => {
    if (deliveryType === 'scheduled' && (!selectedDate || !selectedTimeSlot)) {
      Alert.alert('Dados incompletos', 'Por favor, selecione uma data e horário para entrega.');
      return;
    }

    if (deliveryType === 'custom' && (!selectedDate || !selectedTime)) {
      Alert.alert('Dados incompletos', 'Por favor, selecione uma data e horário específico.');
      return;
    }

    const { preparationHours, preparationTimeType } = computePreparationConfig();

    const scheduledDelivery = {
      type: deliveryType,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      customTime: selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      deliveryMode,
      preparationTimeType,
      preparationHours,
      specialInstructions,
    };

    navigation.navigate('Checkout', { scheduledDelivery });
  };

  const getProbableDeliveryText = () => {
    if (!selectedDate) return 'Selecione uma data para ver a previsão';
    
    let timeText = '';
    if (deliveryType === 'scheduled' && selectedTimeSlot) {
      timeText = ` entre ${getAvailableTimeSlots().find(s => s.value === selectedTimeSlot)?.label}`;
    } else if (deliveryType === 'custom') {
      timeText = ` às ${selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (deliveryMode === 'pickup') {
      return `Sua encomenda deve estar pronta para retirada dia ${new Date(
        selectedDate,
      ).toLocaleDateString('pt-BR')}${timeText}.`;
    }

    return `Sua encomenda deve chegar dia ${new Date(selectedDate).toLocaleDateString('pt-BR')}${timeText}.`;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Agendar Entrega</Text>

      {producer && (
        <Card style={styles.producerCard}>
          <Card.Content style={styles.producerContent}>
            <Ionicons name="storefront-outline" size={24} color="#FF69B4" />
            <View style={styles.producerInfo}>
              <Text style={styles.producerName}>{producer.name}</Text>
              <Text style={styles.producerStatus}>Regras de agendamento aplicadas</Text>
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.deliveryTypeCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Tipo de Entrega</Text>
          <SegmentedButtons
            value={deliveryType}
            onValueChange={setDeliveryType}
            buttons={[
              { value: 'scheduled', label: 'Janela de Entrega', icon: 'calendar-range' },
              { 
                value: 'custom', 
                label: 'Horário Específico', 
                icon: 'clock-outline',
                disabled: producer?.schedulingConfig?.allowSpecificTime === false
              },
            ]}
            style={styles.segmentedButtons}
          />
        </Card.Content>
      </Card>

      <Card style={styles.calendarCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Data de Entrega</Text>
          <Text style={styles.sectionDescription}>
            {producer?.schedulingConfig?.maxDaysInAdvance 
              ? `Este produtor aceita encomendas com até ${producer.schedulingConfig.maxDaysInAdvance} dias de antecedência.`
              : 'Selecione a data desejada para receber sua encomenda'}
          </Text>
          
          {maxLeadTime > 0 && (
            <View style={styles.leadTimeWarning}>
              <Ionicons name="alert-circle-outline" size={20} color="#E91E63" />
              <Text style={styles.leadTimeWarningText}>
                Alguns itens no seu carrinho exigem pelo menos {maxLeadTime} {maxLeadTime === 1 ? 'dia' : 'dias'} de antecedência para produção.
              </Text>
            </View>
          )}

          <Button
            icon="calendar"
            mode="outlined"
            onPress={() => setDatePickerOpen(true)}
            style={styles.calendarButton}
          >
            {selectedDate
              ? new Date(selectedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : 'Selecionar data'}
          </Button>
          <DatePickerModal
            locale="pt"
            mode="single"
            visible={datePickerOpen}
            onDismiss={() => setDatePickerOpen(false)}
            date={selectedDate ? new Date(selectedDate) : undefined}
            validRange={{ 
              startDate: new Date(minDate), 
              endDate: (() => { 
                const d = new Date(); 
                d.setDate(d.getDate() + (producer?.schedulingConfig?.maxDaysInAdvance || 30)); 
                return d; 
              })() 
            }}
            onConfirm={({ date }: { date?: Date }) => {
              if (date) {
                const iso = date.toISOString().split('T')[0];
                const isHoliday = getHolidays().includes(iso);
                if (!isWorkingDay(date) || isHoliday || !withinMaxDays(date)) {
                  Alert.alert('Data indisponível', 'Selecione uma data válida de acordo com a disponibilidade do produtor.');
                } else {
                  setSelectedDate(iso);
                }
              }
              setDatePickerOpen(false);
            }}
          />
        </Card.Content>
      </Card>

      {selectedDate && (
        <Card style={styles.timeCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Horário de Entrega</Text>
            <Text style={styles.sectionDescription}>
              {deliveryType === 'scheduled'
                ? 'Selecione uma janela de horário para receber sua encomenda'
                : 'Selecione um horário específico para sua entrega'}
            </Text>

            {deliveryType === 'scheduled' ? (
              <View style={styles.timeSlots}>
                {availableTimeSlots.length > 0 ? (
                  availableTimeSlots.map(slot => (
                    <TouchableOpacity
                      key={slot.value}
                      style={[
                        styles.timeSlot,
                        selectedTimeSlot === slot.value && styles.selectedTimeSlot,
                      ]}
                      onPress={() => setSelectedTimeSlot(slot.value)}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          selectedTimeSlot === slot.value && styles.selectedTimeSlotText,
                        ]}
                      >
                        {slot.label}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noTimeSlotsText}>
                    Não há horários disponíveis para esta data. Por favor, selecione outra data.
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.customTimeContainer}>
                <TouchableOpacity style={styles.timePickerButton} onPress={showTimePickerModal}>
                  <Ionicons name="time-outline" size={24} color="#FF69B4" />
                  <Text style={styles.timePickerButtonText}>
                    {selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>

                <TimePickerModal
                  visible={timePickerOpen}
                  onDismiss={() => setTimePickerOpen(false)}
                  onConfirm={({ hours, minutes }: { hours: number; minutes: number }) => {
                    const next = new Date(selectedTime);
                    next.setHours(hours);
                    next.setMinutes(minutes);
                    setSelectedTime(next);
                    setTimePickerOpen(false);
                  }}
                  hours={selectedTime.getHours()}
                  minutes={selectedTime.getMinutes()}
                  label="Selecione o horário"
                  cancelLabel="Cancelar"
                  confirmLabel="Confirmar"
                />

                <Text style={styles.customTimeNote}>
                  Nota: Entregas em horário específico estão sujeitas a disponibilidade e podem ter
                  taxa adicional.
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      <Card style={styles.preparationCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Tempo de Preparo</Text>
          <Text style={styles.sectionDescription}>
            Escolha se deseja entrega em casa ou retirada no local. O tempo de preparo é definido
            pelo produtor com base nos produtos do seu pedido.
          </Text>

          <SegmentedButtons
            value={deliveryMode}
            onValueChange={value => setDeliveryMode(value as 'delivery' | 'pickup')}
            buttons={[
              { value: 'delivery', label: 'Entrega em casa', icon: 'truck-delivery-outline' },
              { value: 'pickup', label: 'Retirada no local', icon: 'storefront-outline' },
            ]}
            style={styles.segmentedButtons}
          />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Tempo de preparo médio:</Text>
            <Text style={styles.summaryValue}>
              {preparationConfig.preparationHours} hora
              {preparationConfig.preparationHours > 1 ? 's' : ''} (definido pelo produtor)
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.instructionsCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Instruções Especiais</Text>
          <Text style={styles.sectionDescription}>
            Adicione observações importantes sobre sua encomenda
          </Text>

          <TextInput
            style={styles.instructionsInput}
            placeholder="Ex: Decoração especial, alergias, preferências, mensagem para o bolo, etc."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            maxLength={300}
          />
          <Text style={styles.charCount}>{specialInstructions.length}/300 caracteres</Text>
        </Card.Content>
      </Card>

      <Card style={styles.orderSummaryCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Previsão de Entrega</Text>
          <View style={styles.probableDeliveryContainer}>
            <Ionicons name="bicycle" size={24} color="#FF69B4" />
            <Text style={styles.probableDeliveryText}>{getProbableDeliveryText()}</Text>
          </View>
          
          <Divider style={styles.summaryDivider} />
          
          <Text style={styles.sectionTitle}>Resumo do Pedido</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Itens no carrinho:</Text>
            <Text style={styles.summaryValue}>{items.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Valor total:</Text>
            <Text style={styles.summaryValue}>R$ {total.toFixed(2)}</Text>
          </View>
          {selectedDate && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Data de entrega:</Text>
              <Text style={styles.summaryValue}>
                {new Date(selectedDate).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}
          {selectedTimeSlot && deliveryType === 'scheduled' && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Horário:</Text>
              <Text style={styles.summaryValue}>
                {getAvailableTimeSlots().find(slot => slot.value === selectedTimeSlot)?.label}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        style={styles.continueButton}
        contentStyle={styles.continueButtonContent}
        labelStyle={styles.continueButtonLabel}
        onPress={handleContinue}
        icon="arrow-right"
      >
        Continuar para Pagamento
      </Button>

      <View style={styles.bottomSpace}></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  producerCard: {
    marginBottom: 16,
    backgroundColor: '#FFF0F5',
    borderLeftWidth: 4,
    borderLeftColor: '#FF69B4',
  },
  producerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  producerInfo: {
    marginLeft: 12,
  },
  producerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  producerStatus: {
    fontSize: 12,
    color: '#FF69B4',
  },
  deliveryTypeCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 10,
  },
  calendarCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 10,
  },
  timeCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 10,
  },
  preparationCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 10,
  },
  instructionsCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 10,
  },
  orderSummaryCard: {
    marginBottom: 24,
    elevation: 2,
    borderRadius: 10,
    backgroundColor: '#FFF9FB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  leadTimeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFC1E3',
  },
  leadTimeWarningText: {
    fontSize: 13,
    color: '#E91E63',
    marginLeft: 8,
    flex: 1,
  },
  calendar: {
    borderRadius: 10,
    elevation: 2,
    backgroundColor: '#fff',
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeSlot: {
    width: '48%',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#FF69B4',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#333',
  },
  selectedTimeSlotText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  noTimeSlotsText: {
    color: '#FF6B6B',
    textAlign: 'center',
    marginVertical: 10,
  },
  customTimeContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 16,
    width: '100%',
  },
  timePickerButtonText: {
    fontSize: 18,
    marginLeft: 10,
    color: '#333',
  },
  customTimeNote: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioLabel: {
    marginLeft: 8,
  },
  radioTitle: {
    fontSize: 16,
    color: '#333',
  },
  radioDescription: {
    fontSize: 12,
    color: '#888',
  },
  customHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 40,
  },
  customHoursInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: 'center',
    fontSize: 16,
  },
  customHoursLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  instructionsInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 12,
    height: 120,
    fontSize: 16,
    color: '#333',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#333',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  probableDeliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  probableDeliveryText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  summaryDivider: {
    marginVertical: 16,
  },
  continueButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 30,
    marginBottom: 16,
  },
  continueButtonContent: {
    height: 56,
  },
  continueButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpace: {
    height: 40,
  },
  segmentedButtons: {
    marginTop: 10,
  },
  calendarButton: {
    borderColor: '#FF69B4',
    marginTop: 8,
  },
});
