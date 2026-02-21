import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCart } from '../contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip, Button, Divider, SegmentedButtons, RadioButton } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';

// Configurar o calendário para português brasileiro
LocaleConfig.locales['pt-br'] = {
  monthNames: [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ],
  monthNamesShort: [
    'Jan.',
    'Fev.',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul.',
    'Ago',
    'Set.',
    'Out.',
    'Nov.',
    'Dez.',
  ],
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom.', 'Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.'],
  today: 'Hoje',
};
LocaleConfig.defaultLocale = 'pt-br';

export default function ScheduleDeliveryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { items, total } = useCart();

  // Estados para controle do agendamento
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [preparationTimeType, setPreparationTimeType] = useState('normal');
  const [customPreparationHours, setCustomPreparationHours] = useState('2');
  const [deliveryType, setDeliveryType] = useState('scheduled');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());

  // Dados para o componente de calendário
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];

  // Defina as datas desabilitadas (por exemplo, domingos ou feriados)
  const getDisabledDates = () => {
    const disabledDates = {};

    // Desabilitar domingos nos próximos 3 meses
    let date = new Date(today);
    for (let i = 0; i < 90; i++) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() === 0) {
        // 0 é domingo
        const dateString = date.toISOString().split('T')[0];
        disabledDates[dateString] = { disabled: true, disableTouchEvent: true };
      }
    }

    // Adicionar feriados específicos
    const holidays = [
      '2025-01-01',
      '2025-04-21',
      '2025-05-01',
      '2025-09-07',
      '2025-10-12',
      '2025-11-02',
      '2025-11-15',
      '2025-12-25',
    ];
    holidays.forEach(holiday => {
      disabledDates[holiday] = { disabled: true, disableTouchEvent: true };
    });

    return disabledDates;
  };

  // Horários disponíveis com base no dia
  const getAvailableTimeSlots = () => {
    if (!selectedDate) return [];

    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay();

    // Horários diferentes para finais de semana
    if (dayOfWeek === 6) {
      // Sábado
      return [
        { label: '09:00 - 11:00', value: '09:00' },
        { label: '11:00 - 13:00', value: '11:00' },
        { label: '13:00 - 15:00', value: '13:00' },
      ];
    } else {
      return [
        { label: '09:00 - 11:00', value: '09:00' },
        { label: '11:00 - 13:00', value: '11:00' },
        { label: '13:00 - 15:00', value: '13:00' },
        { label: '15:00 - 17:00', value: '15:00' },
        { label: '17:00 - 19:00', value: '17:00' },
      ];
    }
  };

  // Verifica se o dia selecionado é hoje e filtra horários passados
  const filterTimeSlotsByCurrentTime = timeSlots => {
    if (selectedDate === minDate) {
      const currentHour = today.getHours();
      return timeSlots.filter(slot => {
        const slotHour = parseInt(slot.value.split(':')[0]);
        // Adicionar 2 horas de buffer para preparação mínima
        return slotHour > currentHour + 2;
      });
    }
    return timeSlots;
  };

  const availableTimeSlots = filterTimeSlotsByCurrentTime(getAvailableTimeSlots());

  // Gerenciar a exibição do seletor de horário nativo
  const onTimePickerChange = (event, selectedDate) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setSelectedTime(selectedDate);
    }
  };

  const showTimePickerModal = () => {
    setShowTimePicker(true);
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

    const preparationHours =
      preparationTimeType === 'normal'
        ? 2
        : preparationTimeType === 'extended'
          ? 4
          : parseInt(customPreparationHours);

    const scheduledDelivery = {
      type: deliveryType,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      customTime: selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      preparationTimeType,
      preparationHours,
      specialInstructions,
    };

    navigation.navigate('Checkout', { scheduledDelivery });
  };

  const getMarkedDates = () => {
    const markedDates = { ...getDisabledDates() };
    if (selectedDate) {
      markedDates[selectedDate] = {
        selected: true,
        selectedColor: '#FF69B4',
        disableTouchEvent: false,
      };
    }
    return markedDates;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Agendar Entrega</Text>

      <Card style={styles.deliveryTypeCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Tipo de Entrega</Text>
          <SegmentedButtons
            value={deliveryType}
            onValueChange={setDeliveryType}
            buttons={[
              { value: 'scheduled', label: 'Janela de Entrega', icon: 'calendar-range' },
              { value: 'custom', label: 'Horário Específico', icon: 'clock-outline' },
            ]}
            style={styles.segmentedButtons}
          />
        </Card.Content>
      </Card>

      <Card style={styles.calendarCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Data de Entrega</Text>
          <Text style={styles.sectionDescription}>
            Selecione a data desejada para receber sua encomenda
          </Text>

          <Calendar
            minDate={minDate}
            maxDate={new Date(today.setMonth(today.getMonth() + 3)).toISOString().split('T')[0]}
            onDayPress={day => setSelectedDate(day.dateString)}
            markedDates={getMarkedDates()}
            theme={{
              selectedDayBackgroundColor: '#FF69B4',
              todayTextColor: '#FF69B4',
              arrowColor: '#FF69B4',
              dotColor: '#FF69B4',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 14,
            }}
            style={styles.calendar}
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

                {showTimePicker && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    is24Hour={true}
                    display="default"
                    onChange={onTimePickerChange}
                    minuteInterval={15}
                  />
                )}

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
            Informe quanto tempo precisamos para preparar sua encomenda
          </Text>

          <RadioButton.Group
            onValueChange={value => setPreparationTimeType(value)}
            value={preparationTimeType}
          >
            <View style={styles.radioOption}>
              <RadioButton.Android value="normal" color="#FF69B4" />
              <View style={styles.radioLabel}>
                <Text style={styles.radioTitle}>Preparo Normal</Text>
                <Text style={styles.radioDescription}>2-3 horas de preparo (padrão)</Text>
              </View>
            </View>

            <View style={styles.radioOption}>
              <RadioButton.Android value="extended" color="#FF69B4" />
              <View style={styles.radioLabel}>
                <Text style={styles.radioTitle}>Preparo Estendido</Text>
                <Text style={styles.radioDescription}>4-5 horas para produtos mais elaborados</Text>
              </View>
            </View>

            <View style={styles.radioOption}>
              <RadioButton.Android value="custom" color="#FF69B4" />
              <View style={styles.radioLabel}>
                <Text style={styles.radioTitle}>Preparo Personalizado</Text>
                <Text style={styles.radioDescription}>Especifique o tempo necessário</Text>
              </View>
            </View>
          </RadioButton.Group>

          {preparationTimeType === 'custom' && (
            <View style={styles.customHoursContainer}>
              <TextInput
                style={styles.customHoursInput}
                keyboardType="numeric"
                value={customPreparationHours}
                onChangeText={text => {
                  // Aceitar apenas números entre 1 e 24
                  const hours = parseInt(text.replace(/[^0-9]/g, ''));
                  if (!isNaN(hours) && hours >= 1 && hours <= 24) {
                    setCustomPreparationHours(hours.toString());
                  }
                }}
                maxLength={2}
              />
              <Text style={styles.customHoursLabel}>horas</Text>
            </View>
          )}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
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
});
